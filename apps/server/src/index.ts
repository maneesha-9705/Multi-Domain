import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { RoleEnum, Role } from '@echo-fog/shared';
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

app.get('/api/exercise/:id/report', (req, res) => {
  const session = activeExercises.get(req.params.id);
  if (!session) return res.status(404).send('Exercise not found');
  
  const events = session.engine.logger.getEvents();
  const state = session.engine.getState();
  
  const officerStats = Object.values(state.officers).map(o => {
    const movements = events.filter(e => e.type === 'OFFICER_MOVED' && e.officerId === o.id).length;
    return `<tr><td>${o.id}</td><td>${o.name}</td><td>${o.role}</td><td>${movements}</td></tr>`;
  }).join('');

  const timeline = events.map(e => {
    const time = new Date(e.timestamp * 1000).toISOString().substr(11, 8);
    return `<tr><td>${time}</td><td>${e.type}</td><td>${e.description}</td></tr>`;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ECHO-FOG AAR - ${req.params.id}</title>
      <style>
        body { font-family: monospace; background: #fff; color: #000; padding: 40px; max-width: 800px; margin: auto; }
        @media print { body { padding: 0; } }
        h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; text-transform: uppercase; }
        h2 { border-bottom: 1px dashed #000; margin-top: 30px; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background: #eee; }
        .stamp { font-size: 24px; color: #d00; border: 3px solid #d00; padding: 10px; display: inline-block; transform: rotate(-5deg); position: absolute; top: 20px; right: 20px; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="stamp">EXERCISE ONLY<br/>FICTIONAL DATA</div>
      <h1>ECHO-FOG AFTER-ACTION REPORT</h1>
      
      <table>
        <tr><th>Operation ID</th><td>${req.params.id}</td></tr>
        <tr><th>Operation Status</th><td>${state.status}</td></tr>
        <tr><th>Total Duration (Sim Time)</th><td>${state.simTime} seconds</td></tr>
        <tr><th>Total Events</th><td>${events.length}</td></tr>
      </table>

      <h2>Officer Activity</h2>
      <table>
        <tr><th>ID</th><th>Name</th><th>Role</th><th>Total Movements</th></tr>
        ${officerStats}
      </table>

      <h2>Chronological Timeline</h2>
      <table>
        <tr><th>Time (T+)</th><th>Event Type</th><th>Description</th></tr>
        ${timeline}
      </table>
      
      <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
        End of Report. Fictional unclassified training data.
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

async function ensureExerciseInitialized(exerciseId: string) {
  if (activeExercises.has(exerciseId)) return activeExercises.get(exerciseId)!;
  
  const engine = new SimulationEngine(exerciseId, scenario1);
  if (scenario1.initialBuildings && scenario1.initialOfficers) {
    engine.initFictionalEntities(scenario1.initialBuildings, scenario1.initialOfficers);
  }

  const pipeline = new DegradationPipeline();
  const session = { engine, pipeline, participants: new Set<Role>() };
  activeExercises.set(exerciseId, session);

  engine.on('tick', (state) => {
    io.to(`instructor_${exerciseId}`).emit('state:truth', state);
    io.to(`instructor_${exerciseId}`).emit('effects:update', pipeline.getActiveEffects());
    io.to(`instructor_${exerciseId}`).emit('participants:update', Array.from(session.participants));
    
    // Broadcast state to all trainees (in this fictional dashboard, state is unified)
    RoleEnum.options.forEach(role => {
      io.to(`trainee_${exerciseId}_${role}`).emit('state:perceived', state);
    });
  });

  engine.on('injectTriggered', (inject) => {
    io.to(`instructor_${exerciseId}`).emit('instructor:inject_alert', inject);
    
    if (inject.type === 'COMMS_DEGRADED') {
      const { channel, severity } = inject.payload;
      // Affect all officers on this network
      Object.values(engine.getState().officers).forEach(off => {
        if (off.commsNetwork === channel) {
          engine.setOfficerComms(off.id, channel, 'DEGRADED');
        }
      });
    }
    
    if (inject.type === 'MOVE_OFFICER') {
      const { officerId, targetBuildingId } = inject.payload;
      engine.moveOfficerToBuilding(officerId, targetBuildingId);
    }
  });

  // Default to not started
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

    socket.on('disconnect', () => {
      session.participants.delete(role);
      io.to(`instructor_${exerciseId}`).emit('participants:update', Array.from(session.participants));
    });
  });

  socket.on('instructor:control', (data) => {
    const { exerciseId, action, payload } = data;
    const session = activeExercises.get(exerciseId);
    if (!session) return;

    if (action === 'START') session.engine.start();
    if (action === 'PAUSE') session.engine.pause();
    if (action === 'RESUME') session.engine.start();
    if (action === 'END') session.engine.end();
    if (action === 'SPEED') session.engine.setSpeed(payload.multiplier);
    if (action === 'INJECT_EFFECT') session.pipeline.addEffect(payload.effect);
    if (action === 'REMOVE_EFFECT') session.pipeline.removeEffect(payload.effectId);
    if (action === 'SEND_MESSAGE') {
       session.engine.logger.logEvent({
         type: 'ORDER_ISSUED',
         timestamp: session.engine.getState().simTime,
         description: `Order from ${payload.sender}: ${payload.text}`
       });
       io.to(`trainee_${exerciseId}_TRAINEE_COMPANY_CMDR`).emit('messages:update', payload);
    }
    if (action === 'MOVE_OFFICER') {
       session.engine.moveOfficerToBuilding(payload.officerId, payload.targetBuildingId);
    }
    if (action === 'SET_COMMS') {
       session.engine.setOfficerComms(payload.officerId, payload.channel, payload.status);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`ECHO-FOG Server running on port ${PORT}`);
});