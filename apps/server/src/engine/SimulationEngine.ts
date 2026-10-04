import { GroundTruthState, Scenario, UnitState, Position, Building, Officer } from '@echo-fog/shared';
import { EventEmitter } from 'events';
import { EventLogger } from './EventLogger';

export class SimulationEngine extends EventEmitter {
  private state: GroundTruthState;
  private scenario: Scenario;
  private tickInterval: NodeJS.Timeout | null = null;
  private readonly TICK_RATE_MS = 1000;
  public logger: EventLogger;

  constructor(exerciseId: string, scenario: Scenario) {
    super();
    this.scenario = scenario;
    this.logger = new EventLogger();
    
    const units: Record<string, UnitState> = {};
    scenario.initialUnits.forEach(u => { units[u.id] = { ...u }; });

    this.state = {
      simTime: 0,
      exerciseId,
      scenarioId: scenario.id,
      units,
      officers: {},
      buildings: {},
      activeInjects: [],
      speedMultiplier: 1,
      isPaused: true,
      status: 'NOT_STARTED'
    };
  }

  public initFictionalEntities(buildings: Building[], officers: Officer[]) {
    buildings.forEach(b => this.state.buildings[b.id] = { ...b, officers: [...b.officers] });
    officers.forEach(o => {
      this.state.officers[o.id] = { ...o, waypoints: [...o.waypoints] };
      if (o.currentBuildingId && this.state.buildings[o.currentBuildingId]) {
        if (!this.state.buildings[o.currentBuildingId].officers.includes(o.id)) {
          this.state.buildings[o.currentBuildingId].officers.push(o.id);
        }
      }
    });
  }

  public spawnOfficer(role: string): Officer {
    const officerId = `OFF-${role}`;
    if (this.state.officers[officerId]) {
      return this.state.officers[officerId];
    }
    
    // Select a random valid position from the predefined buildings/spawn points
    const buildingIds = Object.keys(this.state.buildings);
    const randomBuildingId = buildingIds[Math.floor(Math.random() * buildingIds.length)];
    const spawnBuilding = this.state.buildings[randomBuildingId];

    // Add a small visual offset so they don't stack perfectly on top of each other
    const offsetLat = (Math.random() - 0.5) * 100;
    const offsetLng = (Math.random() - 0.5) * 100;

    const nameParts = role.split('_');
    const shortName = nameParts[nameParts.length - 1];

    const officer: Officer = {
      id: officerId,
      name: `Officer ${shortName}`,
      role: role.replace(/_/g, ' '),
      currentBuildingId: spawnBuilding.id,
      position: { lat: spawnBuilding.position.lat + offsetLat, lng: spawnBuilding.position.lng + offsetLng },
      status: 'ACTIVE',
      commsNetwork: 'VHF',
      commsStatus: 'AVAILABLE',
      lastUpdateTime: this.state.simTime,
      waypoints: [],
      targetBuildingId: null
    };

    this.state.officers[officer.id] = officer;
    spawnBuilding.officers.push(officer.id);

    this.logger.logEvent({
      type: 'OFFICER_JOINED',
      timestamp: this.state.simTime,
      officerId: officer.id,
      buildingId: spawnBuilding.id,
      description: `${officer.name} joined operation at ${spawnBuilding.name}`
    });

    this.emit('tick', this.state); // force broadcast
    return officer;
  }

  public getState(): GroundTruthState {
    return this.state;
  }

  public start() {
    if (!this.state.isPaused && this.state.status !== 'NOT_STARTED') return;
    
    if (this.state.status === 'NOT_STARTED') {
      this.state.status = 'ACTIVE';
      this.logger.logEvent({ type: 'OPERATION_STARTED', timestamp: this.state.simTime, description: 'Operation Started' });
      
      // Auto-spawn mock officers for the instructor if none have joined yet
      if (Object.keys(this.state.officers).length === 0) {
        this.spawnOfficer('TRAINEE_PLATOON_CMDR_1');
        this.spawnOfficer('TRAINEE_PLATOON_CMDR_2');
      }
    } else {
      this.state.status = 'ACTIVE';
      this.logger.logEvent({ type: 'OPERATION_RESUMED', timestamp: this.state.simTime, description: 'Operation Resumed' });
    }
    
    this.state.isPaused = false;
    this.tickInterval = setInterval(() => this.tick(), this.TICK_RATE_MS);
    this.emit('started');
  }

  public pause() {
    if (this.state.isPaused) return;
    this.state.isPaused = true;
    this.state.status = 'PAUSED';
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.logger.logEvent({ type: 'OPERATION_PAUSED', timestamp: this.state.simTime, description: 'Operation Paused' });
    this.emit('paused');
  }
  
  public end() {
    this.pause();
    this.state.status = 'COMPLETED';
    this.logger.logEvent({ type: 'OPERATION_ENDED', timestamp: this.state.simTime, description: 'Operation Ended' });
    this.emit('ended');
  }

