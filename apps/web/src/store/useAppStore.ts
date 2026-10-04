import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Role, GroundTruthState, UnitState, Building, Officer } from '@echo-fog/shared';

interface AppState {
  socket: Socket | null;
  connected: boolean;
  role: Role | null;
  exerciseId: string | null;
  
  perceivedUnits: Record<string, UnitState & { perceivedStatus?: string }>;
  commsQuality: Record<string, number>;
  messages: any[];
  buildings: Record<string, Building>;
  officers: Record<string, Officer>;
  
  commsChannels: Record<string, { channel: string, status: 'AVAILABLE'|'DEGRADED'|'UNAVAILABLE', delaySeconds: number }>;
  decisions: any[];
  truthState: GroundTruthState | null;
  activeEffects: any[];
  participants: Role[];

  connect: (exerciseId: string, role: Role) => void;
  disconnect: () => void;
  startExercise: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  socket: null,
  connected: false,
  role: null,
  exerciseId: null,
  perceivedUnits: {},
  commsQuality: {},
  commsChannels: {},
  decisions: [],
  messages: [],
  buildings: {},
  officers: {},
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

    socket.on('state:perceived', (state: GroundTruthState) => {
      set({ 
        buildings: state.buildings,
        officers: state.officers,
        truthState: state
      });
    });

    socket.on('state:truth', (state: GroundTruthState) => {
      set({ truthState: state, buildings: state.buildings, officers: state.officers });
    });

    socket.on('effects:update', (effects) => {
      set({ activeEffects: effects });
    });

    socket.on('comms:update', (channels) => {
      set({ commsChannels: channels });
    });

    socket.on('decisions:update', (decisions) => {
      set({ decisions });
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
