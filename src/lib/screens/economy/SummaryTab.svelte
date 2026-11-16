<script lang="ts">
  import {
    asteroidRecord,
    building,
    material,
    milestone,
    region as regionRecord
  } from '#lib/game/data/index.ts';
  import type { BuildingKind } from '#lib/game/data/index.ts';
  import {
    activeOrders,
    economy,
    flowsOf,
    isFood,
    kcalOf,
    programmeDays,
    remainingMass,
    siteDeposits,
    type Site
  } from '#lib/game/economy/index.ts';
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import Cols from './Cols.svelte';
  import {
    formatCount,
    formatDays,
    formatKcal,
    formatMass,
    formatPeople,
    formatPercent,
    formatPower,
    formatRate
  } from './format.ts';
  import { buildingName, kindName, limitText } from './view.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const food = $derived(flows.food);
  const foodStock = $derived(
    Object.entries(site.stock)
      .filter(([m]) => isFood(m))
      .reduce((a, [, v]) => a + v, 0)
  );
  const foodStockKcal = $derived(
    Object.entries(site.stock)
      .filter(([m]) => isFood(m))
      .reduce((a, [m, v]) => a + v * kcalOf(m), 0)
  );
  const foodDays = $derived(
    food.made >= food.demand ? Infinity : foodStockKcal / Math.max(1e-9, food.demand - food.made) / 24
  );

  const foodShares = $derived(
    Object.entries(food.eatenBy)
      .filter(([, kcal]) => food.eaten > 0 && kcal / food.eaten >= 0.005)
      .sort((x, y) => y[1] - x[1])
      .map(([m, kcal]) => `${material(m).name.replace(/ \(.*\)$/, '')} ${formatPercent(kcal / food.eaten)}`)
      .join(', ')
  );

  const kinds = $derived.by(() => {
    const by: Partial<Record<BuildingKind, { count: number; workers: number; power: number }>> = {};
    for (const a of flows.actors) {
      if (a.kind !== 'group') continue;
      const b = building(a.group.building);
      const row = (by[b.kind] ??= { count: 0, workers: 0, power: 0 });
      row.count += a.group.count;
      row.workers += a.group.on ? a.group.count * b.workers : 0;
      row.power += (a.inputs['@power'] ?? 0) * a.share;
    }
    return Object.entries(by) as [BuildingKind, { count: number; workers: number; power: number }][];
  });
  const kindRows = $derived<Cell[][]>(
    kinds.map(([k, r]) => [kindName(k), formatCount(r.count), formatCount(r.workers), formatPower(r.power)])
  );

  const place = $derived(regionRecord(site.region ?? ''));
  const deposits = $derived(siteDeposits(site));
  const depositRows = $derived<Cell[][]>([
    ...deposits.ground.map((d): Cell[] => [material(d.material).name, 'Ground', d.grade.toFixed(2)]),
    ...deposits.air.map((d): Cell[] => [material(d.material).name, 'Atmosphere', d.grade.toFixed(2)])
  ]);
  const rock = $derived(asteroidRecord(site.worldBody));
  const programmeRows = $derived<Cell[][]>(
    economy.running
      .filter((p) => p.site === site.id)
      .map((p) => {
        const m = milestone(p.number);
        return [
          p.number,
          m.name,
          { pct: Math.floor(p.progress * 100) },
          formatDays((1 - p.progress) * programmeDays(m))
        ];
      })
  );

  const buildRows = $derived<Cell[][]>(
    activeOrders(site).map((o) => {
      const a = flows.actors.find((x) => x.kind === 'build' && x.order.id === o.id);
      const share = a?.share ?? 0;
      return [
        buildingName(o.building),
        { pct: Math.floor(o.done * 100) },
        share > 1e-9 && a?.kind === 'build' ? formatDays(((1 - o.done) * a.hours) / share / 24) : 'never',
        a && a.share < 1 - 1e-9 ? { text: limitText(a.limit), warn: true } : 'Building'
      ];
    })
  );
</script>

<Cols columns="minmax(0,5fr) minmax(0,6fr)">
  <div>
    <h3>Population and food</h3>
    <DefList
      rows={[
        ['People', formatPeople(site.population)],
        ['Growth', `${formatRate(flows.growthPerHour * 8766)} a year`],
        [
          'Calories made',
          `${formatKcal(food.made * 24)} a day against ${formatKcal(food.demand * 24)} needed`
        ],
        [
          'Food balance',
          `${food.made >= food.demand ? '+' : ''}${formatPercent(food.made / food.demand - 1)}`
        ],
        ['Calorie shares', foodShares || 'None eaten'],
        ['People fed', formatPercent(food.cover)],
        [
          'Food in store',
          `${formatMass(foodStock)}, ${Number.isFinite(foodDays) ? formatDays(foodDays) : 'growing'}`
        ]
      ]}
    />
    <h3>Workers</h3>
    <DefList
      rows={[
        ['Workforce', formatPeople(flows.workers.available)],
        ['Workers needed', formatPeople(flows.workers.needed)],
        ['Staffing', formatPercent(flows.workers.share)]
      ]}
    />
    <h3>Power and compute</h3>
    <DefList
      rows={[
        ['Grid', formatPower(site.gridKw)],
        ['Generated', formatPower(flows.power.supply - site.gridKw)],
        ['Demand', formatPower(flows.power.demand)],
        [
          'Balance',
          `${flows.power.supply >= flows.power.demand ? '+' : '-'}${formatPower(Math.abs(flows.power.supply - flows.power.demand))}`
        ],
        ['Compute made', `${formatCount(flows.compute.supply)} cu an hour`],
        ['Compute wanted', `${formatCount(flows.compute.demand)} cu an hour`]
      ]}
    />
  </div>
  <div>
    {#if place || deposits.air.length}
      <h3>Region</h3>
      <div id="siteRegion">
        <DefList
          rows={[
            ['Region', place?.name ?? 'Atmosphere only'],
            ...(rock
              ? [
                  [
                    'Left',
                    `${formatPercent(remainingMass(economy, site.worldBody) / rock.mass)} of the body`
                  ] as [string, string]
                ]
              : [])
          ]}
        />
        <Table head={['Deposit', 'Where', '>Grade']} rows={depositRows} />
      </div>
    {/if}
    <h3>Industry by kind</h3>
    <Table head={['Kind', '>Buildings', '>Workers', '>Power']} rows={kindRows} />
    <h3>Programmes</h3>
    {#if programmeRows.length}
      <Table head={['>#', 'Milestone', 'Done', '>Left']} rows={programmeRows} />
    {:else}
      <p class="none">No programme is running. Start one from the Milestones tab.</p>
    {/if}
    <h3>Building now</h3>
    {#if buildRows.length}
      <Table head={['Building', 'Done', '>Left', 'Status']} rows={buildRows} />
    {:else}
      <p class="none">Nothing is being built.</p>
    {/if}
  </div>
</Cols>

<style>
  .none {
    margin: 0;
    color: var(--dim);
  }
</style>
