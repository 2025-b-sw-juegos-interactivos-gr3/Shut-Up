import type { Scene } from '@babylonjs/core/scene';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/events';

type Trigger = {
  id: string;
  center: Vector3;
  halfExtents: Vector3;
  oneShot: boolean;
  triggered: boolean;
  cooldownMs: number;
  lastTriggeredMs: number;
  wasInside: boolean;
  intensity: number;
};

export class ScareSystem {
  private triggers: Trigger[] = [];
  private audioContext: AudioContext | null = null;
  private audioBufferCache = new Map<string, AudioBuffer | null>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();

  private lastGlobalScareMs = 0;
  private nextGlobalCooldownMs = 6500;

  private readonly eventBus: EventBus;
  private readonly scene: Scene;
  private readonly camera: Camera;

  constructor(eventBus: EventBus, scene: Scene, camera: Camera) {
    this.eventBus = eventBus;
    this.scene = scene;
    this.camera = camera;
    // Many scare volumes along the corridor, so you don't run out after 4.
    // IDs map to assets in /public/screamers and /public/sfx (optional).
    const startZ = 24;
    const endZ = 382;
    const approxStep = 18;
    const count = Math.max(1, Math.floor((endZ - startZ) / approxStep) + 1);

    // Scatter volumes with jitter so spacing isn't linear.
    for (let i = 0; i < count; i++) {
      const z = startZ + i * approxStep + randRange(-10, 10);
      const id = `screamer_${i + 1}`;
      const intensity = clamp01(0.32 + randRange(-0.08, 0.28));

      // Mix of one-shot and repeating triggers.
      const oneShot = Math.random() < 0.55;
      const cooldownMs = oneShot ? 0 : 8000 + Math.floor(Math.random() * 7000);

      this.createTrigger(id, new Vector3(0, 1.8, z), new Vector3(8.5, 3, 5.5), intensity, oneShot, cooldownMs);
    }
  }

  reset(): void {
    this.triggers = this.triggers.map((t) => ({
      ...t,
      triggered: false,
      lastTriggeredMs: 0,
      wasInside: false,
    }));
    this.lastGlobalScareMs = 0;
    this.nextGlobalCooldownMs = 6500;
  }

  update(): void {
    const p = this.camera.globalPosition;
    const nowMs = performance.now();
    for (const t of this.triggers) {
      if (t.oneShot && t.triggered) continue;
      if (!t.oneShot && t.cooldownMs > 0 && nowMs - t.lastTriggeredMs < t.cooldownMs) continue;

      const inside = containsPointAabb(p, t.center, t.halfExtents);
      if (inside && !t.wasInside) {
        // Only attempt when entering the volume to avoid spam.
        t.wasInside = true;

        // Global cooldown prevents scares from clustering too predictably.
        if (nowMs - this.lastGlobalScareMs < this.nextGlobalCooldownMs) {
          continue;
        }

        const chance = 0.32 + t.intensity * 0.45;
        if (Math.random() <= chance) {
          t.triggered = true;
          t.lastTriggeredMs = nowMs;
          this.lastGlobalScareMs = nowMs;
          this.nextGlobalCooldownMs = 4500 + Math.floor(Math.random() * 9500);

          this.eventBus.emit(GameEvents.SCARE_TRIGGERED, { id: t.id, intensity: t.intensity });
          this.playScreamer(t.id, t.intensity);
        }
      }

      if (!inside && t.wasInside) {
        t.wasInside = false;
      }
    }
  }

