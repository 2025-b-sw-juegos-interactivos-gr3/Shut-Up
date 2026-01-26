import type { IGameState } from './IGameState';
import type { UIController } from '../ui/UIController';
import type { AudioAnalysisSystem } from '../systems/AudioAnalysisSystem';

export class GameOverState implements IGameState {
  readonly name = 'GameOver';

  private readonly ui: UIController;
  private readonly audio: AudioAnalysisSystem;

  constructor(ui: UIController, audio: AudioAnalysisSystem) {
    this.ui = ui;
    this.audio = audio;
  }

  enter(_prev: IGameState | null): void {
    this.audio.setInGame(false);
    this.ui.setOverlayMode('gameover');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  exit(_next: IGameState): void {}

  update(_dtSeconds: number): void {
    // Keep mic meter alive on the menu overlay.
    this.audio.update();
  }
}
