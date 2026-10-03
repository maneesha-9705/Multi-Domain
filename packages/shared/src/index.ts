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
  initialBuildings: z.array(z.any()).optional(), // Type Building
  initialOfficers: z.array(z.any()).optional(), // Type Officer
  injects: z.array(InjectSchema),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const GroundTruthStateSchema = z.object({
  simTime: z.number(),
  exerciseId: z.string(),
  scenarioId: z.string(),
  units: z.record(z.string(), UnitStateSchema), // Keeping units for compatibility if needed
  officers: z.record(z.string(), z.any()), // Will type properly below
  buildings: z.record(z.string(), z.any()),
  activeInjects: z.array(z.string()),
  speedMultiplier: z.number(),
  isPaused: z.boolean(),
  status: z.enum(['NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED']).default('NOT_STARTED'),
});
export type GroundTruthState = z.infer<typeof GroundTruthStateSchema>;

export const BuildingSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  position: PositionSchema,
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED']),
  officers: z.array(z.string())
});
export type Building = z.infer<typeof BuildingSchema>;

export const OfficerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  currentBuildingId: z.string().nullable(),
  position: PositionSchema,
  status: z.enum(['ACTIVE', 'IN_TRANSIT', 'OFFLINE']),
  commsNetwork: z.string(),
  commsStatus: z.enum(['AVAILABLE', 'DEGRADED', 'UNAVAILABLE']),
  lastUpdateTime: z.number(),
  waypoints: z.array(PositionSchema),
  targetBuildingId: z.string().nullable()
});
export type Officer = z.infer<typeof OfficerSchema>;

export const SimEventSchema = z.object({
  eventId: z.string(),
  type: z.string(),
  timestamp: z.number(),
  officerId: z.string().optional(),
  buildingId: z.string().optional(),
  channel: z.string().optional(),
  description: z.string(),
  status: z.string().optional(),
  data: z.any().optional()
});
export type SimEvent = z.infer<typeof SimEventSchema>;

export const OrderSchema = z.object({
  orderId: z.string(),
  issuer: z.string(),
  recipient: z.string(),
  content: z.string(),
  timestamp: z.number(),
  status: z.enum(['ISSUED', 'ACKNOWLEDGED', 'COMPLETED', 'FAILED'])
});
export type Order = z.infer<typeof OrderSchema>;
