import { GroundTruthState, Scenario, UnitState, Position } from '@echo-fog/shared';
import { EventEmitter } from 'events';

export class SimulationEngine extends EventEmitter {
  private state: GroundTruthState;
  private scenario: Scenario;
  private tickInterval: NodeJS.Timeout | null = null;
  private readonly TICK_RATE_MS = 1000; // 1 real second = 1 tick
  private lastTickTime: number = 0;

  constructor(exerciseId: string, scenario: Scenario) {
    super();
    this.scenario = scenario;
    
    // Initialize ground truth state from scenario
    const units: Record<string, UnitState> = {};
    scenario.initialUnits.forEach(u => {
      units[u.id] = { ...u };
    });

    this.state = {
      simTime: 0,
      exerciseId,
      scenarioId: scenario.id,
      units,
      activeInjects: [],
      speedMultiplier: 1,
      isPaused: true
    };
  }

  public getState(): GroundTruthState {
    return this.state;
  }

  public start() {
    if (!this.state.isPaused) return;
    this.state.isPaused = false;
    this.lastTickTime = Date.now();
    this.tickInterval = setInterval(() => this.tick(), this.TICK_RATE_MS);
    this.emit('started');
  }

  public pause() {
    if (this.state.isPaused) return;
    this.state.isPaused = true;
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.emit('paused');
  }
  
  public setSpeed(multiplier: number) {
    this.state.speedMultiplier = multiplier;
    this.emit('speedChanged', multiplier);
  }

  private tick() {
    if (this.state.isPaused) return;

    const now = Date.now();
    // In a real implementation we would calculate exact delta, 
    // but for discrete ticks we'll just add the multiplier
    const deltaSimTime = 1 * this.state.speedMultiplier;
    this.state.simTime += deltaSimTime;

    this.updateUnitPositions(deltaSimTime);
    this.checkInjects();

    // Emit tick event so socket manager can distribute state
    this.emit('tick', this.state);
  }

  private updateUnitPositions(deltaSimTime: number) {
    Object.values(this.state.units).forEach(unit => {
      if (unit.waypoints.length > 0 && unit.speed > 0) {
        const target = unit.waypoints[0];
        const dist = this.calculateDistance(unit.position, target);
        
        // 1 unit = 1 meter
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
