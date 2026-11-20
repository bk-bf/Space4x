import { economy, labsActive, labsInUse } from '#lib/game/economy/index.ts';
import { registerStatus } from '#lib/game/index.ts';

registerStatus('labs', () => {
  const active = labsActive(economy);
  const assigned = labsInUse(economy);
  return { icon: 'star', value: `${assigned} / ${active}`, title: 'Labs assigned', warn: active > assigned };
});
