import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { TacticalMap } from './features/map/TacticalMap';
import { Officer, SimEvent } from '@echo-fog/shared';

export const MainView: React.FC = () => {
  const { role, truthState, disconnect, exerciseId, participants, messages, buildings, officers } = useAppStore();

  const isInstructor = role === 'INSTRUCTOR';
  const status = truthState?.status || 'NOT_STARTED';

  // REPLAY STATE
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayTime, setReplayTime] = useState(0);
  const [replayData, setReplayData] = useState<{events: SimEvent[], maxTime: number} | null>(null);

  useEffect(() => {
    let interval: any;
    if (isReplaying && replayData) {
      interval = setInterval(() => {
        setReplayTime(t => {
          if (t >= replayData.maxTime) {
            setIsReplaying(false);
            return 0;
          }
          return t + 1; // 1x speed replay tick
        });
      }, 100); // speed up playback by 10x
    }
    return () => clearInterval(interval);
  }, [isReplaying, replayData]);

  const handleStartReplay = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/exercise/${exerciseId}/data`);
      const data = await res.json();
      setReplayData({ events: data.events, maxTime: truthState?.simTime || 0 });
      setReplayTime(0);
      setIsReplaying(true);
    } catch (e) { console.error(e); }
  };

  const simTime = isReplaying ? replayTime : (truthState?.simTime || 0);

  const formatSimTime = (time: number) => {
    const h = Math.floor(time / 3600).toString().padStart(2, '0');
    const m = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${h}${m}${s}Z`;
  };

  const activeOfficers = useMemo(() => {
    if (!isReplaying || !replayData) return officers;
    
    // Compute officer positions at replayTime based on events
    const computedOfficers: Record<string, Officer> = JSON.parse(JSON.stringify(officers));
    
    // Replay events up to replayTime
    const pastEvents = replayData.events.filter(e => e.timestamp <= replayTime);
    
    Object.values(computedOfficers).forEach(off => {
      const myEvents = pastEvents.filter(e => e.officerId === off.id);
      
      const lastJoin = myEvents.slice().reverse().find(e => e.type === 'OFFICER_JOINED');
      if (!lastJoin) {
         off.status = 'INACTIVE';
         return; // not yet joined
      }
      off.status = 'ACTIVE';

      // Find the most recent comms event
      const lastComms = myEvents.slice().reverse().find(e => e.type.startsWith('COMMUNICATION_'));
      if (lastComms && 'status' in lastComms) {
         off.commsStatus = (lastComms as any).status;
      }

      // Movement logic
      const lastMoveStart = myEvents.slice().reverse().find(e => e.type === 'OFFICER_MOVED');
      const lastMoveEnd = myEvents.slice().reverse().find(e => e.type === 'OFFICER_ENTERED_BUILDING');
      
      if (lastMoveStart && (!lastMoveEnd || lastMoveEnd.timestamp < lastMoveStart.timestamp)) {
         // Currently in transit during this replay frame
         off.currentBuildingId = null;
         // In a real robust system we'd interpolate between start building and target building coordinates.
         // Since we don't store target in the event easily right now, we'll just mark them IN_TRANSIT.
      } else if (lastMoveEnd) {
         off.currentBuildingId = lastMoveEnd.buildingId || null;
         if (off.currentBuildingId && buildings[off.currentBuildingId]) {
           off.position = { ...buildings[off.currentBuildingId].position };
         }
      } else if (lastJoin.buildingId && buildings[lastJoin.buildingId]) {
         off.currentBuildingId = lastJoin.buildingId;
         off.position = { ...buildings[lastJoin.buildingId].position };
      }
    });
    
    return computedOfficers;
  }, [officers, buildings, isReplaying, replayTime, replayData]);

  const commsOverview = useMemo(() => {
    const nets: Record<string, 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'> = { VHF: 'AVAILABLE', UHF: 'AVAILABLE', SATCOM: 'AVAILABLE', DATALINK: 'AVAILABLE' };
    Object.values(activeOfficers).forEach(o => {
      if (o.status === 'INACTIVE') return;
      if (o.commsStatus === 'DEGRADED' && nets[o.commsNetwork] === 'AVAILABLE') nets[o.commsNetwork] = 'DEGRADED';
      if (o.commsStatus === 'UNAVAILABLE') nets[o.commsNetwork] = 'UNAVAILABLE';
    });
    return nets;
  }, [activeOfficers]);

  return (
    <div className="h-screen w-screen flex flex-col bg-base text-text overflow-hidden font-sans">
      {/* HEADER */}
      <header className="h-14 bg-panel border-b border-border flex items-center justify-between px-4 shrink-0 bg-camo bg-cover relative">
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
        <div className="flex items-center gap-4 z-10">
          <h1 className="text-2xl font-stencil text-accent tracking-widest drop-shadow-md">ECHO-FOG</h1>
          <span className="text-xs bg-card px-2 py-1 rounded border border-border text-muted font-mono uppercase">Op Iron Veil</span>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full border border-base ${status === 'ACTIVE' ? 'bg-friendly animate-pulse' : 'bg-muted'}`}></span>
            <span className="text-sm font-stencil text-sand tracking-wide">{role?.replace(/_/g, ' ')}</span>
            <span className="text-xs font-mono bg-base/50 px-1 border border-border">[{status}]</span>
          </div>
        </div>
        <div className="flex items-center gap-6 z-10">
          <div className="text-right">
            <div className="font-mono text-accent text-sm leading-none">T+ {formatSimTime(simTime)}</div>
            <div className="text-[10px] text-muted font-bold uppercase tracking-wider">031430Z OCT 26</div>
          </div>
          <button onClick={disconnect} className="text-xs border border-border bg-card/80 hover:bg-stamp hover:text-white px-3 py-1 rounded font-bold uppercase transition-colors">Disconnect</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
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
              Object.entries(commsOverview).map(([channel, qual]) => (
                <div key={channel} className="mil-card">
                  <div className="flex justify-between text-xs mb-2 font-mono">
                    <span className="font-bold">{channel}</span>
                    <span className={qual === 'UNAVAILABLE' ? 'text-stamp font-bold' : qual === 'DEGRADED' ? 'text-delayed' : 'text-friendly'}>{qual}</span>
                  </div>
                  <div className="w-full bg-base h-1.5 rounded overflow-hidden border border-border">
                    <div className={`h-full ${qual === 'UNAVAILABLE' ? 'bg-stamp w-full' : qual === 'DEGRADED' ? 'bg-delayed w-1/2' : 'bg-friendly w-full'}`} />
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: Tactical Map */}
        <main className="flex-1 relative bg-base flex flex-col p-2">
          {isInstructor && <div className="stamp top-4 left-4 z-[1000] !border-instructor !text-instructor opacity-100">{isReplaying ? 'REPLAY MODE' : 'GROUND TRUTH'}</div>}
          <div className="stamp bottom-4 right-4 z-[1000] text-sm">FICTIONAL DATA</div>
          <TacticalMap buildings={buildings} officers={activeOfficers} isGroundTruth={isInstructor} />
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
                  <p className="text-[10px] text-muted uppercase font-bold">Lifecycle Controls</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'START' })} className="bg-friendly text-base font-bold text-xs py-1 rounded">START</button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'PAUSE' })} className="bg-base border border-border text-xs py-1 rounded font-bold uppercase">PAUSE</button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'RESUME' })} className="bg-accent text-panel hover:bg-sand font-bold text-xs py-1 rounded uppercase">RESUME</button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'END' })} className="bg-stamp text-white font-bold text-xs py-1 rounded">END OP</button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <a href={`http://localhost:3001/api/exercise/${exerciseId}/report`} target="_blank" className="block text-center w-full bg-instructor text-black font-bold text-xs py-1 rounded uppercase">AAR REPORT</a>
                    <button onClick={handleStartReplay} className="bg-unknown text-black font-bold text-xs py-1 rounded uppercase">{isReplaying ? 'REPLAYING...' : 'REPLAY'}</button>
                  </div>
                  {isReplaying && (
                    <div className="mt-2">
                      <input type="range" min="0" max={replayData?.maxTime || 0} value={replayTime} onChange={e => setReplayTime(Number(e.target.value))} className="w-full" />
                    </div>
                  )}
                </div>

                <div className="mil-card">
                  <p className="text-[10px] text-muted uppercase font-bold mb-2">Push Orders</p>
                  <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'SEND_MESSAGE', payload: { id: Date.now().toString(), text: 'All officers report to Facility A immediately.', sender: 'HQ' } })} className="w-full bg-base hover:bg-border border border-border text-xs py-2 rounded font-mono text-sand">
                    &gt; SEND REGROUP ORDER
                  </button>
                </div>

                <div className="mil-card flex-1">
                  <p className="text-[10px] text-muted uppercase font-bold mb-2">Simulation Events</p>
                  <div className="space-y-2">
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'INJECT_EFFECT', payload: { effect: { id: Date.now().toString(), type: 'COMMS_DEGRADED', payload: { channel: 'VHF', severity: 'HIGH' }, active: true } } })} className="w-full bg-base hover:bg-border text-xs py-2 rounded border border-border text-left px-2 font-mono text-stamp">
                      + DEGRADE VHF
                    </button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'MOVE_OFFICER', payload: { officerId: 'OFF-003', targetBuildingId: 'BLD-005' } })} className="w-full bg-base hover:bg-border text-xs py-2 rounded border border-border text-left px-2 font-mono text-accent">
                      + MOVE OFF-003 TO FACILITY A
                    </button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'MOVE_OFFICER', payload: { officerId: 'OFF-005', targetBuildingId: 'BLD-001' } })} className="w-full bg-base hover:bg-border text-xs py-2 rounded border border-border text-left px-2 font-mono text-accent">
                      + MOVE OFF-005 TO HQ
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full gap-4">
                <div className="mil-card flex-1 flex flex-col">
                  <h3 className="text-xs font-bold text-muted uppercase mb-2 border-b border-border pb-1">Incoming Orders</h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {messages?.map(msg => (
                      <div key={msg.id} className="text-xs font-mono bg-base p-2 rounded border-l-2 border-accent">
                        <span className="text-[10px] text-muted block mb-1">FROM: {msg.sender} // {new Date().toLocaleTimeString()}</span>
                        <span className="text-text">{msg.text}</span>
                        <div className="mt-2 flex gap-1">
                          <button className="text-[9px] px-2 py-1 bg-border rounded hover:bg-friendly text-white">ACKNOWLEDGE</button>
                        </div>
                      </div>
                    ))}
                    {messages?.length === 0 && <p className="text-xs text-muted italic font-mono">No incoming traffic...</p>}
                  </div>
                </div>
                <div className="mil-card">
                  <h3 className="text-xs font-bold text-muted uppercase mb-2">Standing Orders</h3>
                  <p className="text-xs font-mono text-sand">Maintain operational readiness. Await further intel regarding anomalous movements.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      {/* BOTTOM BAR */}
      <footer className="h-10 bg-panel border-t border-border flex items-center px-4 shrink-0 text-xs text-muted font-mono justify-between">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-friendly rounded-full inline-block"></span> Secure Net</span>
        </div>
        <div>Fictional unclassified training data.</div>
      </footer>
    </div>
  );
};
