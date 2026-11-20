import type { EventKind } from './types';

export const PAUSE_KINDS: readonly { id: EventKind; label: string }[] = [
  { id: 'arrival', label: 'Ship arrives' },
  { id: 'blocked', label: 'Order blocked' },
  { id: 'finished', label: 'Building or ship finished' },
  { id: 'research', label: 'Project researched' },
  { id: 'shortage', label: 'Shortage or forecast' }
];

export const WARN_DAYS = 30;

export const WARN_DAY_CHOICES: readonly number[] = [7, 14, 30, 60, 90, 180];

export type PauseKinds = Record<EventKind, boolean>;

export const defaultPauses = (): PauseKinds => ({
  arrival: true,
  blocked: true,
  finished: true,
  research: true,
  shortage: true
});

export const isWarnDays = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 3650;
