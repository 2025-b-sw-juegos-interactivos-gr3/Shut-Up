import type { IGameState } from './IGameState';
import type { UIController } from '../ui/UIController';
import type { AudioAnalysisSystem } from '../systems/AudioAnalysisSystem';

export class MenuState implements IGameState {
  readonly name = 'Menu';

  private readonly ui: UIController;
  private readonly audio: AudioAnalysisSystem;

  constructor(ui: UIController, audio: AudioAnalysisSystem) {
    this.ui = ui;
    this.audio = audio;
  }

  enter(_prev: IGameState | null): void {
    this.audio.setInGame(false);
    this.ui.setOverlayMode('menu');
  }

  exit(_next: IGameState): void {}

  update(_dtSeconds: number): void {
    this.audio.update();
  }
}
