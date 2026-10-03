import { z } from 'zod';

export const RoleEnum = z.enum([
  'INSTRUCTOR',
  'TRAINEE_COMPANY_CMDR',
  'TRAINEE_PLATOON_CMDR_1',
  'TRAINEE_PLATOON_CMDR_2',
  'TRAINEE_AIR_LIAISON',
  'TRAINEE_EW_OFFICER',
  'TRAINEE_CYBER_OFFICER'
]);
export type Role = z.infer<typeof RoleEnum>;

// Basic coordinate
export const PositionSchema = z.object({
  lat: z.number(),
  lng: z.number()
});
export type Position = z.infer<typeof PositionSchema>;

export const UnitAffiliationSchema = z.enum(['BLUE', 'RED', 'NEUTRAL', 'UNKNOWN']);
export type UnitAffiliation = z.infer<typeof UnitAffiliationSchema>;

export const UnitTypeSchema = z.enum(['INFANTRY', 'ARMOUR', 'ARTILLERY', 'UAV', 'EW_NODE', 'C2_NODE']);
export type UnitType = z.infer<typeof UnitTypeSchema>;

export const UnitStateSchema = z.object({
  id: z.string(),
  callsign: z.string(),
  affiliation: UnitAffiliationSchema,
  type: UnitTypeSchema,
  position: PositionSchema,
  heading: z.number(),
  speed: z.number(), // meters per second
  waypoints: z.array(PositionSchema),
  status: z.enum(['ACTIVE', 'DESTROYED', 'COMM_LOSS']),
});
export type UnitState = z.infer<typeof UnitStateSchema>;

export const InfoMessageSchema = z.object({
  id: z.string(),
  sourceUnit: z.string(),
  channel: z.enum(['VHF', 'UHF', 'SATCOM', 'DATALINK', 'CYBER-ALERT', 'ISR-FEED']),
  domain: z.enum(['LAND', 'AIR', 'CYBER', 'EW']),
  content: z.string(),
  truthRef: z.string().optional(),
  timestampGenerated: z.number(),
  timestampDelivered: z.number(),
  confidence: z.number().min(0).max(1),
  freshnessAge: z.number(),
  status: z.enum(['CLEAN', 'DELAYED', 'CORRUPTED', 'CONFLICTING', 'STALE', 'LOST']),
  contradictsMessageId: z.string().optional()
});
export type InfoMessage = z.infer<typeof InfoMessageSchema>;

export const InjectSchema = z.object({
  id: z.string(),
  triggerTime: z.number(), // sim time in seconds
  type: z.string(),
  payload: z.any()
});
export type Inject = z.infer<typeof InjectSchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  mapDef: z.object({
    center: PositionSchema,
    zoom: z.number()
  }),
  initialUnits: z.array(UnitStateSchema),
  injects: z.array(InjectSchema),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const GroundTruthStateSchema = z.object({
  simTime: z.number(),
  exerciseId: z.string(),
  scenarioId: z.string(),
  units: z.record(z.string(), UnitStateSchema),
  activeInjects: z.array(z.string()),
  speedMultiplier: z.number(),
  isPaused: z.boolean(),
});
export type GroundTruthState = z.infer<typeof GroundTruthStateSchema>;
