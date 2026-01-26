import { EventBus } from '../core/EventBus';
import { GameEvents } from '../core/events';

type OverlayMode = 'menu' | 'hidden' | 'pause' | 'gameover' | 'win';

export class UIController {
  private overlay: HTMLDivElement;
  private hud: HTMLDivElement;

  private btnMic: HTMLButtonElement;
  private btnCalibrate: HTMLButtonElement;
  private btnStart: HTMLButtonElement;

  private micValue: HTMLSpanElement;
  private micThreshold: HTMLSpanElement;
  private micBar: HTMLDivElement;
  private micHint: HTMLElement;

  private hudTimestamp: HTMLSpanElement;
  private hudBattery: HTMLSpanElement;
  private hudMicFill: HTMLDivElement;
  private screamer: HTMLDivElement;
  private screamerImg: HTMLImageElement;
  private screamerTimeout: number | null = null;

  private mode: OverlayMode = 'menu';
  private isMicConnected = false;
  private hasThreshold = false;
  private lastGameOverReason: 'noise' | 'other' = 'noise';

  private readonly eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.overlay = mustGet<HTMLDivElement>('#overlay');
    this.hud = mustGet<HTMLDivElement>('#hud');

    this.btnMic = mustGet<HTMLButtonElement>('#btnMic');
    this.btnCalibrate = mustGet<HTMLButtonElement>('#btnCalibrate');
    this.btnStart = mustGet<HTMLButtonElement>('#btnStart');

    this.micValue = mustGet<HTMLSpanElement>('#micValue');
    this.micThreshold = mustGet<HTMLSpanElement>('#micThreshold');
    this.micBar = mustGet<HTMLDivElement>('#micBar');
    this.micHint = mustGet<HTMLElement>('#micHint');

    this.hudTimestamp = mustGet<HTMLSpanElement>('#hudTimestamp');
    this.hudBattery = mustGet<HTMLSpanElement>('#hudBattery');
    this.hudMicFill = mustGet<HTMLDivElement>('#micMeterFill');
    this.screamer = mustGet<HTMLDivElement>('#screamer');
    this.screamerImg = mustGet<HTMLImageElement>('#screamerImg');

    this.setOverlayMode('menu');
    this.hudBattery.textContent = '100%';

    this.eventBus.on(GameEvents.MIC_LEVEL, ({ rms }) => {
      const clamped = clamp01(rms * 10);
      this.micValue.textContent = rms.toFixed(3);
      this.micBar.style.width = `${clamped * 100}%`;
      this.hudMicFill.style.width = `${clamped * 100}%`;
    });

    this.eventBus.on(GameEvents.MIC_CALIBRATED, ({ threshold }) => {
      this.hasThreshold = true;
      this.micThreshold.textContent = threshold.toFixed(3);
      this.updateButtons();
    });

    this.eventBus.on(GameEvents.TIMER_CHANGED, ({ timeLeftSeconds }) => {
      this.hudTimestamp.textContent = formatTimestamp(timeLeftSeconds);
    });

    this.eventBus.on(GameEvents.GAME_OVER, ({ reason }) => {
      this.lastGameOverReason = reason;
      this.setOverlayMode('gameover');
    });

    this.eventBus.on(GameEvents.GAME_WIN, () => {
      this.setOverlayMode('win');
    });

    this.eventBus.on(GameEvents.SCARE_TRIGGERED, ({ id }) => {
      this.setScreamerImage(id);
      this.flashScreamer(420);
    });

