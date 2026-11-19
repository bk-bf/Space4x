import {
  advanceEconomy,
  economy,
  economyHorizon,
  flowsOf,
  homeSite,
  siteById,
  touch,
  type SupplyKind
} from '#lib/game/economy/index.ts';
import { game, registerHorizon, registerStatus, registerSystem, START_TIME } from '#lib/game/index.ts';
import type { StatusValue } from '#lib/game/types.ts';
import { advanceShips, shipsHorizon } from '#lib/game/ships/index.ts';
import { milestones } from '#lib/game/data/index.ts';
import { fmt } from '#lib/ui/index.ts';
import { shortName } from './format.ts';
import { allTroubles, troubleLine, type Trouble } from './troubles.ts';
import { scarcest } from './view.ts';

registerSystem('economy', (game, dt) => {
  advanceEconomy(
    economy,
    dt,
    (text, warn, at, siteId, tag) => {
      const body = siteId ? siteById(siteId)?.worldBody : undefined;
      game.log(tag?.kind === 'milestone' ? 'flask' : 'factory', text, warn, {
        at: START_TIME + at * 1000,
        ...(body ? { subject: { kind: 'body' as const, id: body } } : {}),
        ...(siteId ? { site: siteId } : {}),
        ...(tag ?? {})
      });
    },
    game.warnDays
  );
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
    title: [chip.title, ...list.map(troubleLine), `Click to open ${first.site.name}`].join('\n'),
    warn: true,
    open: { site: first.site.id, ...(first.material ? { material: first.material } : {}) }
  };
}

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
  return withTroubles(
    {
      icon: 'chip',
      value: c.supply > 0 || c.demand > 0 ? `${fmt.group(c.supply)} cu/h` : 'None',
      title: 'Compute produced an hour',
      warn: c.demand > c.supply
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

registerStatus('milestones', () => ({
  icon: 'flask',
  value: `${economy.done.length}/${milestones.length}`,
  title: 'Milestones reached'
}));
