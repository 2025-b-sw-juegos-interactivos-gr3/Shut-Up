import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/events';

export class MovementSystem {
  private lastPos: Vector3 | null = null;
  private isMoving = false;

  private readonly eventBus: EventBus;
  private readonly camera: Camera;
  private readonly movementThreshold: number;

  constructor(eventBus: EventBus, camera: Camera, movementThreshold = 0.1) {
    this.eventBus = eventBus;
    this.camera = camera;
    this.movementThreshold = movementThreshold;
  }

  reset(): void {
    this.lastPos = this.camera.globalPosition.clone();
    this.isMoving = false;
    this.eventBus.emit(GameEvents.PLAYER_MOVEMENT, { isMoving: false, speed: 0 });
  }

  update(dtSeconds: number): void {
    if (!this.lastPos) {
      this.reset();
      return;
    }

    const pos = this.camera.globalPosition;
    const dist = Vector3.Distance(pos, this.lastPos);
    const speed = dtSeconds > 0 ? dist / dtSeconds : 0;
    this.lastPos.copyFrom(pos);

    const movingNow = speed > this.movementThreshold;
    if (movingNow !== this.isMoving) {
      this.isMoving = movingNow;
      this.eventBus.emit(GameEvents.PLAYER_MOVEMENT, { isMoving: movingNow, speed });
    }
  }

  getIsMoving(): boolean {
    return this.isMoving;
  }
}
