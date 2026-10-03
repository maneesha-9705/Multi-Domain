import { Scenario, Building, Officer } from '@echo-fog/shared';

const initialBuildings: Building[] = [
  { id: 'BLD-001', name: 'Command Center', type: 'Operations', position: { lat: 8000, lng: 8000 }, status: 'ACTIVE', officers: ['OFF-001'] },
  { id: 'BLD-002', name: 'Operations Building', type: 'Operations', position: { lat: 8500, lng: 8200 }, status: 'ACTIVE', officers: ['OFF-002'] },
  { id: 'BLD-003', name: 'Communications Building', type: 'Comms', position: { lat: 8200, lng: 7500 }, status: 'ACTIVE', officers: ['OFF-003'] },
  { id: 'BLD-004', name: 'Logistics Building', type: 'Logistics', position: { lat: 7000, lng: 8000 }, status: 'ACTIVE', officers: ['OFF-004'] },
  { id: 'BLD-005', name: 'Facility A', type: 'Outpost', position: { lat: 10000, lng: 5000 }, status: 'ACTIVE', officers: [] },
  { id: 'BLD-006', name: 'Facility B', type: 'Outpost', position: { lat: 12000, lng: 6000 }, status: 'ACTIVE', officers: ['OFF-005'] }
];

const initialOfficers: Officer[] = [
  { id: 'OFF-001', name: 'Officer Alpha', role: 'Command Officer', currentBuildingId: 'BLD-001', position: { lat: 8000, lng: 8000 }, status: 'ACTIVE', commsNetwork: 'SATCOM', commsStatus: 'AVAILABLE', lastUpdateTime: 0, waypoints: [], targetBuildingId: null },
  { id: 'OFF-002', name: 'Officer Bravo', role: 'Operations Officer', currentBuildingId: 'BLD-002', position: { lat: 8500, lng: 8200 }, status: 'ACTIVE', commsNetwork: 'VHF', commsStatus: 'AVAILABLE', lastUpdateTime: 0, waypoints: [], targetBuildingId: null },
  { id: 'OFF-003', name: 'Officer Charlie', role: 'Communications Officer', currentBuildingId: 'BLD-003', position: { lat: 8200, lng: 7500 }, status: 'ACTIVE', commsNetwork: 'DATALINK', commsStatus: 'AVAILABLE', lastUpdateTime: 0, waypoints: [], targetBuildingId: null },
  { id: 'OFF-004', name: 'Officer Delta', role: 'Logistics Officer', currentBuildingId: 'BLD-004', position: { lat: 7000, lng: 8000 }, status: 'ACTIVE', commsNetwork: 'UHF', commsStatus: 'AVAILABLE', lastUpdateTime: 0, waypoints: [], targetBuildingId: null },
  { id: 'OFF-005', name: 'Officer Echo', role: 'Field Officer', currentBuildingId: 'BLD-006', position: { lat: 12000, lng: 6000 }, status: 'ACTIVE', commsNetwork: 'VHF', commsStatus: 'AVAILABLE', lastUpdateTime: 0, waypoints: [], targetBuildingId: null }
];

export const scenario1: Scenario = {
  id: 'scen-iron-veil',
  name: 'Operation Iron Veil',
  description: 'Fictional training simulation.',
  mapDef: { center: { lat: 10000, lng: 10000 }, zoom: 0 },
  initialUnits: [], // Removed tactical units as requested
  initialBuildings,
  initialOfficers,
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
