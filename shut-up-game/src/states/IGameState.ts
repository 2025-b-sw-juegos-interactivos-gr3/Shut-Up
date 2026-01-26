export interface IGameState {
  readonly name: string;
  enter(prev: IGameState | null): void;
  exit(next: IGameState): void;
  update(dtSeconds: number): void;
}
