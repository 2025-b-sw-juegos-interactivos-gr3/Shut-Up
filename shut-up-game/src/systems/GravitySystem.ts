import type { Scene } from '@babylonjs/core/scene';
import type { World } from '../world/World';
import { EventBus } from '../core/EventBus';

export class GravitySystem {
  // NOTE: Gravity toggling was removed from the vertical slice.
  // This class remains as a no-op stub to avoid breaking historical references.
  // It is intentionally unused by the current game loop.
  constructor(_eventBus: EventBus, _scene: Scene, _world: World) {}

  reset(): void {}

  getIsInverted(): boolean {
    return false;
  }

  toggleIfGrounded(): void {}
}
