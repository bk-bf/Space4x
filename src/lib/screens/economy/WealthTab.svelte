<script lang="ts">
  import type { Colony } from '#lib/game/types.ts';
  import { CanvasView, DefList, Table, type Cell } from '#lib/ui/index.ts';
  import { toggleSubsidy } from './actions.ts';
  import Bar from './Bar.svelte';
  import { GOODS } from './catalog.ts';
  import { drawFlowChart } from './chart.ts';
  import Cols from './Cols.svelte';
  import { colonyName } from './lookup.ts';
  import { formatCount, formatMoney, formatPercent, formatSigned } from './format.ts';
  import {
    SHIP_TRADE_CAPACITY,
    empireFlows,
    lineIncome,
    productionModifier,
    subsidyCost,
    trade,
    wealthIncome,
    wealthLines,
    wealthSpending
  } from './sim.ts';
  import { economy } from './state.svelte.ts';

  let { colony }: { colony: Colony } = $props();

  let lineId = $state<number | null>(null);

  const tr = $derived(trade(economy));
  const lines = $derived(wealthLines(colony, economy, tr));
  const flows = $derived(empireFlows(economy));
  const line = $derived(economy.lines.find((l) => l.id === lineId));

  const wealthRows = $derived<Cell[][]>([
    ['Taxes on workers', formatSigned(lines.taxes)],
    ['Exchanges', formatSigned(lines.exchange)],
    ['Civilian trade', formatSigned(lines.trade)],
    ['Maintenance', formatSigned(-lines.maintenance)],
    ['Research', formatSigned(-lines.research)],
    ['Shipbuilding', formatSigned(-lines.shipbuilding)],
    [
      'Net at this colony',
      {
        text: formatSigned(wealthIncome(lines) - wealthSpending(lines)),
        warn: wealthIncome(lines) < wealthSpending(lines)
      }
    ]
  ]);

  const lineRows = $derived<Cell[][]>(
    economy.lines.map((l) => [
      l.name,
      l.ships,
      formatSigned(lineIncome(l, economy, tr)),
      l.subsidy ? { icon: 'coin', text: `${formatCount(subsidyCost(l))} a year` } : '-'
    ])
  );

  const goodRows = $derived<Cell[][]>(
    GOODS.map((g) => {
      const here = colony.trade[g.id];
      const all = tr.goods[g.id];
      const met = all.demand > 0 ? Math.min(1, all.supply / all.demand) : 1;
      return [
        g.name,
        g.price,
        here.supply,
        here.demand,
        { text: formatSigned(here.supply - here.demand), warn: here.demand > here.supply },
        all.supply,
        all.demand,
        { meter: Math.round(met * 100), label: formatPercent(met) }
      ];
    })
  );
</script>

<Cols columns="minmax(0,1fr) minmax(0,1.5fr)">
  <div>
    <h3>Wealth at {colonyName(colony)}, a year</h3>
    <Table head={['Line', '>Amount']} rows={wealthRows} />
    <h3>Empire income and spending, last 12 months</h3>
    <CanvasView scale={2} height={150} draw={(fb) => drawFlowChart(fb, economy.history)} />
  </div>
  <div>
    <h3>Empire</h3>
    <DefList
      two
      rows={[
        ['Wealth', formatMoney(economy.wealth)],
        ['Wealth cap', formatMoney(flows.cap)],
        ['Production modifier', formatPercent(productionModifier(economy))],
        ['Income a year', formatSigned(flows.income)],
        ['Spending a year', formatSigned(-flows.spending)],
        ['Net a year', formatSigned(flows.income - flows.spending)],
        ['Subsidies a year', formatSigned(-flows.subsidies)],
        ['Civilian ships', economy.lines.reduce((a, l) => a + l.ships, 0)]
      ]}
    />
    <h3>Civilian shipping lines</h3>
    <Table
      head={['Line', '>Ships', '>Income a year', '>Subsidy']}
      rows={lineRows}
      selected={economy.lines.findIndex((l) => l.id === lineId)}
      keys={economy.lines.map((l) => String(l.id))}
      onpick={(row) => (lineId = economy.lines[row]?.id ?? null)}
    />
    <Bar>
      <button id="lineSubsidy" disabled={!line} onclick={() => line && toggleSubsidy(line.id)}
        >{line?.subsidy ? 'Stop subsidy' : 'Subsidise'}</button
      >
      <span class="gap"></span>
      <span class="dim"
        >{formatCount(tr.volume)} loads traded, shipping carries {formatPercent(tr.carried)}, {SHIP_TRADE_CAPACITY}
        loads a ship</span
      >
    </Bar>
  </div>
</Cols>
<h3>Trade goods</h3>
<Table
  head={[
    'Good',
    '>Price',
    '>Supply here',
    '>Demand here',
    '>Net here',
    '>Supply, all',
    '>Demand, all',
    'Met'
  ]}
  rows={goodRows}
/>

<style>
  .dim {
    color: var(--dim);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
