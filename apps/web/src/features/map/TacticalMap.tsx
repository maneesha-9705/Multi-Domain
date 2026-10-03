import React, { useMemo } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { UnitState } from '@echo-fog/shared';

// We use CRS.Simple for arbitrary local cartesian coordinates
const bounds: L.LatLngBoundsExpression = [[0, 0], [20000, 20000]]; // 20km x 20km

interface TacticalMapProps {
  units: Record<string, UnitState & { perceivedStatus?: string }>;
  isGroundTruth: boolean;
}

// Generate simple SVG data URIs for APP-6 like icons
const getUnitIcon = (unit: UnitState & { perceivedStatus?: string }) => {
  let shape = 'circle';
  let color = '#FACC15'; // UNKNOWN
  
  if (unit.affiliation === 'BLUE') { shape = 'rect'; color = '#3B9EFF'; }
  else if (unit.affiliation === 'RED') { shape = 'polygon'; color = '#FF6B3D'; } // diamond
  else if (unit.affiliation === 'NEUTRAL') { shape = 'rect'; color = '#9DB4C0'; } // square
  
  let strokeColor = 'white';
  let strokeDash = '0';
  let animClass = '';
  let opacity = 1;

  if (unit.perceivedStatus === 'UNVERIFIED') { strokeDash = '4'; }
  if (unit.perceivedStatus === 'STALE') { opacity = 0.5; }
  if (unit.perceivedStatus === 'CONFLICTING') { animClass = 'animate-pulse'; strokeColor = '#A78BFA'; }
  if (unit.perceivedStatus === 'CORRUPTED') { animClass = 'animate-bounce'; strokeColor = '#E879F9'; }

  const html = `
    <div class="relative w-8 h-8 flex items-center justify-center ${animClass}" style="opacity: ${opacity}">
      <svg width="32" height="32" viewBox="0 0 32 32">
        ${shape === 'rect' ? `<rect x="4" y="8" width="24" height="16" fill="${color}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${strokeDash}" />` : ''}
        ${shape === 'polygon' ? `<polygon points="16,2 30,16 16,30 2,16" fill="${color}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${strokeDash}" />` : ''}
        ${shape === 'circle' ? `<circle cx="16" cy="16" r="10" fill="${color}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${strokeDash}" />` : ''}
      </svg>
      <span class="absolute -bottom-4 text-[10px] font-mono font-bold bg-base px-1 rounded border border-border whitespace-nowrap">${unit.callsign}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'bg-transparent',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export const TacticalMap: React.FC<TacticalMapProps> = ({ units, isGroundTruth }) => {
  return (
    <div className={`relative h-full w-full rounded-lg overflow-hidden border-2 ${isGroundTruth ? 'border-instructor' : 'border-border'}`}>
      {isGroundTruth && (
        <div className="absolute top-2 left-2 z-[1000] bg-instructor text-black px-2 py-1 font-bold text-sm rounded shadow">
          GROUND TRUTH
        </div>
      )}
      <MapContainer 
        center={[10000, 10000]} 
        zoom={-1} 
        crs={L.CRS.Simple}
        minZoom={-3}
        maxZoom={2}
        style={{ height: '100%', width: '100%', background: '#0B1118' }}
      >
        <ImageOverlay
          url="/terrain.svg"
          bounds={bounds}
        />
        
        {Object.values(units).map(unit => (
          <Marker 
            key={unit.id} 
            position={[unit.position.lat, unit.position.lng]} 
            icon={getUnitIcon(unit)}
          >
            <Popup className="tactical-popup">
              <div className="font-mono text-sm text-text bg-card p-2 rounded border border-border min-w-[150px]">
                <strong className="text-accent">{unit.callsign}</strong> ({unit.affiliation})<br/>
                <hr className="border-border my-1"/>
                Type: {unit.type}<br/>
                Status: {unit.perceivedStatus || unit.status}<br/>
                Heading: {Math.round(unit.heading)}°<br/>
                Speed: {unit.speed} m/s
                {!isGroundTruth && (
                  <div className="flex gap-1 mt-2">
                    <button className="flex-1 bg-friendly/20 text-friendly hover:bg-friendly/40 px-1 py-1 rounded text-xs border border-friendly/50">T</button>
                    <button className="flex-1 bg-unknown/20 text-unknown hover:bg-unknown/40 px-1 py-1 rounded text-xs border border-unknown/50">S</button>
                    <button className="flex-1 bg-hostile/20 text-hostile hover:bg-hostile/40 px-1 py-1 rounded text-xs border border-hostile/50">F</button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