  private createTrigger(
    id: string,
    center: Vector3,
    halfExtents: Vector3,
    intensity: number,
    oneShot: boolean,
    cooldownMs: number,
  ): void {
    this.triggers.push({
      id,
      center,
      halfExtents,
      intensity,
      oneShot,
      cooldownMs,
      lastTriggeredMs: 0,
      wasInside: false,
      triggered: false,
    });

    // Optional invisible volume for debugging spatial placement.
    const mesh = MeshBuilder.CreateBox(`trigger_${id}`, {
      width: halfExtents.x * 2,
      height: halfExtents.y * 2,
      depth: halfExtents.z * 2,
    }, this.scene);
    mesh.position = center.clone();
    mesh.isVisible = false;
    mesh.checkCollisions = false;
    const mat = new StandardMaterial(`triggerMat_${id}`, this.scene);
    mat.emissiveColor = new Color3(1, 0, 0);
    mat.alpha = 0.15;
    mesh.material = mat;
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  private playScreamer(id: string, intensity: number): void {
    void this.ensureAudioContext().then(async (ctx) => {
      const buffer = await this.getOrLoadAudioBuffer(id, ctx);
      if (buffer) {
        this.playBuffer(ctx, buffer, intensity);
        return;
      }

      // Fallback: heavier synthetic stinger.
      this.playSynthScreamer(ctx, intensity);
    });
  }

  private playBuffer(ctx: AudioContext, buffer: AudioBuffer, intensity: number): void {
    const now = ctx.currentTime;
    const maxSeconds = 1.25;
    const duration = Math.min(buffer.duration, maxSeconds);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 0.92 + Math.random() * 0.18;

    const gain = ctx.createGain();
    const peak = Math.min(1, 0.55 + intensity * 0.55);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + duration);
  }

  private async getOrLoadAudioBuffer(id: string, ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.audioBufferCache.has(id)) return this.audioBufferCache.get(id) ?? null;
    const existing = this.loading.get(id);
    if (existing) return existing;

    const promise = this.loadAudioBufferFromPublic(id, ctx)
      .then((buffer) => {
        this.audioBufferCache.set(id, buffer);
        this.loading.delete(id);
        return buffer;
      })
      .catch(() => {
        this.audioBufferCache.set(id, null);
        this.loading.delete(id);
        return null;
      });

    this.loading.set(id, promise);
    return promise;
  }

  private async loadAudioBufferFromPublic(id: string, ctx: AudioContext): Promise<AudioBuffer | null> {
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    const name = id;
    const exts = ['ogg', 'mp3', 'wav'];

    for (const ext of exts) {
      const url = `${String(base).replace(/\/$/, '')}/sfx/${name}.${ext}`;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const arr = await res.arrayBuffer();
        return await ctx.decodeAudioData(arr);
      } catch {
        // Try next extension.
      }
    }
    return null;
  }

  private playSynthScreamer(ctx: AudioContext, intensity: number): void {
    const now = ctx.currentTime;
    const duration = 0.45 + intensity * 0.45;

    // Noise burst
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      const env = Math.pow(1 - t, 2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(700, now);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1200 + intensity * 900, now);
    bp.Q.setValueAtTime(6, now);

    // Harsh tonal layer
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520 + intensity * 420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + duration);

    const mix = ctx.createGain();
    mix.gain.setValueAtTime(1, now);

    const out = ctx.createGain();
    const peak = Math.min(1, 0.35 + intensity * 0.75);
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(peak, now + 0.02);
    out.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-22, now);
    comp.knee.setValueAtTime(18, now);
    comp.ratio.setValueAtTime(10, now);
    comp.attack.setValueAtTime(0.003, now);
    comp.release.setValueAtTime(0.18, now);

    noise.connect(hp);
    hp.connect(bp);
    bp.connect(mix);

    osc.connect(mix);
    mix.connect(out);
    out.connect(comp);
    comp.connect(ctx.destination);

    noise.start(now);
    osc.start(now);
    osc.stop(now + duration);
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function containsPointAabb(p: Vector3, c: Vector3, e: Vector3): boolean {
  return (
    Math.abs(p.x - c.x) <= e.x &&
    Math.abs(p.y - c.y) <= e.y &&
    Math.abs(p.z - c.z) <= e.z
  );
}
