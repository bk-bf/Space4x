<script lang="ts">
  import type { Colony } from '#lib/game/types.ts';
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import Bar from './Bar.svelte';
  import { MINERALS } from './catalog.ts';
  import { MINE_OUTPUT, accessibility, annualUse, mineOutput, productivity, yearsLeft } from './sim.ts';
  import { formatCount, formatPercent, formatSigned, formatTons, formatYears } from './format.ts';
  import { economy, ui } from './state.svelte.ts';

  let { colony }: { colony: Colony } = $props();

  const rows = $derived<Cell[][]>(
    MINERALS.map((m) => {
      const d = colony.deposits[m.id];
      const out = mineOutput(colony, m.id, economy);
      const use = annualUse(colony, m.id, economy);
      const years = yearsLeft(colony, m.id, economy);
      const left = d.initial > 0 ? d.amount / d.initial : 0;
      return [
        m.name,
        formatTons(d.amount),
        { pct: Math.round(left * 100) },
        { meter: Math.round(d.accessibility * 100), label: d.accessibility.toFixed(2) },
        accessibility(d).toFixed(2),
        formatCount(out),
        formatTons(colony.stock[m.id]),
        formatCount(use),
        { text: formatSigned(out - use), warn: out - use < 0 },
        { meter: Math.min(100, Math.round(years)), label: formatYears(years) }
      ];
    })
  );

  function queueMines() {
    ui.pick = 'mine';
    ui.tab = 'industry';
  }
</script>

<h3>Deposits and output</h3>
<Table
  head={[
    'Mineral',
    '>Deposit left, t',
    'Left',
    'Accessibility',
    '>Now',
    '>Output a year',
    '>Stockpile',
    '>Used a year',
    '>Balance',
    'Years left'
  ]}
  {rows}
/>
<h3>Mines</h3>
<DefList
  two
  rows={[
    ['Mines', colony.installations.mine],
    ['Base output per mine', `${MINE_OUTPUT} t a year`],
    ['Staffing, governor, wealth', formatPercent(productivity(colony, economy))],
    ['Governor bonus', `+${formatPercent(colony.governor.bonus)}`]
  ]}
/>
<Bar><button id="queueMines" onclick={queueMines}>Build more mines</button></Bar>
