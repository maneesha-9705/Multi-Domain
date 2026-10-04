import React, { useEffect } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Building, Officer, Role } from '@echo-fog/shared';

const bounds: L.LatLngBoundsExpression = [[0, 0], [20000, 20000]];
// Bounding box enclosing all tactical sector features, compass, legend, reference box, and assets
const activeSectorBounds: L.LatLngBoundsExpression = [[600, 600], [18200, 19400]];

const FitMapBounds: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(activeSectorBounds, { padding: [5, 5], animate: false });
  }, [map]);
  return null;
};

interface TacticalMapProps {
  buildings: Record<string, Building>;
  officers: Record<string, Officer>;
  isGroundTruth: boolean;
  role?: Role | null;
}

// Callout directional offsets (dx, dy) for de-conflicting labels around center
interface LabelCallout {
  dx: number;
  dy: number;
}

const BUILDING_CALLOUTS: Record<string, LabelCallout> = {
  'SP-003': { dx: 0, dy: -45 },     // Observation Point (NORTH)
  'SP-002': { dx: 70, dy: -25 },    // Checkpoint 2 (NORTH-EAST)
  'SP-001': { dx: -80, dy: -20 },   // Checkpoint 1 (NORTH-WEST)
  'BLD-004': { dx: 75, dy: -10 },   // Operations Building (EAST)
  'BLD-002': { dx: -85, dy: -30 },  // Command HQ (NORTH-WEST)
  'BLD-003': { dx: -85, dy: 25 },   // Communications Building (SOUTH-WEST)
  'BLD-001': { dx: 75, dy: 25 },    // Training Building (SOUTH-EAST)
  'BLD-005': { dx: -75, dy: 35 },   // Logistics Building (SOUTH-WEST)
  'SP-006': { dx: 70, dy: 35 },     // Training Area B (SOUTH-EAST)
  'SP-005': { dx: -75, dy: 35 },    // Training Area A (SOUTH-WEST)
  'SP-004': { dx: 0, dy: 45 },      // Assembly Point (SOUTH)
};

const getOfficerIcon = (officer: Officer) => {
  let color = '#6B8E23'; // #6B8E23 -> Olive Drab
  let statusBadgeClass = 'border-[#4B5320] text-[#6B8E23] bg-[#000000]/80';
  let commsText = 'VHF OK';

  if (officer.commsStatus === 'DEGRADED') {
    color = '#FFD700'; // #FFD700 -> Gold
    statusBadgeClass = 'border-[#FFD700] text-[#FFD700] bg-[#000000]/90 animate-pulse';
    commsText = 'VHF DEGRADED';
  } else if (officer.commsStatus === 'UNAVAILABLE') {
    color = '#8B4513'; // #8B4513 -> Saddle Brown
    statusBadgeClass = 'border-[#8B4513] text-[#8B4513] bg-[#000000]/90';
    commsText = 'VHF LOST';
  }

  const isCmdr1 = officer.id.includes('PLATOON_CMDR_1') || officer.name.includes('CMDR_1') || officer.id.includes('CMDR_1');
  const roleTitle = isCmdr1 ? 'TRAINEE COMPANY CMD' : 'PLATOON LEADER';

  // Offset CMDR-1 to South-West and CMDR-2 to South-East to avoid overlap
  const dx = isCmdr1 ? -65 : 65;
  const dy = 30;

  const html = `
    <div class="relative w-[220px] h-[120px] pointer-events-none">
      <svg class="absolute inset-0 w-full h-full" viewBox="0 0 220 120">
        <!-- Callout Leader Line -->
        <line x1="110" y1="60" x2="${110 + dx}" y2="${60 + dy}" stroke="${color}" stroke-width="1.5" stroke-dasharray="3 3" />
        <circle cx="${110 + dx}" cy="${60 + dy}" r="3" fill="${color}" />
        <!-- Center Icon -->
        <circle cx="110" cy="60" r="9" fill="${color}" stroke="#000000" stroke-width="2" />
        <circle cx="110" cy="60" r="4" fill="#000000" />
      </svg>
      <!-- Offset Callout Badge Box -->
      <div class="absolute pointer-events-auto bg-[#000000]/95 border border-[#4B5320] px-2 py-1 rounded shadow-lg backdrop-blur-sm transform -translate-x-1/2 -translate-y-1/2" style="left: ${110 + dx}px; top: ${60 + dy}px;">
        <div class="text-[10px] font-mono font-bold text-[#FFD700] whitespace-nowrap">${officer.name}</div>
        <div class="text-[8px] font-mono text-[#A9A9A9] font-medium uppercase whitespace-nowrap">${roleTitle}</div>
        <div class="text-[7px] font-mono font-bold px-1 py-0.5 rounded border mt-0.5 uppercase whitespace-nowrap ${statusBadgeClass}">
          ${commsText}
        </div>
      </div>
    </div>
  `;
  return L.divIcon({ html, className: 'bg-transparent', iconSize: [220, 120], iconAnchor: [110, 60] });
};

