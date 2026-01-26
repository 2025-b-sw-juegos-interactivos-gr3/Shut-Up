import { Engine } from '@babylonjs/core';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/events';
import { StateManager } from '../core/StateManager';
import { AudioAnalysisSystem } from '../systems/AudioAnalysisSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { TimerSystem } from '../systems/TimerSystem';
import { ScareSystem } from '../systems/ScareSystem';
import { FlashlightSystem } from '../systems/FlashlightSystem';
import { AmbientStaticSystem } from '../systems/AmbientStaticSystem';
import { GameOverState } from '../states/GameOverState';
import { MenuState } from '../states/MenuState';
import { PlayState } from '../states/PlayState';
import { WinState } from '../states/WinState';
import { UIController } from '../ui/UIController';
import { World } from '../world/World';

export class GameApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: Engine;
  private readonly eventBus = EventBus.getInstance();

  private readonly ui: UIController;
  private readonly world: World;
  private readonly audio: AudioAnalysisSystem;
  private readonly timer: TimerSystem;
  private readonly movement: MovementSystem;
  private readonly scares: ScareSystem;
  private readonly flashlight: FlashlightSystem;
  private readonly ambient: AmbientStaticSystem;

  private readonly ambientPlayLevel = 0.6;
  private readonly ambientPrePlayLevel = this.ambientPlayLevel * 0.5;

  private readonly menuState: MenuState;
  private readonly playState: PlayState;
  private readonly gameOverState: GameOverState;
  private readonly winState: WinState;
  private readonly stateManager: StateManager;

  private lastFrameMs = performance.now();
  private paused = false;
  private runStartedAtMs = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
    this.world = new World(this.engine, this.canvas);
    this.ui = new UIController(this.eventBus);
    this.audio = new AudioAnalysisSystem(this.eventBus);
    this.timer = new TimerSystem(this.eventBus);
    this.movement = new MovementSystem(this.eventBus, this.world.camera);
    this.scares = new ScareSystem(this.eventBus, this.world.scene, this.world.camera);
    this.flashlight = new FlashlightSystem(this.eventBus, this.world.scene, this.world.camera);
    this.ambient = new AmbientStaticSystem();

    this.menuState = new MenuState(this.ui, this.audio);
    this.playState = new PlayState(
      this.ui,
      this.audio,
      this.timer,
      this.movement,
      () => this.world.resetPlayerToSpawn(),
      this.scares,
      this.flashlight,
    );
    this.gameOverState = new GameOverState(this.ui, this.audio);
    this.winState = new WinState(this.ui, this.audio);

    this.stateManager = new StateManager(this.menuState);

    this.ui.wireButtons({
      onConnectMic: async () => {
        await this.ambient.start();
        this.ambient.setLevel(this.ambientPrePlayLevel);
        await this.audio.connectMicrophone();
      },
      onCalibrate: async () => {
        await this.audio.calibrate(3);
      },
      onStart: () => {
        void this.ambient.start().then(() => this.ambient.setLevel(this.ambientPlayLevel));
        this.paused = false;
        this.runStartedAtMs = performance.now();
        this.stateManager.transition(this.playState);
      },
      onResume: () => {
        this.setPaused(false);
      },
      onRestart: () => {
        this.handleRewind();
      },
    });

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'r') {
        this.handleRewind();
      }
      if (e.key.toLowerCase() === 'f') {
        if (this.stateManager.getCurrent().name === this.playState.name) {
          this.flashlight.toggle();
        }
      }

      if (e.key.toLowerCase() === 'p') {
        if (this.stateManager.getCurrent().name === this.playState.name) {
          this.setPaused(!this.paused);
        }
      }

      if (e.key === 'Escape') {
        if (this.stateManager.getCurrent().name === this.playState.name && !this.paused) {
          this.setPaused(true);
        }
      }
    });

    this.eventBus.on(GameEvents.GAME_OVER, () => {
      if (this.stateManager.getCurrent().name === this.playState.name) {
        this.ambient.setLevel(0.35);
        this.stateManager.transition(this.gameOverState);
      }
    });

    this.eventBus.on(GameEvents.GAME_WIN, () => {
      if (this.stateManager.getCurrent().name === this.playState.name) {
        this.ambient.setLevel(0.25);
        this.stateManager.transition(this.winState);
      }
    });

    this.eventBus.on(GameEvents.SCARE_TRIGGERED, ({ intensity }) => {
      // Panic: temporarily reduce tolerance (easier to lose).
      const multiplier = 1 - Math.min(0.25, intensity * 0.15);
      this.audio.applyTemporaryThresholdMultiplier(multiplier, 2500);
    });

    window.addEventListener('resize', () => this.engine.resize());
  }

  start(): void {
    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const dtSeconds = Math.min(0.05, (now - this.lastFrameMs) / 1000);
      this.lastFrameMs = now;

      if (this.paused) {
        this.world.scene.render();
        return;
      }

      // Objective: reach the end of the corridor.
      if (this.stateManager.getCurrent().name === this.playState.name) {
        if (this.world.camera.globalPosition.z >= this.world.goalZ) {
          const spent = this.runStartedAtMs > 0 ? Math.max(0, Math.round((now - this.runStartedAtMs) / 1000)) : 0;
          this.eventBus.emit(GameEvents.GAME_WIN, { timeSpentSeconds: spent });
        }
      }

      this.stateManager.update(dtSeconds);
      this.world.scene.render();
    });
  }

  private handleRewind(): void {
    const current = this.stateManager.getCurrent().name;

    // In-game: rewind immediately without leaving Play.
    if (current === this.playState.name) {
      this.playState.rewind();
      return;
    }

    // From GameOver/Win: restart a fresh run from spawn.
    if (current === this.gameOverState.name || current === this.winState.name) {
      this.paused = false;
      this.runStartedAtMs = performance.now();
      this.stateManager.transition(this.playState);
      return;
    }

    // From Menu: do nothing.
  }

  private setPaused(isPaused: boolean): void {
    if (isPaused === this.paused) return;

    this.paused = isPaused;
    if (this.paused) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      this.ui.setOverlayMode('pause');
    } else {
      this.ui.setOverlayMode('hidden');
    }
  }
}
