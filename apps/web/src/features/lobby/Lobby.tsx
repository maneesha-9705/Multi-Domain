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
    <div className="flex flex-col items-center justify-center min-h-screen bg-base">
      <div className="bg-panel p-8 rounded-lg border border-border shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-accent mb-6 text-center">ECHO-FOG Simulator</h1>
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Exercise ID</label>
            <input 
              type="text" 
              required
              value={exerciseId}
              onChange={e => setExerciseId(e.target.value)}
              className="w-full bg-base border border-border rounded p-2 text-text focus:border-accent outline-none"
              placeholder="e.g. uuid"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Role</label>
            <select 
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full bg-base border border-border rounded p-2 text-text focus:border-accent outline-none"
            >
              {RoleEnum.options.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-accent text-base font-bold py-2 px-4 rounded hover:bg-cyan-300 transition-colors mt-4"
          >
            Join Exercise
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted mb-4 text-center">Instructor Demo Tools</p>
          <button 
            onClick={() => startExercise()}
            className="w-full bg-transparent border border-instructor text-instructor font-bold py-2 px-4 rounded hover:bg-instructor hover:text-black transition-colors"
          >
            Start New Demo Scenario
          </button>
        </div>
      </div>
    </div>
  );
};
