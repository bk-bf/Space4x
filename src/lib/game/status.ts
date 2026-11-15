import type { StatusValue } from './types';

export type StatusSource = () => Omit<StatusValue, 'id'>;

export const STATUS_IDS = ['wealth', 'people', 'fuel', 'shortage', 'labs', 'yards'] as const;

export type StatusId = (typeof STATUS_IDS)[number];

const sources = new Map<StatusId, StatusSource>();

export function registerStatus(id: StatusId, source: StatusSource): () => void {
  sources.set(id, source);
  return () => {
    if (sources.get(id) === source) sources.delete(id);
  };
}

export function statusValues(): StatusValue[] {
  return STATUS_IDS.flatMap((id) => {
    const source = sources.get(id);
    return source ? [{ id, ...source() }] : [];
  });
}
