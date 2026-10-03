import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const prisma = new PrismaClient();
const aarRouter = Router();

aarRouter.get('/:exerciseId', async (req, res) => {
  const { exerciseId } = req.params;
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        decisions: {
          orderBy: { simTime: 'asc' }
        },
        participants: true
      }
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Generate a simple JSON AAR Report
    const report = {
      meta: {
        exerciseId: exercise.id,
        scenarioId: exercise.scenarioId,
        date: exercise.createdAt,
        totalDecisions: exercise.decisions.length,
        participants: exercise.participants.map(p => p.role)
      },
      decisionTimeline: exercise.decisions.map(d => ({
        simTime: d.simTime,
        role: d.participantRole,
        injectId: d.injectId,
        choice: d.choice,
        timeToDecideMs: d.timeToDecideMs,
        rationale: d.rationale,
        confidence: d.confidence
      }))
    };

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate AAR' });
  }
});

export default aarRouter;
