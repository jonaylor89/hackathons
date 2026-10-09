// FastAndSlow — shared data types for baked Deepfire fixtures

export type Vec2 = [number, number] // [lon, lat]

// OSM layer — baked from Overpass API, used for Pokemon-style region map rendering
export type OsmRoadKind = 'motorway' | 'trunk' | 'primary' | 'secondary'
export type OsmAreaKind = 'water' | 'forest' | 'farmland' | 'meadow' | 'residential' | 'urban'
export type OsmSettlementKind = 'city' | 'town' | 'village' | 'hamlet'
export type OsmPoiKind = 'hospital' | 'school' | 'fire_station' | 'hotel'

export interface OsmRoad {
  kind: OsmRoadKind
  nodes: Vec2[]
}

export interface OsmArea {
  kind: OsmAreaKind
  rings: number[][][] // [outer ring, ...holes], each ring is [lon, lat][]
}

export interface OsmWaterway {
  nodes: Vec2[]
}

export interface OsmSettlement {
  kind: OsmSettlementKind
  name: string
  location: Vec2
}

export interface OsmPoi {
  kind: OsmPoiKind
  name: string
  location: Vec2
}

export interface OsmLayer {
  slug: string
  queriedAt: string
  bbox: [number, number, number, number] // [minLon, minLat, maxLon, maxLat]
  roads: OsmRoad[]
  areas: OsmArea[]
  waterways: OsmWaterway[]
  settlements: OsmSettlement[]
  pois: OsmPoi[]
}

/** A single hotspot detection from deepfire:hotspots */
export interface Hotspot {
  id: string
  clusterId: string
  observedAt: string // ISO timestamp
  source: string
  confidenceTier: 'LOW' | 'MEDIUM' | 'HIGH'
  fireRadiativePower: number // MW
  location: Vec2
}

/** A cluster (fire) from deepfire:clusters */
export interface Cluster {
  id: string
  name: string
  firstObserved: string
  lastObserved: string
  /** reported burned area in hectares, for the picker */
  burnedAreaHa?: number
  region: string
  centroid: Vec2
}

/** A single hourly MultiPolygon feature from fire-spread simulation */
export interface FireSpreadFeature {
  hour: number
  /** GeoJSON MultiPolygon coordinates: Polygon[][][] -> [lng,lat][] */
  coordinates: number[][][][]
  /** ensemble member index (0..9) */
  member: number
}

export interface FireSpreadSim {
  clusterId: string
  durationHours: number
  ensembleMembers: number
  features: FireSpreadFeature[]
}

export interface ValuesAtRiskTarget {
  id: string
  name: string
  kind: 'school' | 'care_facility' | 'hospital' | 'residential' | 'infrastructure'
  location: Vec2
  preparationLeadMinutes: number
}

/** A complete baked fire fixture */
export interface FireFixture {
  cluster: Cluster
  hotspots: Hotspot[]
  perimeters: number[][][][] // satellite-perimeters MultiPolygon coords
  spread: FireSpreadSim
  valuesAtRisk: ValuesAtRiskTarget[]
  osmLayer?: OsmLayer
}

export type DroneId = 'EMBER' | 'KITE' | 'NOVA'

export interface DroneState {
  id: DroneId
  name: string
  position: Vec2
  path: Vec2[]
  pathIndex: number
  status: 'idle' | 'patrolling' | 'rerouting' | 'verifying' | 'scanning' | 'returning' | 'recalled'
  home: Vec2
  speed: number // tiles per second
  mission?: string
  batteryPct?: number
}

export type ActionType =
  | 'write_drone_path'
  | 'dispatch_verification_drone'
  | 'recall_drone'
  | 'set_coverage_priority'
  | 'reallocate_fleet_attention'
  | 'prepare_targeted_warning'
  | 'request_route_verification'
  | 'escalate_incident'
  | 'auto_create_incident'
  | 'auto_reroute_drone'
  | 'DEVIN_TRIGGERED'
  | 'DEVIN_TRIGGER_FAILED'
  | 'verification_scan_complete'
  | 'safety_buffer_expanded'

export type ActionStatus = 'PROPOSED' | 'APPROVED' | 'VETOED'

export type Actor = 'JEV' | 'DEVIN' | 'POLICY_ENGINE'

export interface ActionEvent {
  id: string
  simTick: number
  timestamp: string
  actor: Actor
  actionType: ActionType
  target: string
  params: Record<string, unknown>
  reason: string
  confidence: number
  status: ActionStatus
  simulated: true
}

export interface IncidentState {
  id: string
  clusterId: string
  createdAt: string
  confidence: number
  hotspotCount: number
  highConfidenceRatio: number
  avgFRP: number
  persistenceHours: number
  pathRisk: number
  conservativeArrivalMinutes: number | null
  forecastConfidence: number | null
  spreadMeanHours: number | null
  spreadStdDevHours: number | null
}

export interface AutonomyPolicyConfig {
  autoCreateIncidentWhenConfidenceGte: number
  autoDispatchVerificationDroneWhenConfidenceGte: number
  autoRerouteDroneWhenPathRiskGte: number
  autoPrepareWarningWhen: {
    conservativeArrivalMinutesLte: number
    preparationLeadMinutesGte: number
    confidenceGte: number
  }
}

export interface SimState {
  tick: number
  fireId: string | null
  incidents: IncidentState[]
  drones: DroneState[]
  actions: ActionEvent[]
  policy: AutonomyPolicyConfig
  /** terminal log lines rendered in the HUD */
  log: LogLine[]
  devinSession: DevinSessionState | null
}

export interface LogLine {
  id: string
  tick: number
  timestamp: string
  actor: Actor | 'SYSTEM'
  text: string
  typed?: boolean
}

export interface DevinSessionState {
  sessionId: string
  status: 'triggered' | 'running' | 'completed' | 'timeout' | 'error'
  triggeredAt: string
  attachmentName: string
  structuredOutput: DevinStructuredOutput | null
}

export interface DevinStructuredOutput {
  assessment: { targetId: string; reasoning: string }
  actions: {
    type: ActionType
    target: string
    params: Record<string, unknown>
    reason: string
    confidence: number
  }[]
}

/** Jev's computed signals — ground truth handed to Devin */
export interface JevSignals {
  incidentConfidence: number
  pathRisk: number
  conservativeArrivalMinutes: number | null
  forecastConfidence: number | null
}
