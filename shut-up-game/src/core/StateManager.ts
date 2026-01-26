import type { IGameState } from '../states/IGameState';

export class StateManager {
  private current: IGameState;

  constructor(initial: IGameState) {
    this.current = initial;
    this.current.enter(null);
  }

  transition(next: IGameState): void {
    const prev = this.current;
    prev.exit(next);
    this.current = next;
    next.enter(prev);
  }

  update(dtSeconds: number): void {
    this.current.update(dtSeconds);
  }

  getCurrent(): IGameState {
    return this.current;
  }
}
