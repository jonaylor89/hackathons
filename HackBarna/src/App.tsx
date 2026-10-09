import { useEffect, useMemo, useRef, useState } from 'react'
import { FirePicker } from './components/FirePicker'
import { PixiMap } from './components/PixiMap'
import { Timeline } from './components/Timeline'
import { TerminalLog } from './components/TerminalLog'
import { DevinPanel, JevPanel } from './components/AgentPanels'
import { BriefingModal } from './components/BriefingModal'
import { loadFixtures } from './data/fixtures'
import { DEFAULT_WEIGHTS, computeForecastConfidence, computeIncidentConfidence, computePathRisk, computeArrivalMinutes, visibleHotspots } from './data/simulation'
import type { ActionEvent, DevinStructuredOutput, DroneState, FireFixture, IncidentState } from './data/types'
import { makeAction, makeLog, useAppStore } from './store/appStore'

interface BackendState {
  tick: number
  hour: number
  playing: boolean
  speed: number
  fireId: string | null
  drones: Array<{ id: DroneState['id']; position: [number, number]; home: [number, number]; path: [number, number][]; pathIndex: number; status: DroneState['status'] }>
  incidents: Array<{ id: string; clusterId: string; createdAt: string; signals: { incidentConfidence: number; pathRisk: number; conservativeArrivalMinutes: number | null; forecastConfidence: number | null } }>
  actions: ActionEvent[]
  devinSessions: Array<{ sessionId: string; status: string; triggeredAt: string; structuredOutput: DevinStructuredOutput | null }>
  authority: 'BACKEND'
}

function makeDrones(fixture: FireFixture): DroneState[] {
  const [lon, lat] = fixture.cluster.centroid
  const specs = [
    { id: 'EMBER' as const, offset: [-0.45, -0.42] as const, mission: 'UPWIND PERIMETER SCAN' },
    { id: 'KITE' as const, offset: [0.55, -0.4] as const, mission: 'ASSET CORRIDOR WATCH' },
    { id: 'NOVA' as const, offset: [-0.5, 0.5] as const, mission: 'COMMS RELAY' },
  ]
  return specs.map(({ id, offset, mission }) => {
    const home: [number, number] = [lon + offset[0], lat + offset[1]]
    return { id, name: id, position: home, home, path: [home], pathIndex: 0, status: 'idle', speed: 1, mission, batteryPct: 100 }
  })
}

