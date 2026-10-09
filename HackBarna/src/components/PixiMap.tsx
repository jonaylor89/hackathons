import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { DroneState, FireFixture, Vec2, OsmLayer, OsmSettlement, OsmPoi } from '../data/types'

const WORLD_W = 480
const WORLD_H = 288
const TILE = 16
const COLS = WORLD_W / TILE
const ROWS = WORLD_H / TILE

type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number }

function boundsFor(fixture: FireFixture, drones: DroneState[] = []): Bounds {
  const pts: Vec2[] = [
    fixture.cluster.centroid,
    ...fixture.hotspots.map((h) => h.location),
    ...fixture.valuesAtRisk.map((v) => v.location),
    ...drones.flatMap((drone) => [drone.position, drone.home, ...drone.path]),
  ]
  for (const feature of fixture.spread.features) {
    for (const polygon of feature.coordinates) for (const ring of polygon) for (const p of ring) pts.push(p as Vec2)
  }
  // Keep the OSM scene as the baseline, but expand framing when a safety route
  // moves an aircraft beyond it. Previously those aircraft silently disappeared.
  if (fixture.osmLayer) {
    const [minLon, minLat, maxLon, maxLat] = fixture.osmLayer.bbox
    pts.push([minLon, minLat], [minLon, maxLat], [maxLon, minLat], [maxLon, maxLat])
  }
  let minLon = Math.min(...pts.map((p) => p[0]))
  let maxLon = Math.max(...pts.map((p) => p[0]))
  let minLat = Math.min(...pts.map((p) => p[1]))
  let maxLat = Math.max(...pts.map((p) => p[1]))
  const lonPad = Math.max(0.025, (maxLon - minLon) * 0.12)
  const latPad = Math.max(0.025, (maxLat - minLat) * 0.12)
  minLon -= lonPad
  maxLon += lonPad
  minLat -= latPad
  maxLat += latPad
  return { minLon, maxLon, minLat, maxLat }
}

function project([lon, lat]: Vec2, b: Bounds): { x: number; y: number } {
  return {
    x: ((lon - b.minLon) / (b.maxLon - b.minLon)) * WORLD_W,
    y: WORLD_H - ((lat - b.minLat) / (b.maxLat - b.minLat)) * WORLD_H,
  }
}

function unproject(x: number, y: number, b: Bounds): Vec2 {
  return [b.minLon + (x / WORLD_W) * (b.maxLon - b.minLon), b.minLat + ((WORLD_H - y) / WORLD_H) * (b.maxLat - b.minLat)]
}

function pointInRing(point: Vec2, ring: number[][]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pointInMultiPolygon(point: Vec2, coords: number[][][][]): boolean {
  return coords.some((polygon) => polygon[0] && pointInRing(point, polygon[0]))
}

function hash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x + salt * 29, 374761393) ^ Math.imul(y + salt * 17, 668265263)
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

// ── Procedural terrain fallback (no OSM data) ────────────────────────────────

function drawTerrain(layer: Container) {
  const tile = new Graphics()
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE
      const y = row * TILE
      const n = hash(col, row)
      const base = n > 0.83 ? 0x789844 : n > 0.55 ? 0x87a94b : 0x91b454
      tile.rect(x, y, TILE, TILE).fill(base)
      if (n > 0.18) {
        tile.rect(x + 3, y + 5, 2, 4).fill(0x668739)
        tile.rect(x + 6, y + 3, 2, 5).fill(0x719440)
      }
      if (n > 0.65) tile.rect(x + 11, y + 10, 2, 3).fill(0xa5c762)
      const roadRow = Math.round(4 + col * 0.29)
      if (Math.abs(row - roadRow) <= 1) {
        tile.rect(x, y, TILE, TILE).fill(row === roadRow ? 0xc5a05d : 0xb38d50)
        if (row === roadRow && col % 2 === 0) tile.rect(x + 3, y + 7, 7, 2).fill(0xd9b96e)
      } else if (n > 0.91 && row > 1 && row < ROWS - 2) {
        tile.rect(x + 4, y + 3, 8, 8).fill(0x356d3b)
        tile.rect(x + 2, y + 6, 12, 5).fill(0x3f7f42)
        tile.rect(x + 7, y + 11, 3, 5).fill(0x70482d)
        tile.rect(x + 5, y + 4, 3, 3).fill(0x58984a)
      }
    }
  }
  layer.addChild(tile)
}

