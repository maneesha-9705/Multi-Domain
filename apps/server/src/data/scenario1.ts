import { Scenario, Building, Officer } from '@echo-fog/shared';

export const initialBuildings: Building[] = [
  { id: 'BLD-001', name: 'Training Building', type: 'Operations', position: { lat: 8000, lng: 8000 }, status: 'ACTIVE', officers: [] },
  { id: 'BLD-002', name: 'Command Building', type: 'Operations', position: { lat: 8500, lng: 8200 }, status: 'ACTIVE', officers: [] },
  { id: 'BLD-003', name: 'Communications Building', type: 'Comms', position: { lat: 8200, lng: 7500 }, status: 'ACTIVE', officers: [] },
  { id: 'BLD-004', name: 'Operations Building', type: 'Operations', position: { lat: 9000, lng: 8500 }, status: 'ACTIVE', officers: [] },
  { id: 'BLD-005', name: 'Logistics Building', type: 'Logistics', position: { lat: 7000, lng: 8000 }, status: 'ACTIVE', officers: [] },
  { id: 'SP-001', name: 'Checkpoint 1', type: 'Point', position: { lat: 10000, lng: 9000 }, status: 'ACTIVE', officers: [] },
  { id: 'SP-002', name: 'Checkpoint 2', type: 'Point', position: { lat: 11000, lng: 9500 }, status: 'ACTIVE', officers: [] },
  { id: 'SP-003', name: 'Observation Point', type: 'Point', position: { lat: 12000, lng: 10000 }, status: 'ACTIVE', officers: [] },
  { id: 'SP-004', name: 'Assembly Point', type: 'Point', position: { lat: 6000, lng: 7000 }, status: 'ACTIVE', officers: [] },
  { id: 'SP-005', name: 'Training Area A', type: 'Area', position: { lat: 6500, lng: 6500 }, status: 'ACTIVE', officers: [] },
  { id: 'SP-006', name: 'Training Area B', type: 'Area', position: { lat: 6500, lng: 7500 }, status: 'ACTIVE', officers: [] }
];

export const scenario1: Scenario = {
  id: 'scen-iron-veil',
  name: 'Operation Iron Veil',
  description: 'Fictional training simulation.',
  mapDef: { center: { lat: 10000, lng: 10000 }, zoom: 0 },
  initialUnits: [],
  initialBuildings,
  initialOfficers: [],
  injects: [
    {
      id: 'inj-jamming-1',
      triggerTime: 10,
      type: 'COMMS_DEGRADED',
      payload: { channel: 'VHF', severity: 'HIGH' }
    },
    {
      id: 'inj-move-1',
      triggerTime: 20,
      type: 'MOVE_OFFICER',
      payload: { officerId: 'OFF-003', targetBuildingId: 'BLD-005' }
    }
  ]
};
