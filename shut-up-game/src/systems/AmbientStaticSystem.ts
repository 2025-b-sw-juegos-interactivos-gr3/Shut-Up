export class AmbientStaticSystem {
  private audioContext: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;

    this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // White noise with a tiny bit of low-pass-ish feel via scaling.
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    this.gain = ctx.createGain();
    this.gain.gain.value = 0.04;

    this.noiseSource.connect(this.gain);
    this.gain.connect(ctx.destination);

    this.noiseSource.start();
    this.started = true;
  }

  setLevel(level01: number): void {
    if (!this.gain) return;
    const clamped = Math.max(0, Math.min(1, level01));
    this.gain.gain.value = 0.02 + clamped * 0.06;
  }
}
