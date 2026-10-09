import { useAppStore } from '../store/appStore'

function Meter({ value, color = '#f4a92d' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 flex-1 border-2 border-gba-uiBorder bg-[#0e1019] p-[1px]">
        <div className="h-full transition-none" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-9 text-right font-mono text-[10px] text-gba-uiText">{pct}%</span>
    </div>
  )
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0">
      <span className="text-[10px] text-gba-uiDim">{label}</span>
      <span className="font-mono text-[11px] font-bold text-gba-uiText">{children}</span>
    </div>
  )
}

export function JevPanel() {
  const incident = useAppStore((s) => s.sim.incidents[0])
  const drones = useAppStore((s) => s.sim.drones)
  return (
    <section className="gba-panel overflow-hidden">
      <header className="flex items-center gap-3 border-b-2 border-gba-uiBorder bg-[#232839] p-3">
        <div className="grid h-9 w-9 place-items-center border-2 border-gba-fireHi bg-[#3a2015] pixel-font text-[12px] text-gba-fireHi">J</div>
        <div>
          <div className="pixel-font text-[10px] text-gba-fireHi">JEV // FAST</div>
          <div className="mt-1 text-[10px] text-gba-uiDim">Rules · sensing · detection</div>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[9px] text-gba-uiGood"><span className="h-2 w-2 animate-blink bg-gba-uiGood" /> ONLINE</div>
      </header>
      <div className="p-3">
        <div className="mb-1 text-[9px] uppercase text-gba-uiDim">Incident confidence</div>
        <Meter value={incident?.confidence ?? 0} />
        <div className="mt-2">
          <Metric label="Hotspots">{incident?.hotspotCount ?? '—'}</Metric>
          <Metric label="High-tier ratio">{incident ? `${Math.round(incident.highConfidenceRatio * 100)}%` : '—'}</Metric>
          <Metric label="Avg radiative power">{incident ? `${incident.avgFRP.toFixed(1)} MW` : '—'}</Metric>
          <Metric label="Persistence">{incident ? `${incident.persistenceHours.toFixed(1)} h` : '—'}</Metric>
          <Metric label="Nearest path risk">{incident ? `${Math.round(incident.pathRisk * 100)}%` : '—'}</Metric>
        </div>
        <div className="mt-2 border-l-4 border-gba-fireHi bg-[#281d19] p-2 text-[10px] leading-4 text-gba-uiText">
          {incident ? 'Only evidence observed by this replay instant is scored. Routes must remain outside the amber safety buffer.' : 'Accumulating time-local evidence before opening an incident.'}
        </div>
        <div className="mt-3 space-y-1">
          {drones.map((drone) => (
            <div key={drone.id} className="flex items-center gap-2 border border-white/5 bg-[#10131f] px-2 py-1.5 font-mono text-[9px]">
              <span className="w-12 font-bold text-gba-uiInfo">{drone.id}</span>
              <span className="min-w-0 flex-1 truncate text-gba-uiDim">{drone.status.toUpperCase()}</span>
              <span className="text-gba-uiGood">{Math.round(drone.batteryPct ?? 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function DevinPanel() {
  const incident = useAppStore((s) => s.sim.incidents[0])
  const session = useAppStore((s) => s.sim.devinSession)
  const open = useAppStore((s) => s.panels.devinOpen)
  const toggle = useAppStore((s) => s.togglePanel)
  const arrival = incident?.conservativeArrivalMinutes
  const confidence = incident?.forecastConfidence

  return (
    <section className="gba-panel overflow-hidden">
      <button className="flex w-full items-center gap-3 border-b-2 border-gba-uiBorder bg-[#232839] p-3 text-left" onClick={() => toggle('devinOpen')}>
        <div className="grid h-9 w-9 place-items-center border-2 border-gba-uiInfo bg-[#17283a] pixel-font text-[12px] text-gba-uiInfo">D</div>
        <div>
          <div className="pixel-font text-[10px] text-gba-uiInfo">DEVIN // SLOW</div>
          <div className="mt-1 text-[10px] text-gba-uiDim">Forecasting · reasoning</div>
        </div>
        <div className="ml-auto pixel-font text-[8px] text-gba-uiDim">{open ? '▼' : '▶'}</div>
      </button>
      {open && (
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between rounded border border-gba-uiBorder bg-[#10131f] px-2 py-1.5">
            <span className="text-[10px] text-gba-uiDim">SESSION</span>
            <span className={`pixel-font text-[7px] ${session ? 'text-gba-uiInfo' : 'text-gba-uiDim'}`}>{session?.status.toUpperCase() ?? 'STANDBY'}</span>
          </div>
          <Metric label="Conservative arrival">{arrival == null ? 'unavailable' : `${Math.round(arrival)} min`}</Metric>
          <Metric label="Forecast confidence">{confidence == null ? 'unavailable' : `${Math.round(confidence * 100)}%`}</Metric>
          <div className="mt-3">
            <div className="mb-1 pixel-font text-[8px] uppercase text-gba-uiInfo">Assessment</div>
            <div className="min-h-16 border-2 border-gba-uiBorder bg-[#10131f] p-2 text-[10px] leading-4 text-gba-uiText">
              {session?.structuredOutput?.assessment.reasoning ?? (incident ? 'Observed heat is available; ensemble spread is not. Recommendations remain constrained to verification and safe coverage.' : 'Standing by until Jev opens an incident from observed evidence.')}
            </div>
          </div>
          <div className="mt-2 border border-gba-uiBorder bg-[#171a27] p-2 text-[9px] leading-4 text-gba-uiDim"><span className="text-gba-uiAccent">NO FORECAST ≠ NO RISK.</span> All recommendations are proposals until the deterministic policy engine approves them.</div>
        </div>
      )}
    </section>
  )
}
