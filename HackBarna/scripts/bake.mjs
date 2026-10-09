#!/usr/bin/env node
/**
 * One-off Deepfire fixture baker. This script is never shipped to clients.
 *
 * Usage:
 *   npm run bake -- --discover-only   # resolve clusters + inspect data, no simulations
 *   npm run bake                      # full bake, including 12h / 10 member simulations
 *   npm run bake -- --target avila-burgohondo
 *
 * Output: public/fixtures/<slug>.json + public/fixtures/index.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const API = process.env.DEEPFIRE_API_URL || 'https://api.deepfire.co'
const OGC = `${API}/ogc/features/v1`
const OUT = resolve('public/fixtures')
const args = new Set(process.argv.slice(2))
const discoverOnly = args.has('--discover-only')
const targetArgIndex = process.argv.indexOf('--target')
const onlyTarget = targetArgIndex >= 0 ? process.argv[targetArgIndex + 1] : null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function jwtExpiry(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).exp * 1000 } catch { return 0 }
}

async function getToken() {
  if (process.env.DEEPFIRE_TMP_TOKEN && jwtExpiry(process.env.DEEPFIRE_TMP_TOKEN) > Date.now() + 60_000) {
    return process.env.DEEPFIRE_TMP_TOKEN
  }
  const id = process.env.DEEPFIRE_CLIENT_ID
  const secret = process.env.DEEPFIRE_CLIENT_SECRET
  if (!id || !secret) throw new Error('Set DEEPFIRE_CLIENT_ID and DEEPFIRE_CLIENT_SECRET in .env')

  // Deepfire accepts OAuth client credentials at /v1/token. Keep the token in
  // memory for this one-off run; callers may copy it to DEEPFIRE_TMP_TOKEN.
  const attempts = [
    { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: secret }) },
    { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }).toString() },
  ]
  for (const init of attempts) {
    const res = await fetch(`${API}/v1/token`, { method: 'POST', ...init })
    if (res.ok) {
      const json = await res.json()
      const token = json.access_token || json.token
      if (token) return token
    }
  }
  throw new Error('Deepfire token exchange failed')
}

async function apiJson(url, token, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { accept: 'application/json', authorization: `Bearer ${token}`, ...(init.headers || {}) },
  })
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${url} → ${res.status}: ${(await res.text()).slice(0, 500)}`)
  return res.json()
}

async function ogcItems(collection, token, { bbox, datetime, limit = 10000 } = {}) {
  const q = new URLSearchParams({ limit: String(limit), f: 'application/json' })
  if (bbox) q.set('bbox', bbox.join(','))
  if (datetime) q.set('datetime', datetime)
  return (await apiJson(`${OGC}/collections/${encodeURIComponent(collection)}/items?${q}`, token)).features || []
}

function distanceKm(a, b) {
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad
  const dLon = (b[0] - a[0]) * rad
  const la1 = a[1] * rad
  const la2 = b[1] * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

function chooseCluster(target, features) {
  if (target.clusterId) {
    const exact = features.find((f) => f.properties.id === target.clusterId)
    if (!exact) throw new Error(`${target.slug}: configured cluster ${target.clusterId} not found in bbox/time window`)
    return exact
  }
  if (!features.length) throw new Error(`${target.slug}: no clusters in bbox/time window; set clusterId manually`)
  // Prefer persistent clusters near the named fire. Persistence dominates,
  // with a distance penalty to avoid selecting an unrelated regional fire.
  return [...features].sort((a, b) => {
    const score = (f) => {
      const p = f.properties
      const hours = (new Date(p.last_observed) - new Date(p.first_observed)) / 3_600_000
      return hours * 8 - distanceKm(target.center, f.geometry.coordinates)
    }
    return score(b) - score(a)
  })[0]
}

async function getOrCreateSimulation(clusterId, token) {
  const listing = await apiJson(`${API}/v1/fire-spread/simulations`, token)
  let sim = (listing.items || []).find((x) => x.clusterId === clusterId && x.durationHours === 12 && x.ensembleMembers === 10 && x.status === 'COMPLETED')
  if (!sim) {
    sim = await apiJson(`${API}/v1/fire-spread/simulations`, token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clusterId, durationHours: 12, ensembleMembers: 10 }),
    })
  }
  const id = sim.id || sim.simulationId
  if (!id) throw new Error(`simulation response had no id: ${JSON.stringify(sim).slice(0, 500)}`)
  const deadline = Date.now() + 20 * 60_000
  while (Date.now() < deadline) {
    const current = await apiJson(`${API}/v1/fire-spread/simulations/${id}`, token)
    process.stdout.write(`\r  simulation ${id.slice(0, 8)}… ${current.status}     `)
    if (current.status === 'COMPLETED') { process.stdout.write('\n'); return current }
    if (['FAILED', 'ERROR', 'NO_SPREAD', 'CANCELLED'].includes(current.status)) {
      throw new Error(`simulation ${id} ended ${current.status}: ${current.errorMessage || 'unknown error'}`)
    }
    await sleep(5000)
  }
  throw new Error(`simulation ${id} timed out after 20 minutes`)
}

function normalizeFixture(target, clusterFeature, hotspots, perimeters, simulation) {
  const p = clusterFeature.properties
  const clusterId = p.id
  const spreadFeatures = simulation?.result?.features || []
  return {
    provenance: {
      mode: 'historical-deepfire-replay',
      bakedAt: new Date().toISOString(),
      source: 'Deepfire API',
      runtimeDeepfireCalls: false,
      simulationId: simulation?.id || null,
    },
    cluster: {
      id: clusterId,
      name: target.name,
      region: target.region,
      burnedAreaHa: target.reportedBurnedAreaHa,
      firstObserved: p.first_observed,
      lastObserved: p.last_observed,
      centroid: clusterFeature.geometry.coordinates,
    },
    hotspots: hotspots
      .filter((h) => h.properties.cluster_id === clusterId)
      .map((h) => ({
        id: h.properties.id,
        clusterId,
        observedAt: h.properties.observed_at,
        source: h.properties.source,
        confidenceTier: String(h.properties.confidence || 'LOW').toUpperCase(),
        fireRadiativePower: Number(h.properties.fire_radiative_power || 0),
        location: h.geometry.coordinates,
      }))
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt)),
    perimeters: perimeters.filter((x) => x.properties.cluster_id === clusterId).at(-1)?.geometry?.coordinates || [],
    spread: {
      clusterId,
      durationHours: simulation?.durationHours || 12,
      ensembleMembers: simulation?.ensembleMembers || 10,
      features: spreadFeatures.map((f, index) => ({
        hour: Number(f.properties?.hour || f.properties?.elapsed_seconds / 3600 || 0),
        member: Number(f.properties?.ensemble_member ?? f.properties?.ensembleMember ?? Math.floor(index / 12)),
        coordinates: f.geometry.coordinates,
      })),
    },
    valuesAtRisk: target.valuesAtRisk,
  }
}

function validate(fixture, discoverMode) {
  const errors = []
  if (!fixture.hotspots.length) errors.push('no hotspots')
  if (!fixture.cluster.firstObserved || !fixture.cluster.lastObserved) errors.push('missing cluster timespan')
  if (!discoverMode && !fixture.spread.features.length) errors.push('no fire-spread features')
  if (!fixture.valuesAtRisk.length) errors.push('no values-at-risk')
  const byMember = new Map()
  for (const f of fixture.spread.features) {
    const hours = byMember.get(f.member) || []
    hours.push(f.hour)
    byMember.set(f.member, hours)
  }
  if (!discoverMode && byMember.size < fixture.spread.ensembleMembers) errors.push(`only ${byMember.size}/${fixture.spread.ensembleMembers} ensemble members present`)
  if (errors.length) throw new Error(`${fixture.cluster.name} fixture invalid: ${errors.join(', ')}`)
  const first = new Date(fixture.cluster.firstObserved)
  const last = new Date(fixture.cluster.lastObserved)
  return {
    hotspotCount: fixture.hotspots.length,
    timespanHours: ((last - first) / 3_600_000).toFixed(1),
    spreadHours: [...new Set(fixture.spread.features.map((f) => f.hour))].sort((a, b) => a - b).join(',') || '(not baked)',
    ensembleMembers: byMember.size,
  }
}

async function main() {
  const token = await getToken()
  const targets = JSON.parse(await readFile(new URL('./fire-targets.json', import.meta.url), 'utf8'))
    .filter((t) => !onlyTarget || t.slug === onlyTarget)
  if (!targets.length) throw new Error(`Unknown --target ${onlyTarget}`)
  await mkdir(OUT, { recursive: true })
  const index = []

  for (const target of targets) {
    console.log(`\n[${target.slug}] discovering cluster…`)
    const clusters = await ogcItems('deepfire:clusters', token, target)
    const clusterFeature = chooseCluster(target, clusters)
    const id = clusterFeature.properties.id
    console.log(`  cluster ${id} (${clusterFeature.properties.first_observed} → ${clusterFeature.properties.last_observed})`)
    const window = { bbox: target.bbox, datetime: `${clusterFeature.properties.first_observed}/${clusterFeature.properties.last_observed}` }
    const [hotspots, perimeters] = await Promise.all([
      ogcItems('deepfire:hotspots', token, window),
      ogcItems('deepfire:satellite-perimeters', token, window),
    ])
    const simulation = discoverOnly ? null : await getOrCreateSimulation(id, token)
    const fixture = normalizeFixture(target, clusterFeature, hotspots, perimeters, simulation)
    const stats = validate(fixture, discoverOnly)
    console.log(`  verified: ${JSON.stringify(stats)}`)
    await writeFile(resolve(OUT, `${target.slug}.json`), JSON.stringify(fixture, null, 2) + '\n')
    index.push({ id, slug: target.slug, name: target.name, region: target.region, hotspotCount: fixture.hotspots.length, file: `${target.slug}.json` })
  }
  await writeFile(resolve(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n')
  console.log(`\nWrote ${index.length} fixture(s) to ${OUT}`)
}

main().catch((error) => {
  console.error(`\nBake failed: ${error.stack || error}`)
  process.exitCode = 1
})
