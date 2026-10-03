import { SimEvent } from '@echo-fog/shared';

export class EventLogger {
  private events: SimEvent[] = [];

  public logEvent(event: Omit<SimEvent, 'eventId'>) {
    const fullEvent: SimEvent = {
      eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...event
    };
    this.events.push(fullEvent);
    console.log(`[EventLog] ${fullEvent.timestamp} | ${fullEvent.type}: ${fullEvent.description}`);
    return fullEvent;
  }

  public getEvents(): SimEvent[] {
    return this.events;
  }

  public clear() {
    this.events = [];
  }
}