const getBuildingIcon = (building: Building) => {
  const isCheckpoint = building.id.startsWith('SP-') && building.id !== 'SP-003';
  const isHQ = building.id === 'BLD-002';
  const isObs = building.id === 'SP-003';

  let iconSvg = '';
  let accentColor = '#4B5320';
  let badgeTitleColor = 'text-[#B0C4DE]';

  if (isCheckpoint) {
    accentColor = '#FFD700'; // Gold
    badgeTitleColor = 'text-[#FFD700]';
    iconSvg = `
      <polygon points="16,4 28,16 16,28 4,16" fill="#3C3C3D" stroke="#FFD700" stroke-width="2.5" />
      <circle cx="16" cy="16" r="4" fill="#FFD700" />
    `;
  } else if (isHQ) {
    accentColor = '#FFD700'; // Gold
    badgeTitleColor = 'text-[#FFD700]';
    iconSvg = `
      <rect x="3" y="3" width="26" height="26" fill="#4B5320" stroke="#FFD700" stroke-width="2.5" />
      <text x="16" y="20" font-size="11" font-family="'Black Ops One', monospace" fill="#FFD700" text-anchor="middle" font-weight="bold">HQ</text>
    `;
  } else if (isObs) {
    accentColor = '#B0C4DE'; // Light Steel Blue
    badgeTitleColor = 'text-[#B0C4DE]';
    iconSvg = `
      <circle cx="16" cy="16" r="12" fill="#000000" stroke="#B0C4DE" stroke-width="2.5" />
      <path d="M16,6 L16,26 M6,16 L26,16" stroke="#FFD700" stroke-width="1.5" />
    `;
  } else {
    accentColor = '#4B5320'; // Army Green
    iconSvg = `
      <rect x="4" y="4" width="24" height="24" fill="#3C3C3D" stroke="#4B5320" stroke-width="2" />
      <text x="16" y="19" font-size="9" fill="#A9A9A9" text-anchor="middle" font-family="monospace" font-weight="bold">${building.type.substring(0,3).toUpperCase()}</text>
    `;
  }

  const callout = BUILDING_CALLOUTS[building.id] || { dx: 60, dy: -25 };
  const badgeX = 110 + callout.dx;
  const badgeY = 60 + callout.dy;

  const html = `
    <div class="relative w-[220px] h-[120px] pointer-events-none">
      <svg class="absolute inset-0 w-full h-full" viewBox="0 0 220 120">
        <!-- Thin Tactical Leader Line -->
        <line x1="110" y1="60" x2="${badgeX}" y2="${badgeY}" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3 3" />
        <circle cx="${badgeX}" cy="${badgeY}" r="3" fill="${accentColor}" />
        <!-- Center Icon -->
        <g transform="translate(94, 44)">
          ${iconSvg}
        </g>
      </svg>
      <!-- Offset Tactical Callout Badge -->
      <div class="absolute pointer-events-auto bg-[#000000]/95 border border-[#4B5320] px-2 py-1 rounded shadow-md backdrop-blur-sm transform -translate-x-1/2 -translate-y-1/2" style="left: ${badgeX}px; top: ${badgeY}px;">
        <div class="text-[9px] font-mono font-bold ${badgeTitleColor} whitespace-nowrap">${building.name}</div>
        ${building.officers.length > 0 ? `<div class="text-[7px] font-mono font-bold bg-[#6B8E23] text-[#000000] px-1.5 py-0.2 rounded-full inline-block mt-0.5 whitespace-nowrap">${building.officers.length} ASSETS</div>` : ''}
      </div>
    </div>
  `;
  return L.divIcon({ html, className: 'bg-transparent', iconSize: [220, 120], iconAnchor: [110, 60] });
};

