import { useMissionStore } from '../stores/missionStore.js'

export function CockpitPanel() {
  const { throttle, nextStage, abortMission } = useMissionStore()

  return (
    <div style={{ position: 'absolute', bottom: 20, right: 20, background: '#111', padding: 20, border: '2px solid #0f0', borderRadius: 10 }}>
      {/* THROTTLE */}
      <div style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 24, marginBottom: 20 }}>
        THROTTLE<br />
        <div style={{ height: 200, width: 40, background: '#000', border: '1px solid #0f0', position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: 0, width: '100%',
            height: `${throttle * 100}%`,
            background: throttle > 0.9 ? 'red' : '#0f0'
          }} />
        </div>
      </div>

      {/* FLIGHT SYSTEMS */}
      <div style={{ borderTop: '2px solid #330', paddingTop: 10 }}>
        <div style={{ color: '#fa0', fontSize: 12, marginBottom: 5, fontWeight: 'bold' }}>FLIGHT SYSTEMS</div>

        <button onClick={nextStage} style={{
          background: '#220', color: '#ff0', border: '2px solid #ff0',
          width: '100%', padding: '10px', marginBottom: '10px',
          fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer',
          textShadow: '0 0 5px #ff0'
        }}>
          JETTISON STAGE
        </button>

        <button onClick={abortMission} style={{
          background: 'linear-gradient(#a00, #500)', color: '#fff', border: '2px solid #fff',
          width: '100%', padding: '15px',
          fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold',
          boxShadow: '0 0 10px #f00', cursor: 'pointer',
          textShadow: '0 0 5px #fff'
        }}>
          ABORT
        </button>
      </div>
    </div>
  )
}