// ── Pokemon FireRed region-map terrain from OSM data ─────────────────────────

/** DDA pixel-line using 1×1 rect stamps. */
function drawPixelLine(g: Graphics, x0: number, y0: number, x1: number, y1: number, w: number, color: number) {
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const steps = Math.max(dx, dy, 1)
  const xStep = (x1 - x0) / steps
  const yStep = (y1 - y0) / steps
  const half = Math.floor(w / 2)
  for (let i = 0; i <= steps; i++) {
    g.rect(Math.round(x0 + xStep * i) - half, Math.round(y0 + yStep * i) - half, w, w).fill(color)
  }
}

// Tile classification values
const TC_OPEN = 0
const TC_FARMLAND = 1
const TC_FOREST = 2
const TC_WATER = 3
const TC_URBAN = 4

/** Classify each 16px tile based on OSM area polygons. Returns Uint8Array[ROWS*COLS]. */
function classifyTiles(osm: OsmLayer, bounds: Bounds): Uint8Array {
  const grid = new Uint8Array(ROWS * COLS) // default 0 = open land

  // Priority order: farmland/meadow < urban < forest < water
  // Process lowest-priority first so higher-priority overwrites.
  const kindPriority: Record<string, number> = {
    farmland: 1,
    meadow: 1,
    residential: 2,
    urban: 2,
    forest: 3,
    water: 4,
  }
  const sorted = [...osm.areas].sort(
    (a, b) => (kindPriority[a.kind] ?? 0) - (kindPriority[b.kind] ?? 0),
  )

  for (const area of sorted) {
    const outerRing = area.rings[0]
    if (!outerRing || outerRing.length < 3) continue

    // Compute ring's pixel bbox for fast skip
    let minPx = WORLD_W, maxPx = 0, minPy = WORLD_H, maxPy = 0
    for (const [lon, lat] of outerRing) {
      const { x, y } = project([lon, lat], bounds)
      if (x < minPx) minPx = x
      if (x > maxPx) maxPx = x
      if (y < minPy) minPy = y
      if (y > maxPy) maxPy = y
    }
    const colMin = Math.max(0, Math.floor(minPx / TILE))
    const colMax = Math.min(COLS - 1, Math.floor(maxPx / TILE))
    const rowMin = Math.max(0, Math.floor(minPy / TILE))
    const rowMax = Math.min(ROWS - 1, Math.floor(maxPy / TILE))

    const tileValue =
      area.kind === 'water' ? TC_WATER :
      area.kind === 'forest' ? TC_FOREST :
      area.kind === 'farmland' || area.kind === 'meadow' ? TC_FARMLAND :
      area.kind === 'urban' || area.kind === 'residential' ? TC_URBAN :
      TC_OPEN

    for (let row = rowMin; row <= rowMax; row++) {
      for (let col = colMin; col <= colMax; col++) {
        const geo = unproject(col * TILE + TILE / 2, row * TILE + TILE / 2, bounds)
        if (pointInRing(geo, outerRing)) {
          grid[row * COLS + col] = tileValue
        }
      }
    }
  }

  return grid
}

