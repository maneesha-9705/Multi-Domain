import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { RoleEnum, Role } from '@echo-fog/shared';

export const Lobby: React.FC = () => {
  const { connect, startExercise } = useAppStore();
  const [exerciseId, setExerciseId] = useState('');
  const [role, setRole] = useState<Role>('TRAINEE_COMPANY_CMDR');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (exerciseId && role) {
      connect(exerciseId, role);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base bg-camo bg-cover relative overflow-hidden">
      <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>

      <div className="z-10 bg-panel p-8 rounded-lg border-2 border-border shadow-2xl w-full max-w-lg relative">
        
        <div className="stamp top-4 right-4 text-2xl -rotate-12 opacity-40">EXERCISE ONLY</div>
        
        <div className="text-center mb-8 border-b border-border pb-4">
          <h1 className="text-5xl font-stencil text-accent tracking-widest drop-shadow-lg">ECHO-FOG</h1>
          <p className="text-muted font-mono mt-2 uppercase text-xs tracking-widest">Multi-Domain Decision Trainer</p>
        </div>
        
        <form onSubmit={handleJoin} className="space-y-6">
          <div className="mil-card">
            <label className="block text-xs font-bold text-accent mb-2 uppercase font-mono tracking-widest">Exercise ID</label>
            <input 
              type="text" 
              required
              value={exerciseId}
              onChange={e => setExerciseId(e.target.value.toUpperCase())}
              className="w-full bg-base border border-border rounded p-2 text-text focus:border-accent outline-none font-mono uppercase text-lg"
              placeholder="e.g. IND-007"
            />
          </div>

          <div className="mil-card">
            <label className="block text-xs font-bold text-accent mb-2 uppercase font-mono tracking-widest">Select Assignment</label>
            <div className="grid grid-cols-1 gap-2">
              <select 
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                className="w-full bg-base border border-border rounded p-3 text-text focus:border-accent outline-none font-mono text-sm uppercase"
                size={5}
              >
                {RoleEnum.options.map(r => (
                  <option key={r} value={r} className="p-2 border-b border-border/30 hover:bg-card">
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Dog tag preview */}
            <div className="mt-4 flex justify-center">
              <div className="bg-gradient-to-b from-gray-300 to-gray-500 text-black w-48 h-24 rounded-[30px] shadow-lg flex flex-col items-center justify-center font-mono p-2 border-2 border-gray-400 relative">
                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gray-600 shadow-inner"></div>
                <div className="text-[10px] uppercase font-bold text-gray-800">{role.replace(/_/g, ' ')}</div>
                <div className="text-xs font-bold mt-1 tracking-widest">{exerciseId || 'NO ID'}</div>
                <div className="text-[8px] mt-2 text-gray-700">SRV: {Math.floor(Math.random()*899999 + 100000)}</div>
                <div className="text-[8px] text-gray-700">BLOOD: O+</div>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-accent text-panel font-stencil text-xl py-3 px-4 rounded border-2 border-accent hover:bg-sand transition-colors uppercase tracking-widest"
          >
            Deploy
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-dashed border-border">
          <p className="text-[10px] text-muted mb-2 text-center uppercase font-mono tracking-widest">Instructor Tools</p>
          <button 
            onClick={() => startExercise()}
            className="w-full bg-base border-2 border-instructor text-instructor font-stencil py-2 px-4 rounded hover:bg-instructor hover:text-black transition-colors tracking-widest"
          >
            START DEMO OPORD
          </button>
        </div>
      </div>
    </div>
  );
};