  public setSpeed(multiplier: number) {
    this.state.speedMultiplier = multiplier;
    this.emit('speedChanged', multiplier);
  }

  private tick() {
    if (this.state.isPaused) return;

    const deltaSimTime = 1 * this.state.speedMultiplier;
    this.state.simTime += deltaSimTime;

    this.updateUnitPositions(deltaSimTime);
    this.updateOfficerPositions(deltaSimTime);
    this.checkInjects();

    this.emit('tick', this.state);
  }

  private updateUnitPositions(deltaSimTime: number) {
    Object.values(this.state.units).forEach(unit => {
      if (unit.waypoints.length > 0 && unit.speed > 0) {
        const target = unit.waypoints[0];
        const dist = this.calculateDistance(unit.position, target);
        const moveDist = unit.speed * deltaSimTime;
        
        if (dist <= moveDist) {
          unit.position = { ...target };
          unit.waypoints.shift();
        } else {
          const ratio = moveDist / dist;
          unit.position.lat += (target.lat - unit.position.lat) * ratio;
          unit.position.lng += (target.lng - unit.position.lng) * ratio;
          unit.heading = Math.atan2(target.lng - unit.position.lng, target.lat - unit.position.lat) * 180 / Math.PI;
        }
      }
    });
  }

  private updateOfficerPositions(deltaSimTime: number) {
    Object.values(this.state.officers).forEach(officer => {
      if (officer.waypoints.length > 0 && officer.status === 'IN_TRANSIT') {
        const target = officer.waypoints[0];
        const dist = this.calculateDistance(officer.position, target);
        const speed = 10; // Fictional map speed
        const moveDist = speed * deltaSimTime;
        
        if (dist <= moveDist) {
          officer.position = { ...target };
          officer.waypoints.shift();

          if (officer.waypoints.length === 0) {
            officer.status = 'ACTIVE';
            
            if (officer.targetBuildingId && this.state.buildings[officer.targetBuildingId]) {
              const b = this.state.buildings[officer.targetBuildingId];
              if (!b.officers.includes(officer.id)) {
                b.officers.push(officer.id);
              }
              officer.currentBuildingId = b.id;
              
              this.logger.logEvent({
                type: 'OFFICER_ENTERED_BUILDING',
                timestamp: this.state.simTime,
                officerId: officer.id,
                buildingId: b.id,
                description: `${officer.name} entered ${b.name}`
              });
            }
            officer.targetBuildingId = null;
          }
        } else {
          const ratio = moveDist / dist;
          officer.position.lat += (target.lat - officer.position.lat) * ratio;
          officer.position.lng += (target.lng - officer.position.lng) * ratio;
        }
      }
    });
  }

  public moveOfficerToBuilding(officerId: string, targetBuildingId: string) {
    const officer = this.state.officers[officerId];
    const targetBuilding = this.state.buildings[targetBuildingId];
    if (!officer || !targetBuilding) return;

    if (officer.currentBuildingId) {
      const currentBuilding = this.state.buildings[officer.currentBuildingId];
      if (currentBuilding) {
        currentBuilding.officers = currentBuilding.officers.filter(id => id !== officerId);
      }
      this.logger.logEvent({
        type: 'OFFICER_LEFT_BUILDING',
        timestamp: this.state.simTime,
        officerId: officer.id,
        buildingId: officer.currentBuildingId,
        description: `${officer.name} departed ${currentBuilding?.name || 'building'}`
      });
    }

    this.logger.logEvent({
      type: 'OFFICER_MOVED',
      timestamp: this.state.simTime,
      officerId: officer.id,
      description: `${officer.name} started moving to ${targetBuilding.name}`
    });

    officer.currentBuildingId = null;
    officer.targetBuildingId = targetBuildingId;
    officer.status = 'IN_TRANSIT';
    officer.waypoints = [{ ...targetBuilding.position }];
  }
  
  public setOfficerComms(officerId: string, channel: string, status: 'AVAILABLE'|'DEGRADED'|'UNAVAILABLE') {
    const officer = this.state.officers[officerId];
    if (!officer) return;
    officer.commsNetwork = channel;
    officer.commsStatus = status;
    this.logger.logEvent({
      type: status === 'AVAILABLE' ? 'COMMUNICATION_RESTORED' : (status === 'DEGRADED' ? 'COMMUNICATION_DEGRADED' : 'COMMUNICATION_LOST'),
      timestamp: this.state.simTime,
      officerId,
      channel,
      status,
      description: `${officer.name} ${channel} communications ${status}`
    });
  }

  private checkInjects() {
    this.scenario.injects.forEach(inject => {
      if (this.state.simTime >= inject.triggerTime && !this.state.activeInjects.includes(inject.id)) {
        this.state.activeInjects.push(inject.id);
        this.emit('injectTriggered', inject);
      }
    });
  }

  private calculateDistance(p1: Position, p2: Position): number {
    return Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2));
  }
}