    this.eventBus.on(GameEvents.BATTERY_CHANGED, ({ percent }) => {
      this.hudBattery.textContent = `${Math.round(percent)}%`;
    });
  }

  private flashScreamer(ms: number): void {
    if (this.screamerTimeout != null) {
      window.clearTimeout(this.screamerTimeout);
      this.screamerTimeout = null;
    }
    this.screamer.classList.add('visible');
    this.screamerTimeout = window.setTimeout(() => {
      this.screamer.classList.remove('visible');
      this.screamerTimeout = null;
    }, ms);
  }

  private setScreamerImage(id: string): void {
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    const safeBase = String(base).replace(/\/$/, '') + '/';
    const primary = `${safeBase}screamers/${id}.svg`;
    const fallback = `${safeBase}screamers/default.svg`;

    this.screamerImg.onerror = () => {
      if (this.screamerImg.src !== fallback) this.screamerImg.src = fallback;
    };

    this.screamerImg.src = primary;
  }

  wireButtons(options: {
    onConnectMic: () => Promise<void>;
    onCalibrate: () => Promise<void>;
    onStart: () => void;
    onResume: () => void;
    onRestart: () => void;
  }): void {
    this.btnMic.addEventListener('click', async () => {
      this.micHint.textContent = 'Solicitando permiso de micrófono...';
      try {
        await options.onConnectMic();
        this.isMicConnected = true;
        this.micHint.textContent = 'Micrófono listo. Calibra tu silencio.';
      } catch (err) {
        this.micHint.textContent = 'No se pudo acceder al micrófono (revisa permisos).';
        throw err;
      } finally {
        this.updateButtons();
      }
    });

    this.btnCalibrate.addEventListener('click', async () => {
      this.micHint.textContent = 'Calibrando... silencio total por 3s.';
      this.btnCalibrate.disabled = true;
      try {
        await options.onCalibrate();
        this.micHint.textContent = 'Calibración lista. Inicia cuando quieras.';
      } finally {
        this.updateButtons();
      }
    });

    this.btnStart.addEventListener('click', () => {
      if (this.mode === 'pause') {
        options.onResume();
      } else if (this.mode === 'gameover' || this.mode === 'win') {
        options.onRestart();
      } else {
        options.onStart();
      }
    });
  }

  setOverlayMode(mode: OverlayMode): void {
    this.mode = mode;
    if (mode === 'hidden') {
      this.overlay.style.display = 'none';
      this.hud.classList.add('visible');
      return;
    }

    this.overlay.style.display = 'grid';
    // Keep VHS overlay visible even in menu.
    this.hud.classList.add('visible');

    const panel = this.overlay.querySelector<HTMLDivElement>('.panel');
    if (!panel) return;

    if (mode === 'menu') {
      panel.querySelector('h1')!.textContent = 'SHUT UP! — Vertical Slice';
      panel.querySelectorAll('p')[0]!.innerHTML = '<span class="danger">Regla:</span> si el mic detecta un pico de ruido, pierdes instantáneamente.';
      panel.querySelectorAll('p')[1]!.textContent = '1) Permite micrófono. 2) Calibra tu silencio. 3) Inicia y llega al final del pasillo.';
      this.btnStart.textContent = 'Iniciar';
    }

    if (mode === 'pause') {
      panel.querySelector('h1')!.textContent = 'Paused';
      panel.querySelectorAll('p')[0]!.innerHTML = '<span class="danger">PLAYBACK PAUSED</span> — cinta en pausa';
      panel.querySelectorAll('p')[1]!.textContent = "Pulsa 'P' para continuar. (Click para capturar puntero al volver)";
      this.btnStart.textContent = 'Continuar';
    }

    if (mode === 'gameover') {
      if (this.lastGameOverReason === 'noise') {
        panel.querySelector('h1')!.textContent = 'Noise detected';
        panel.querySelectorAll('p')[0]!.innerHTML = '<span class="danger">SIGNAL LOST</span> — RECORDING TERMINATED';
        panel.querySelectorAll('p')[1]!.textContent = "Pulsa 'R' para rebobinar la cinta (reintentar).";
      } else {
        panel.querySelector('h1')!.textContent = 'Tape ended';
        panel.querySelectorAll('p')[0]!.innerHTML = '<span class="danger">PLAYBACK STOPPED</span> — se acabó la cinta';
        panel.querySelectorAll('p')[1]!.textContent = "Pulsa 'R' para rebobinar e intentarlo de nuevo.";
      }
      this.btnStart.textContent = 'Reintentar';
    }

    if (mode === 'win') {
      panel.querySelector('h1')!.textContent = 'Recording complete';
      panel.querySelectorAll('p')[0]!.textContent = 'La cinta terminó. Sobreviviste el slice.';
      panel.querySelectorAll('p')[1]!.textContent = "Pulsa 'R' para volver al menú.";
      this.btnStart.textContent = 'Volver al menú';
    }

    this.updateButtons();
  }

  private updateButtons(): void {
    if (this.mode === 'menu') {
      this.btnMic.disabled = false;
      this.btnCalibrate.disabled = !this.isMicConnected;
      this.btnStart.disabled = !this.isMicConnected || !this.hasThreshold;
      return;
    }

    if (this.mode === 'pause') {
      this.btnMic.disabled = true;
      this.btnCalibrate.disabled = true;
      this.btnStart.disabled = false;
      return;
    }

    // GameOver/Win
    this.btnMic.disabled = true;
    this.btnCalibrate.disabled = true;
    this.btnStart.disabled = false;
  }
}

function mustGet<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el as T;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function formatTimestamp(timeLeftSeconds: number): string {
  // VHS-ish: show elapsed-like counter but based on remaining.
  const totalMs = Math.max(0, Math.floor(timeLeftSeconds * 1000));
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor((totalMs % 1000) / 40); // ~25fps
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}:${pad2(frames)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
