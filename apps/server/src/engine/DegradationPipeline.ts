import { GroundTruthState, UnitState, Role, InfoMessage } from '@echo-fog/shared';

// Define active degradations
export type DegradationEffect = {
  id: string;
  type: 'DELAY' | 'DROPOUT' | 'CORRUPTION' | 'STALE' | 'SPOOF';
  targetRole?: Role;
  targetChannel?: string;
  intensity: number; // 0-100
  active: boolean;
};

export class DegradationPipeline {
  private activeEffects: DegradationEffect[] = [];
  
  // Track last known good states for 'STALE' effect
  private lastKnownStates: Record<Role, Record<string, UnitState & { age: number }>> = {
    INSTRUCTOR: {},
    TRAINEE_COMPANY_CMDR: {},
    TRAINEE_PLATOON_CMDR_1: {},
    TRAINEE_PLATOON_CMDR_2: {},
    TRAINEE_AIR_LIAISON: {},
    TRAINEE_EW_OFFICER: {},
    TRAINEE_CYBER_OFFICER: {}
  };

  public addEffect(effect: DegradationEffect) {
    this.activeEffects.push(effect);
  }

  public removeEffect(id: string) {
    this.activeEffects = this.activeEffects.filter(e => e.id !== id);
  }

  public getActiveEffects() {
    return this.activeEffects;
  }

  public processStateForRole(truth: GroundTruthState, role: Role) {
    if (role === 'INSTRUCTOR') {
      return truth; // Instructor always sees ground truth
    }

    // Deep copy truth to mutate into perceived
    const perceivedUnits: Record<string, UnitState & { perceivedStatus?: string; age?: number }> = {};
    const commsQuality: Record<string, number> = {
      VHF: 100, UHF: 100, SATCOM: 100, DATALINK: 100
    };

    // Apply effects to comms quality
    this.activeEffects.forEach(effect => {
      if ((!effect.targetRole || effect.targetRole === role) && effect.targetChannel) {
        if (effect.type === 'DROPOUT') {
          commsQuality[effect.targetChannel] = Math.max(0, 100 - effect.intensity);
        } else if (effect.type === 'DELAY') {
          commsQuality[effect.targetChannel] = Math.max(0, 100 - (effect.intensity / 2));
        }
      }
    });

    Object.values(truth.units).forEach(unit => {
      // Basic visibility logic: Red units are only visible if they are within a certain condition
      // For this demo, let's assume all units are transmitted via a data link that can be degraded.
      
      let isVisible = true;
      let unitState = { ...unit } as any;

      const dropoutEffect = this.activeEffects.find(e => e.type === 'DROPOUT' && (!e.targetRole || e.targetRole === role));
      const staleEffect = this.activeEffects.find(e => e.type === 'STALE' && (!e.targetRole || e.targetRole === role));
      const corruptionEffect = this.activeEffects.find(e => e.type === 'CORRUPTION' && (!e.targetRole || e.targetRole === role));

      if (dropoutEffect && Math.random() * 100 < dropoutEffect.intensity) {
        isVisible = false;
      }

      if (isVisible) {
        if (corruptionEffect && Math.random() * 100 < corruptionEffect.intensity) {
          // Corrupt position slightly
          unitState.position.lat += (Math.random() - 0.5) * 0.01;
          unitState.position.lng += (Math.random() - 0.5) * 0.01;
          unitState.perceivedStatus = 'CORRUPTED';
        }

        // Update last known state
        this.lastKnownStates[role][unit.id] = { ...unitState, age: 0 };
        perceivedUnits[unit.id] = unitState;
      } else if (staleEffect) {
        // Fall back to last known state
        const lastKnown = this.lastKnownStates[role][unit.id];
        if (lastKnown) {
          lastKnown.age += 1;
          perceivedUnits[unit.id] = { ...lastKnown, perceivedStatus: 'STALE' };
        }
      }
    });

    // Handle spoofing (fake units)
    const spoofEffects = this.activeEffects.filter(e => e.type === 'SPOOF' && (!e.targetRole || e.targetRole === role));
    spoofEffects.forEach((spoof, idx) => {
       perceivedUnits[`spoof-${idx}`] = {
         id: `spoof-${idx}`,
         callsign: 'UNKNOWN CONTACT',
         affiliation: 'UNKNOWN',
         type: 'ARMOUR',
         position: { lat: 51.53 + (Math.random()*0.02), lng: -0.12 + (Math.random()*0.02) },
         heading: 0,
         speed: 0,
         waypoints: [],
         status: 'ACTIVE',
         perceivedStatus: 'UNVERIFIED',
         age: 0
       };
    });

    return {
      simTime: truth.simTime,
      exerciseId: truth.exerciseId,
      perceivedUnits,
      commsQuality
    };
  }
}
