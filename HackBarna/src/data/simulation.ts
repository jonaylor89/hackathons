import type { FireFixture, JevSignals, ValuesAtRiskTarget, Vec2 } from './types'

// ---- Geodesic helpers (small distances, Haversine) ------------------------

const R_KM = 6371

export function haversineKm(a: Vec2, b: Vec2): number {
  const [lon1, lat1] = a
  const [lon2, lat2] = b
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const la1 = (lat1 * Math.PI) / 180
  const la2 = (lat2 * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R_KM * Math.asin(Math.sqrt(h))
}

/** Average over a GeoJSON polygon's outer ring vertex list */
function ringCentroid(ring: number[][]): Vec2 {
  let lon = 0
  let lat = 0
  for (const [lng, ltd] of ring) {
    lon += lng
    lat += ltd
  }
  const n = ring.length || 1
  return [lon / n, lat / n]
}

/** Centroid of a MultiPolygon's first polygon's first ring (fallback). */
function polygonCentroid(coords: number[][][][]): Vec2 {
  const poly = coords[0]
  if (!poly || !poly[0] || poly[0].length === 0) return coords.flat(3).length ? ringCentroid(coords.flat(2) as number[][]) : [0, 0]
  return ringCentroid(poly[0])
}

/** Bounding radius (km) of a polygon — max distance from centroid to any vertex. */
function polygonRadiusKm(coords: number[][][][]): number {
  const c = polygonCentroid(coords)
  let max = 0
  for (const poly of coords) {
    for (const ring of poly) {
      for (const v of ring) {
        const d = haversineKm(c, v as Vec2)
        if (d > max) max = d
      }
    }
  }
  return max
}

// ---- JEV'S COMPUTED SIGNALS (ground truth, no LLM) ------------------------

export type ConfidenceWeights = { hotspot: number; highRatio: number; frp: number; persistence: number }

export const DEFAULT_WEIGHTS: ConfidenceWeights = {
  hotspot: 0.3,
  highRatio: 0.3,
  frp: 0.2,
  persistence: 0.2,
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Soft normalization: map value onto 0..1 against a reference scale. */
function softNorm(value: number, ref: number): number {
  if (ref <= 0) return 0
  return clamp01(1 - Math.exp(-value / ref))
}

/**
 * incidentConfidence — weighted combination of:
 *   hotspot count in cluster, proportion of HIGH confidence detections,
 *   average fire_radiative_power, persistence duration.
 * Normalized to 0..1.
 */
export function visibleHotspots(fixture: FireFixture, simHour: number) {
  const start = new Date(fixture.cluster.firstObserved).getTime()
  const end = new Date(fixture.cluster.lastObserved).getTime()
  const duration = fixture.spread.durationHours || 12
  const cutoff = start + clamp01(simHour / duration) * Math.max(0, end - start)
  return fixture.hotspots.filter((hotspot) => new Date(hotspot.observedAt).getTime() <= cutoff)
}

export function computeIncidentConfidence(
  fixture: FireFixture,
  weights: ConfidenceWeights = DEFAULT_WEIGHTS,
  simHour = fixture.spread.durationHours || 12,
): number {
  const hs = visibleHotspots(fixture, simHour)
  const count = hs.length
  const high = hs.filter((h) => h.confidenceTier === 'HIGH').length
  const highRatio = count ? high / count : 0
  const avgFrp = count ? hs.reduce((s, h) => s + h.fireRadiativePower, 0) / count : 0

  const persistenceHours = hs.length < 2 ? 0 : Math.max(
    0,
    (new Date(hs[hs.length - 1].observedAt).getTime() - new Date(hs[0].observedAt).getTime()) / 3_600_000,
  )

  const score =
    weights.hotspot * softNorm(count, 40) +
    weights.highRatio * clamp01(highRatio) +
    weights.frp * softNorm(avgFrp, 60) +
    weights.persistence * softNorm(persistenceHours, 48)

  return clamp01(score)
}

/**
 * pathRisk — proximity of a drone's path to the nearest fire-spread polygon
 * for the current simulated hour. 1 at the polygon edge, decaying to 0 at
 * `decayKm` away.
 */
export function computePathRisk(
  path: Vec2[],
  spreadFeatures: { hour: number; coordinates: number[][][][] }[],
  currentHour: number,
  decayKm = 8,
): number {
  if (path.length === 0) return 0
  // pick the spread feature nearest the current hour (floor)
  const feats = [...spreadFeatures].sort((a, b) => Math.abs(a.hour - currentHour) - Math.abs(b.hour - currentHour))
  const feat = feats.find((f) => f.hour <= currentHour) ?? feats[0]
  if (!feat) return 0
  const c = polygonCentroid(feat.coordinates)
  const r = polygonRadiusKm(feat.coordinates)
  let maxRisk = 0
  for (const p of path) {
    const d = haversineKm(p, c)
    const edge = Math.max(0, d - r) // distance outside the fire edge (0 if inside)
    const risk = edge <= 0 ? 1 : clamp01(1 - edge / decayKm)
    if (risk > maxRisk) maxRisk = risk
  }
  return maxRisk
}

/**
 * conservativeArrivalMinutes — walk the fire-spread result polygons hour by
 * hour until one intersects a buffer around a valuesAtRisk target, then
 * interpolate within the hour.
 *
 * Returns null if the fire never reaches the target within the sim window.
 */
export function computeArrivalMinutes(
  target: ValuesAtRiskTarget,
  spreadFeatures: { hour: number; coordinates: number[][][][] }[],
  bufferKm = 1.0,
): number | null {
  const sorted = [...spreadFeatures].sort((a, b) => a.hour - b.hour)
  if (sorted.length === 0) return null

  let prevHour = 0
  let prevDist = Infinity
  for (const feat of sorted) {
    const c = polygonCentroid(feat.coordinates)
    const r = polygonRadiusKm(feat.coordinates)
    const distKm = haversineKm(target.location, c)
    // distance from target to the fire's edge (negative = fire has passed it)
    const distanceFromEdge = distKm - r
    if (distanceFromEdge <= bufferKm) {
      // interpolate within the hour between previous and current edge distance
      if (!isFinite(prevDist)) return feat.hour * 60
      const prevEdge = prevDist - r
      const curEdge = distanceFromEdge
      const total = curEdge - prevEdge
      if (Math.abs(total) < 1e-9) return feat.hour * 60
      const frac = clamp01((bufferKm - prevEdge) / total)
      const minutes = prevHour * 60 + frac * (feat.hour - prevHour) * 60
      return Math.max(0, minutes)
    }
    prevHour = feat.hour
    prevDist = distKm
  }
  return null
}

/**
 * forecastConfidence / uncertainty — variance in arrival time ACROSS the
 * ensemble members. Tight spread = high confidence.
 */
export function computeForecastConfidence(
  target: ValuesAtRiskTarget,
  spreadFeatures: { hour: number; member: number; coordinates: number[][][][] }[],
  bufferKm = 1.0,
): { confidence: number | null; meanMinutes: number | null; stdDevMinutes: number | null } {
  const byMember = new Map<number, { hour: number; coordinates: number[][][][] }[]>()
  for (const f of spreadFeatures) {
    const arr = byMember.get(f.member) ?? []
    arr.push(f)
    byMember.set(f.member, arr)
  }
  if (byMember.size < 2) return { confidence: null, meanMinutes: null, stdDevMinutes: null }

  const arrivals: number[] = []
  for (const [, feats] of byMember) {
    const a = computeArrivalMinutes(target, feats, bufferKm)
    if (a != null) arrivals.push(a)
  }
  if (arrivals.length < 2) return { confidence: null, meanMinutes: null, stdDevMinutes: null }

  const mean = arrivals.reduce((s, x) => s + x, 0) / arrivals.length
  const variance = arrivals.reduce((s, x) => s + (x - mean) ** 2, 0) / arrivals.length
  const stdDev = Math.sqrt(variance)
  // scale stdDev (hours of spread) into a 0..1 confidence: 0h spread -> 1, >8h -> ~0
  const confidence = clamp01(1 - stdDev / (8 * 60))
  return { confidence, meanMinutes: mean, stdDevMinutes: stdDev }
}

export function computeAllSignals(fixture: FireFixture, dronePath: Vec2[], currentHour: number): JevSignals {
  const incidentConfidence = computeIncidentConfidence(fixture, DEFAULT_WEIGHTS, currentHour)
  const pathRisk = computePathRisk(dronePath, fixture.spread.features, currentHour)
  const primary = fixture.valuesAtRisk[0]
  const arrival = primary ? computeArrivalMinutes(primary, fixture.spread.features) : null
  const fc = primary ? computeForecastConfidence(primary, fixture.spread.features) : { confidence: null }
  return {
    incidentConfidence,
    pathRisk,
    conservativeArrivalMinutes: arrival,
    forecastConfidence: fc.confidence,
  }
}
