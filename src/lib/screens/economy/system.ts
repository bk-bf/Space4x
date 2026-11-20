import {
  advanceEconomy,
  economy,
  economyHorizon,
  flowsOf,
  homeSite,
  siteById,
  touch,
  type LogFn,
  type SupplyKind
} from '#lib/game/economy/index.ts';
import { game, registerHorizon, registerStatus, registerSystem, START_TIME } from '#lib/game/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import type { StatusValue } from '#lib/game/types.ts';
import { advanceShips, shipsHorizon } from '#lib/game/ships/index.ts';
import { fmt } from '#lib/ui/index.ts';
import { shortName } from './format.ts';
import { allTroubles, troubleLine, type Trouble } from './troubles.ts';
import { scarcest } from './view.ts';

export const economyLog =
  (game: Game): LogFn =>
  (text, warn, at, siteId, tag) => {
    const body = siteId ? siteById(siteId)?.worldBody : undefined;
    game.log(tag?.kind === 'milestone' ? 'flask' : 'factory', text, warn, {
      at: START_TIME + at * 1000,
      ...(body ? { subject: { kind: 'body' as const, id: body } } : {}),
      ...(siteId ? { site: siteId } : {}),
      ...(tag ?? {})
    });
  };

registerSystem('economy', (game, dt) => {
  advanceEconomy(economy, dt, economyLog(game), game.warnDays);
  advanceShips(game, dt);
  touch();
});

registerHorizon('economy', (game) => Math.min(economyHorizon(economy, game.warnDays), shipsHorizon(game)));

const flows = () => flowsOf(homeSite());

const troubles = (kind: SupplyKind): Trouble[] =>
  allTroubles(economy.sites, flowsOf, game.warnDays).filter((t) => t.kind === kind);

type Chip = Omit<StatusValue, 'id'>;

function withTroubles(chip: Chip, kind: SupplyKind): Chip {
  const list = troubles(kind);
  const first = list[0];
  if (!first) return chip;
  return {
    ...chip,
    title: [chip.title, ...list.map(troubleLine)].join('\n'),
    warn: true,
    open: { site: first.site.id, ...(first.material ? { material: first.material } : {}) }
  };
}

registerStatus('treasury', () => ({
  icon: 'coin',
  value: fmt.money(economy.market.treasury),
  title: 'Treasury',
  warn: economy.market.treasury < 0
}));

registerStatus('people', () => ({
  icon: 'people',
  value: fmt.population(homeSite().population),
  title: 'People'
}));

registerStatus('food', () => withTroubles(foodChip(), 'food'));

function foodChip(): Chip {
  const f = flows().food;
  const spare = f.demand > 0 ? f.made / f.demand - 1 : 0;
  return f.cover < 1 - 1e-9
    ? {
        icon: 'grain',
        value: `${fmt.pct(f.cover)} fed`,
        title: 'Food: share of the calorie need met',
        warn: true
      }
    : {
        icon: 'grain',
        value: `${spare >= 0 ? '+' : ''}${fmt.pct(spare)}`,
        title: 'Food: calories made against calories needed',
        warn: spare < 0
      };
}

registerStatus('power', () => {
  const p = flows().power;
  const spare = p.supply - p.demand;
  return withTroubles(
    {
      icon: 'bolt',
      value: `${spare >= 0 ? '+' : '-'}${fmt.power(Math.abs(spare))}`,
      title: 'Power: generation less demand',
      warn: spare < 0
    },
    'power'
  );
});

registerStatus('compute', () => {
  const c = flows().compute;
  const share = c.demand > 0 ? Math.min(1, c.supply / c.demand) : 1;
  return withTroubles(
    {
      icon: 'chip',
      value: share < 1 ? `${Math.round(share * 100)}% compute` : `+${fmt.eflops(c.supply - c.demand)}`,
      title: 'Compute',
      warn: share < 1
    },
    'compute'
  );
});

registerStatus('scarce', () => {
  const s = scarcest(homeSite(), flows());
  return s
    ? {
        icon: 'warn',
        value: shortName(s.id),
        title: s.days === 0 ? 'Scarcest material: run out' : `Scarcest material: ${fmt.days(s.days)} left`,
        warn: true
      }
    : { icon: 'warn', value: 'None', title: 'Scarcest material', warn: false };
});
