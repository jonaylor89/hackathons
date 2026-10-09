#!/usr/bin/env node
/**
 * Fetch OSM terrain and settlement data for each fire target via Overpass API.
 * No credentials required — Overpass is public.
 *
 * Usage:
 *   npm run bake:osm
 *   npm run bake:osm -- --target avila-burgohondo
 *
 * Output: public/fixtures/<slug>.osm.json
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter'
const OUT_DIR = resolve('public/fixtures')

const targetArgIndex = process.argv.indexOf('--target')
const onlyTarget = targetArgIndex >= 0 ? process.argv[targetArgIndex + 1] : null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const HEADERS = {
  'content-type': 'application/x-www-form-urlencoded',
  'accept': '*/*',
  'user-agent': 'FastAndSlow/1.0 wildfire-simulation-bake-script',
}

async function overpassPost(query, attempt = 1) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: HEADERS,
    body: `data=${encodeURIComponent(query)}`,
  })
  if (res.status === 429 || res.status === 504 || res.status === 502 || res.status === 503) {
    if (attempt >= 4) throw new Error(`Overpass HTTP ${res.status} after ${attempt} attempts`)
    const wait = attempt * 20000
    console.log(`  HTTP ${res.status} — retrying in ${wait / 1000}s (attempt ${attempt}/4)…`)
    await sleep(wait)
    return overpassPost(query, attempt + 1)
  }
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`)
  return res.json()
}

// Query 1: geographic ways (roads, water areas, landuse, waterways)
function waysQuery(minLat, minLon, maxLat, maxLon) {
  return `[out:json][timeout:60][maxsize:50000000][bbox:${minLat},${minLon},${maxLat},${maxLon}];
(
  way["highway"~"^(motorway|trunk|primary|secondary)$"];
  way["natural"~"^(water|wood)$"];
  way["waterway"~"^(river|canal)$"];
  way["landuse"~"^(forest|farmland|meadow|grassland|residential|commercial|industrial)$"];
);
out body geom;`
}

// Query 2: named nodes only (settlements + key POIs) — very lightweight
function nodesQuery(minLat, minLon, maxLat, maxLon) {
  return `[out:json][timeout:30][bbox:${minLat},${minLon},${maxLat},${maxLon}];
(
  node["place"~"^(city|town|village|hamlet)$"]["name"];
  node["amenity"~"^(hospital|school|fire_station)$"]["name"];
);
out body;`
}

const HIGHWAY_MAP = { motorway: 'motorway', trunk: 'trunk', primary: 'primary', secondary: 'secondary' }
const LANDUSE_MAP = { forest: 'forest', farmland: 'farmland', meadow: 'meadow', grassland: 'meadow', residential: 'residential', commercial: 'urban', industrial: 'urban' }
const SETTLEMENT_MAP = { city: 'city', town: 'town', village: 'village', hamlet: 'hamlet' }
const POI_MAP = { hospital: 'hospital', school: 'school', fire_station: 'fire_station' }

function simplifyLine(nodes, thresholdDeg = 0.003, maxNodes = 200) {
  if (nodes.length <= 2) return nodes
  const out = [nodes[0]]
  for (let i = 1; i < nodes.length - 1; i++) {
    const [px, py] = out[out.length - 1]
    const [cx, cy] = nodes[i]
    if (Math.hypot(cx - px, cy - py) >= thresholdDeg) out.push(nodes[i])
  }
  out.push(nodes[nodes.length - 1])
  if (out.length <= maxNodes) return out
  const step = (out.length - 1) / (maxNodes - 1)
  return Array.from({ length: maxNodes }, (_, i) => out[Math.round(i * step)])
}

function processWays(data) {
  const roads = [], areas = [], waterways = []
  for (const el of data.elements ?? []) {
    if (el.type !== 'way' || !el.geometry) continue
    const tags = el.tags ?? {}
    const nodes = el.geometry.map(({ lat, lon }) => [lon, lat])
    const isClosed = nodes.length > 2 &&
      nodes[0][0] === nodes[nodes.length - 1][0] &&
      nodes[0][1] === nodes[nodes.length - 1][1]
    if (HIGHWAY_MAP[tags.highway]) {
      roads.push({ kind: HIGHWAY_MAP[tags.highway], nodes: simplifyLine(nodes) })
    } else if ((tags.natural === 'water' || tags.natural === 'wood') && isClosed) {
      areas.push({ kind: tags.natural === 'water' ? 'water' : 'forest', rings: [simplifyLine(nodes, 0.002)] })
    } else if (LANDUSE_MAP[tags.landuse] && isClosed) {
      areas.push({ kind: LANDUSE_MAP[tags.landuse], rings: [simplifyLine(nodes, 0.002)] })
    } else if ((tags.waterway === 'river' || tags.waterway === 'canal') && nodes.length >= 2) {
      waterways.push({ nodes: simplifyLine(nodes) })
    }
  }
  return { roads, areas, waterways }
}

function processNodes(data) {
  const settlements = [], pois = []
  for (const el of data.elements ?? []) {
    if (el.type !== 'node') continue
    const tags = el.tags ?? {}
    if (SETTLEMENT_MAP[tags.place] && tags.name) {
      settlements.push({ kind: SETTLEMENT_MAP[tags.place], name: tags.name, location: [el.lon, el.lat] })
    } else if (POI_MAP[tags.amenity] && tags.name) {
      pois.push({ kind: POI_MAP[tags.amenity], name: tags.name, location: [el.lon, el.lat] })
    }
  }
  const priOrder = { hospital: 0, fire_station: 1, school: 2 }
  pois.sort((a, b) => (priOrder[a.kind] ?? 9) - (priOrder[b.kind] ?? 9))
  return { settlements, pois: pois.slice(0, 30) }
}

async function main() {
  const all = JSON.parse(await readFile(new URL('./fire-targets.json', import.meta.url), 'utf8'))
  const targets = all.filter((t) => !onlyTarget || t.slug === onlyTarget)
  if (!targets.length) throw new Error(`No matching targets${onlyTarget ? ` for --target ${onlyTarget}` : ''}`)

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    console.log(`\n[${target.slug}] fetching OSM data…`)
    try {
      const [minLon, minLat, maxLon, maxLat] = target.bbox

      console.log('  query 1/2: ways (roads, water, landuse)…')
      const waysData = await overpassPost(waysQuery(minLat, minLon, maxLat, maxLon))
      const { roads, areas, waterways } = processWays(waysData)
      await sleep(3000)

      console.log('  query 2/2: settlements & POIs…')
      const nodesData = await overpassPost(nodesQuery(minLat, minLon, maxLat, maxLon))
      const { settlements, pois } = processNodes(nodesData)

      console.log(`  roads:${roads.length} areas:${areas.length} waterways:${waterways.length} settlements:${settlements.length} pois:${pois.length}`)
      const layer = { slug: target.slug, queriedAt: new Date().toISOString(), bbox: target.bbox, roads, areas, waterways, settlements, pois }
      const outPath = resolve(OUT_DIR, `${target.slug}.osm.json`)
      await writeFile(outPath, JSON.stringify(layer, null, 2) + '\n')
      console.log(`  → ${outPath}`)
    } catch (err) {
      console.error(`  FAILED: ${err.message}`)
    }
    if (i < targets.length - 1) { console.log('  sleeping 15s…'); await sleep(15000) }
  }
}

main().catch((err) => { console.error(`\nbake-osm failed: ${err.stack || err}`); process.exitCode = 1 })
