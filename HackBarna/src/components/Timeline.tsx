import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'

export function Timeline() {
  const timeline = useAppStore((s) => s.timeline)
  const setHour = useAppStore((s) => s.setHour)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const setSpeed = useAppStore((s) => s.setSpeed)
  const backendAuthority = useAppStore((s) => s.backendAuthority)

  useEffect(() => {
    if (!timeline.playing || backendAuthority) return
    const timer = window.setInterval(() => {
      const current = useAppStore.getState().timeline
      const next = current.hour + current.speed * 0.004
      if (next >= current.simDurationHours) {
        setHour(current.simDurationHours)
        setPlaying(false)
      } else {
        setHour(next)
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [timeline.playing, timeline.speed, backendAuthority, setHour, setPlaying])

  return (
    <div className="gba-panel grid grid-cols-[48px_40px_minmax(0,1fr)] items-center gap-2 px-3 py-2 sm:flex sm:gap-3">
      <button
        className={`gba-btn h-9 w-12 ${timeline.playing ? 'gba-btn--selected' : ''}`}
        onClick={() => setPlaying(!timeline.playing)}
        aria-label={timeline.playing ? 'Pause replay' : 'Play replay'}
      >
        {timeline.playing ? 'Ⅱ' : '▶'}
      </button>
      <button className="gba-btn h-9" onClick={() => setHour(0)}>↺</button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex justify-between font-mono text-[10px] text-gba-uiDim">
          <span>IGNITION</span>
          <span className="text-gba-uiAccent">H+{timeline.hour.toFixed(1)}</span>
          <span>H+{timeline.simDurationHours}</span>
        </div>
        <input
          className="h-3 w-full cursor-pointer appearance-none rounded-none border-2 border-gba-uiBorder bg-[#0e1019] accent-gba-fireHi"
          type="range"
          min={0}
          max={timeline.simDurationHours}
          step={0.1}
          value={timeline.hour}
          onChange={(e) => setHour(Number(e.target.value))}
          aria-label="Simulation hour"
        />
      </div>
      <div className="col-span-3 flex w-full shrink-0 justify-end gap-1 sm:w-auto">
        {[0.25, 1, 4, 16].map((speed) => (
          <button
            key={speed}
            className={`gba-btn px-2 ${timeline.speed === speed ? 'gba-btn--selected' : ''}`}
            onClick={() => setSpeed(speed)}
          >
            {speed}×
          </button>
        ))}
      </div>
    </div>
  )
}