/** Draw full OSM-based terrain: tiles + roads + waterways. */
function drawTerrainOsm(layer: Container, osm: OsmLayer, bounds: Bounds, grid: Uint8Array) {
  const g = new Graphics()

  // ── Tile base pass ──────────────────────────────────────────────────────────
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE
      const y = row * TILE
      const tc = grid[row * COLS + col]
      const n = hash(col, row)
      const n2 = hash(col, row, 3)

      if (tc === TC_OPEN) {
        // Warm amber/tan open land
        const base = n > 0.7 ? 0xd4a858 : n > 0.4 ? 0xc89848 : 0xbc8c40
        g.rect(x, y, TILE, TILE).fill(base)
        // Sparse scrub marks
        if (n > 0.55) {
          g.rect(x + 3, y + 5, 2, 4).fill(0xa07030)
          g.rect(x + 9, y + 3, 2, 5).fill(0x987028)
        }
        // Occasional rock
        if (n > 0.88) {
          g.rect(x + 6, y + 8, 4, 3).fill(0x988060)
          g.rect(x + 7, y + 7, 3, 2).fill(0xb09878)
        }
      } else if (tc === TC_FARMLAND) {
        // Yellow-green farmland
        const base = n > 0.5 ? 0xa8c840 : 0x98b830
        g.rect(x, y, TILE, TILE).fill(base)
        // Field-line grid marks
        if (col % 3 === 0) g.rect(x, y, 1, TILE).fill(0x88a020)
        if (row % 3 === 0) g.rect(x, y, TILE, 1).fill(0x88a020)
      } else if (tc === TC_FOREST) {
        // Dark forest base
        g.rect(x, y, TILE, TILE).fill(0x1c4c28)
        // Canopy blobs
        g.rect(x + 1, y + 1, 10, 9).fill(0x286038)
        g.rect(x + 3, y, 8, 12).fill(n > 0.5 ? 0x307040 : 0x388848)
        // Highlight
        g.rect(x + 4, y + 1, 4, 3).fill(0x388848)
        // Trunk hint
        if (n2 > 0.6) g.rect(x + 7, y + 12, 2, 4).fill(0x4c3418)
      } else if (tc === TC_WATER) {
        // Deep blue water
        const base = n > 0.5 ? 0x4878e0 : 0x2858c8
        g.rect(x, y, TILE, TILE).fill(base)
        // Shimmer
        if (n > 0.7) g.rect(x + 2, y + 3, 5, 2).fill(0x80b0ff)
        if (n2 > 0.75) g.rect(x + 8, y + 9, 4, 2).fill(0x6090f0)
      } else if (tc === TC_URBAN) {
        // Cream urban
        g.rect(x, y, TILE, TILE).fill(0xe8d098)
        // Building texture
        if (n > 0.55) g.rect(x + 2, y + 2, 5, 5).fill(0xc8b070)
        if (n > 0.35) g.rect(x + 9, y + 7, 5, 5).fill(0xb89860)
        if (n2 > 0.5) g.rect(x + 4, y + 9, 4, 4).fill(0xd0b868)
      }
    }
  }

  // ── Roads ───────────────────────────────────────────────────────────────────
  const roadG = new Graphics()
  for (const road of osm.roads) {
    const nodes = road.nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      const { x: x0, y: y0 } = project(nodes[i] as Vec2, bounds)
      const { x: x1, y: y1 } = project(nodes[i + 1] as Vec2, bounds)
      if (road.kind === 'motorway' || road.kind === 'trunk') {
        drawPixelLine(roadG, x0, y0, x1, y1, 4, 0xd09830)
        drawPixelLine(roadG, x0, y0, x1, y1, 2, 0xf0c040)
      } else if (road.kind === 'primary') {
        drawPixelLine(roadG, x0, y0, x1, y1, 3, 0xc08828)
        drawPixelLine(roadG, x0, y0, x1, y1, 1, 0xe0b030)
      } else {
        // secondary
        drawPixelLine(roadG, x0, y0, x1, y1, 2, 0xb07820)
        drawPixelLine(roadG, x0, y0, x1, y1, 1, 0xd0a028)
      }
    }
  }

  // ── Waterways ───────────────────────────────────────────────────────────────
  for (const ww of osm.waterways) {
    const nodes = ww.nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      const { x: x0, y: y0 } = project(nodes[i] as Vec2, bounds)
      const { x: x1, y: y1 } = project(nodes[i + 1] as Vec2, bounds)
      drawPixelLine(roadG, x0, y0, x1, y1, 2, 0x2858c8)
      drawPixelLine(roadG, x0, y0, x1, y1, 1, 0x4878e0)
    }
  }

  layer.addChild(g, roadG)
}

// ── Settlement icons ──────────────────────────────────────────────────────────

