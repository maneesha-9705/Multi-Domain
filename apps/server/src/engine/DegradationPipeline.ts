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

export type ChannelState = {
  channel: string;
  status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  delaySeconds: number;
  dropoutRate: number;
};

export class DegradationPipeline {
  private activeEffects: DegradationEffect[] = [];
  private channels: Record<string, ChannelState> = {
    VHF: { channel: 'VHF', status: 'AVAILABLE', delaySeconds: 0, dropoutRate: 0 },
    UHF: { channel: 'UHF', status: 'AVAILABLE', delaySeconds: 0, dropoutRate: 0 },
    SATCOM: { channel: 'SATCOM', status: 'AVAILABLE', delaySeconds: 0, dropoutRate: 0 },
    DATALINK: { channel: 'DATALINK', status: 'AVAILABLE', delaySeconds: 0, dropoutRate: 0 },
  };
  
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

  public setChannelState(channel: string, status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE', delaySeconds: number = 10) {
    if (!this.channels[channel]) {
      this.channels[channel] = { channel, status: 'AVAILABLE', delaySeconds: 0, dropoutRate: 0 };
    }
    const c = this.channels[channel];
    c.status = status;
    if (status === 'AVAILABLE') {
      c.delaySeconds = 0;
      c.dropoutRate = 0;
    } else if (status === 'DEGRADED') {
      c.delaySeconds = delaySeconds;
      c.dropoutRate = 20;
    } else if (status === 'UNAVAILABLE') {
      c.delaySeconds = 0;
      c.dropoutRate = 100;
    }
  }

  public getChannelState(channel: string): ChannelState {
    return this.channels[channel] || { channel, status: 'AVAILABLE', delaySeconds: 0, dropoutRate: 0 };
  }

  public getAllChannels(): Record<string, ChannelState> {
    return this.channels;
  }

  public processOutgoingMessage(message: any, channel: string = 'VHF') {
    const chState = this.getChannelState(channel);
    if (chState.status === 'UNAVAILABLE') {
      return { status: 'DROPOUT' as const, reason: 'Total channel blackout / signal loss' };
    }
    if (chState.status === 'DEGRADED') {
      return {
        status: 'DELAYED' as const,
        delaySeconds: chState.delaySeconds || 10,
        message: {
          ...message,
          channel,
          degradationTag: `DELAYED BY ${chState.delaySeconds || 10}S`,
          originalSimTime: message.simTime
        }
      };
    }
    return {
      status: 'DELIVERED' as const,
      message: {
        ...message,
        channel,
        degradationTag: 'CLEAN'
      }
    };
  }

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
    const commsQuality: Record<string, number> = {};
    Object.entries(this.channels).forEach(([ch, s]) => {
      commsQuality[ch] = s.status === 'AVAILABLE' ? 100 : (s.status === 'DEGRADED' ? 50 : 0);
    });

    Object.values(truth.units).forEach(unit => {
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
          unitState.position.lat += (Math.random() - 0.5) * 0.01;
          unitState.position.lng += (Math.random() - 0.5) * 0.01;
          unitState.perceivedStatus = 'CORRUPTED';
        }

        this.lastKnownStates[role][unit.id] = { ...unitState, age: 0 };
        perceivedUnits[unit.id] = unitState;
      } else if (staleEffect) {
        const lastKnown = this.lastKnownStates[role][unit.id];
        if (lastKnown) {
          lastKnown.age += 1;
          perceivedUnits[unit.id] = { ...lastKnown, perceivedStatus: 'STALE' };
        }
      }
    });

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
      ...truth,
      perceivedUnits,
      commsQuality
    };
  }
}
