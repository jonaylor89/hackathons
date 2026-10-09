import type { FireFixture, Cluster, Hotspot, FireSpreadFeature, ValuesAtRiskTarget, Vec2, OsmLayer } from './types'

/**
 * Generates a deterministic demo fixture (synthetic fire near Ávila-type
 * coordinates) so the UI can be developed and demoed without a live bake.
 * The real bake script overwrites these with actual Deepfire data.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function ringAround(center: Vec2, radiusDeg: number, points: number, rnd: () => number, jitter = 0.3): number[][] {
  const ring: number[][] = []
  for (let i = 0; i < points; i++) {
    const ang = (i / points) * Math.PI * 2
    const jr = radiusDeg * (1 + (rnd() - 0.5) * jitter * 2)
    ring.push([center[0] + Math.cos(ang) * jr, center[1] + Math.sin(ang) * jr * 0.7])
  }
  ring.push(ring[0])
  return ring
}

export function generateDemoFire(id: string, name: string, region: string, center: Vec2, seed = 7): FireFixture {
  const rnd = mulberry32(seed)
  const start = new Date('2024-07-21T12:00:00Z')
  const firstObserved = start.toISOString()
  const lastObserved = new Date(start.getTime() + 64 * 3_600_000).toISOString()

  const cluster: Cluster = {
    id,
    name,
    region,
    centroid: center,
    firstObserved,
    lastObserved,
    burnedAreaHa: Math.round(4000 + rnd() * 46000),
  }

  // 60 hotspots spread over the cluster window
  const hotspots: Hotspot[] = []
  const n = 60
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 64 // hours into the event
    const tier = t > 40 ? 'HIGH' : t > 18 ? 'MEDIUM' : 'LOW'
    const frp = tier === 'HIGH' ? 40 + rnd() * 90 : tier === 'MEDIUM' ? 15 + rnd() * 40 : 2 + rnd() * 18
    const spread = (t / 64) * 0.12
    hotspots.push({
      id: `demo-${id}-hs-${i}`,
      clusterId: id,
      observedAt: new Date(start.getTime() + t * 3_600_000).toISOString(),
      source: rnd() > 0.5 ? 'MODIS' : 'VIIRS',
      confidenceTier: tier,
      fireRadiativePower: Math.round(frp * 10) / 10,
      location: [center[0] + (rnd() - 0.5) * spread * 2, center[1] + (rnd() - 0.5) * spread * 1.4],
    })
  }

  // 12 hours of fire spread, 10 ensemble members
  const features: FireSpreadFeature[] = []
  const durationHours = 12
  const members = 10
  for (let m = 0; m < members; m++) {
    const mr = mulberry32(seed * 100 + m)
    for (let h = 1; h <= durationHours; h++) {
      // fire grows roughly linearly with hour, ensemble members diverge
      const baseRadius = 0.01 + (h / durationHours) * 0.16 * (1 + (mr() - 0.5) * 0.35)
      const drift: Vec2 = [(mr() - 0.5) * 0.04 * h, (mr() - 0.5) * 0.03 * h]
      const centerH: Vec2 = [center[0] + drift[0], center[1] + drift[1]]
      features.push({
        hour: h,
        member: m,
        coordinates: [[ringAround(centerH, baseRadius, 16, mr)]],
      })
    }
  }

  // satellite perimeter = largest (member 0, hour 12) roughly
  const perimeters = features.find((f) => f.member === 0 && f.hour === durationHours)?.coordinates ?? []

  const valuesAtRisk: ValuesAtRiskTarget[] = [
    {
      id: `${id}-school`,
      name: 'Vega Primary School',
      kind: 'school',
      location: [center[0] + 0.11, center[1] - 0.05],
      preparationLeadMinutes: 45,
    },
    {
      id: `${id}-care`,
      name: 'Valle Care Residence',
      kind: 'care_facility',
      location: [center[0] - 0.08, center[1] + 0.09],
      preparationLeadMinutes: 90,
    },
  ]

  return {
    cluster,
    hotspots,
    perimeters,
    spread: { clusterId: id, durationHours, ensembleMembers: members, features },
    valuesAtRisk,
  }
}

export const DEMO_FIRES: FireFixture[] = [
  generateDemoFire('demo-burgohondo', 'Ávila / Burgohondo', 'Castilla y León', [-4.85, 40.42], 7),
  generateDemoFire('demo-lamiarla', 'Guadalajara / La Mierla', 'Castilla–La Mancha', [-3.35, 40.95], 101),
  generateDemoFire('demo-ores', 'Orés / Cinco Villas', 'Aragón', [-1.0, 42.28], 202),
  generateDemoFire('demo-gallardos', 'Los Gallardos', 'Andalucía', [-1.95, 37.15], 303),
  generateDemoFire('demo-tuejar', 'Tuéjar', 'Valencia', [-1.04, 39.76], 404),
]

/**
 * Load fixtures. Tries the backend `/sim/fires` first (Phase 3+), then
 * static JSON in `public/fixtures/`, then falls back to demo data.
 */
export async function loadFixtures(): Promise<Record<string, FireFixture>> {
  try {
    const res = await fetch('/sim/fires')
    if (res.ok) {
      const json = (await res.json()) as { fires: FireFixture[] }
      if (json.fires?.length) {
        // Also load OSM layers — fetch index to get slug mapping
        let slugMap: Record<string, string> = {}
        try {
          const idx = await fetch('/fixtures/index.json')
          if (idx.ok) {
            const entries = (await idx.json()) as { id: string; slug: string }[]
            slugMap = Object.fromEntries(entries.map((e) => [e.id, e.slug]))
          }
        } catch { /* no index */ }
        for (const f of json.fires) {
          const slug = slugMap[f.cluster.id]
          if (slug) {
            try {
              const osmRes = await fetch(`/fixtures/${slug}.osm.json`)
              if (osmRes.ok) f.osmLayer = (await osmRes.json()) as OsmLayer
            } catch { /* osm layer not available */ }
          }
        }
        return Object.fromEntries(json.fires.map((f) => [f.cluster.id, f]))
      }
    }
  } catch {
    // backend not running — fall through to static/demo fixtures
  }

  try {
    const res = await fetch('/fixtures/index.json')
    if (res.ok) {
      const ids = (await res.json()) as { id: string; slug?: string; file?: string }[]
      const out: Record<string, FireFixture> = {}
      for (const { id, slug, file } of ids) {
        const fr = await fetch(`/fixtures/${file ?? `${slug ?? id}.json`}`)
        if (fr.ok) {
          const f = (await fr.json()) as FireFixture
          if (slug) {
            try {
              const osmRes = await fetch(`/fixtures/${slug}.osm.json`)
              if (osmRes.ok) f.osmLayer = (await osmRes.json()) as OsmLayer
            } catch { /* osm layer not available */ }
          }
          out[f.cluster.id] = f
        }
      }
      if (Object.keys(out).length) return out
    }
  } catch {
    // fall through to demo
  }

  return Object.fromEntries(DEMO_FIRES.map((f) => [f.cluster.id, f]))
}
