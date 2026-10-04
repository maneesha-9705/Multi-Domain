import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { TacticalMap } from './features/map/TacticalMap';
import { Officer, SimEvent } from '@echo-fog/shared';

export const MainView: React.FC = () => {
  const { role, truthState, disconnect, exerciseId, participants, messages, buildings, officers, commsChannels, decisions } = useAppStore();
  const [customMsgText, setCustomMsgText] = useState('');

  // TRAINEE DECISION STATE
  const [selectedChoice, setSelectedChoice] = useState<'HOLD' | 'REGROUP' | 'PROCEED' | 'REQUEST_RECON' | null>(null);
  const [rationaleText, setRationaleText] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [promptStartTime, setPromptStartTime] = useState<number>(Date.now());

  useEffect(() => {
    setPromptStartTime(Date.now());
  }, [messages]);

  const handleSubmitDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChoice) return;
    const timeToDecideMs = Date.now() - promptStartTime;
    useAppStore.getState().socket?.emit('trainee:submit_decision', {
      exerciseId,
      role,
      choice: selectedChoice,
      rationale: rationaleText || 'CP2 status unconfirmed and VHF signal degraded.',
      confidence: confidenceLevel,
      timeToDecideMs
    });
    setRationaleText('');
    setSelectedChoice(null);
  };

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
    
    const computedOfficers: Record<string, Officer> = JSON.parse(JSON.stringify(officers));
    const pastEvents = replayData.events.filter(e => e.timestamp <= replayTime);
    
    Object.values(computedOfficers).forEach(off => {
      const myEvents = pastEvents.filter(e => e.officerId === off.id);
      
      const lastJoin = myEvents.slice().reverse().find(e => e.type === 'OFFICER_JOINED');
      if (!lastJoin) {
         off.status = 'OFFLINE';
         return;
      }
      off.status = 'ACTIVE';

      const lastComms = myEvents.slice().reverse().find(e => e.type.startsWith('COMMUNICATION_'));
      if (lastComms && 'status' in lastComms) {
         off.commsStatus = (lastComms as any).status;
      }

      const lastMoveStart = myEvents.slice().reverse().find(e => e.type === 'OFFICER_MOVED');
      const lastMoveEnd = myEvents.slice().reverse().find(e => e.type === 'OFFICER_ENTERED_BUILDING');
      
      if (lastMoveStart && (!lastMoveEnd || lastMoveEnd.timestamp < lastMoveStart.timestamp)) {
         off.currentBuildingId = null;
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

  const setChannelState = (channel: string, commsStatus: 'AVAILABLE'|'DEGRADED'|'UNAVAILABLE', delaySeconds: number = 10) => {
    useAppStore.getState().socket?.emit('instructor:control', {
      exerciseId,
      action: 'SET_COMMS',
      payload: { channel, status: commsStatus, delaySeconds }
    });
  };

  const sendOrderMessage = (text: string, channel: string = 'VHF') => {
    if (!text.trim()) return;
    useAppStore.getState().socket?.emit('instructor:control', {
      exerciseId,
      action: 'SEND_MESSAGE',
      payload: {
        id: Date.now().toString(),
        text,
        sender: 'HQ (INSTRUCTOR)',
        channel,
        targetRole: 'TRAINEE_COMPANY_CMDR'
      }
    });
    setCustomMsgText('');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#000000] text-[#B0C4DE] overflow-hidden font-sans">
      {/* HEADER */}
      <header className="h-14 bg-[#000000] border-b border-[#4B5320] flex items-center justify-between px-4 shrink-0 relative">
        <div className="flex items-center gap-4 z-10">
          <h1 className="text-2xl font-stencil text-[#FFD700] tracking-widest drop-shadow-md">ECHO-FOG</h1>
          <span className="text-xs bg-[#4B5320] px-2 py-1 rounded border border-[#6B8E23] text-[#B0C4DE] font-mono uppercase font-bold">Op Iron Veil</span>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full border border-[#000000] ${status === 'ACTIVE' ? 'bg-[#6B8E23] animate-pulse' : 'bg-[#A9A9A9]'}`}></span>
            <span className="text-sm font-stencil text-[#B0C4DE] tracking-wide">{role?.replace(/_/g, ' ')}</span>
            <span className="text-xs font-mono bg-[#3C3C3D] px-1.5 py-0.5 rounded border border-[#4B5320] text-[#A9A9A9]">[{status}]</span>
          </div>
        </div>
        <div className="flex items-center gap-6 z-10">
          <div className="text-right">
            <div className="font-mono text-[#FFD700] text-sm leading-none font-bold">T+ {formatSimTime(simTime)}</div>
            <div className="text-[10px] text-[#A9A9A9] font-bold uppercase tracking-wider">031430Z OCT 26</div>
          </div>
          <button onClick={disconnect} className="text-xs border border-[#4B5320] bg-[#3C3C3D] hover:bg-[#6B8E23] hover:text-[#000000] text-[#B0C4DE] px-3 py-1 rounded font-bold uppercase transition-colors">Disconnect</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Comms / Trainees */}
        <aside className="w-72 bg-[#000000] border-r border-[#4B5320] flex flex-col z-10">
          <div className="p-2.5 border-b border-[#4B5320] font-stencil text-[#FFD700] text-sm tracking-widest bg-[#3C3C3D]">
            {isInstructor ? 'CONNECTED ASSETS' : 'COMMS NET STATUS'}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isInstructor ? (
              participants?.map(p => (
                <div key={p} className="mil-card flex items-center gap-2 bg-[#3C3C3D] border border-[#4B5320] hover:border-[#6B8E23]">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#6B8E23] animate-pulse"></span>
                  <span className="text-xs font-mono text-[#B0C4DE]">{p}</span>
                </div>
              ))
            ) : (
              ['VHF', 'UHF', 'SATCOM', 'DATALINK'].map(ch => {
                const info = commsChannels[ch] || { channel: ch, status: 'AVAILABLE', delaySeconds: 0 };
                const isDegraded = info.status === 'DEGRADED';
                const isLost = info.status === 'UNAVAILABLE';
                return (
                  <div key={ch} className="mil-card bg-[#3C3C3D] border border-[#4B5320]">
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="font-bold text-[#B0C4DE]">{ch}</span>
                      <span className={isLost ? 'text-[#8B4513] font-bold' : isDegraded ? 'text-[#FFD700] font-bold' : 'text-[#6B8E23] font-bold'}>
                        {isLost ? 'BLACKOUT' : isDegraded ? `DEGRADED (${info.delaySeconds}s LATENCY)` : 'CLEAN'}
                      </span>
                    </div>
                    <div className="w-full bg-[#000000] h-2 rounded overflow-hidden border border-[#4B5320]">
                      <div className={`h-full ${isLost ? 'bg-[#8B4513] w-full' : isDegraded ? 'bg-[#FFD700] w-1/2 animate-pulse' : 'bg-[#6B8E23] w-full'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: Tactical Map */}
        <main className="flex-1 relative bg-[#000000] flex flex-col p-2">
          {isInstructor && <div className="stamp top-4 left-4 z-[1000] !border-[#FFD700] !text-[#FFD700] opacity-100">{isReplaying ? 'REPLAY MODE' : 'GROUND TRUTH'}</div>}
          <div className="stamp bottom-4 right-4 z-[1000] text-sm !border-[#8B4513] !text-[#8B4513]">FICTIONAL DATA</div>
          <TacticalMap buildings={buildings} officers={activeOfficers} isGroundTruth={isInstructor} role={role} />
        </main>

        {/* RIGHT COLUMN: Decision / Instructor */}
        <aside className="w-80 bg-[#000000] border-l border-[#4B5320] flex flex-col z-10">
          <div className="p-2.5 border-b border-[#4B5320] font-stencil text-[#FFD700] text-sm tracking-widest bg-[#3C3C3D]">
            {isInstructor ? 'INSTRUCTOR DASHBOARD' : 'SITUATION / ORDERS'}
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {isInstructor ? (
              <>
                <div className="mil-card bg-[#3C3C3D] border border-[#4B5320] space-y-2">
                  <p className="text-[10px] text-[#A9A9A9] uppercase font-bold tracking-widest font-mono">Lifecycle Controls</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'START' })} className="bg-[#6B8E23] text-[#000000] border border-[#FFD700] font-bold text-xs py-1.5 rounded hover:bg-[#FFD700] transition-colors uppercase">START</button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'PAUSE' })} className="bg-[#4B5320] border border-[#4B5320] text-[#B0C4DE] hover:bg-[#3C3C3D] text-xs py-1.5 rounded font-bold uppercase transition-colors">PAUSE</button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'RESUME' })} className="bg-[#6B8E23] border border-[#FFD700] text-[#000000] hover:bg-[#FFD700] font-bold text-xs py-1.5 rounded uppercase transition-colors">RESUME</button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'END' })} className="bg-[#8B4513] text-[#FFD700] border border-[#8B4513] hover:bg-[#FFD700] hover:text-[#000000] font-bold text-xs py-1.5 rounded transition-colors uppercase">END OP</button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <a href={`http://localhost:3001/api/exercise/${exerciseId}/report`} target="_blank" className="block text-center w-full bg-[#2F4F4F] text-[#B0C4DE] border border-[#4B5320] hover:bg-[#4B5320] hover:text-[#FFD700] font-bold text-xs py-1.5 rounded uppercase transition-colors">AAR REPORT</a>
                    <button onClick={handleStartReplay} className="bg-[#FFD700] text-[#000000] border border-[#FFD700] hover:bg-[#6B8E23] font-bold text-xs py-1.5 rounded uppercase transition-colors">{isReplaying ? 'REPLAYING...' : 'REPLAY'}</button>
                  </div>
                  {isReplaying && (
                    <div className="mt-2">
                      <input type="range" min="0" max={replayData?.maxTime || 0} value={replayTime} onChange={e => setReplayTime(Number(e.target.value))} className="w-full accent-[#FFD700]" />
                    </div>
                  )}
                </div>

                <div className="mil-card bg-[#3C3C3D] border border-[#4B5320] space-y-2">
                  <p className="text-[10px] text-[#FFD700] uppercase font-bold tracking-widest font-mono border-b border-[#4B5320] pb-1">Comms Degradation Engine</p>
                  <div className="space-y-1.5">
                    <button onClick={() => setChannelState('VHF', 'AVAILABLE', 0)} className="w-full bg-[#3C3C3D] hover:bg-[#6B8E23] hover:text-[#000000] border border-[#6B8E23] text-xs py-1.5 px-2 rounded font-mono text-[#6B8E23] text-left transition-colors font-bold">
                      ✔ RESTORE VHF (CLEAN NET)
                    </button>
                    <button onClick={() => setChannelState('VHF', 'DEGRADED', 10)} className="w-full bg-[#3C3C3D] hover:bg-[#FFD700] hover:text-[#000000] border border-[#FFD700] text-xs py-1.5 px-2 rounded font-mono text-[#FFD700] text-left transition-colors font-bold">
                      ⚠ DEGRADE VHF (10s DELAY)
                    </button>
                    <button onClick={() => setChannelState('VHF', 'UNAVAILABLE', 0)} className="w-full bg-[#3C3C3D] hover:bg-[#8B4513] hover:text-[#FFD700] border border-[#8B4513] text-xs py-1.5 px-2 rounded font-mono text-[#8B4513] text-left transition-colors font-bold">
                      ✖ DROPOUT VHF (BLACKOUT)
                    </button>
                  </div>
                </div>

                <div className="mil-card bg-[#3C3C3D] border border-[#4B5320]">
                  <p className="text-[10px] text-[#A9A9A9] uppercase font-bold mb-2 tracking-widest font-mono">Push VHF Orders</p>
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        value={customMsgText} 
                        onChange={e => setCustomMsgText(e.target.value)} 
                        placeholder="Type order text..." 
                        className="flex-1 bg-[#000000] border border-[#4B5320] rounded px-2 py-1 text-xs text-[#B0C4DE] font-mono outline-none focus:border-[#FFD700]" 
                      />
                      <button onClick={() => sendOrderMessage(customMsgText)} className="bg-[#6B8E23] text-[#000000] px-2 py-1 text-xs font-mono font-bold rounded hover:bg-[#FFD700]">SEND</button>
                    </div>
                    <button onClick={() => sendOrderMessage('All officers report to Operations Building immediately.')} className="w-full bg-[#3C3C3D] hover:bg-[#6B8E23] hover:text-[#000000] border border-[#4B5320] text-xs py-1.5 rounded font-mono text-[#B0C4DE] transition-colors text-left px-2">
                      &gt; PRESET: REGROUP ORDER
                    </button>
                    <button onClick={() => sendOrderMessage('Platoon Cmdr 1 reinforce Checkpoint 2 position.')} className="w-full bg-[#3C3C3D] hover:bg-[#6B8E23] hover:text-[#000000] border border-[#4B5320] text-xs py-1.5 rounded font-mono text-[#B0C4DE] transition-colors text-left px-2">
                      &gt; PRESET: REINFORCE CP2 ORDER
                    </button>
                    <button onClick={() => useAppStore.getState().socket?.emit('instructor:control', { exerciseId, action: 'INJECT_CONFLICTING_REPORTS', payload: { location: 'Checkpoint 2', channel: 'VHF' } })} className="w-full bg-[#3C3C3D] hover:bg-[#FFD700] hover:text-[#000000] border border-[#FFD700] text-xs py-2 rounded font-mono text-[#FFD700] transition-colors text-left px-2 font-bold shadow-md">
                      ⚡ INJECT CONFLICTING REPORTS (CP2)
                    </button>
                  </div>
                </div>

                <div className="mil-card bg-[#3C3C3D] border border-[#4B5320] flex-1 flex flex-col">
                  <p className="text-[10px] text-[#FFD700] uppercase font-bold mb-2 tracking-widest font-mono border-b border-[#4B5320] pb-1">Trainee Real-Time Decisions ({decisions?.length || 0})</p>
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-56">
                    {decisions?.slice().reverse().map((d: any) => (
                      <div key={d.id} className="text-xs font-mono bg-[#000000] p-2 rounded border-l-2 border-[#FFD700]">
                        <div className="flex justify-between items-center text-[10px] text-[#A9A9A9] mb-1">
                          <span className="font-bold text-[#FFD700]">{d.role}</span>
                          <span className="text-[#B0C4DE] font-bold">T+ {formatSimTime(d.simTime)}</span>
                        </div>
                        <div className="flex items-center gap-2 my-1">
                          <span className="bg-[#4B5320] text-[#000000] px-1.5 py-0.5 font-bold rounded text-[10px]">{d.choice}</span>
                          <span className={`text-[9px] px-1 rounded border font-bold ${d.confidence === 'HIGH' ? 'border-[#6B8E23] text-[#6B8E23]' : d.confidence === 'MEDIUM' ? 'border-[#FFD700] text-[#FFD700]' : 'border-[#8B4513] text-[#8B4513]'}`}>
                            CONF: {d.confidence}
                          </span>
                        </div>
                        <div className="text-[9px] text-[#A9A9A9] font-mono mt-1">Comms: {d.commsStateAtDecision}</div>
                        <div className="text-[10px] text-[#B0C4DE] italic mt-1 bg-[#3C3C3D]/50 p-1 rounded border border-[#4B5320]/50">"{d.rationale}"</div>
                      </div>
                    ))}
                    {(!decisions || decisions.length === 0) && <p className="text-xs text-[#A9A9A9] italic font-mono">No decisions submitted yet...</p>}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full gap-3 overflow-y-auto">
                <div className="mil-card bg-[#3C3C3D] border border-[#4B5320]">
                  <h3 className="text-xs font-bold text-[#FFD700] uppercase mb-2 border-b border-[#4B5320] pb-1 font-mono">Tactical Decision Under Uncertainty</h3>
                  <form onSubmit={handleSubmitDecision} className="space-y-3">
                    <div>
                      <label className="text-[10px] text-[#A9A9A9] uppercase font-mono font-bold block mb-1">1. Select Tactical Action</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['HOLD', 'REGROUP', 'PROCEED', 'REQUEST_RECON'] as const).map(choice => (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => setSelectedChoice(choice)}
                            className={`text-xs font-mono font-bold py-2 px-1 rounded border transition-colors ${selectedChoice === choice ? 'bg-[#FFD700] text-[#000000] border-[#FFD700]' : 'bg-[#000000] text-[#B0C4DE] border-[#4B5320] hover:border-[#6B8E23]'}`}
                          >
                            [{choice.replace('_', ' ')}]
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#A9A9A9] uppercase font-mono font-bold block mb-1">2. Confidence Level</label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['LOW', 'MEDIUM', 'HIGH'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setConfidenceLevel(level)}
                            className={`text-[10px] font-mono font-bold py-1 rounded border ${confidenceLevel === level ? 'bg-[#6B8E23] text-[#000000] border-[#6B8E23]' : 'bg-[#000000] text-[#A9A9A9] border-[#4B5320]'}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#A9A9A9] uppercase font-mono font-bold block mb-1">3. Decision Rationale (Why?)</label>
                      <textarea
                        required
                        rows={3}
                        value={rationaleText}
                        onChange={e => setRationaleText(e.target.value)}
                        placeholder="Explain rationale (e.g. Reports conflict between CP2 outpost and ISR feed)..."
                        className="w-full bg-[#000000] border border-[#4B5320] rounded p-2 text-xs text-[#B0C4DE] font-mono outline-none focus:border-[#FFD700] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedChoice || !rationaleText.trim()}
                      className="w-full bg-[#6B8E23] disabled:opacity-40 disabled:cursor-not-allowed text-[#000000] border border-[#FFD700] font-bold font-mono text-xs py-2.5 rounded hover:bg-[#FFD700] transition-colors uppercase tracking-wider shadow-lg"
                    >
                      SUBMIT DECISION TO HQ
                    </button>
                  </form>
                </div>

                <div className="mil-card bg-[#3C3C3D] border border-[#4B5320] flex-1 flex flex-col min-h-[140px]">
                  <h3 className="text-xs font-bold text-[#FFD700] uppercase mb-2 border-b border-[#4B5320] pb-1 font-mono">Incoming Orders & Intel Feeds</h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {messages?.map(msg => {
                      const isConflict = msg.isConflicting || msg.text?.includes('REPORT A') || msg.text?.includes('REPORT B');
                      return (
                        <div key={msg.id} className={`text-xs font-mono p-2 rounded border-l-2 ${isConflict ? 'border-[#FFD700] bg-[#000000] shadow-md' : 'border-[#4B5320] bg-[#000000]'}`}>
                          <div className="flex justify-between items-center text-[10px] text-[#A9A9A9] mb-1">
                            <span className="font-bold text-[#B0C4DE]">FROM: {msg.sender}</span>
                            <span className={`px-1 rounded border font-bold ${isConflict ? 'border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10 animate-pulse' : (msg.degradationTag?.includes('DELAYED') ? 'border-[#FFD700] text-[#FFD700]' : 'border-[#6B8E23] text-[#6B8E23]')}`}>
                              {isConflict ? '⚠ CONFLICTING REPORT' : (msg.degradationTag || 'VHF CLEAN')}
                            </span>
                          </div>
                          <span className={isConflict ? 'text-[#FFD700] font-bold block' : 'text-[#B0C4DE] block'}>{msg.text}</span>
                        </div>
                      );
                    })}
                    {messages?.length === 0 && <p className="text-xs text-[#A9A9A9] italic font-mono">No incoming traffic...</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      {/* BOTTOM BAR */}
      <footer className="h-10 bg-[#000000] border-t border-[#4B5320] flex items-center px-4 shrink-0 text-xs text-[#A9A9A9] font-mono justify-between">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#6B8E23] rounded-full inline-block"></span> Secure Net</span>
        </div>
        <div>Fictional unclassified training data.</div>
      </footer>
    </div>
  );
};

