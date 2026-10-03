import React from 'react';
import { useAppStore } from './store/useAppStore';
import { TacticalMap } from './features/map/TacticalMap';

export const MainView: React.FC = () => {
  const { role, truthState, perceivedUnits, commsQuality, disconnect, exerciseId, participants, messages, activeEffects } = useAppStore();

  const isInstructor = role === 'INSTRUCTOR';
  const unitsToDisplay = isInstructor ? truthState?.units || {} : perceivedUnits;
  const simTime = isInstructor ? truthState?.simTime || 0 : 0; 

  const formatSimTime = (time: number) => {
    const h = Math.floor(time / 3600).toString().padStart(2, '0');
    const m = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
    const s = (time % 60).toString().padStart(2, '0');
    return `${h}${m}${s}Z`;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-base text-text overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="h-14 bg-panel border-b border-border flex items-center justify-between px-4 shrink-0 bg-camo bg-cover relative">
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
        
        <div className="flex items-center gap-4 z-10">
          <h1 className="text-2xl font-stencil text-accent tracking-widest drop-shadow-md">ECHO-FOG</h1>
          <span className="text-xs bg-card px-2 py-1 rounded border border-border text-muted font-mono uppercase">OP Iron Veil</span>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-friendly border border-base"></span>
            <span className="text-sm font-stencil text-sand tracking-wide">{role?.replace(/_/g, ' ')}</span>
            <span className="text-xs font-mono bg-base/50 px-1 border border-border">{isInstructor ? 'GODS-EYE' : 'CS-99'}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 z-10">
          <div className="text-right">
            <div className="font-mono text-accent text-sm leading-none">T+ {formatSimTime(simTime)}</div>
            <div className="text-[10px] text-muted font-bold uppercase tracking-wider">031430Z OCT 26</div>
          </div>
          <button 
            onClick={disconnect}
            className="text-xs border border-border bg-card/80 hover:bg-stamp hover:text-white px-3 py-1 rounded font-bold uppercase transition-colors"
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* MAIN CONTENT: 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: Comms / Trainees */}
        <aside className="w-72 mil-panel rounded-none border-t-0 border-b-0 border-l-0 flex flex-col z-10">
          <div className="p-2 border-b border-border font-stencil text-accent text-sm tracking-widest bg-card">
            {isInstructor ? 'CONNECTED ASSETS' : 'COMMS NET'}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isInstructor ? (
              participants?.map(p => (
                <div key={p} className="mil-card flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-friendly animate-pulse"></span>
                  <span className="text-xs font-mono text-sand">{p}</span>
                </div>
              ))
            ) : (
              Object.entries(commsQuality).map(([channel, quality]) => (
                <div key={channel} className="mil-card">
                  <div className="flex justify-between text-xs mb-2 font-mono">
                    <span className="font-bold">{channel}</span>
                    <span className={quality < 50 ? 'text-stamp font-bold' : quality < 80 ? 'text-unknown' : 'text-friendly'}>
                      {quality}%
                    </span>
                  </div>
                  <div className="w-full bg-base h-1.5 rounded overflow-hidden border border-border">
                    <div 
                      className={`h-full ${quality < 50 ? 'bg-stamp' : quality < 80 ? 'bg-unknown' : 'bg-friendly'}`} 
                      style={{ width: `${quality}%` }}
                    />
                  </div>
                  {quality < 50 && <div className="text-[10px] text-stamp mt-1 uppercase font-bold animate-pulse">NO SIGNAL / JAMMED</div>}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: Tactical Map */}
        <main className="flex-1 relative bg-base flex flex-col p-2">
          {isInstructor && <div className="stamp top-4 left-4 z-[1000] !border-instructor !text-instructor opacity-100">GROUND TRUTH</div>}
          <div className="stamp bottom-4 right-4 z-[1000] text-sm">FICTIONAL DATA</div>
          <TacticalMap units={unitsToDisplay} isGroundTruth={isInstructor} />
        </main>

        {/* RIGHT COLUMN: Decision / Instructor */}
        <aside className="w-80 mil-panel rounded-none border-t-0 border-b-0 border-r-0 flex flex-col z-10">
          <div className="p-2 border-b border-border font-stencil text-accent text-sm tracking-widest bg-card">
            {isInstructor ? 'INSTRUCTOR DASHBOARD' : 'SITUATION / ORDERS'}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {isInstructor ? (
              <>
                <div className="mil-card space-y-2">
                  <p className="text-[10px] text-muted uppercase font-bold">Sim Controls</p>
                  <div className="flex space-x-2">
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'PAUSE' })} className="flex-1 bg-base hover:bg-border text-xs py-2 rounded border border-border font-bold uppercase">
                      Pause
                    </button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'RESUME' })} className="flex-1 bg-accent text-panel hover:bg-sand font-bold text-xs py-2 rounded uppercase">
                      Resume
                    </button>
                  </div>
                </div>

                <div className="mil-card">
                  <p className="text-[10px] text-muted uppercase font-bold mb-2">Push Orders</p>
                  <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'SEND_MESSAGE', payload: { id: Date.now().toString(), text: 'Fall back to phase line Alpha.', sender: 'HQ' } })} className="w-full bg-base hover:bg-border border border-border text-xs py-2 rounded font-mono text-sand">
                    &gt; FALL BACK TO ALPHA
                  </button>
                </div>

                <div className="mil-card flex-1">
                  <p className="text-[10px] text-muted uppercase font-bold mb-2">Active Degradations</p>
                  <div className="space-y-2">
                    {activeEffects?.length === 0 && <span className="text-xs text-muted font-mono">NO ACTIVE EFFECTS</span>}
                    {activeEffects?.map(effect => (
                      <div key={effect.id} className="text-[10px] font-mono bg-stamp/20 border border-stamp/50 text-stamp p-2 rounded flex justify-between items-center">
                        <span>{effect.type} {effect.targetRole ? `[${effect.targetRole}]` : ''}</span>
                        <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'REMOVE_EFFECT', payload: { effectId: effect.id }})} className="text-white hover:text-stamp bg-stamp/40 px-1 rounded">X</button>
                      </div>
                    ))}
                  </div>

                  <hr className="border-border border-dashed my-3" />
                  
                  <p className="text-[10px] text-muted uppercase font-bold mb-2">Inject Menu</p>
                  <div className="space-y-2">
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'INJECT_EFFECT', payload: { effect: { id: Date.now().toString(), type: 'DROPOUT', targetChannel: 'VHF', intensity: 100, active: true } } })} className="w-full bg-base hover:bg-border text-xs py-2 rounded border border-border text-left px-2 font-mono text-stamp flex items-center justify-between">
                      <span>+ VHF BLACKOUT</span>
                    </button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'INJECT_EFFECT', payload: { effect: { id: Date.now().toString(), type: 'CORRUPTION', targetRole: 'TRAINEE_COMPANY_CMDR', intensity: 80, active: true } } })} className="w-full bg-base hover:bg-border text-xs py-2 rounded border border-border text-left px-2 font-mono text-stamp flex items-center justify-between">
                      <span>+ RADAR CORRUPTION</span>
                    </button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'INJECT_EFFECT', payload: { effect: { id: Date.now().toString(), type: 'SPOOF', targetRole: 'TRAINEE_PLATOON_CMDR_1', intensity: 100, active: true } } })} className="w-full bg-base hover:bg-border text-xs py-2 rounded border border-border text-left px-2 font-mono text-stamp flex items-center justify-between">
                      <span>+ SPOOF PLATOON 1</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full gap-4">
                <div className="mil-card flex-1 flex flex-col">
                  <h3 className="text-xs font-bold text-muted uppercase mb-2 border-b border-border pb-1">Incoming Intel / Orders</h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {messages?.map(msg => (
                      <div key={msg.id} className="text-xs font-mono bg-base p-2 rounded border-l-2 border-accent">
                        <span className="text-[10px] text-muted block mb-1">FROM: {msg.sender} // {new Date().toLocaleTimeString()}</span>
                        <span className="text-text">{msg.text}</span>
                        <div className="mt-2 flex gap-1">
                          <button className="text-[9px] px-1 bg-border rounded hover:bg-friendly text-white">TRUST</button>
                          <button className="text-[9px] px-1 bg-border rounded hover:bg-stamp text-white">SUSPECT</button>
                        </div>
                      </div>
                    ))}
                    {messages?.length === 0 && <p className="text-xs text-muted italic font-mono">No incoming traffic...</p>}
                  </div>
                </div>

                <div className="mil-card">
                  <h3 className="text-xs font-bold text-muted uppercase mb-2">Standing Orders</h3>
                  <p className="text-xs font-mono text-sand">Maintain defensive posture at Phase Line Bravo. Await further intel regarding enemy armour elements.</p>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* BOTTOM BAR: Timeline / Chat */}
      <footer className="h-10 bg-panel border-t border-border flex items-center px-4 shrink-0 text-xs text-muted font-mono justify-between">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-friendly rounded-full inline-block"></span> Secure Net</span>
          <span className="border-l border-border pl-4">PHASE 1: DEFEND</span>
        </div>
        <div>
          Fictional unclassified training data. Map: Sector KAVACH.
        </div>
      </footer>
    </div>
  );
};
