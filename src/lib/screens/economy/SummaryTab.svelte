<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import type { Colony } from '#lib/game/types.ts';
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import { INSTALLATIONS, MINERALS, SECTORS, item } from './catalog.ts';
  import Cols from './Cols.svelte';
  import { formatCount, formatDate, formatPeople, formatPercent, formatRate, formatTons } from './format.ts';
  import {
    allocate,
    fuelOutput,
    growthRate,
    industrialCapacity,
    mineOutput,
    orderFinish,
    populationCapacity,
    productionModifier,
    staffing,
    trade,
    wealthIncome,
    wealthLines,
    workersBySector,
    workersEmployed,
    workersFree,
    workersRequired,
    workforce
  } from './sim.ts';
  import { economy } from './state.svelte.ts';

  let { colony }: { colony: Colony } = $props();

  const bySector = $derived(workersBySector(colony));
  const required = $derived(workersRequired(colony));
  const mined = $derived(MINERALS.reduce((a, m) => a + mineOutput(colony, m.id, economy), 0));
  const wealth = $derived(wealthIncome(wealthLines(colony, economy, trade(economy))));
  const plan = $derived(allocate(colony, economy));

  const output = (id: string): string => {
    if (id === 'mine') return `${formatTons(mined)} t a year, all minerals`;
    if (id === 'factory') return `${formatCount(industrialCapacity(colony, economy))} BP a year`;
    if (id === 'refinery') return `${formatCount(fuelOutput(colony, economy))} t fuel a year`;
    if (id === 'dome') return `${formatPeople(populationCapacity(colony))} people housed`;
    if (id === 'exchange') return 'Wealth for the empire';
    if (id === 'lab') return 'Research';
    return 'Orbital access';
  };

  const installationRows = $derived<Cell[][]>(
    INSTALLATIONS.map((def) => [
      def.name,
      colony.installations[def.id],
      formatCount(def.workers),
      formatCount(def.workers * colony.installations[def.id]),
      output(def.id)
    ])
  );
  const sectorRows = $derived<Cell[][]>(
    SECTORS.map((s) => [
      s.name,
      formatCount(bySector[s.id]),
      {
        meter: required > 0 ? Math.round((bySector[s.id] / required) * 100) : 0,
        label: formatPercent(required > 0 ? bySector[s.id] / required : 0)
      }
    ])
  );
  const queueRows = $derived<Cell[][]>(
    plan
      .slice(0, 4)
      .map((a) => [
        item(a.order.item).name,
        `${a.order.quantity} of ${a.order.ordered}`,
        a.order.paused ? 'Paused' : formatDate(orderFinish(a, game.time))
      ])
  );
</script>

<Cols columns="minmax(0,5fr) minmax(0,6fr)">
  <div>
    <h3>Population</h3>
    <DefList
      rows={[
        ['People', formatPeople(colony.population)],
        ['Growth', `${formatRate(growthRate(colony))} a year`],
        ['Housing', formatPeople(populationCapacity(colony))],
        ['Workforce', formatCount(workforce(colony))],
        ['Workers needed', formatCount(required)],
        ['Workers employed', formatCount(workersEmployed(colony))],
        ['Workers free', formatCount(workersFree(colony))],
        ['Staffing', formatPercent(staffing(colony))],
        ['Governor', `${colony.governor.name}, +${formatPercent(colony.governor.bonus)}`],
        ['Garrison', `${colony.garrison} units`]
      ]}
    />
    <h3>Workers by sector</h3>
    <Table head={['Sector', '>Workers', 'Share']} rows={sectorRows} />
    <h3>Environment</h3>
    <DefList
      rows={[
        ['Air', colony.environment.air],
        ['Gravity', colony.environment.gravity],
        ['Surface', colony.environment.surface],
        ['Setting', colony.environment.note]
      ]}
    />
  </div>
  <div>
    <h3>Installations</h3>
    <Table
      head={['Installation', '>Number', '>Workers each', '>Workers', 'Output']}
      rows={installationRows}
    />
    <h3>Production</h3>
    <DefList
      rows={[
        ['Industrial capacity', `${formatCount(industrialCapacity(colony, economy))} BP a year`],
        ['Mining', `${formatTons(mined)} t a year`],
        ['Fuel refining', `${formatCount(fuelOutput(colony, economy))} t a year`],
        ['Wealth produced', `${formatCount(wealth)} a year`],
        ['Production modifier', formatPercent(productionModifier(economy))]
      ]}
    />
    <h3>Next to finish</h3>
    {#if queueRows.length}
      <Table head={['Item', '>Left', '>Done by']} rows={queueRows} />
    {:else}
      <p class="none">The construction queue is empty.</p>
    {/if}
  </div>
</Cols>

<style>
  .none {
    margin: 0;
    color: var(--dim);
  }
</style>
