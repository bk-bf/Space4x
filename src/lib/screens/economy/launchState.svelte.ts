import type { LaunchRequest } from '#lib/game/ships/index.ts';

export const launchUi: {
  ship: string;
  payload: 'none' | 'cargo';
  material: string;
  amount: number;
  cargo: Record<string, number>;
} = $state({
  ship: '',
  payload: 'none',
  material: 'stainless_steel',
  amount: 1000,
  cargo: {}
});

export function requestOf(ship: string): LaunchRequest {
  return launchUi.payload === 'cargo' ? { ship, cargo: { ...launchUi.cargo } } : { ship };
}
