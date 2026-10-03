import React from 'react';
import { MapContainer, ImageOverlay, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Building, Officer } from '@echo-fog/shared';

const bounds: L.LatLngBoundsExpression = [[0, 0], [20000, 20000]];

interface TacticalMapProps {
  buildings: Record<string, Building>;
  officers: Record<string, Officer>;
  isGroundTruth: boolean;
}

const getOfficerIcon = (officer: Officer) => {
  let color = '#4DA3FF'; // default friendly blue
  if (officer.commsStatus === 'DEGRADED') color = '#F59E0B'; // delayed/degraded orange
  if (officer.commsStatus === 'UNAVAILABLE') color = '#FF5A36'; // hostile/lost red

  const html = `
    <div class="relative w-8 h-8 flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2" />
        <text x="12" y="16" font-size="10" fill="white" text-anchor="middle" font-family="monospace">${officer.name.charAt(8)}</text>
      </svg>
      <span class="absolute -bottom-4 text-[9px] font-mono font-bold bg-base px-1 rounded border border-border whitespace-nowrap">${officer.id}</span>
    </div>
  `;
  return L.divIcon({ html, className: 'bg-transparent', iconSize: [24, 24], iconAnchor: [12, 12] });
};

const getBuildingIcon = (building: Building) => {
  const html = `
    <div class="relative w-12 h-12 flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <rect x="0" y="0" width="40" height="40" fill="#262D1E" stroke="#C8B560" stroke-width="2" />
        <text x="20" y="22" font-size="8" fill="#C8B560" text-anchor="middle" font-family="monospace">${building.type.substring(0,3).toUpperCase()}</text>
      </svg>
      <span class="absolute -bottom-5 text-[9px] font-mono font-bold bg-panel px-1 rounded border border-accent text-accent whitespace-nowrap">${building.name}</span>
      ${building.officers.length > 0 ? `<span class="absolute -top-2 -right-2 bg-friendly text-base text-[8px] font-bold px-1 rounded-full">${building.officers.length}</span>` : ''}
    </div>
  `;
  return L.divIcon({ html, className: 'bg-transparent', iconSize: [40, 40], iconAnchor: [20, 20] });
};

export const TacticalMap: React.FC<TacticalMapProps> = ({ buildings, officers, isGroundTruth }) => {
  return (
    <div className={`relative h-full w-full rounded-lg overflow-hidden border-2 ${isGroundTruth ? 'border-instructor' : 'border-border'}`}>
      <MapContainer center={[10000, 10000]} zoom={-1} crs={L.CRS.Simple} minZoom={-3} maxZoom={2} style={{ height: '100%', width: '100%', background: '#1C2116' }}>
        <ImageOverlay url="/terrain.svg" bounds={bounds} />
        
        {Object.values(buildings).map(b => (
          <Marker key={b.id} position={[b.position.lat, b.position.lng]} icon={getBuildingIcon(b)}>
            <Popup className="tactical-popup">
              <div className="font-mono text-xs text-text bg-card p-3 rounded border border-border min-w-[200px]">
                <strong className="text-accent text-sm block border-b border-border pb-1 mb-2">{b.name}</strong>
                Type: <span className="text-sand">{b.type}</span><br/>
                Status: <span className="text-friendly">{b.status}</span><br/>
                Active Officers: {b.officers.length}<br/>
                <div className="mt-2 space-y-1">
                  {b.officers.map(oid => {
                    const o = officers[oid];
                    return o ? <div key={oid} className="bg-panel p-1 border border-border text-[10px]">- {o.name} ({o.role})</div> : null;
                  })}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {Object.values(officers).map(o => (
          <Marker key={o.id} position={[o.position.lat, o.position.lng]} icon={getOfficerIcon(o)}>
            <Popup className="tactical-popup">
              <div className="font-mono text-xs text-text bg-card p-3 rounded border border-border min-w-[180px]">
                <strong className="text-accent text-sm block border-b border-border pb-1 mb-2">{o.name}</strong>
                ID: {o.id}<br/>
                Role: <span className="text-sand">{o.role}</span><br/>
                Bld: {o.currentBuildingId ? buildings[o.currentBuildingId]?.name : 'IN TRANSIT'}<br/>
                Status: {o.status}<br/>
                Comms: {o.commsNetwork} <br/>
                Signal: <span className={o.commsStatus === 'AVAILABLE' ? 'text-friendly' : 'text-stamp'}>{o.commsStatus}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
