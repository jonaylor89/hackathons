import type { FireFixture } from '../data/types'
import { useAppStore } from '../store/appStore'

function formatArea(ha?: number) {
  if (!ha) return '—'
  return `${new Intl.NumberFormat('en-US').format(ha)} ha`
}

export function FirePicker({ fixtures }: { fixtures: Record<string, FireFixture> }) {
  const activeId = useAppStore((s) => s.activeFireId)
  const setActive = useAppStore((s) => s.setActiveFire)
  const open = useAppStore((s) => s.panels.incidentPickerOpen)
  const toggle = useAppStore((s) => s.togglePanel)
  const active = activeId ? fixtures[activeId] : undefined

  return (
    <div className="relative z-40">
      <button
        className="flex min-w-0 items-center gap-2 rounded border-2 border-gba-uiBorder bg-[#10131f] px-2.5 py-1.5 text-left transition-none hover:border-gba-uiAccent"
        onClick={() => toggle('incidentPickerOpen')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="shrink-0 pixel-font text-[8px] uppercase text-gba-uiAccent"><span className="sm:hidden">Replay</span><span className="hidden sm:inline">Historical replay</span></span>
        <span className="hidden max-w-40 truncate text-[10px] text-gba-uiText sm:block">{active?.cluster.name ?? 'Select fire'}</span>
        <span className="shrink-0 pixel-font text-[8px] text-gba-uiDim">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded border-2 border-gba-uiBorder bg-[#171a27] shadow-2xl">
          <div className="max-h-72 overflow-y-auto p-2 gba-scroll">
            {Object.values(fixtures).map((f) => {
              const selected = f.cluster.id === activeId
              return (
                <button
                  key={f.cluster.id}
                  className={`mb-1.5 w-full rounded border-2 p-2 text-left transition-none ${
                    selected
                      ? 'border-gba-uiAccent bg-[#3a2f14]'
                      : 'border-transparent bg-[#202536] hover:border-gba-uiBorder'
                  }`}
                  onClick={() => setActive(f.cluster.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`pixel-font text-[8px] leading-4 ${selected ? 'text-gba-uiAccent' : 'text-gba-uiText'}`}>
                        {selected && <span className="mr-1">▶</span>}
                        {f.cluster.name}
                      </div>
                      <div className="mt-1 text-[10px] text-gba-uiDim">{f.cluster.region}</div>
                    </div>
                    <div className="shrink-0 rounded bg-[#0e1019] px-1.5 py-1 text-[9px] text-gba-uiDim">
                      {formatArea(f.cluster.burnedAreaHa)}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