function drawSettlement(layer: Container, settlement: OsmSettlement, bounds: Bounds) {
  const { x: cx, y: cy } = project(settlement.location, bounds)
  if (cx < 4 || cx > WORLD_W - 4 || cy < 4 || cy > WORLD_H - 4) return

  const icon = new Graphics()
  const px = Math.round(cx)
  const py = Math.round(cy)

  if (settlement.kind === 'city') {
    // 16×12 main building + 6×10 wing
    icon.rect(px - 8, py - 12, 16, 12).fill(0xf0e0c8)
    icon.rect(px + 8, py - 10, 6, 10).fill(0xf0e0c8)
    icon.rect(px - 8, py - 14, 16, 4).fill(0x905830) // roof
    icon.rect(px + 8, py - 12, 6, 3).fill(0x905830)
    icon.rect(px - 3, py - 8, 4, 5).fill(0x7090b8) // window
    icon.rect(px + 4, py - 8, 3, 4).fill(0x7090b8)
    icon.rect(px - 1, py - 4, 3, 4).fill(0x503018) // door
  } else if (settlement.kind === 'town') {
    // 14×12
    icon.rect(px - 7, py - 12, 14, 12).fill(0xf0e0c8)
    icon.rect(px - 7, py - 14, 14, 4).fill(0xa06038)
    icon.rect(px - 3, py - 8, 3, 4).fill(0x7090b8)
    icon.rect(px + 2, py - 8, 3, 4).fill(0x7090b8)
    icon.rect(px - 1, py - 4, 3, 4).fill(0x503018)
  } else if (settlement.kind === 'village') {
    // 10×9
    icon.rect(px - 5, py - 9, 10, 9).fill(0xf0e0c8)
    icon.rect(px - 5, py - 11, 10, 3).fill(0xa07040)
    icon.rect(px - 2, py - 6, 2, 3).fill(0x7090b8)
    icon.rect(px + 2, py - 6, 2, 3).fill(0x7090b8)
    icon.rect(px - 1, py - 3, 3, 3).fill(0x503018)
  } else {
    // hamlet — 8×7
    icon.rect(px - 4, py - 7, 8, 7).fill(0xf0e0c8)
    icon.rect(px - 4, py - 9, 8, 3).fill(0xb08050)
    icon.rect(px - 2, py - 5, 2, 3).fill(0x7090b8)
    icon.rect(px + 1, py - 5, 2, 3).fill(0x7090b8)
  }

  layer.addChild(icon)

  const fontSize = settlement.kind === 'city' ? 8 : settlement.kind === 'town' ? 7 : 6
  const fill = settlement.kind === 'city' || settlement.kind === 'town' ? 0x18202f : 0x28302f
  let name = settlement.name
  if (name.length > 16) name = name.slice(0, 16)
  const label = new Text({
    text: name,
    style: new TextStyle({
      fontFamily: 'monospace',
      fontSize,
      fontWeight: 'bold',
      fill,
      stroke: { color: 0xf0e0c8, width: 2 },
    }),
  })
  label.x = Math.round(px - label.width / 2)
  label.y = py + 2
  layer.addChild(label)
}

// ── POI icons ─────────────────────────────────────────────────────────────────

function drawOsmPoi(layer: Container, poi: OsmPoi, bounds: Bounds) {
  const { x: cx, y: cy } = project(poi.location, bounds)
  if (cx < 4 || cx > WORLD_W - 4 || cy < 4 || cy > WORLD_H - 4) return

  const icon = new Graphics()
  const px = Math.round(cx)
  const py = Math.round(cy)

  if (poi.kind === 'hospital') {
    icon.rect(px - 5, py - 8, 10, 8).fill(0xf8f8f8) // white box
    icon.rect(px - 5, py - 10, 10, 3).fill(0x909090) // gray roof
    icon.rect(px - 1, py - 6, 3, 6).fill(0xd02020) // red cross vertical
    icon.rect(px - 4, py - 4, 9, 3).fill(0xd02020) // red cross horizontal
  } else if (poi.kind === 'school') {
    icon.rect(px - 5, py - 8, 10, 8).fill(0xf0d870) // yellow box
    icon.rect(px - 5, py - 10, 10, 3).fill(0x907030) // warm roof
    icon.rect(px - 2, py - 5, 2, 3).fill(0x705020)
    icon.rect(px + 1, py - 5, 2, 3).fill(0x705020)
  } else if (poi.kind === 'fire_station') {
    icon.rect(px - 5, py - 8, 10, 8).fill(0xe03020) // red box
    icon.rect(px - 5, py - 10, 10, 3).fill(0x601010) // dark roof
    icon.rect(px - 4, py - 5, 8, 4).fill(0xd09030) // bay door
  } else {
    // hotel
    icon.rect(px - 5, py - 8, 10, 8).fill(0x8090b0) // blue-gray
    icon.rect(px - 5, py - 10, 10, 3).fill(0x506080) // roof
    icon.rect(px - 3, py - 6, 2, 2).fill(0xf8d040) // windows
    icon.rect(px + 2, py - 6, 2, 2).fill(0xf8d040)
    icon.rect(px - 3, py - 3, 2, 2).fill(0xf8d040)
    icon.rect(px + 2, py - 3, 2, 2).fill(0xf8d040)
  }

  layer.addChild(icon)
}

