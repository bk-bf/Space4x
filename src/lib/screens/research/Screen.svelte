<script lang="ts">
  import { milestones } from '#lib/game/data/index.ts';
  import { economy, flowsOf, homeSite, programmeDays } from '#lib/game/economy/index.ts';
  import { Icon, Panel, ScreenGrid, Stat, Tabs, fmt, tipText, type Tab } from '#lib/ui/index.ts';
  import ProgrammeCard from './ProgrammeCard.svelte';
  import ProgrammeList from './ProgrammeList.svelte';
  import { openItems, statusOf } from './programme.ts';
  import { research } from './research.svelte.ts';
  import Tree from './Tree.svelte';
  import UnlockList from './UnlockList.svelte';

  const tabs: readonly Tab[] = [
    { id: 'tree', label: 'Dependency tree', icon: 'net' },
    { id: 'programmes', label: 'Programmes', icon: 'list' },
    { id: 'unlocks', label: 'Unlocks', icon: 'box' }
  ];

  const site = $derived(homeSite());
  const flows = $derived(flowsOf(site));
  const statuses = $derived(milestones.map((m) => statusOf(economy, m)));
  const ready = $derived(statuses.filter((s) => s === 'ready').length);
  const next = $derived(
    Math.min(
      ...economy.running.map(
        (p) => (1 - p.progress) * programmeDays(milestones.find((m) => m.number === p.number)!)
      )
    )
  );
  const wanted = $derived(flows.compute.demand);
  const made = $derived(flows.compute.supply);
  const items = $derived(openItems(economy));
  const running = $derived(economy.running.length);
</script>

<ScreenGrid id="research" columns="minmax(0,1fr)">
  <Panel grow>
    {#snippet head()}
      <Icon name="flask" />Research <small>{economy.done.length} of {milestones.length} reached</small>
    {/snippet}
    <div class="page">
      <div class="stats">
        <Stat
          compact
          icon="flask"
          value="{economy.done.length} of {milestones.length}"
          label="milestones reached"
          tip="Researched"
        />
        <Stat
          compact
          icon="hammer"
          value={String(running)}
          label={running ? `next done in ${fmt.days(next)}` : 'none running'}
          tip={tipText('Programmes running')}
        />
        <Stat
          compact
          icon="play"
          value={String(ready)}
          label="ready to start"
          tip={tipText('Ready to start')}
        />
        <Stat
          compact
          icon="chip"
          value="{fmt.group(made)} cu"
          label="wants {fmt.group(wanted)} cu an hour"
          warn={wanted > made}
          tip="Compute"
        />
        <Stat compact icon="box" value={String(items)} label="buildings and parts open" tip="Unlocked" />
      </div>
      <Tabs {tabs} bind:active={research.tab} />
      <div class="split">
        <div class="main" class:treemain={research.tab === 'tree'}>
          {#if research.tab === 'tree'}
            <Tree />
          {:else if research.tab === 'programmes'}
            <ProgrammeList />
          {:else}
            <UnlockList />
          {/if}
        </div>
        <div class="side"><ProgrammeCard /></div>
      </div>
    </div>
  </Panel>
</ScreenGrid>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding-bottom: 4px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 4px;
  }
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    gap: 12px;
    min-height: 0;
    flex: 1;
  }
  .main,
  .side {
    overflow: auto;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
  }
  .main {
    padding: 4px 6px 8px 4px;
  }
  .main.treemain {
    display: flex;
    flex-direction: column;
    padding-bottom: 4px;
    overflow: hidden;
  }
  .side {
    padding: 4px 4px 8px;
  }
  small {
    font: 18px 'VT';
  }
</style>
