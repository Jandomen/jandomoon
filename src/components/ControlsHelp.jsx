import { useState } from 'react'
import { useMissionStore } from '../stores/missionStore'

export function ControlsHelp() {
  const { cameraMode, toggleCamera } = useMissionStore()
  const [visible, setVisible] = useState(true)

  if (!visible) {
    return (
      <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 1000 }}>
        <button
          onClick={() => setVisible(true)}
          style={{
            background: 'rgba(0,10,20,0.9)', color: '#0af', border: '1px solid #0af',
            borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer',
            fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Show Controls"
        >
          ?
        </button>
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '10px',
      left: '0',
      right: '0',
      display: 'flex',
      justifyContent: 'center',
      gap: '10px', // Gap for buttons
      pointerEvents: 'none',
      zIndex: 1000,
      alignItems: 'center'
    }}>
      <div style={{
        background: 'rgba(0,10,20,0.9)',
        padding: '10px 25px',
        border: '1px solid #0af',
        color: '#0af',
        fontFamily: 'Orbitron, monospace',
        borderRadius: '5px',
        fontSize: '12px',
        boxShadow: '0 0 15px rgba(0, 150, 255, 0.2)',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <div>
          <span style={{ color: '#fff', marginRight: '10px' }}>CONTROLES:</span>
          ESPACIO: Ignición • ↑↓: Potencia • ←→: Giro • T: TLI • L: Alunizar • P: Paracaídas • V: Vista • W: Warp
        </div>

        {/* Helper Buttons inside the bar */}
        <button
          onClick={toggleCamera}
          style={{
            background: '#0af', color: '#000', border: 'none',
            borderRadius: '3px', padding: '2px 8px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '10px'
          }}
        >
          {cameraMode === 'cabin' ? 'SALIR DE CABINA' : 'ENTRAR A CABINA'}
        </button>

        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'transparent', color: '#0af', border: '1px solid #0af',
            borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer',
            fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: '10px'
          }}
          title="Hide Controls"
        >
          X
        </button>
      </div>
    </div>
  )
}