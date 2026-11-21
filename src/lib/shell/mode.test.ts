import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(gallery: boolean) {
  vi.resetModules();
  vi.stubEnv('VITE_SPACE4X_GALLERY', gallery ? '1' : '');
  const list = await import('#lib/screens/list.ts');
  const world = await import('#lib/game/mock/world.ts');
  return { list, world: world.mockWorld() };
}

afterEach(() => vi.unstubAllEnvs());

describe('game and gallery modes', () => {
  it('lists only the real screens and shows no mock site in the game', async () => {
    const { list, world } = await load(false);
    expect(list.SCREENS.map((s) => s.id)).toEqual(['map', 'economy', 'research', 'classes', 'robots']);
    for (const mock of ['ground', 'commanders', 'intel', 'galaxy']) {
      expect(list.isScreenId(mock)).toBe(false);
    }
    expect(world.sites).toEqual([]);
  });

  it('lists every screen and every mock site in the gallery', async () => {
    const { list, world } = await load(true);
    expect(list.SCREENS).toHaveLength(8);
    expect(list.isScreenId('galaxy')).toBe(true);
    expect(world.sites).toHaveLength(6);
  });
});