// ── Fire + overlay draw functions ─────────────────────────────────────────────

function drawFire(layer: Container, fixture: FireFixture, hour: number, bounds: Bounds) {
  const integerHour = Math.max(1, Math.ceil(hour))
  const memberZero = fixture.spread.features
    .filter((f) => f.member === 0 && f.hour <= integerHour)
    .sort((a, b) => b.hour - a.hour)[0]

  const observedTiles = new Set<string>()
  if (!memberZero) {
    const start = new Date(fixture.cluster.firstObserved).getTime()
    const end = new Date(fixture.cluster.lastObserved).getTime()
    const cutoff = start + (hour / fixture.spread.durationHours) * (end - start)
    for (const hotspot of fixture.hotspots) {
      if (new Date(hotspot.observedAt).getTime() > cutoff) continue
      const p = project(hotspot.location, bounds)
      observedTiles.add(`${Math.floor(p.x / TILE)},${Math.floor(p.y / TILE)}`)
    }
  }

  const tile = new Graphics()
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const geo = unproject(col * TILE + TILE / 2, row * TILE + TILE / 2, bounds)
      const burning = memberZero ? pointInMultiPolygon(geo, memberZero.coordinates) : observedTiles.has(`${col},${row}`)
      if (!burning) continue
      const x = col * TILE
      const y = row * TILE
      const n = hash(col, row, integerHour)
      tile.rect(x, y, TILE, TILE).fill(n > 0.55 ? 0xc83e18 : 0xdc551d)
      tile.rect(x + 2, y + 10, 12, 4).fill(0x9f2b14)
      tile.rect(x + 5, y + 4, 6, 8).fill(0xf09624)
      tile.rect(x + (n > 0.5 ? 7 : 4), y + 2, 4, 6).fill(0xffc13a)
      if (n > 0.76) tile.rect(x + 1, y + 2, 3, 3).fill(0x6f6870)
    }
  }
  layer.addChild(tile)
}

function drawHotspots(layer: Container, fixture: FireFixture, hour: number, bounds: Bounds) {
  const start = new Date(fixture.cluster.firstObserved).getTime()
  const end = new Date(fixture.cluster.lastObserved).getTime()
  const cutoff = start + (hour / fixture.spread.durationHours) * (end - start)
  const marker = new Graphics()
  const visible = fixture.hotspots.filter((h) => new Date(h.observedAt).getTime() <= cutoff)
  const stride = Math.max(1, Math.ceil(visible.length / 180))
  for (let index = 0; index < visible.length; index += stride) {
    const hotspot = visible[index]
    const { x, y } = project(hotspot.location, bounds)
    const color = hotspot.confidenceTier === 'HIGH' ? 0xffd13d : hotspot.confidenceTier === 'MEDIUM' ? 0xf27d24 : 0xd7a252
    marker.rect(Math.round(x) - 2, Math.round(y) - 2, 5, 5).fill(0x3b1b13)
    marker.rect(Math.round(x) - 1, Math.round(y) - 3, 3, 5).fill(color)
  }
  layer.addChild(marker)
}

function drawTargets(layer: Container, fixture: FireFixture, bounds: Bounds) {
  const marker = new Graphics()
  layer.addChild(marker)
  for (const [index, target] of fixture.valuesAtRisk.entries()) {
    const { x, y } = project(target.location, bounds)
    marker.rect(Math.round(x) - 7, Math.round(y) - 7, 14, 14).fill(0x172238)
    marker.rect(Math.round(x) - 5, Math.round(y) - 5, 10, 10).fill(0xe8e3d0)
    marker.rect(Math.round(x) - 1, Math.round(y) - 5, 3, 10).fill(0x4f7fbf)
    marker.rect(Math.round(x) - 5, Math.round(y) - 1, 10, 3).fill(0x4f7fbf)
    const label = new Text({
      text: target.name.toUpperCase().replace(' PRIMARY SCHOOL', ' SCHOOL').replace(' CARE RESIDENCE', ' CARE').slice(0, 18),
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x18202f, width: 3 } }),
    })
    label.x = Math.round(x) + 9
    label.y = Math.round(y) - 5 + index * 10
    layer.addChild(label)
  }
}

