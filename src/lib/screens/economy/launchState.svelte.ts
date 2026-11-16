import type { Payload, Stack } from '#lib/game/ships/index.ts';

export const launchUi: {
  stages: string[];
  payload: 'none' | 'cargo' | 'ship';
  material: string;
  amount: number;
  cargo: Record<string, number>;
  ship: string;
  pick: string;
} = $state({
  stages: [],
  payload: 'none',
  material: 'stainless_steel',
  amount: 1000,
  cargo: {},
  ship: '',
  pick: ''
});

export function stackOf(): Stack {
  const payload: Payload =
    launchUi.payload === 'cargo'
      ? { kind: 'cargo', cargo: { ...launchUi.cargo } }
      : launchUi.payload === 'ship' && launchUi.ship
        ? { kind: 'ship', ship: launchUi.ship }
        : { kind: 'none' };
  return { stages: [...launchUi.stages], payload };
}
