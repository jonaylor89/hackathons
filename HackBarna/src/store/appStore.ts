import { create } from 'zustand'
import type {
  ActionEvent,
  DevinSessionState,
  DroneState,
  FireFixture,
  IncidentState,
  LogLine,
  SimState,
  AutonomyPolicyConfig,
  JevSignals,
} from '../data/types'

export const DEFAULT_POLICY: AutonomyPolicyConfig = {
  autoCreateIncidentWhenConfidenceGte: 0.55,
  autoDispatchVerificationDroneWhenConfidenceGte: 0.7,
  autoRerouteDroneWhenPathRiskGte: 0.6,
  autoPrepareWarningWhen: {
    conservativeArrivalMinutesLte: 120,
    preparationLeadMinutesGte: 30,
    confidenceGte: 0.5,
  },
}

interface FocusedIncident {
  id: string
  fixture: FireFixture
  signals: JevSignals | null
}

interface TimelineState {
  /** current simulated hour (0..simDurationHours) */
  hour: number
  /** scrub speed, in sim-hours per real second */
  speed: number
  playing: boolean
  simDurationHours: number
}

interface PanelState {
  terminalOpen: boolean
  devinOpen: boolean
  incidentPickerOpen: boolean
}

interface AppStore {
  // ---- fixtures / scene ----
  fixtures: Record<string, FireFixture>
  fixtureList: string[]
  activeFireId: string | null
  backendAuthority: boolean
  setBackendAuthority: (enabled: boolean) => void

  // ---- timeline ----
  timeline: TimelineState
  setHour: (h: number) => void
  setSpeed: (s: number) => void
  setPlaying: (p: boolean) => void
  setActiveFire: (id: string | null) => void

  // ---- camera ----
  camera: { x: number; y: number; zoom: number }
  setCamera: (c: { x: number; y: number; zoom: number }) => void

  // ---- panels ----
  panels: PanelState
  togglePanel: (k: keyof PanelState) => void

  // ---- sim mirror (frontend-owned during Phase 0–2) ----
  sim: SimState
  setSim: (s: Partial<SimState>) => void
  pushAction: (a: ActionEvent) => void
  pushLog: (l: LogLine) => void
  setDrones: (d: DroneState[]) => void
  setIncidents: (i: IncidentState[]) => void
  setDevinSession: (s: DevinSessionState | null) => void

  // ---- focused incident (for the Devin panel) ----
  focused: FocusedIncident | null
  setFocused: (f: FocusedIncident | null) => void
}

let logCounter = 0
let actionCounter = 0

export function makeLog(actor: LogLine['actor'], text: string, tick = 0, typed = false): LogLine {
  return {
    id: `log-${++logCounter}-${Date.now()}`,
    tick,
    timestamp: new Date().toISOString(),
    actor,
    text,
    typed,
  }
}

export function makeAction(
  actor: ActionEvent['actor'],
  actionType: ActionEvent['actionType'],
  target: string,
  reason: string,
  status: ActionEvent['status'],
  confidence: number,
  params: Record<string, unknown> = {},
  tick = 0,
): ActionEvent {
  return {
    id: `act-${++actionCounter}-${Date.now()}`,
    simTick: tick,
    timestamp: new Date().toISOString(),
    actor,
    actionType,
    target,
    params,
    reason,
    confidence,
    status,
    simulated: true,
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  fixtures: {},
  fixtureList: [],
  activeFireId: null,
  backendAuthority: false,
  setBackendAuthority: (backendAuthority) => set({ backendAuthority }),

  timeline: {
    hour: 0,
    speed: 1,
    playing: false,
    simDurationHours: 12,
  },
  setHour: (hour) => {
    set((s) => ({ timeline: { ...s.timeline, hour: Math.max(0, Math.min(s.timeline.simDurationHours, hour)) } }))
    if (get().backendAuthority) void fetch('/sim/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hour }) })
  },
  setSpeed: (speed) => {
    set((s) => ({ timeline: { ...s.timeline, speed } }))
    if (get().backendAuthority) void fetch('/sim/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ speed }) })
  },
  setPlaying: (playing) => {
    set((s) => ({ timeline: { ...s.timeline, playing } }))
    if (get().backendAuthority) void fetch('/sim/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playing }) })
  },
  setActiveFire: (activeFireId) =>
    set((s) => ({
      activeFireId,
      timeline: { ...s.timeline, hour: 0, playing: false },
      panels: { ...s.panels, incidentPickerOpen: false },
    })),

  camera: { x: 0, y: 0, zoom: 1 },
  setCamera: (camera) => set({ camera }),

  panels: {
    terminalOpen: true,
    devinOpen: true,
    incidentPickerOpen: false,
  },
  togglePanel: (k) =>
    set((s) => ({ panels: { ...s.panels, [k]: !s.panels[k] } })),

  sim: {
    tick: 0,
    fireId: null,
    incidents: [],
    drones: [],
    actions: [],
    policy: DEFAULT_POLICY,
    log: [makeLog('SYSTEM', 'FASTANDSLOW — autonomy sandbox ready. Load a fire to begin replay.', 0, true)],
    devinSession: null,
  },
  setSim: (patch) => set((s) => ({ sim: { ...s.sim, ...patch } })),
  pushAction: (a) => set((s) => ({ sim: { ...s.sim, actions: [...s.sim.actions, a].slice(-200) } })),
  pushLog: (l) => set((s) => ({ sim: { ...s.sim, log: [...s.sim.log, l].slice(-300) } })),
  setDrones: (drones) => set((s) => ({ sim: { ...s.sim, drones } })),
  setIncidents: (incidents) => set((s) => ({ sim: { ...s.sim, incidents } })),
  setDevinSession: (devinSession) => set((s) => ({ sim: { ...s.sim, devinSession } })),

  focused: null,
  setFocused: (focused) => set({ focused }),
}))

// convenient selectors
export const useTimeline = () => useAppStore((s) => s.timeline)
export const usePanels = () => useAppStore((s) => s.panels)
export const useCamera = () => useAppStore((s) => s.camera)
export const useSim = () => useAppStore((s) => s.sim)
export const useFixtures = () => useAppStore((s) => s.fixtures)
export const useActiveFireId = () => useAppStore((s) => s.activeFireId)
export const useFocused = () => useAppStore((s) => s.focused)
