import type { Scene } from '@babylonjs/core/scene';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/events';

export class FlashlightSystem {
  private readonly eventBus: EventBus;
  private readonly light: SpotLight;

  private isOn = true;
  private battery = 100;

  // Tuning
  private readonly drainPerSecond = 100 / 60; // 1 minute full drain
  private readonly regenPerSecond = 100 / 180; // 3 minutes to recharge

  private readonly baseIntensity = 12;
  private readonly baseRange = 60;

  constructor(eventBus: EventBus, scene: Scene, camera: Camera) {
    this.eventBus = eventBus;

    this.light = new SpotLight(
      'flashlight',
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 1),
      Math.PI / 6,
      18,
      scene,
    );
    this.light.diffuse = new Color3(1, 0.95, 0.85);
    this.light.specular = new Color3(1, 1, 1);
    this.light.intensity = this.baseIntensity;
    this.light.range = this.baseRange;

    // Attach to camera so it behaves like a handheld light.
    this.light.parent = camera as any;
    this.light.position = new Vector3(0.12, -0.12, 0.25);
    this.light.direction = new Vector3(0, 0, 1);

    this.publish();
    this.apply();
  }

  reset(): void {
    this.isOn = true;
    this.battery = 100;
    this.publish();
    this.apply();
  }

  toggle(): void {
    // Can't turn on if dead.
    if (!this.isOn && this.battery <= 0.5) return;
    this.isOn = !this.isOn;
    this.publish();
    this.apply();
  }

  update(dtSeconds: number): void {
    const prev = this.battery;
    if (this.isOn) {
      this.battery = Math.max(0, this.battery - this.drainPerSecond * dtSeconds);
      if (this.battery <= 0.01) {
        this.battery = 0;
        this.isOn = false;
        this.publish();
      }
    } else {
      this.battery = Math.min(100, this.battery + this.regenPerSecond * dtSeconds);
    }

    if (Math.floor(prev) !== Math.floor(this.battery)) {
      this.eventBus.emit(GameEvents.BATTERY_CHANGED, { percent: this.battery });
    }
    this.apply();
  }

  private publish(): void {
    this.eventBus.emit(GameEvents.FLASHLIGHT_CHANGED, { isOn: this.isOn });
    this.eventBus.emit(GameEvents.BATTERY_CHANGED, { percent: this.battery });
  }

  private apply(): void {
    const battery01 = Math.max(0, Math.min(1, this.battery / 100));
    const intensityScale = this.isOn ? Math.max(0.05, battery01) : 0;
    this.light.intensity = this.baseIntensity * intensityScale;
    this.light.range = this.baseRange * (0.55 + 0.45 * battery01);
  }
}
