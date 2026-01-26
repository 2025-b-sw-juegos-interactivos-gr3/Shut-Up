import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/events';

export class TimerSystem {
  private timeLeftSeconds: number;
  private readonly initialSeconds: number;
  private ended = false;

  private readonly eventBus: EventBus;

  constructor(eventBus: EventBus, initialSeconds = 18 * 60) {
    this.eventBus = eventBus;
    this.initialSeconds = initialSeconds;
    this.timeLeftSeconds = initialSeconds;
  }

  reset(): void {
    this.timeLeftSeconds = this.initialSeconds;
    this.ended = false;
    this.eventBus.emit(GameEvents.TIMER_CHANGED, { timeLeftSeconds: this.timeLeftSeconds });
  }

  update(dtSeconds: number, shouldTick: boolean): void {
    if (!shouldTick) return;
    if (this.ended) return;
    const prev = this.timeLeftSeconds;
    this.timeLeftSeconds = Math.max(0, this.timeLeftSeconds - dtSeconds);
    if (Math.floor(prev) !== Math.floor(this.timeLeftSeconds)) {
      this.eventBus.emit(GameEvents.TIMER_CHANGED, { timeLeftSeconds: Math.ceil(this.timeLeftSeconds) });
    }
    if (this.timeLeftSeconds <= 0) {
      this.ended = true;
      this.eventBus.emit(GameEvents.GAME_OVER, { reason: 'other' });
    }
  }

  getTimeLeftSeconds(): number {
    return this.timeLeftSeconds;
  }
}
