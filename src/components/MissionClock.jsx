import { useMissionStore } from '../stores/missionStore'

export function MissionClock() {
  const met = useMissionStore(state => state.met)

  const format = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(3, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const ss = (s % 60).toString().padStart(2, '0')
    return `${h}:${m}:${ss}`
  }

  return (
    <div style={{ position: 'absolute', top: 20, right: 20, color: '#0f0', fontFamily: 'monospace', fontSize: 32, background: 'rgba(0,0,0,0.7)', padding: '10px 20px' }}>
      MET {format(met)}
    </div>
  )
}