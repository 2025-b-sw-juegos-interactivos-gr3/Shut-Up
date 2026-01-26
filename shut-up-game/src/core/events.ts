export const GameEvents = {
  MIC_LEVEL: 'MIC_LEVEL',
  MIC_CALIBRATED: 'MIC_CALIBRATED',
  NOISE_DETECTED: 'NOISE_DETECTED',
  TIMER_CHANGED: 'TIMER_CHANGED',
  PLAYER_MOVEMENT: 'PLAYER_MOVEMENT',
  SCARE_TRIGGERED: 'SCARE_TRIGGERED',
  BATTERY_CHANGED: 'BATTERY_CHANGED',
  FLASHLIGHT_CHANGED: 'FLASHLIGHT_CHANGED',
  GAME_OVER: 'GAME_OVER',
  GAME_WIN: 'GAME_WIN',
} as const;

export type EventMap = {
  [GameEvents.MIC_LEVEL]: { rms: number };
  [GameEvents.MIC_CALIBRATED]: { threshold: number };
  [GameEvents.NOISE_DETECTED]: { rms: number; threshold: number };
  [GameEvents.TIMER_CHANGED]: { timeLeftSeconds: number };
  [GameEvents.PLAYER_MOVEMENT]: { isMoving: boolean; speed: number };
  [GameEvents.SCARE_TRIGGERED]: { id: string; intensity: number };
  [GameEvents.BATTERY_CHANGED]: { percent: number };
  [GameEvents.FLASHLIGHT_CHANGED]: { isOn: boolean };
  [GameEvents.GAME_OVER]: { reason: 'noise' | 'other' };
  [GameEvents.GAME_WIN]: { timeSpentSeconds: number };
};
