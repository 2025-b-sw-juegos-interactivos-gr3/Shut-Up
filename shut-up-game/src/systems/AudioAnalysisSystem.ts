import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/events';

const STORAGE_KEY = 'shutup.mic_threshold';

export class AudioAnalysisSystem {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Float32Array<ArrayBuffer> | null = null;
  private threshold: number | null = null;
  private thresholdMultiplier = 1;
  private thresholdBoostUntilMs = 0;
  private enabled = false;
  private inGame = false;

  private readonly eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.threshold = parsed;
        this.eventBus.emit(GameEvents.MIC_CALIBRATED, { threshold: parsed });
      }
    }
  }

  getThreshold(): number | null {
    return this.threshold;
  }

  getIsEnabled(): boolean {
    return this.enabled;
  }

  async connectMicrophone(): Promise<void> {
    if (this.enabled) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    const buffer = new ArrayBuffer(this.analyser.fftSize * Float32Array.BYTES_PER_ELEMENT);
    this.data = new Float32Array(buffer);
    source.connect(this.analyser);
    this.enabled = true;
  }

  setInGame(inGame: boolean): void {
    this.inGame = inGame;
  }

  update(): void {
    if (!this.enabled || !this.analyser || !this.data) return;
    if (this.thresholdBoostUntilMs > 0 && performance.now() > this.thresholdBoostUntilMs) {
      this.thresholdMultiplier = 1;
      this.thresholdBoostUntilMs = 0;
    }
    this.analyser.getFloatTimeDomainData(this.data);
    const rms = computeRms(this.data);
    this.eventBus.emit(GameEvents.MIC_LEVEL, { rms });

    const effectiveThreshold = this.threshold != null ? this.threshold * this.thresholdMultiplier : null;
    if (this.inGame && effectiveThreshold != null && this.threshold != null && rms > effectiveThreshold) {
      this.eventBus.emit(GameEvents.NOISE_DETECTED, { rms, threshold: this.threshold });
      this.eventBus.emit(GameEvents.GAME_OVER, { reason: 'noise' });
    }
  }

  // Makes it easier to lose for a short duration (panic effect).
  applyTemporaryThresholdMultiplier(multiplier: number, durationMs: number): void {
    this.thresholdMultiplier = Math.max(0.5, Math.min(2, multiplier));
    this.thresholdBoostUntilMs = performance.now() + Math.max(0, durationMs);
  }

  async calibrate(seconds = 3): Promise<number> {
    if (!this.enabled) {
      await this.connectMicrophone();
    }
    if (!this.analyser || !this.data) throw new Error('Audio analyser not ready');

    const start = performance.now();
    const samples: number[] = [];
    while (performance.now() - start < seconds * 1000) {
      this.analyser.getFloatTimeDomainData(this.data);
      samples.push(computeRms(this.data));
      await sleep(50);
    }

    const mean = average(samples);
    const std = standardDeviation(samples, mean);
    const ambientPeak = Math.max(...samples);

    // Conservative threshold: ambient peak + margin.
    const candidate = Math.max(ambientPeak * 1.6, mean + std * 6, 0.02);
    this.threshold = candidate;
    localStorage.setItem(STORAGE_KEY, String(candidate));
    this.eventBus.emit(GameEvents.MIC_CALIBRATED, { threshold: candidate });
    return candidate;
  }
}

function computeRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = buffer[i];
    sum += v * v;
  }
  return Math.sqrt(sum / buffer.length);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function standardDeviation(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) {
    const d = v - mean;
    sum += d * d;
  }
  return Math.sqrt(sum / values.length);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
