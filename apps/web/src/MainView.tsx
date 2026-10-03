import React from 'react';
import { useAppStore } from './store/useAppStore';
import { TacticalMap } from './features/map/TacticalMap';

export const MainView: React.FC = () => {
  const { role, truthState, perceivedUnits, commsQuality, disconnect, exerciseId } = useAppStore();

  const isInstructor = role === 'INSTRUCTOR';
  const unitsToDisplay = isInstructor ? truthState?.units || {} : perceivedUnits;
  const simTime = isInstructor ? truthState?.simTime || 0 : 0; // Trainee gets simTime via perceived state if added

  return (
    <div className="h-screen w-screen flex flex-col bg-base text-text overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-panel border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-accent tracking-wider">ECHO-FOG</h1>
          <span className="text-xs bg-card px-2 py-1 rounded text-muted font-mono">ID: {exerciseId}</span>
          <span className="text-sm font-semibold">{role?.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm">T+ {Math.floor(simTime / 60)}:{(simTime % 60).toString().padStart(2, '0')}</span>
          <button 
            onClick={disconnect}
            className="text-sm border border-border hover:bg-card px-3 py-1 rounded"
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Comms / Participants */}
        <aside className="w-64 bg-panel border-r border-border flex flex-col">
          <div className="p-3 border-b border-border font-semibold text-sm">
            {isInstructor ? 'Connected Trainees' : 'Comms Channels'}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isInstructor ? (
              useAppStore.getState().participants?.map(p => (
                <div key={p} className="bg-card p-2 rounded border border-border text-xs text-accent">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  {p}
                </div>
              ))
            ) : (
              Object.entries(commsQuality).map(([channel, quality]) => (
                <div key={channel} className="bg-card p-2 rounded border border-border">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono">{channel}</span>
                    <span className={quality < 50 ? 'text-hostile' : quality < 80 ? 'text-unknown' : 'text-friendly'}>
                      {quality}%
                    </span>
                  </div>
                  <div className="w-full bg-base h-1 rounded overflow-hidden">
                    <div 
                      className={`h-full ${quality < 50 ? 'bg-hostile' : quality < 80 ? 'bg-unknown' : 'bg-friendly'}`} 
                      style={{ width: `${quality}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center: Map */}
        <main className="flex-1 relative p-2">
          <TacticalMap units={unitsToDisplay} isGroundTruth={isInstructor} />
        </main>

        {/* Right Panel: Decision/Instructor Controls */}
        <aside className="w-80 bg-panel border-l border-border flex flex-col">
          <div className="p-3 border-b border-border font-semibold text-sm">
            {isInstructor ? 'Instructor Dashboard' : 'Decision Panel'}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {isInstructor ? (
              <div className="space-y-4 flex-1">
                <p className="text-xs text-muted">Use this panel to control simulation and inject degradations.</p>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'PAUSE' })}
                    className="flex-1 bg-card hover:bg-border text-sm py-2 rounded border border-border"
                  >
                    Pause
                  </button>
                  <button 
                    onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'RESUME' })}
                    className="flex-1 bg-instructor text-black hover:bg-green-400 font-bold text-sm py-2 rounded"
                  >
                    Resume
                  </button>
                </div>

                <div className="border border-border p-2 rounded bg-card mt-4">
                  <h3 className="text-xs font-bold text-accent mb-2">Send Order</h3>
                  <button 
                    onClick={() => useAppStore.getState().socket?.emit('instructor:control', { 
                      exerciseId, 
                      action: 'SEND_MESSAGE',
                      payload: { id: Date.now().toString(), text: 'Fall back to phase line Alpha.', sender: 'HQ' }
                    })}
                    className="w-full bg-border hover:bg-gray-600 text-xs py-1 rounded"
                  >
                    Send "Fall back" Order
                  </button>
                </div>

                <hr className="border-border my-4" />
                <p className="text-xs font-semibold mb-2 text-muted">Active Effects:</p>
                <div className="space-y-2 mb-4">
                  {useAppStore.getState().activeEffects?.length === 0 && <span className="text-xs text-muted">None</span>}
                  {useAppStore.getState().activeEffects?.map(effect => (
                    <div key={effect.id} className="text-xs bg-red-900/30 border border-red-800 text-red-200 p-2 rounded flex justify-between">
                      <span>{effect.type} {effect.targetRole ? `(${effect.targetRole})` : ''}</span>
                      <button 
                        onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'REMOVE_EFFECT', payload: { effectId: effect.id }})}
                        className="text-red-400 hover:text-white"
                      >
                        [X]
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-semibold mb-2 text-muted">Inject New Effects:</p>
                <button 
                  onClick={() => useAppStore.getState().socket?.emit('instructor:control', { 
                    exerciseId, 
                    action: 'INJECT_EFFECT', 
                    payload: { effect: { id: Date.now().toString(), type: 'DROPOUT', targetChannel: 'VHF', intensity: 100, active: true } }
                  })}
                  className="w-full bg-card hover:bg-border text-sm py-2 rounded border border-border text-left px-3"
                >
                  + VHF Comms Blackout
                </button>
                <button 
                  onClick={() => useAppStore.getState().socket?.emit('instructor:control', { 
                    exerciseId, 
                    action: 'INJECT_EFFECT', 
                    payload: { effect: { id: Date.now().toString(), type: 'CORRUPTION', targetRole: 'TRAINEE_COMPANY_CMDR', intensity: 80, active: true } }
                  })}
                  className="w-full bg-card hover:bg-border text-sm py-2 rounded border border-border text-left px-3"
                >
                  + Corrupt Company Cmdr Radar
                </button>
                <button 
                  onClick={() => useAppStore.getState().socket?.emit('instructor:control', { 
                    exerciseId, 
                    action: 'INJECT_EFFECT', 
                    payload: { effect: { id: Date.now().toString(), type: 'SPOOF', targetRole: 'TRAINEE_PLATOON_CMDR_1', intensity: 100, active: true } }
                  })}
                  className="w-full bg-card hover:bg-border text-sm py-2 rounded border border-border text-left px-3"
                >
                  + Spoof Target for Platoon 1
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-4">
                <div className="flex-1 bg-card border border-border rounded p-2 overflow-y-auto">
                  <h3 className="text-xs font-bold text-muted mb-2 sticky top-0 bg-card">Incoming Intel / Orders</h3>
                  {useAppStore.getState().messages?.map(msg => (
                    <div key={msg.id} className="text-sm bg-base p-2 rounded mb-2 border-l-2 border-accent">
                      <span className="text-xs text-muted block">{msg.sender}</span>
                      {msg.text}
                    </div>
                  ))}
                  {useAppStore.getState().messages?.length === 0 && (
                    <p className="text-xs text-muted italic">No incoming traffic.</p>
                  )}
                </div>

                <div className="h-40 border-t border-border pt-4">
                  <p className="text-xs text-muted mb-2">No active decision prompts.</p>
                  <p className="text-xs">Monitor the situation and await injects.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
