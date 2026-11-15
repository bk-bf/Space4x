export const START_TIME = Date.UTC(2026, 10, 15, 6, 0);

export const DAY = 86400;

export interface TimeStep {
  label: string;
  seconds: number;
}

export const STEPS: readonly TimeStep[] = [
  { label: '5s', seconds: 5 },
  { label: '30s', seconds: 30 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
  { label: '20m', seconds: 1200 },
  { label: '1h', seconds: 3600 },
  { label: '3h', seconds: 10800 },
  { label: '8h', seconds: 28800 },
  { label: '1d', seconds: DAY },
  { label: '5d', seconds: 5 * DAY },
  { label: '30d', seconds: 30 * DAY }
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export const formatDay = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

export const formatTimeOfDay = (ms: number): string => {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

export const formatClock = (ms: number): string =>
  `${formatDay(ms)} ${new Date(ms).getUTCFullYear()} ${formatTimeOfDay(ms)}`;

const sameDay = (a: number, b: number) => Math.floor(a / (DAY * 1000)) === Math.floor(b / (DAY * 1000));

export const formatEventTime = (at: number, now: number): string =>
  sameDay(at, now) ? formatTimeOfDay(at) : formatDay(at);
