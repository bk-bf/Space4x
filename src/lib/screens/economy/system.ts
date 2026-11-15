import { registerClassUse, registerStatus, registerSystem } from '#lib/game/index.ts';
import { colonyName } from './lookup.ts';
import { economy } from './state.svelte.ts';
import { stepEconomy } from './sim.ts';
import { fuelChip, peopleChip, shortageChip, wealthChip, yardsChip } from './status.ts';

registerSystem('economy', (game, dt) => {
  stepEconomy(economy, dt, game.time, (category, text, warn) => game.log(category, text, warn), colonyName);
});

registerStatus('wealth', () => ({ icon: 'coin', value: wealthChip(economy), title: 'Wealth' }));
registerStatus('people', () => ({ icon: 'people', value: peopleChip(economy), title: 'People' }));
registerStatus('fuel', () => ({ icon: 'drop', value: fuelChip(economy), title: 'Fuel stock' }));
registerStatus('shortage', () => ({ icon: 'warn', title: 'Running low', ...shortageChip(economy) }));
registerStatus('yards', () => ({ icon: 'yard', value: yardsChip(economy), title: 'Shipyards busy' }));

registerClassUse((id) =>
  economy.colonies.some((c) =>
    c.yards.some(
      (y) =>
        y.tooled === id ||
        y.slipways.some((s) => s.build?.classId === id) ||
        y.tasks.some((t) => t.classId === id)
    )
  )
);
