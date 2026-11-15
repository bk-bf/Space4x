<script lang="ts">
  import { milestones } from '#lib/game/data/index.ts';
  import { economy, type Site } from '#lib/game/economy/index.ts';
  import { Table, type Cell } from '#lib/ui/index.ts';
  import Cols from './Cols.svelte';
  import MilestoneDetail from './MilestoneDetail.svelte';
  import { ui } from './state.svelte.ts';
  import { statusCell } from './milestones.ts';

  let { site }: { site: Site } = $props();

  const rows = $derived<Cell[][]>(
    milestones.map((m) => [m.number, m.name, m.tier, statusCell(economy, site, m)])
  );
</script>

<Cols columns="minmax(0,6fr) minmax(0,5fr)">
  <div id="milestones">
    <Table
      head={['>#', 'Milestone', 'Tier', 'Status']}
      {rows}
      selected={milestones.findIndex((m) => m.number === ui.milestone)}
      keys={milestones.map((m) => String(m.number))}
      onpick={(row) => (ui.milestone = milestones[row]?.number ?? ui.milestone)}
    />
  </div>
  <div>
    <MilestoneDetail {site} number={ui.milestone} />
  </div>
</Cols>
