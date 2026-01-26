import type { IGameState } from './IGameState';
import type { UIController } from '../ui/UIController';
import type { AudioAnalysisSystem } from '../systems/AudioAnalysisSystem';
import type { TimerSystem } from '../systems/TimerSystem';
import type { MovementSystem } from '../systems/MovementSystem';
import type { ScareSystem } from '../systems/ScareSystem';
import type { FlashlightSystem } from '../systems/FlashlightSystem';

export class PlayState implements IGameState {
  readonly name = 'Play';

  private readonly ui: UIController;
  private readonly audio: AudioAnalysisSystem;
  private readonly timer: TimerSystem;
  private readonly movement: MovementSystem;
  private readonly resetToSpawn: () => void;
  private readonly scares: ScareSystem;
  private readonly flashlight: FlashlightSystem;

  constructor(
    ui: UIController,
    audio: AudioAnalysisSystem,
    timer: TimerSystem,
    movement: MovementSystem,
    resetToSpawn: () => void,
    scares: ScareSystem,
    flashlight: FlashlightSystem,
  ) {
    this.ui = ui;
    this.audio = audio;
    this.timer = timer;
    this.movement = movement;
    this.resetToSpawn = resetToSpawn;
    this.scares = scares;
    this.flashlight = flashlight;
  }

  enter(_prev: IGameState | null): void {
    this.audio.setInGame(true);
    this.resetToSpawn();
    this.timer.reset();
    this.movement.reset();
    this.scares.reset();
    this.flashlight.reset();
    this.ui.setOverlayMode('hidden');
  }

  exit(_next: IGameState): void {
    this.audio.setInGame(false);
  }

  update(dtSeconds: number): void {
    this.audio.update();
    this.movement.update(dtSeconds);
    this.scares.update();
    this.flashlight.update(dtSeconds);
    this.timer.update(dtSeconds, this.movement.getIsMoving());
  }

  rewind(): void {
    this.resetToSpawn();
    this.timer.reset();
    this.movement.reset();
    this.scares.reset();
    this.flashlight.reset();
  }
}
