<script lang="ts">
  import { milestone, milestones } from '#lib/game/data/index.ts';
  import { economy, flowsOf, homeSite, programmeDays } from '#lib/game/economy/index.ts';
  import { DefList, Panel, ScreenGrid, Stack, Table, type Cell } from '#lib/ui/index.ts';
  import { formatCount, formatDays } from '#lib/screens/economy/format.ts';
  import MilestoneDetail from '#lib/screens/economy/MilestoneDetail.svelte';
  import { statusCell, tierName } from '#lib/screens/economy/milestones.ts';
  import ChainTree from './ChainTree.svelte';
  import { research } from './research.svelte.ts';

  const site = $derived(homeSite());
  const flows = $derived(flowsOf(site));
  const rows = $derived<Cell[][]>(
    milestones.map((m) => [
      m.number,
      m.name,
      tierName(m.tier),
      m.requires.join(', ') || '-',
      formatDays(programmeDays(m)),
      statusCell(economy, site, m)
    ])
  );
  const runningRows = $derived<Cell[][]>(
    economy.running.map((p) => [p.number, milestone(p.number).name, { pct: Math.floor(p.progress * 100) }])
  );
</script>

<ScreenGrid id="research" columns="minmax(0,1fr) 380px">
  <Stack>
    <ChainTree />
    <Panel grow>
      {#snippet head()}Milestones <small>{economy.done.length} of {milestones.length} reached</small
        >{/snippet}
      <Table
        head={['>#', 'Milestone', 'Tier', 'Needs', '>Takes', 'Status']}
        {rows}
        keys={milestones.map((m) => String(m.number))}
        selected={milestones.findIndex((m) => m.number === research.selected)}
        onpick={(row) => (research.selected = milestones[row]?.number ?? research.selected)}
      />
    </Panel>
  </Stack>
  <Stack>
    <Panel>
      {#snippet head()}Running <small id="labsLine">{economy.running.length} programmes</small>{/snippet}
      {#if runningRows.length}
        <Table head={['>#', 'Milestone', 'Done']} rows={runningRows} />
      {:else}
        <p class="none">No programme is running.</p>
      {/if}
    </Panel>
    <Panel title="Programme">
      <MilestoneDetail {site} number={research.selected} bill={false} />
    </Panel>
    <Panel title="Compute" grow>
      <DefList
        rows={[
          ['Made', `${formatCount(flows.compute.supply)} cu an hour`],
          ['Wanted', `${formatCount(flows.compute.demand)} cu an hour`]
        ]}
      />
    </Panel>
  </Stack>
</ScreenGrid>

<style>
  .none {
    margin: 0;
    color: var(--dim);
  }
</style>
