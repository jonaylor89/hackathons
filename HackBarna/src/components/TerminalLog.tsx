import { useEffect, useRef, useState } from 'react'
import type { ActionEvent } from '../data/types'
import { useAppStore } from '../store/appStore'

const actorColors: Record<string, string> = {
  SYSTEM: 'text-gba-uiDim',
  JEV: 'text-gba-fireHi',
  DEVIN: 'text-gba-uiInfo',
  POLICY_ENGINE: 'text-gba-uiGood',
}

const actionCopy: Record<string, { title: string; icon: string }> = {
  auto_create_incident: { title: 'INCIDENT ALPHA OPENED', icon: '!' },
  dispatch_verification_drone: { title: 'VERIFICATION MISSION LAUNCHED', icon: '↗' },
  verification_scan_complete: { title: 'THERMAL SCAN COMPLETE', icon: '◇' },
  safety_buffer_expanded: { title: 'SAFETY BUFFER EXPANDED', icon: '◉' },
  auto_reroute_drone: { title: 'SAFE CORRIDOR APPLIED', icon: '↝' },
  recall_drone: { title: 'MISSION RESERVE REACHED', icon: '↙' },
  write_drone_path: { title: 'ROUTE CHANGE REVIEWED', icon: '⌁' },
  set_coverage_priority: { title: 'COVERAGE PRIORITY UPDATED', icon: '▦' },
  reallocate_fleet_attention: { title: 'FLEET ATTENTION REALLOCATED', icon: '⇄' },
  prepare_targeted_warning: { title: 'WARNING DRAFT REVIEWED', icon: '△' },
  DEVIN_TRIGGERED: { title: 'SLOW REASONING STARTED', icon: 'D' },
  DEVIN_TRIGGER_FAILED: { title: 'DETERMINISTIC FALLBACK ACTIVE', icon: '↺' },
}

function friendlyTarget(target: string) {
  if (target.startsWith('incident-')) return 'Incident Alpha'
  return target.replaceAll('_', ' ')
}

function displayReason(action: ActionEvent) {
  if (action.actionType === 'DEVIN_TRIGGER_FAILED') return 'Slow-reasoning service unavailable. Jev retained deterministic safety authority.'
  return action.reason
}

function DecisionCard({ action }: { action: ActionEvent }) {
  const copy = actionCopy[action.actionType] ?? { title: action.actionType.replaceAll('_', ' ').toUpperCase(), icon: '•' }
  const approved = action.status === 'APPROVED'
  const vetoed = action.status === 'VETOED'
  const simHour = typeof action.params.simHour === 'number' ? action.params.simHour : action.simTick * 0.004
  return (
    <article className={`decision-card ${vetoed ? 'decision-card--veto' : approved ? 'decision-card--approved' : ''}`}>
      <div className="decision-card__rail" aria-hidden="true">{copy.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[10px] text-gba-uiDim">H+{simHour.toFixed(2)}</span>
          <span className={`pixel-font text-[8px] ${actorColors[action.actor] ?? 'text-white'}`}>{action.actor}</span>
          <span className={`status-chip ${approved ? 'status-chip--approved' : vetoed ? 'status-chip--vetoed' : 'status-chip--proposed'}`}>
            {vetoed ? 'VETOED' : approved ? 'APPROVED' : 'PROPOSED'}
          </span>
        </div>
        <h3 className="mt-1.5 pixel-font text-[9px] leading-4 text-gba-uiText">{copy.title}</h3>
        <p className="mt-1 font-mono text-[11px] leading-4 text-gba-uiDim">{displayReason(action)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px]">
          <span className="rounded-sm bg-[#0e1019] px-2 py-1 text-gba-uiText">TARGET · {friendlyTarget(action.target)}</span>
          <span className="text-gba-uiDim">CONF {Math.round(action.confidence * 100)}%</span>
        </div>
      </div>
    </article>
  )
}

export function TerminalLog() {
  const log = useAppStore((s) => s.sim.log)
  const actions = useAppStore((s) => s.sim.actions)
  const open = useAppStore((s) => s.panels.terminalOpen)
  const toggle = useAppStore((s) => s.togglePanel)
  const [mode, setMode] = useState<'decisions' | 'audit'>('decisions')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [log, actions, mode])

  return (
    <section className="gba-panel flex min-h-0 flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b-2 border-gba-uiBorder bg-[#232839] px-3 py-2">
        <button className="min-w-0 text-left" onClick={() => toggle('terminalOpen')}>
          <span className="pixel-font text-[9px] uppercase text-gba-uiAccent">Mission decisions</span>
          <span className="ml-2 hidden text-[9px] text-gba-uiDim sm:inline">LIVE AUTONOMY NARRATIVE</span>
        </button>
        <div className="flex items-center gap-1">
          <button className={`feed-tab ${mode === 'decisions' ? 'feed-tab--active' : ''}`} onClick={() => setMode('decisions')}>STORY</button>
          <button className={`feed-tab ${mode === 'audit' ? 'feed-tab--active' : ''}`} onClick={() => setMode('audit')}>AUDIT</button>
          <button className="ml-1 px-1 pixel-font text-[8px] text-gba-uiDim" onClick={() => toggle('terminalOpen')} aria-label="Toggle mission feed">{open ? '▼' : '▶'}</button>
        </div>
      </header>
      {open && mode === 'decisions' && (
        <div ref={ref} className="gba-scroll flex h-56 gap-2 overflow-x-auto overflow-y-hidden bg-[#10131f] p-3 lg:h-48">
          {actions.length ? actions.map((action) => <DecisionCard key={action.id} action={action} />) : (
            <div className="grid w-full place-items-center border border-dashed border-gba-uiBorder p-4 text-center">
              <div><div className="animate-blink text-gba-uiGood">◆</div><p className="mt-2 text-[10px] text-gba-uiDim">Watching time-local evidence for a policy threshold…</p></div>
            </div>
          )}
        </div>
      )}
      {open && mode === 'audit' && (
        <div ref={ref} className="gba-scroll h-56 overflow-y-auto bg-[#10131f] p-3 font-mono text-[10px] leading-5 lg:h-48">
          {log.map((line) => (
            <div key={line.id} className="grid grid-cols-[64px_92px_minmax(0,1fr)] gap-2 border-b border-white/5 py-1">
              <span className="text-gba-uiDim">T+{line.tick}</span><span className={actorColors[line.actor]}>{line.actor}</span><span className="break-words text-gba-uiText">{line.text}</span>
            </div>
          ))}
          {actions.map((action) => (
            <div key={action.id} className="grid grid-cols-[64px_92px_minmax(0,1fr)] gap-2 border-b border-white/5 py-1">
              <span className="text-gba-uiDim">T+{action.simTick}</span><span className={actorColors[action.actor]}>{action.actor}</span>
              <span className="break-words text-gba-uiText">[SIMULATED] {action.actionType} → {friendlyTarget(action.target)} · {action.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
