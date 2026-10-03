import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { RoleEnum } from '@echo-fog/shared';
import { SimulationEngine } from './engine/SimulationEngine';
import { scenario1 } from './data/scenario1';
import { DegradationPipeline } from './engine/DegradationPipeline';
import aarRouter from './routes/aar';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For demo purposes
  }
});
const prisma = new PrismaClient();

// In-memory store for active exercises
const activeExercises = new Map<string, { 
  engine: SimulationEngine, 
  pipeline: DegradationPipeline,
  participants: Set<Role>
}>();

app.use(cors());
app.use(express.json());

app.use('/api/aar', aarRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', roles: RoleEnum.options });
});

async function ensureExerciseInitialized(exerciseId: string) {
  if (activeExercises.has(exerciseId)) return activeExercises.get(exerciseId)!;
  
  const engine = new SimulationEngine(exerciseId, scenario1);
  const pipeline = new DegradationPipeline();
  const session = { engine, pipeline, participants: new Set<Role>() };
  activeExercises.set(exerciseId, session);

  engine.on('tick', (state) => {
    io.to(`instructor_${exerciseId}`).emit('state:truth', state);
    io.to(`instructor_${exerciseId}`).emit('effects:update', pipeline.getActiveEffects());
    io.to(`instructor_${exerciseId}`).emit('participants:update', Array.from(session.participants));
    
    const rolesToUpdate: Role[] = ['TRAINEE_COMPANY_CMDR', 'TRAINEE_PLATOON_CMDR_1', 'TRAINEE_PLATOON_CMDR_2'];
    rolesToUpdate.forEach(role => {
      const perceived = pipeline.processStateForRole(state, role);
      io.to(`trainee_${exerciseId}_${role}`).emit('state:perceived', perceived);
    });
  });

  engine.on('injectTriggered', (inject) => {
    io.to(`instructor_${exerciseId}`).emit('instructor:inject_alert', inject);
    if (inject.type === 'START_JAMMING') {
      pipeline.addEffect({
        id: inject.id,
        type: 'DROPOUT',
        targetChannel: inject.payload.channel,
        intensity: inject.payload.intensity,
        active: true
      });
    }
  });

  // Start paused by default so instructor has to press Resume
  engine.pause(); 
  
  return session;
}

app.post('/api/exercise/start', async (req, res) => {
  try {
    const exercise = await prisma.exercise.create({
      data: { scenarioId: scenario1.id, status: 'RUNNING' }
    });
    await ensureExerciseInitialized(exercise.id);
    res.json({ exerciseId: exercise.id, status: 'started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start exercise' });
  }
});

io.on('connection', (socket) => {
  
  socket.on('exercise:join', async (data) => {
    const { exerciseId, role } = data as { exerciseId: string, role: Role };
    const session = await ensureExerciseInitialized(exerciseId);
    
    session.participants.add(role);

    if (role === 'INSTRUCTOR') {
      socket.join(`instructor_${exerciseId}`);
      socket.emit('participants:update', Array.from(session.participants));
    } else {
      socket.join(`trainee_${exerciseId}_${role}`);
      io.to(`instructor_${exerciseId}`).emit('participants:update', Array.from(session.participants));
    }

    // Handle disconnect cleanup
    socket.on('disconnect', () => {
      session.participants.delete(role);
      io.to(`instructor_${exerciseId}`).emit('participants:update', Array.from(session.participants));
    });
  });

  socket.on('instructor:control', (data) => {
    const { exerciseId, action, payload } = data;
    const session = activeExercises.get(exerciseId);
    if (!session) return;

    if (action === 'PAUSE') session.engine.pause();
    if (action === 'RESUME') session.engine.start();
    if (action === 'SPEED') session.engine.setSpeed(payload.multiplier);
    if (action === 'INJECT_EFFECT') session.pipeline.addEffect(payload.effect);
    if (action === 'REMOVE_EFFECT') session.pipeline.removeEffect(payload.effectId);
    if (action === 'SEND_MESSAGE') {
       io.to(`trainee_${exerciseId}_TRAINEE_COMPANY_CMDR`).emit('messages:update', payload);
       io.to(`trainee_${exerciseId}_TRAINEE_PLATOON_CMDR_1`).emit('messages:update', payload);
       io.to(`trainee_${exerciseId}_TRAINEE_PLATOON_CMDR_2`).emit('messages:update', payload);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`ECHO-FOG Server running on port ${PORT}`);
});