function drawSafetyAndRoutes(layer: Container, fixture: FireFixture, drones: DroneState[], hour: number, bounds: Bounds) {
  const start = new Date(fixture.cluster.firstObserved).getTime()
  const end = new Date(fixture.cluster.lastObserved).getTime()
  const cutoff = start + Math.max(0, Math.min(1, hour / (fixture.spread.durationHours || 12))) * (end - start)
  const visible = fixture.hotspots.filter((hotspot) => new Date(hotspot.observedAt).getTime() <= cutoff)
  const g = new Graphics()

  if (visible.length) {
    const center: Vec2 = [
      visible.reduce((sum, hotspot) => sum + hotspot.location[0], 0) / visible.length,
      visible.reduce((sum, hotspot) => sum + hotspot.location[1], 0) / visible.length,
    ]
    const cp = project(center, bounds)
    let radius = 16
    for (const hotspot of visible) {
      const hp = project(hotspot.location, bounds)
      radius = Math.max(radius, Math.hypot(hp.x - cp.x, hp.y - cp.y) + 10)
    }
    g.circle(cp.x, cp.y, radius).fill({ color: 0xe0503a, alpha: 0.08 }).stroke({ color: 0xffd13d, width: 2, alpha: 0.8 })
  }

  for (const drone of drones) {
    const remaining = [drone.position, ...drone.path.slice(drone.pathIndex + 1)]
    if (remaining.length < 2) continue
    const color = drone.id === 'EMBER' ? 0xf0982e : drone.id === 'KITE' ? 0x63b7dc : 0xc58be0
    const first = project(remaining[0], bounds)
    g.moveTo(first.x, first.y)
    for (const waypoint of remaining.slice(1)) {
      const p = project(waypoint, bounds)
      g.lineTo(p.x, p.y)
    }
    g.stroke({ color, width: 2, alpha: 0.85 })
    for (const waypoint of remaining.slice(1)) {
      const p = project(waypoint, bounds)
      g.circle(p.x, p.y, 3).fill(0x10131f).stroke({ color, width: 1 })
    }
  }
  layer.addChild(g)
}

function drawDrone(layer: Container, drone: DroneState, bounds: Bounds, phase: number) {
  const p = project(drone.position, bounds)
  const x = Math.round(p.x)
  const y = Math.round(p.y) + (phase % 2)
  const color = drone.id === 'EMBER' ? 0xf0982e : drone.id === 'KITE' ? 0x63b7dc : 0xc58be0
  const shadow = new Graphics().ellipse(x - 7, y + 7, 14, 4).fill({ color: 0x17201d, alpha: 0.5 })
  const sprite = new Graphics()
  sprite.rect(x - 3, y - 4, 7, 9).fill(0x283044)
  sprite.rect(x - 8, y - 2, 5, 3).fill(color)
  sprite.rect(x + 4, y - 2, 5, 3).fill(color)
  sprite.rect(x - 9, y - 4 - (phase % 2), 4, 1).fill(0xe8e3d0)
  sprite.rect(x + 6, y - 4 - (phase % 2), 4, 1).fill(0xe8e3d0)
  sprite.rect(x - 1, y - 2, 3, 3).fill(0xf4d35e)
  layer.addChild(shadow, sprite)
  const label = new Text({
    text: drone.id,
    style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fontWeight: 'bold', fill: color, stroke: { color: 0x10131f, width: 3 } }),
  })
  label.x = x - Math.round(label.width / 2)
  label.y = y + 9
  layer.addChild(label)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  fixture: FireFixture
  hour: number
  drones: DroneState[]
}

