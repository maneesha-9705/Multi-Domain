import { Scenario } from '@echo-fog/shared';

export const scenario1: Scenario = {
  id: 'scen-iron-veil',
  name: 'Operation Iron Veil',
  description: 'Company-level defensive, EW jamming of battalion net while enemy armour approaches.',
  mapDef: {
    center: { lat: 10000, lng: 10000 },
    zoom: 0 // CRS Simple zoom
  },
  initialUnits: [
    {
      id: 'unit-blue-hq',
      callsign: 'HQ',
      affiliation: 'BLUE',
      type: 'C2_NODE',
      position: { lat: 3500, lng: 7500 }, // near Village Rudra
      heading: 0,
      speed: 0,
      waypoints: [],
      status: 'ACTIVE'
    },
    {
      id: 'unit-blue-plt1',
      callsign: 'Alpha Platoon',
      affiliation: 'BLUE',
      type: 'INFANTRY',
      position: { lat: 3800, lng: 3800 }, // at Bridge Alpha
      heading: 0,
      speed: 0,
      waypoints: [],
      status: 'ACTIVE'
    },
    {
      id: 'unit-red-armour1',
      callsign: 'Unknown Armour',
      affiliation: 'RED',
      type: 'ARMOUR',
      position: { lat: 12000, lng: 11500 }, // Silent Ridge
      heading: 225,
      speed: 5, // 5m/s
      waypoints: [{ lat: 3800, lng: 3800 }], // heading to Bridge
      status: 'ACTIVE'
    }
  ],
  injects: [
    {
      id: 'inj-jamming-1',
      triggerTime: 30, // 30 seconds in
      type: 'START_JAMMING',
      payload: { channel: 'VHF', intensity: 80 }
    }
  ]
};
