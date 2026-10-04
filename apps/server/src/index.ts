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
  participants: Set<Role>,
  decisions: any[]
}>();

app.use(cors());
app.use(express.json());

app.use('/api/aar', aarRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', roles: RoleEnum.options });
});

app.get('/api/exercise/:id/data', (req, res) => {
  const session = activeExercises.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Exercise not found' });
  res.json({
    events: session.engine.logger.getEvents(),
    buildings: session.engine.getState().buildings,
    officers: session.engine.getState().officers
  });
});

app.get('/api/exercise/:id/report', (req, res) => {
  const session = activeExercises.get(req.params.id);
  if (!session) return res.status(404).send('Exercise not found');
  
  const events = session.engine.logger.getEvents();
  const state = session.engine.getState();
  const decisions = session.decisions || [];
  const participants = Array.from(session.participants);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `T+${h}${m}${s}Z`;
  };

  // Metrics Calculation from REAL data
  const totalDecisions = decisions.length;
  const avgResponseTime = totalDecisions > 0 
    ? (decisions.reduce((sum: number, d: any) => sum + (d.timeToDecideMs || 0), 0) / totalDecisions / 1000).toFixed(1)
    : 'N/A';
  const fastestDecision = totalDecisions > 0 
    ? (Math.min(...decisions.map((d: any) => d.timeToDecideMs || 0)) / 1000).toFixed(1)
    : 'N/A';
  const slowestDecision = totalDecisions > 0 
    ? (Math.max(...decisions.map((d: any) => d.timeToDecideMs || 0)) / 1000).toFixed(1)
    : 'N/A';
  
  const decisionsUnderDegraded = decisions.filter((d: any) => 
    d.commsStateAtDecision?.includes('DEGRADED') || d.commsStateAtDecision?.includes('UNAVAILABLE')
  ).length;

  const decisionsUnderConflict = decisions.filter((d: any) => 
    d.infoAvailableSnapshot?.activeConflictingReports?.length > 0
  ).length;

  const rationaleCount = decisions.filter((d: any) => d.rationale && d.rationale.trim() !== 'No rationale provided.').length;
  const rationaleRate = totalDecisions > 0 ? `${Math.round((rationaleCount / totalDecisions) * 100)}%` : 'N/A';

  // Comms Impact Calculation
  const normalDecisions = decisions.filter((d: any) => d.commsStateAtDecision?.includes('AVAILABLE') && !d.commsStateAtDecision?.includes('DEGRADED'));
  const degradedDecisions = decisions.filter((d: any) => d.commsStateAtDecision?.includes('DEGRADED') || d.commsStateAtDecision?.includes('UNAVAILABLE'));
  
  const normalAvg = normalDecisions.length >= 1 
    ? (normalDecisions.reduce((s: number, d: any) => s + (d.timeToDecideMs || 0), 0) / normalDecisions.length / 1000).toFixed(1) + ' sec'
    : 'INSUFFICIENT DATA';
  const degradedAvg = degradedDecisions.length >= 1 
    ? (degradedDecisions.reduce((s: number, d: any) => s + (d.timeToDecideMs || 0), 0) / degradedDecisions.length / 1000).toFixed(1) + ' sec'
    : 'INSUFFICIENT DATA';
  const conflictAvg = decisionsUnderConflict >= 1 
    ? (decisions.filter((d: any) => d.infoAvailableSnapshot?.activeConflictingReports?.length > 0).reduce((s: number, d: any) => s + (d.timeToDecideMs || 0), 0) / decisionsUnderConflict / 1000).toFixed(1) + ' sec'
    : 'INSUFFICIENT DATA';

  // Group Decisions By Role
  const decisionsByRole: Record<string, any[]> = {};
  decisions.forEach((d: any) => {
    const r = d.role || 'UNKNOWN_ROLE';
    if (!decisionsByRole[r]) decisionsByRole[r] = [];
    decisionsByRole[r].push(d);
  });

  const individualTimelinesHtml = Object.entries(decisionsByRole).map(([r, roleDecisions]) => {
    const cards = roleDecisions.map((d: any) => {
      const snapshot = d.infoAvailableSnapshot || {};
      const conflicts = snapshot.activeConflictingReports || [];
      const conflictText = conflicts.length > 0 
        ? conflicts.map((c: any) => `<li>${c.description}</li>`).join('')
        : '<li>No conflicting reports active at decision time.</li>';

      return `
        <div class="decision-card">
          <div class="card-header">
            <span class="badge choice">${d.choice}</span>
            <span class="badge conf-${(d.confidence || 'MEDIUM').toLowerCase()}">CONFIDENCE: ${d.confidence || 'MEDIUM'}</span>
            <span class="time">${formatTime(d.simTime)} (Replay Ref)</span>
          </div>
          <table class="sub-table">
            <tr><th>Response Latency</th><td>${((d.timeToDecideMs || 0) / 1000).toFixed(1)} seconds</td></tr>
            <tr><th>Comms Condition</th><td>${d.commsStateAtDecision || 'VHF AVAILABLE'}</td></tr>
            <tr><th>Written Rationale</th><td class="rationale-text">"${d.rationale}"</td></tr>
            <tr>
              <th>Information Available at Decision</th>
              <td>
                <div class="snapshot-box">
                  <strong>Active Comms Nets:</strong> ${(d.availableChannels || ['VHF']).join(', ')}<br/>
                  <strong>Active Intelligence Feeds:</strong>
                  <ul>${conflictText}</ul>
                </div>
              </td>
            </tr>
          </table>
        </div>
      `;
    }).join('');

    return `
      <div class="role-section">
        <h3>ROLE: ${r.replace(/_/g, ' ')}</h3>
        ${cards}
      </div>
    `;
  }).join('');

  // Team Decision Sequence HTML
  const teamTimelineRows = decisions.map((d: any) => `
    <tr>
      <td>${formatTime(d.simTime)}</td>
      <td><strong>${d.role}</strong></td>
      <td><span class="badge choice-inline">${d.choice}</span></td>
      <td>${d.confidence}</td>
      <td>${((d.timeToDecideMs || 0) / 1000).toFixed(1)}s</td>
      <td>${d.commsStateAtDecision}</td>
    </tr>
  `).join('');

  // Comms Timeline Rows
  const commsEvents = events.filter((e: any) => e.type.startsWith('COMMUNICATION_'));
  const commsTimelineRows = commsEvents.map((e: any) => `
    <tr>
      <td>${formatTime(e.timestamp)}</td>
      <td>${e.channel || 'VHF'}</td>
      <td><strong>${e.type}</strong></td>
      <td>${e.description}</td>
    </tr>
  `).join('');

  // Conflicting Reports Analysis Rows
  const conflictEvents = events.filter((e: any) => e.type === 'INJECT_CONFLICTING_REPORTS');
  const conflictRows = conflictEvents.map((e: any) => {
    const data = e.data || {};
    const repA = data.reportA || {};
    const repB = data.reportB || {};
    return `
      <div class="conflict-card">
        <div class="conflict-title">⚡ CONFLICTING INTEL INJECTION at ${formatTime(e.timestamp)}</div>
        <div class="conflict-grid">
          <div class="report-box">
            <strong>REPORT A (${repA.sender || 'OUTPOST'})</strong><br/>
            "${repA.text || 'Sector secure.'}"
          </div>
          <div class="report-box">
            <strong>REPORT B (${repB.sender || 'ISR PATROL'})</strong><br/>
            "${repB.text || 'Movement detected.'}"
          </div>
        </div>
        <div class="conflict-meta">Channel: ${e.channel || 'VHF'} // Trainee Decision Exposure: ${decisionsUnderConflict} decisions recorded under this conflict.</div>
      </div>
    `;
  }).join('');

  // Master Event -> Information -> Decision Chain Rows
  const masterChainRows = events.filter((e: any) => 
    ['ORDER_ISSUED', 'COMMUNICATION_DEGRADED', 'COMMUNICATION_DELAYED', 'COMMUNICATION_DROPOUT', 'INJECT_CONFLICTING_REPORTS', 'TRAINEE_DECISION'].includes(e.type)
  ).map((e: any) => {
    const isDecision = e.type === 'TRAINEE_DECISION';
    const decData = e.data || {};
    return `
      <tr class="${isDecision ? 'decision-row' : ''}">
        <td>${formatTime(e.timestamp)}</td>
        <td><strong>${e.type}</strong></td>
        <td>${e.description}</td>
        <td>${isDecision ? decData.choice : '-'}</td>
        <td>${isDecision ? `"${decData.rationale}"` : '-'}</td>
        <td>${isDecision ? ((decData.timeToDecideMs || 0) / 1000).toFixed(1) + 's' : '-'}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ECHO-FOG AAR - ${req.params.id}</title>
      <style>
        body { font-family: 'JetBrains Mono', monospace, sans-serif; background: #ffffff; color: #000000; padding: 40px; max-width: 950px; margin: auto; line-height: 1.5; }
        @media print { body { padding: 0; max-width: 100%; } .no-print { display: none; } }
        h1 { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; text-transform: uppercase; font-size: 26px; margin-bottom: 5px; }
        .sub-header { text-align: center; font-weight: bold; font-size: 12px; color: #444; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px; }
        h2 { border-bottom: 2px solid #000; margin-top: 35px; padding-bottom: 5px; text-transform: uppercase; font-size: 16px; background: #f0f0f0; padding-left: 8px; }
        h3 { border-bottom: 1px solid #666; margin-top: 20px; font-size: 14px; text-transform: uppercase; color: #222; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; font-size: 11px; }
        th, td { border: 1px solid #000; padding: 7px; text-align: left; }
        th { background: #e0e0e0; font-weight: bold; text-transform: uppercase; }
        .stamp { font-size: 20px; color: #d00; border: 3px solid #d00; padding: 8px 12px; display: inline-block; transform: rotate(-4deg); position: absolute; top: 25px; right: 25px; text-transform: uppercase; font-weight: bold; }
        .summary-box { border: 2px solid #000; padding: 15px; background: #f9f9f9; margin-bottom: 25px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; margin-top: 10px; }
        .stat-card { border: 1px solid #000; padding: 8px; background: #fff; }
        .stat-val { font-size: 18px; font-weight: bold; margin-top: 4px; }
        .stat-lbl { font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; }
        .role-section { border: 1px solid #888; padding: 12px; margin-bottom: 20px; background: #fafafa; }
        .decision-card { border: 1px solid #000; padding: 12px; margin-top: 10px; background: #fff; }
        .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 8px; }
        .badge { font-weight: bold; padding: 3px 8px; border: 1px solid #000; text-transform: uppercase; font-size: 11px; }
        .badge.choice { background: #4B5320; color: #fff; }
        .badge.choice-inline { background: #3C3C3D; color: #FFD700; border: none; }
        .badge.conf-high { background: #d4edda; color: #155724; border-color: #c3e6cb; }
        .badge.conf-medium { background: #fff3cd; color: #856404; border-color: #ffeeba; }
        .badge.conf-low { background: #f8d7da; color: #721c24; border-color: #f5c6cb; }
        .time { font-weight: bold; font-size: 11px; }
        .rationale-text { font-style: italic; background: #f0f4f8; padding: 6px; font-weight: bold; }
        .snapshot-box { font-size: 10px; line-height: 1.4; }
        .snapshot-box ul { margin: 4px 0 0 15px; padding: 0; }
        .conflict-card { border: 1px solid #b8860b; background: #fffdf0; padding: 10px; margin-bottom: 12px; }
        .conflict-title { font-weight: bold; color: #8b6508; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
        .conflict-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .report-box { border: 1px border #ccc; background: #fff; padding: 8px; font-size: 10px; }
        .conflict-meta { font-size: 10px; margin-top: 8px; color: #666; font-style: italic; }
        .decision-row { background: #f0f7ff; }
        .disclaimer-footer { margin-top: 40px; padding: 12px; border: 1px border #ccc; background: #eee; font-size: 10px; text-align: center; color: #444; }
      </style>
    </head>
    <body>
      <div class="stamp">EXERCISE ONLY<br/>FICTIONAL DATA</div>
      <h1>ECHO-FOG AFTER-ACTION REVIEW</h1>
      <div class="sub-header">Multi-Domain Decision-Making Trainer for Degraded Comms (SIH 26248)</div>

      <!-- EVALUATOR EXECUTIVE SUMMARY -->
      <div class="summary-box">
        <strong style="text-transform: uppercase; font-size: 13px;">EXERCISE OUTCOME & PERFORMANCE SUMMARY</strong>
        <div class="summary-grid">
          <div class="stat-card">
            <div class="stat-lbl">Connected Roles</div>
            <div class="stat-val">${participants.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Total Decisions</div>
            <div class="stat-val">${totalDecisions}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Degraded Comms Decisions</div>
            <div class="stat-val">${decisionsUnderDegraded}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Conflict-Exposed Decisions</div>
            <div class="stat-val">${decisionsUnderConflict}</div>
          </div>
        </div>
        <div class="summary-grid" style="margin-top: 8px;">
          <div class="stat-card">
            <div class="stat-lbl">Avg Response Time</div>
            <div class="stat-val">${avgResponseTime} s</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Response Time Range</div>
            <div class="stat-val">${fastestDecision}s - ${slowestDecision}s</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Rationale Rate</div>
            <div class="stat-val">${rationaleRate}</div>
          </div>
          <div class="stat-card">
            <div class="stat-lbl">Comms Condition</div>
            <div class="stat-val" style="font-size: 12px;">${decisionsUnderDegraded > 0 ? 'DEGRADED' : 'NORMAL'}</div>
          </div>
        </div>
      </div>

      <!-- SECTION 1: EXERCISE OVERVIEW -->
      <h2>1. EXERCISE OVERVIEW</h2>
      <table>
        <tr><th>Operation / Exercise ID</th><td>${req.params.id}</td></tr>
        <tr><th>Scenario Name</th><td>${state.scenarioId} (Operation Iron Veil)</td></tr>
        <tr><th>Operation Status</th><td>${state.status}</td></tr>
        <tr><th>Total Simulation Duration</th><td>${state.simTime} seconds (${formatTime(state.simTime)})</td></tr>
        <tr><th>Connected Participants</th><td>${participants.map(p => p.replace(/_/g, ' ')).join(', ') || 'INSTRUCTOR'}</td></tr>
        <tr><th>Total Recorded Events</th><td>${events.length}</td></tr>
      </table>

      <!-- SECTION 2: CHRONOLOGICAL COMMUNICATION TIMELINE -->
      <h2>2. COMMUNICATION DEGRADATION TIMELINE</h2>
      ${commsTimelineRows.length > 0 ? `
        <table>
          <tr><th>Sim Time</th><th>Channel</th><th>Event Type</th><th>Description</th></tr>
          ${commsTimelineRows}
        </table>
      ` : '<p style="font-size: 11px; italic;">No communication status changes recorded.</p>'}

      <!-- SECTION 3: TEAM DECISION SEQUENCE -->
      <h2>3. TEAM DECISION SEQUENCE</h2>
      ${teamTimelineRows.length > 0 ? `
        <table>
          <tr><th>Replay Ref</th><th>Role</th><th>Choice</th><th>Confidence</th><th>Response Time</th><th>Comms Condition</th></tr>
          ${teamTimelineRows}
        </table>
      ` : '<p style="font-size: 11px; italic;">No trainee decisions recorded during this exercise session.</p>'}

      <!-- SECTION 4: INDIVIDUAL DECISION TIMELINES & RATIONALES -->
      <h2>4. INDIVIDUAL DECISION TIMELINES & RATIONALE</h2>
      ${individualTimelinesHtml || '<p style="font-size: 11px; italic;">No individual trainee decisions submitted.</p>'}

      <!-- SECTION 5: INFORMATION CONFLICT ANALYSIS -->
      <h2>5. INFORMATION CONFLICT ANALYSIS</h2>
      ${conflictRows.length > 0 ? conflictRows : '<p style="font-size: 11px; italic;">No conflicting intelligence reports were injected during this exercise.</p>'}

      <!-- SECTION 6: DECISION PERFORMANCE & COMMS IMPACT -->
      <h2>6. PERFORMANCE METRICS & COMMUNICATION IMPACT ANALYSIS</h2>
      <table>
        <tr><th>Metric</th><th>Recorded Value</th><th>Notes</th></tr>
        <tr><td>Total Decisions Submitted</td><td>${totalDecisions}</td><td>Captured via real-time Socket.IO pipeline</td></tr>
        <tr><td>Average Decision Latency</td><td>${avgResponseTime} seconds</td><td>Time from prompt/order to submission</td></tr>
        <tr><td>Fastest / Slowest Decision</td><td>${fastestDecision}s / ${slowestDecision}s</td><td>Response speed range</td></tr>
        <tr><td>Rationale Completion Rate</td><td>${rationaleRate}</td><td>Percentage of decisions with written rationale</td></tr>
        <tr><td>Decisions Made Under Degraded Comms</td><td>${decisionsUnderDegraded}</td><td>Executed while channel latency or dropout was active</td></tr>
        <tr><td>Decisions Made Under Conflicting Intel</td><td>${decisionsUnderConflict}</td><td>Executed while contradictory reports were unverified</td></tr>
      </table>

      <h3>Response Latency By Comms Condition</h3>
      <table>
        <tr><th>Condition</th><th>Sample Size</th><th>Average Response Time</th></tr>
        <tr><td>Normal Communication (Clean Net)</td><td>${normalDecisions.length}</td><td>${normalAvg}</td></tr>
        <tr><td>Degraded Communication (Latency / Dropout)</td><td>${degradedDecisions.length}</td><td>${degradedAvg}</td></tr>
        <tr><td>Conflicting Information Active</td><td>${decisionsUnderConflict}</td><td>${conflictAvg}</td></tr>
      </table>

      <!-- SECTION 7: EVENT -> INFORMATION -> DECISION CHAIN -->
      <h2>7. EVENT → INFORMATION → DECISION CHAIN</h2>
      <table>
        <tr><th>Sim Time</th><th>Event Type</th><th>Description / Intel Received</th><th>Action Choice</th><th>Rationale</th><th>Response Latency</th></tr>
        ${masterChainRows}
      </table>

      <!-- DISCLAIMER FOOTER -->
      <div class="disclaimer-footer">
        <strong>TRAINING & DECISION-SUPPORT PROTOTYPE DISCLAIMER</strong><br/>
        This After Action Review is generated from fictional unclassified simulation data produced by the ECHO-FOG platform (SIH 26248).
        This document is designed for evaluating decision-making under uncertainty for staff college training and must not be used as operational military intelligence.
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
  const session = { engine, pipeline, participants: new Set<Role>(), decisions: [] };
  activeExercises.set(exerciseId, session);

  engine.on('tick', (state) => {
    io.to(`instructor_${exerciseId}`).emit('state:truth', state);
    io.to(`instructor_${exerciseId}`).emit('effects:update', pipeline.getActiveEffects());
    io.to(`instructor_${exerciseId}`).emit('comms:update', pipeline.getAllChannels());
    io.to(`instructor_${exerciseId}`).emit('participants:update', Array.from(session.participants));
    
    // Broadcast perceived state to each trainee role room
    RoleEnum.options.forEach(role => {
      const perceivedState = pipeline.processStateForRole(state, role);
      io.to(`trainee_${exerciseId}_${role}`).emit('state:perceived', perceivedState);
      io.to(`trainee_${exerciseId}_${role}`).emit('comms:update', pipeline.getAllChannels());
    });
  });

  engine.on('messageDelivered', ({ targetRole, message }) => {
    if (targetRole === 'ALL') {
      RoleEnum.options.forEach(r => io.to(`trainee_${exerciseId}_${r}`).emit('messages:update', message));
    } else {
      io.to(`trainee_${exerciseId}_${targetRole}`).emit('messages:update', message);
    }
    io.to(`instructor_${exerciseId}`).emit('messages:update', message);
  });

  engine.on('injectTriggered', (inject) => {
    io.to(`instructor_${exerciseId}`).emit('instructor:inject_alert', inject);
    
    if (inject.type === 'COMMS_DEGRADED') {
      const { channel, severity } = inject.payload;
      engine.setChannelStatus(channel || 'VHF', 'DEGRADED', 10);
    }
    
    if (inject.type === 'MOVE_OFFICER') {
      const { officerId, targetBuildingId } = inject.payload;
      engine.moveOfficerToBuilding(officerId, targetBuildingId);
    }
  });

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
      socket.emit('state:truth', session.engine.getState());
      socket.emit('participants:update', Array.from(session.participants));
      socket.emit('comms:update', session.pipeline.getAllChannels());
      socket.emit('decisions:update', session.decisions);
    } else {
      socket.join(`trainee_${exerciseId}_${role}`);
      socket.emit('state:perceived', session.pipeline.processStateForRole(session.engine.getState(), role));
      socket.emit('comms:update', session.pipeline.getAllChannels());
      socket.emit('decisions:update', session.decisions);
      io.to(`instructor_${exerciseId}`).emit('participants:update', Array.from(session.participants));
      
      // Spawn officer dynamically at random predefined position
      session.engine.spawnOfficer(role);
    }

    socket.on('disconnect', () => {
      session.participants.delete(role);
      io.to(`instructor_${exerciseId}`).emit('participants:update', Array.from(session.participants));
    });
  });

  socket.on('trainee:submit_decision', async (data) => {
    const { exerciseId, role, choice, rationale, confidence, timeToDecideMs } = data;
    const session = activeExercises.get(exerciseId);
    if (!session) return;

    const vhfState = session.pipeline.getChannelState('VHF');
    const commsDesc = `VHF ${vhfState.status}${vhfState.delaySeconds ? ` (${vhfState.delaySeconds}s LATENCY)` : ''}`;

    const decisionRecord = {
      id: `DEC-${Date.now()}`,
      exerciseId,
      scenarioId: session.engine.getState().scenarioId,
      role: role || 'TRAINEE_COMPANY_CMDR',
      choice,
      rationale: rationale || 'No rationale provided.',
      confidence: confidence || 'MEDIUM',
      simTime: session.engine.getState().simTime,
      timeToDecideMs: timeToDecideMs || 0,
      commsStateAtDecision: commsDesc,
      availableChannels: Object.keys(session.pipeline.getAllChannels()),
      infoAvailableSnapshot: {
        buildings: Object.values(session.engine.getState().buildings).map((b: any) => ({ id: b.id, name: b.name, status: b.status, officersCount: b.officers.length })),
        officers: Object.values(session.engine.getState().officers).map((o: any) => ({ id: o.id, name: o.name, commsStatus: o.commsStatus })),
        activeConflictingReports: session.engine.logger.getEvents()
          .filter(e => e.type === 'INJECT_CONFLICTING_REPORTS')
          .slice(-3)
          .map(e => ({ timestamp: e.timestamp, description: e.description, data: e.data }))
      },
      timestamp: Date.now()
    };

    session.decisions.push(decisionRecord);

    session.engine.logger.logEvent({
      type: 'TRAINEE_DECISION',
      timestamp: decisionRecord.simTime,
      officerId: `OFF-${role}`,
      status: confidence,
      description: `[TRAINEE DECISION] ${role} selected [${choice}] (${confidence} CONFIDENCE). Comms: ${commsDesc}. Rationale: "${decisionRecord.rationale}"`,
      data: decisionRecord
    });

    try {
      await prisma.decision.create({
        data: {
          exerciseId,
          participantRole: role || 'TRAINEE_COMPANY_CMDR',
          injectId: 'INJ-TRAINEE-CHOICE',
          simTime: Math.floor(decisionRecord.simTime),
          choice,
          timeToDecideMs: timeToDecideMs || 0,
          rationale: decisionRecord.rationale,
          confidence: confidence === 'HIGH' ? 5 : (confidence === 'MEDIUM' ? 3 : 1),
          infoRelied: JSON.stringify(decisionRecord.infoAvailableSnapshot)
        }
      });
    } catch (e) {
      // Ignore DB error if exercise not yet inserted into SQL database
    }

    io.to(`instructor_${exerciseId}`).emit('decisions:update', session.decisions);
    RoleEnum.options.forEach(r => {
      io.to(`trainee_${exerciseId}_${r}`).emit('decisions:update', session.decisions);
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
    
    if (action === 'SET_COMMS') {
       const { channel = 'VHF', status = 'AVAILABLE', delaySeconds = 10 } = payload;
       session.pipeline.setChannelState(channel, status, delaySeconds);
       session.engine.setChannelStatus(channel, status, delaySeconds);
       
       io.to(`instructor_${exerciseId}`).emit('comms:update', session.pipeline.getAllChannels());
       RoleEnum.options.forEach(r => {
         io.to(`trainee_${exerciseId}_${r}`).emit('comms:update', session.pipeline.getAllChannels());
       });
    }

    if (action === 'INJECT_CONFLICTING_REPORTS') {
       const channel = payload?.channel || 'VHF';
       const targetRole = payload?.targetRole || 'TRAINEE_COMPANY_CMDR';
       const location = payload?.location || 'Checkpoint 2';
       
       const reportAId = `REP-A-${Date.now()}`;
       const reportBId = `REP-B-${Date.now()}`;

       const reportA = {
         id: reportAId,
         sender: `${location.toUpperCase()} OUTPOST`,
         text: `[REPORT A - SOURCE: ${location.toUpperCase()}] Sector secure. Zero hostile presence observed. All clear.`,
         simTime: session.engine.getState().simTime,
         isConflicting: true,
         conflictGroup: `CG-${Date.now()}`,
         contradictsReportId: reportBId,
         reliability: 'UNVERIFIED',
         channel
       };

       const reportB = {
         id: reportBId,
         sender: 'OBSERVATION / ISR FEED',
         text: `[REPORT B - SOURCE: ISR PATROL] Unidentified tactical movement detected in tree line near ${location}. Hostile intent possible.`,
         simTime: session.engine.getState().simTime,
         isConflicting: true,
         conflictGroup: `CG-${Date.now()}`,
         contradictsReportId: reportAId,
         reliability: 'UNVERIFIED',
         channel
       };

       session.engine.logger.logEvent({
         type: 'INJECT_CONFLICTING_REPORTS',
         timestamp: session.engine.getState().simTime,
         channel,
         description: `[CONFLICTING INTEL INJECTED] Report A (${location} SECURE) vs Report B (MOVEMENT DETECTED NEAR ${location})`,
         data: { reportA, reportB }
       });

       const resA = session.pipeline.processOutgoingMessage(reportA, channel);
       if (resA.status === 'DROPOUT') {
          session.engine.logger.logEvent({
            type: 'COMMUNICATION_DROPOUT',
            timestamp: session.engine.getState().simTime,
            channel,
            description: `[DROPOUT] Conflicting Report A from ${reportA.sender} LOST over ${channel}`
          });
       } else if (resA.status === 'DELAYED') {
          const deliverAt = session.engine.getState().simTime + resA.delaySeconds;
          session.engine.queueDelayedMessage(deliverAt, targetRole, resA.message, channel, resA.delaySeconds);
       } else {
          if (targetRole === 'ALL') {
            RoleEnum.options.forEach(r => io.to(`trainee_${exerciseId}_${r}`).emit('messages:update', resA.message));
          } else {
            io.to(`trainee_${exerciseId}_${targetRole}`).emit('messages:update', resA.message);
          }
          io.to(`instructor_${exerciseId}`).emit('messages:update', resA.message);
       }

       const resB = session.pipeline.processOutgoingMessage(reportB, channel);
       if (resB.status === 'DROPOUT') {
          session.engine.logger.logEvent({
            type: 'COMMUNICATION_DROPOUT',
            timestamp: session.engine.getState().simTime,
            channel,
            description: `[DROPOUT] Conflicting Report B from ${reportB.sender} LOST over ${channel}`
          });
       } else if (resB.status === 'DELAYED') {
          const deliverAt = session.engine.getState().simTime + resB.delaySeconds;
          session.engine.queueDelayedMessage(deliverAt, targetRole, resB.message, channel, resB.delaySeconds);
       } else {
          if (targetRole === 'ALL') {
            RoleEnum.options.forEach(r => io.to(`trainee_${exerciseId}_${r}`).emit('messages:update', resB.message));
          } else {
            io.to(`trainee_${exerciseId}_${targetRole}`).emit('messages:update', resB.message);
          }
          io.to(`instructor_${exerciseId}`).emit('messages:update', resB.message);
       }

       io.to(`instructor_${exerciseId}`).emit('instructor:inject_alert', {
         type: 'INJECT_CONFLICTING_REPORTS',
         payload: { message: `Injected conflicting intelligence reports for ${location} over ${channel}.` }
       });
    }

    if (action === 'SEND_MESSAGE') {
       const channel = payload.channel || 'VHF';
       const targetRole = payload.targetRole || 'ALL';
       const msgPayload = {
         id: payload.id || Date.now().toString(),
         sender: payload.sender || 'HQ',
         text: payload.text,
         simTime: session.engine.getState().simTime
       };

       const result = session.pipeline.processOutgoingMessage(msgPayload, channel);

       if (result.status === 'DROPOUT') {
          session.engine.logger.logEvent({
            type: 'COMMUNICATION_DROPOUT',
            timestamp: session.engine.getState().simTime,
            channel,
            status: 'UNAVAILABLE',
            description: `[DROPOUT] Order from ${msgPayload.sender} ("${msgPayload.text}") LOST over ${channel}`
          });
          io.to(`instructor_${exerciseId}`).emit('instructor:inject_alert', {
            type: 'COMMUNICATION_DROPOUT',
            payload: { message: `Order transmission lost over ${channel} due to signal blackout.` }
          });
       } else if (result.status === 'DELAYED') {
          const deliverAt = session.engine.getState().simTime + result.delaySeconds;
          session.engine.logger.logEvent({
            type: 'COMMUNICATION_DELAYED',
            timestamp: session.engine.getState().simTime,
            channel,
            status: 'DEGRADED',
            description: `[DELAYED ${result.delaySeconds}s] Order from ${msgPayload.sender} ("${msgPayload.text}") queued for T+${deliverAt}s`
          });
          session.engine.queueDelayedMessage(deliverAt, targetRole, result.message, channel, result.delaySeconds);
          io.to(`instructor_${exerciseId}`).emit('instructor:inject_alert', {
            type: 'COMMUNICATION_DELAYED',
            payload: { message: `Order queued with ${result.delaySeconds}s latency over ${channel}. Will deliver at T+${deliverAt}s.` }
          });
       } else {
          session.engine.logger.logEvent({
            type: 'ORDER_ISSUED',
            timestamp: session.engine.getState().simTime,
            channel,
            status: 'AVAILABLE',
            description: `[CLEAN] Order from ${msgPayload.sender}: "${msgPayload.text}"`
          });
          if (targetRole === 'ALL') {
            RoleEnum.options.forEach(r => io.to(`trainee_${exerciseId}_${r}`).emit('messages:update', result.message));
          } else {
            io.to(`trainee_${exerciseId}_${targetRole}`).emit('messages:update', result.message);
          }
          io.to(`instructor_${exerciseId}`).emit('messages:update', result.message);
       }
    }

    if (action === 'MOVE_OFFICER') {
       session.engine.moveOfficerToBuilding(payload.officerId, payload.targetBuildingId);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`ECHO-FOG Server running on port ${PORT}`);
});