export function PixiMap({ fixture, hour, drones }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const fixtureRef = useRef(fixture)
  const hourRef = useRef(hour)
  const dronesRef = useRef(drones)
  const renderRef = useRef<(() => void) | null>(null)
  const tileGridRef = useRef<{ fixtureId: string; grid: Uint8Array } | null>(null)

  fixtureRef.current = fixture
  hourRef.current = hour
  dronesRef.current = drones

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return
    const app = new Application()

    void app.init({
      width: WORLD_W,
      height: WORLD_H,
      preference: ['canvas'],
      antialias: false,
      resolution: 1,
      autoDensity: false,
      background: '#789844',
    }).then(() => {
      if (cancelled || !hostRef.current) {
        app.destroy(true)
        return
      }
      app.canvas.style.width = '100%'
      app.canvas.style.height = '100%'
      // The dashboard viewport is wider than the fixed simulation canvas.
      // `cover` cropped north/south staging points and made drones disappear.
      app.canvas.style.objectFit = 'fill'
      app.canvas.style.imageRendering = 'pixelated'
      app.canvas.setAttribute('aria-label', 'Historical wildfire replay map')
      hostRef.current.replaceChildren(app.canvas)
      appRef.current = app

      const render = () => {
        const current = appRef.current
        if (!current) return
        current.stage.removeChildren().forEach((c) => c.destroy({ children: true }))
        const terrain = new Container()
        const fire = new Container()
        const markers = new Container()
        const actors = new Container()
        const activeFixture = fixtureRef.current
        const bounds = boundsFor(activeFixture, dronesRef.current)

        const osmLayer = activeFixture.osmLayer
        if (osmLayer) {
          // Cache tile classification per fixture (expensive polygon-in-poly test)
          if (tileGridRef.current?.fixtureId !== activeFixture.cluster.id) {
            tileGridRef.current = {
              fixtureId: activeFixture.cluster.id,
              grid: classifyTiles(osmLayer, bounds),
            }
          }
          drawTerrainOsm(terrain, osmLayer, bounds, tileGridRef.current.grid)
        } else {
          drawTerrain(terrain)
        }

        drawFire(fire, activeFixture, hourRef.current, bounds)
        drawHotspots(markers, activeFixture, hourRef.current, bounds)
        drawTargets(markers, activeFixture, bounds)

        if (osmLayer) {
          // Only label cities + a handful of the largest towns — too many labels are unreadable
          const cities = osmLayer.settlements.filter((s) => s.kind === 'city')
          const towns = osmLayer.settlements.filter((s) => s.kind === 'town').slice(0, 6)
          const villages = osmLayer.settlements.filter((s) => s.kind === 'village').slice(0, 4)
          for (const s of [...cities, ...towns, ...villages]) drawSettlement(markers, s, bounds)
          // POIs: hospitals only (most relevant to wildfire response)
          for (const p of osmLayer.pois.filter((p) => p.kind === 'hospital').slice(0, 4)) drawOsmPoi(markers, p, bounds)
        }

        drawSafetyAndRoutes(actors, activeFixture, dronesRef.current, hourRef.current, bounds)
        for (const drone of dronesRef.current) drawDrone(actors, drone, bounds, Math.floor(hourRef.current * 4) % 2)
        current.stage.addChild(terrain, fire, markers, actors)
      }
      renderRef.current = render
      render()
    })

    return () => {
      cancelled = true
      renderRef.current = null
      if (appRef.current === app) {
        appRef.current = null
        app.destroy(true)
      }
    }
  }, [])

  useEffect(() => {
    renderRef.current?.()
  }, [fixture, hour, drones])

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden bg-gba-grass" ref={hostRef}>
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded border-2 border-[#e8e3d0] bg-[#172238]/90 px-2 py-1 font-mono text-[10px] text-[#e8e3d0] shadow-[2px_2px_0_#0e1019]">
        SAT-FEED // H+{hour.toFixed(1)}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded border-2 border-[#e8e3d0] bg-[#172238]/90 px-2 py-1 font-mono text-[9px] text-[#e8e3d0] shadow-[2px_2px_0_#0e1019]">
        ◯ SAFETY BUFFER&nbsp;&nbsp;■ {fixture.spread.features.length ? 'SPREAD FORECAST' : 'OBSERVED HEAT ONLY'}&nbsp;&nbsp;✚ ASSET
      </div>
    </div>
  )
}
