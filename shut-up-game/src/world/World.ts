import {
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  PointLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';

export class World {
  readonly scene: Scene;
  readonly camera: UniversalCamera;

  readonly goalZ: number;

  private readonly canvas: HTMLCanvasElement;
  private readonly spawnPosition = new Vector3(0, 1.8, 0);
  private readonly spawnRotation = new Vector3(0, 0, 0);

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.02, 0.02, 0.03, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP;
    this.scene.fogDensity = 0.03;
    this.scene.fogColor = new Color3(0.03, 0.03, 0.04);

    this.scene.gravity = new Vector3(0, -0.9, 0);
    this.scene.collisionsEnabled = true;

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.65;

    const fill = new PointLight('fill', new Vector3(0, 8, 8), this.scene);
    fill.intensity = 0.45;
    fill.diffuse = new Color3(0.4, 0.45, 0.5);

    // Long corridor floor (with a few intentional gaps).
    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.08, 0.08, 0.09);

    const segmentDepth = 22;
    const segments = 18; // ~396m
    const corridorWidth = 20;
    for (let i = 0; i < segments; i++) {
      const floor = MeshBuilder.CreateBox(`floor_${i}`, { width: corridorWidth, height: 1, depth: segmentDepth }, this.scene);
      floor.position = new Vector3(0, -0.5, i * segmentDepth + segmentDepth / 2);
      floor.checkCollisions = true;
      floor.material = groundMat;
    }

    // Walls that run the full corridor.
    const wallMat = new StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = new Color3(0.12, 0.12, 0.14);

    const totalDepth = segmentDepth * segments;
    this.goalZ = totalDepth - 8;
    const wallHeight = 7;
    const wallThickness = 2;
    const wallX = corridorWidth / 2 + wallThickness / 2;

    const corridorLeft = MeshBuilder.CreateBox('corridorLeft', { width: wallThickness, height: wallHeight, depth: totalDepth }, this.scene);
    corridorLeft.position = new Vector3(-wallX, wallHeight / 2 - 0.5, totalDepth / 2);
    corridorLeft.checkCollisions = true;
    corridorLeft.material = wallMat;

    const corridorRight = MeshBuilder.CreateBox('corridorRight', { width: wallThickness, height: wallHeight, depth: totalDepth }, this.scene);
    corridorRight.position = new Vector3(wallX, wallHeight / 2 - 0.5, totalDepth / 2);
    corridorRight.checkCollisions = true;
    corridorRight.material = wallMat;

    const endCap = MeshBuilder.CreateBox('endCap', { width: corridorWidth + wallThickness * 2, height: wallHeight, depth: wallThickness }, this.scene);
    endCap.position = new Vector3(0, wallHeight / 2 - 0.5, totalDepth + wallThickness / 2);
    endCap.checkCollisions = true;
    endCap.material = wallMat;

    // Ceiling.
    for (let i = 0; i < segments; i++) {
      const ceil = MeshBuilder.CreateBox(`ceil_${i}`, { width: corridorWidth, height: 1, depth: segmentDepth }, this.scene);
      ceil.position = new Vector3(0, wallHeight - 0.0, i * segmentDepth + segmentDepth / 2);
      ceil.checkCollisions = true;
      ceil.material = groundMat;
    }

    // Obstacles throughout the corridor (to test collisions).
    for (let i = 0; i < 38; i++) {
      const size = 1.6 + (i % 4) * 0.6;
      const box = MeshBuilder.CreateBox(`ob_${i}`, { size }, this.scene);
      const lane = (i % 3) - 1; // -1,0,1
      box.position = new Vector3(lane * 5.5, size / 2, 18 + i * 9.5);
      box.checkCollisions = true;
      box.material = wallMat;
    }

    this.camera = new UniversalCamera('camera', new Vector3(0, 1.8, 0), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    this.camera.ellipsoid = new Vector3(0.4, 0.9, 0.4);
    this.camera.minZ = 0.05;
    this.camera.speed = 0.55;
    this.camera.angularSensibility = 2500;

    // Use WASD instead of arrow keys.
    this.camera.keysUp = [87]; // W
    this.camera.keysDown = [83]; // S
    this.camera.keysLeft = [65]; // A
    this.camera.keysRight = [68]; // D

    this.resetPlayerToSpawn();

    this.scene.onPointerDown = () => {
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }
    };

    const pipeline = new DefaultRenderingPipeline('vhs', true, this.scene, [this.camera]);
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 26;
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 18;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.35;
    pipeline.imageProcessing.exposure = 0.62;
  }

  resetPlayerToSpawn(): void {
    this.camera.position.copyFrom(this.spawnPosition);
    this.camera.rotation.copyFrom(this.spawnRotation);
    // Safety: clear any residual camera motion.
    (this.camera as any).cameraDirection?.setAll?.(0);
    (this.camera as any).cameraRotation?.setAll?.(0);
  }
}