// Filter buildings based on user role (Ground Truth vs Trainee Perceived Intel)
const filterBuildingsForRole = (buildings: Record<string, Building>, role: Role | null | undefined, isGroundTruth: boolean): Record<string, Building> => {
  if (isGroundTruth || !role || role === 'INSTRUCTOR') return buildings; // Instructor sees Ground Truth (All POIs)

  const filtered: Record<string, Building> = {};
  Object.entries(buildings).forEach(([id, b]) => {
    if (role === 'TRAINEE_EW_OFFICER') {
      // EW Officer sees communications, EW nodes, HQ, Operations, and Observation Point
      if (['BLD-002', 'BLD-003', 'BLD-004', 'SP-003'].includes(id) || b.officers.length > 0) {
        filtered[id] = b;
      }
    } else {
      // Company & Platoon Commanders see mission POIs: HQ, Ops, Checkpoints, Obs Point, Assembly
      if (['BLD-002', 'BLD-004', 'SP-001', 'SP-002', 'SP-003', 'SP-004'].includes(id) || b.officers.length > 0) {
        filtered[id] = b;
      }
    }
  });
  return filtered;
};

// Filter officers based on user role
const filterOfficersForRole = (officers: Record<string, Officer>, role: Role | null | undefined, isGroundTruth: boolean): Record<string, Officer> => {
  if (isGroundTruth || !role || role === 'INSTRUCTOR') return officers; // Instructor sees Ground Truth (All Officers)

  const filtered: Record<string, Officer> = {};
  Object.entries(officers).forEach(([id, o]) => {
    if (o.status === 'OFFLINE') return;
    if (role === 'TRAINEE_EW_OFFICER') {
      // EW Officer sees units with signal degradation or active EW duties
      if (o.commsStatus !== 'AVAILABLE' || id.includes('EW') || id.includes('CMDR_1')) {
        filtered[id] = o;
      }
    } else {
      // Trainee Cmdrs see active operational friendly units
      if (id.includes('PLATOON') || id.includes('CMDR') || o.commsStatus === 'AVAILABLE') {
        filtered[id] = o;
      }
    }
  });
  return filtered;
};

export const TacticalMap: React.FC<TacticalMapProps> = ({ buildings, officers, isGroundTruth, role }) => {
  const visibleBuildings = filterBuildingsForRole(buildings, role, isGroundTruth);
  const visibleOfficers = filterOfficersForRole(officers, role, isGroundTruth);

  return (
    <div className={`relative h-full w-full rounded-lg overflow-hidden border-2 ${isGroundTruth ? 'border-[#FFD700]' : 'border-[#4B5320]'}`}>
      <MapContainer center={[9400, 10000]} zoom={-5.2} crs={L.CRS.Simple} minZoom={-8} maxZoom={2} style={{ height: '100%', width: '100%', background: '#000000' }}>
        <FitMapBounds />
        <ImageOverlay url="/terrain.svg" bounds={bounds} />

        {Object.values(visibleBuildings).map(b => (
          <Marker key={b.id} position={[b.position.lat, b.position.lng]} icon={getBuildingIcon(b)}>
            <Popup className="tactical-popup">
              <div className="font-mono text-xs text-[#B0C4DE] bg-[#3C3C3D] p-3 rounded border border-[#4B5320] min-w-[200px]">
                <strong className="text-[#FFD700] text-sm block border-b border-[#4B5320] pb-1 mb-2">{b.name}</strong>
                Type: <span className="text-[#B0C4DE]">{b.type}</span><br/>
                Status: <span className="text-[#6B8E23]">{b.status}</span><br/>
                Active Officers: {b.officers.length}<br/>
                <div className="mt-2 space-y-1">
                  {b.officers.map(oid => {
                    const o = officers[oid];
                    return o ? <div key={oid} className="bg-[#000000] p-1 border border-[#4B5320] text-[10px] text-[#A9A9A9]">- {o.name} ({o.role})</div> : null;
                  })}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {Object.values(visibleOfficers).map(o => (
          <Marker key={o.id} position={[o.position.lat, o.position.lng]} icon={getOfficerIcon(o)}>
            <Popup className="tactical-popup">
              <div className="font-mono text-xs text-[#B0C4DE] bg-[#3C3C3D] p-3 rounded border border-[#4B5320] min-w-[180px]">
                <strong className="text-[#FFD700] text-sm block border-b border-[#4B5320] pb-1 mb-2">{o.name}</strong>
                ID: {o.id}<br/>
                Role: <span className="text-[#B0C4DE]">{o.role}</span><br/>
                Bld: {o.currentBuildingId ? buildings[o.currentBuildingId]?.name : 'IN TRANSIT'}<br/>
                Status: {o.status}<br/>
                Comms: {o.commsNetwork} <br/>
                Signal: <span className={o.commsStatus === 'AVAILABLE' ? 'text-[#6B8E23]' : 'text-[#FFD700]'}>{o.commsStatus}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};






