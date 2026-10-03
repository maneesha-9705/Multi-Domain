import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Role, GroundTruthState, UnitState } from '@echo-fog/shared';

interface AppState {
  socket: Socket | null;
  connected: boolean;
  role: Role | null;
  exerciseId: string | null;
  
  // State for trainees (perceived)
  perceivedUnits: Record<string, UnitState & { perceivedStatus?: string }>;
  commsQuality: Record<string, number>;
  messages: any[];
  
  // State for instructor (truth)
  truthState: GroundTruthState | null;
  activeEffects: any[];
  participants: Role[];

  connect: (exerciseId: string, role: Role) => void;
  disconnect: () => void;
  
  // Actions
  startExercise: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  socket: null,
  connected: false,
  role: null,
  exerciseId: null,
  perceivedUnits: {},
  commsQuality: {},
  messages: [],
  truthState: null,
  activeEffects: [],
  participants: [],

  connect: (exerciseId: string, role: Role) => {
    const socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      set({ connected: true, socket, role, exerciseId });
      socket.emit('exercise:join', { exerciseId, role });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('state:perceived', (data) => {
      set({ 
        perceivedUnits: data.perceivedUnits,
        commsQuality: data.commsQuality
      });
    });

    socket.on('state:truth', (data) => {
      set({ truthState: data });
    });

    socket.on('effects:update', (effects) => {
      set({ activeEffects: effects });
    });

    socket.on('participants:update', (participants) => {
      set({ participants });
    });

    socket.on('messages:update', (msg) => {
      set((state) => ({ messages: [msg, ...state.messages] }));
    });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false, role: null, exerciseId: null });
    }
  },

  startExercise: async () => {
    try {
      const res = await fetch('http://localhost:3001/api/exercise/start', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.exerciseId) {
        // Automatically connect as instructor for demo purposes if we started it
        get().connect(data.exerciseId, 'INSTRUCTOR');
      }
    } catch (e) {
      console.error('Failed to start exercise', e);
    }
  }
}));
