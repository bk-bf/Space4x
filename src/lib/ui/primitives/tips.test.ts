import { describe, expect, it } from 'vitest';
import { building } from '#lib/game/data/index.ts';
import { mass } from '../format.ts';
import { buildingTip, materialName } from './tips.ts';

describe('a building tooltip', () => {
  it('shows the build cost of every material, largest first', () => {
    const cost = Object.entries(building('alloy_works').cost).sort((a, b) => b[1] - a[1]);
    const line = buildingTip('alloy_works')
      .split('\n')
      .find((l) => l.startsWith('Build cost: '));
    expect(line).toBe(
      `Build cost: ${cost.map(([m, kg]) => `${mass(kg)} ${materialName(m).toLowerCase()}`).join(', ')}`
    );
  });

  it('keeps the extra lines after the cost', () => {
    const lines = buildingTip('alloy_works', 'Open').split('\n');
    expect(lines.at(-1)).toBe('Open');
  });
});