function buildIncident(fixture: FireFixture, drones: DroneState[], hour: number): IncidentState {
  const observed = visibleHotspots(fixture, hour)
  const confidence = computeIncidentConfidence(fixture, DEFAULT_WEIGHTS, hour)
  const high = observed.filter((h) => h.confidenceTier === 'HIGH').length
  const avgFRP = observed.length
    ? observed.reduce((sum, h) => sum + h.fireRadiativePower, 0) / observed.length
    : 0
  const persistenceHours = observed.length < 2 ? 0 :
    (new Date(observed[observed.length - 1].observedAt).getTime() - new Date(observed[0].observedAt).getTime()) / 3_600_000
  const pathRisk = drones.reduce(
    (max, drone) => Math.max(max, computePathRisk([drone.position, ...drone.path.slice(drone.pathIndex + 1)], fixture.spread.features, hour)),
    0,
  )
  const target = fixture.valuesAtRisk[0]
  const conservativeArrivalMinutes = target ? computeArrivalMinutes(target, fixture.spread.features.filter((f) => f.member === 0)) : null
  const forecast = target ? computeForecastConfidence(target, fixture.spread.features) : null
  return {
    id: `incident-${fixture.cluster.id}`,
    clusterId: fixture.cluster.id,
    createdAt: new Date().toISOString(),
    confidence,
    hotspotCount: observed.length,
    highConfidenceRatio: observed.length ? high / observed.length : 0,
    avgFRP,
    persistenceHours: Math.max(0, persistenceHours),
    pathRisk,
    conservativeArrivalMinutes,
    forecastConfidence: forecast?.confidence ?? null,
    spreadMeanHours: forecast?.meanMinutes == null ? null : forecast.meanMinutes / 60,
    spreadStdDevHours: forecast?.stdDevMinutes == null ? null : forecast.stdDevMinutes / 60,
  }
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [briefingOpen, setBriefingOpen] = useState(false)
  const fixtures = useAppStore((s) => s.fixtures)
  const activeId = useAppStore((s) => s.activeFireId)
  const hour = useAppStore((s) => s.timeline.hour)
  const drones = useAppStore((s) => s.sim.drones)
  const policy = useAppStore((s) => s.sim.policy)
  const setDrones = useAppStore((s) => s.setDrones)
  const setIncidents = useAppStore((s) => s.setIncidents)
  const setFocused = useAppStore((s) => s.setFocused)
  const pushLog = useAppStore((s) => s.pushLog)
  const pushAction = useAppStore((s) => s.pushAction)
  const initializedFire = useRef<string | null>(null)

  const fixture = useMemo(() => (activeId ? fixtures[activeId] : undefined), [activeId, fixtures])

  useEffect(() => {
    let alive = true
    void loadFixtures().then((loaded) => {
      if (!alive) return
      const ids = Object.keys(loaded)
      useAppStore.setState((s) => ({
        fixtures: loaded,
        fixtureList: ids,
        activeFireId: s.activeFireId ?? ids[0] ?? null,
      }))
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!fixture || initializedFire.current === fixture.cluster.id) return
    initializedFire.current = fixture.cluster.id
    const nextDrones = makeDrones(fixture)
    setDrones(nextDrones)
    const incident = buildIncident(fixture, nextDrones, 0)
    setIncidents([incident])
    setFocused({ id: incident.id, fixture, signals: {
      incidentConfidence: incident.confidence,
      pathRisk: incident.pathRisk,
      conservativeArrivalMinutes: incident.conservativeArrivalMinutes,
      forecastConfidence: incident.forecastConfidence,
    } })
    useAppStore.setState((s) => ({ sim: { ...s.sim, fireId: fixture.cluster.id, actions: [] } }))
    pushLog(makeLog('SYSTEM', `Historical replay loaded: ${fixture.cluster.name}. ${fixture.hotspots.length} baked hotspot detections.`, 0, true))

    if (incident.confidence >= policy.autoCreateIncidentWhenConfidenceGte) {
      pushAction(makeAction('JEV', 'auto_create_incident', incident.id, `Confidence ${incident.confidence.toFixed(2)} crossed ${policy.autoCreateIncidentWhenConfidenceGte.toFixed(2)} threshold.`, 'APPROVED', incident.confidence))
      pushLog(makeLog('JEV', `Autonomy policy triggered: simulated incident created at ${(incident.confidence * 100).toFixed(0)}% confidence.`, 0, true))
    }
  }, [fixture, policy, pushAction, pushLog, setDrones, setFocused, setIncidents])

  useEffect(() => {
    if (!fixture || drones.length === 0) return
    const incident = buildIncident(fixture, drones, hour)
    setIncidents([incident])
    setFocused({ id: incident.id, fixture, signals: {
      incidentConfidence: incident.confidence,
      pathRisk: incident.pathRisk,
      conservativeArrivalMinutes: incident.conservativeArrivalMinutes,
      forecastConfidence: incident.forecastConfidence,
    } })
  }, [fixture, drones, hour, setFocused, setIncidents])

  // Phase 3 authority handoff. If axum is available, select the replay there
  // and turn Zustand into a polling mirror. If unavailable, Phase 1–2 local
  // controls continue to work without errors.
  useEffect(() => {
    if (!fixture) return
    let alive = true
    const apply = (server: BackendState) => {
      if (!alive || server.authority !== 'BACKEND' || server.fireId !== fixture.cluster.id) return
      const mirroredDrones: DroneState[] = server.drones.map((d) => ({ ...d, name: d.id, speed: 1, mission: d.status === 'idle' ? 'STANDBY' : 'UPWIND PERIMETER SCAN', batteryPct: Math.max(35, 100 - server.hour * 4) }))
      const baseline = buildIncident(fixture, mirroredDrones, server.hour)
      const remote = server.incidents[0]
      const incident = remote ? {
        ...baseline,
        id: remote.id,
        clusterId: remote.clusterId,
        createdAt: remote.createdAt,
        confidence: remote.signals.incidentConfidence,
        pathRisk: remote.signals.pathRisk,
        conservativeArrivalMinutes: remote.signals.conservativeArrivalMinutes,
        forecastConfidence: remote.signals.forecastConfidence,
      } : baseline
      useAppStore.setState((current) => {
        const dronesUnchanged = current.sim.drones.length === mirroredDrones.length && current.sim.drones.every((drone, index) => {
          const next = mirroredDrones[index]
          return drone.id === next.id && drone.status === next.status && drone.position[0] === next.position[0] && drone.position[1] === next.position[1]
        })
        const remoteSession = server.devinSessions[0]
        const devinSession = remoteSession ? {
          sessionId: remoteSession.sessionId,
          status: (remoteSession.status === 'exit' ? 'completed' : remoteSession.status === 'failed' ? 'error' : remoteSession.status) as 'running' | 'completed' | 'timeout' | 'error',
          triggeredAt: remoteSession.triggeredAt,
          attachmentName: `${fixture.cluster.id}.json`,
          structuredOutput: remoteSession.structuredOutput,
        } : null
        return {
          backendAuthority: true,
          timeline: { ...current.timeline, hour: server.hour, playing: server.playing, speed: server.speed },
          sim: { ...current.sim, tick: server.tick, fireId: server.fireId, drones: dronesUnchanged ? current.sim.drones : mirroredDrones, incidents: [incident], actions: server.actions, devinSession },
        }
      })
    }
    const sync = async () => {
      try {
        const response = await fetch('/sim/state')
        if (response.ok) apply(await response.json() as BackendState)
      } catch { /* standalone frontend remains local-authority */ }
    }
    void fetch(`/sim/select/${fixture.cluster.id}`, { method: 'POST' })
      .then(async (response) => { if (response.ok) apply(await response.json() as BackendState) })
      .catch(() => undefined)
    const timer = window.setInterval(() => void sync(), 1000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [fixture])

  if (loading || !fixture) {
    return (
      <div className="grid h-full place-items-center bg-[#0e1019]">
        <div className="gba-panel gba-panel--accent p-6 text-center">
          <div className="pixel-font text-[12px] text-gba-uiAccent">FASTANDSLOW</div>
          <div className="mt-4 animate-blink text-[11px] text-gba-uiDim">LOADING HISTORICAL REPLAY…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-screen flex-col overflow-auto bg-[#0e1019] lg:overflow-hidden">
      <header className="relative flex shrink-0 items-center justify-between gap-2 border-b-2 border-gba-uiBorder bg-[#171a27] px-2 py-3 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-[2px]" aria-hidden="true">
            {[0,1,2,3,4,5,6,7,8].map((n) => <span key={n} className={`h-2 w-2 ${[1,3,4,5,7].includes(n) ? 'bg-gba-fireHi' : 'bg-gba-fire'}`} />)}
          </div>
          <div>
            <h1 className="pixel-font text-[13px] tracking-wider text-gba-uiText sm:text-[16px]">FAST<span className="text-gba-fireHi">AND</span>SLOW</h1>
            <p className="mt-1 hidden text-[10px] text-gba-uiDim sm:block">Jev reacts. Devin reasons. FastAndSlow acts.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FirePicker fixtures={fixtures} />
          <button className="gba-btn gba-btn--accent whitespace-nowrap" onClick={() => setBriefingOpen(true)}>JOIN BRIEFING</button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-h-[620px] min-w-0 flex-col gap-2 lg:min-h-0">
          <div className="gba-panel relative min-h-[360px] flex-1 overflow-hidden border-gba-uiBorder p-1">
            <PixiMap fixture={fixture} hour={hour} drones={drones} />
            <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[65%] rounded border-2 border-gba-uiBorder bg-[#10131f]/95 px-2 py-1.5">
              <div className="pixel-font text-[8px] text-gba-uiAccent">{fixture.cluster.name}</div>
              <div className="mt-1 text-[9px] text-gba-uiDim">{fixture.cluster.region} · {fixture.cluster.firstObserved.slice(0, 10)}</div>
            </div>
          </div>
          <Timeline />
          <TerminalLog />
        </section>
        <aside className="gba-scroll grid min-h-0 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:flex lg:flex-col">
          <JevPanel />
          <DevinPanel />
          <div className="gba-panel p-3 text-[9px] leading-4 text-gba-uiDim sm:col-span-2">
            <span className="text-gba-uiAccent">AUTONOMY SANDBOX</span> · Historical evidence and simulated actions only. No aircraft, warning, or dispatch systems are connected.
          </div>
        </aside>
      </main>
      <BriefingModal open={briefingOpen} onClose={() => setBriefingOpen(false)} />
    </div>
  )
}
