<script lang="ts">
  import { projects } from '#lib/game/data/index.ts';
  import {
    economy,
    flowsOf,
    labsActive,
    labsInUse,
    leading,
    researchDaysLeft,
    researchSite
  } from '#lib/game/economy/index.ts';
  import { Icon, Panel, ScreenGrid, Stat, Tabs, fmt, tipText, type Tab } from '#lib/ui/index.ts';
  import ProgrammeCard from './ProgrammeCard.svelte';
  import ProgrammeList from './ProgrammeList.svelte';
  import { research } from './research.svelte.ts';
  import ScientistCard from './ScientistCard.svelte';
  import ScientistList from './ScientistList.svelte';
  import Tree from './Tree.svelte';
  import UnlockList from './UnlockList.svelte';

  const tabs: readonly Tab[] = [
    { id: 'tree', label: 'Dependency tree', icon: 'net' },
    { id: 'programmes', label: 'Projects', icon: 'list' },
    { id: 'unlocks', label: 'Unlocks', icon: 'box' },
    { id: 'scientists', label: 'Scientists', icon: 'people' }
  ];

  const site = $derived(researchSite(economy));
  const flows = $derived(site ? flowsOf(site) : undefined);
  const running = $derived(economy.running.length);
  const next = $derived(Math.min(...economy.running.map((p) => researchDaysLeft(flows, p))));
  const assigned = $derived(labsInUse(economy));
  const active = $derived(labsActive(economy));
  const labActors = $derived(flows?.actors.filter((a) => a.kind === 'programme') ?? []);
  const wanted = $derived(labActors.reduce((a, x) => a + (x.inputs.compute ?? 0) * x.cap, 0));
  const used = $derived(labActors.reduce((a, x) => a + (x.inputs.compute ?? 0) * x.share, 0));
  const met = $derived(wanted > 0 ? used / wanted : 1);
  const idle = $derived(economy.scientists.filter((s) => !leading(economy, s.id)).length);
  const scientist = $derived(
    research.tab === 'scientists' ? (research.scientist ?? economy.scientists[0]?.id ?? null) : null
  );
</script>

<ScreenGrid id="research" columns="minmax(0,1fr)">
  <Panel grow>
    {#snippet head()}
      <Icon name="flask" />Research <small>{economy.done.length} of {projects.length} researched</small>
    {/snippet}
    <div class="page">
      <div class="stats">
        <Stat
          compact
          icon="flask"
          value="{economy.done.length} of {projects.length}"
          label="researched"
          tip="Research"
        />
        <Stat
          compact
          icon="hammer"
          value={String(running)}
          label={running && Number.isFinite(next)
            ? `next done in ${fmt.days(next)}`
            : running
              ? 'stalled'
              : 'none running'}
          tip={tipText('Projects running')}
        />
        <Stat
          compact
          icon="star"
          value="{assigned} / {active}"
          label="labs assigned"
          warn={active > assigned}
          tip={tipText('Labs')}
        />
        <Stat
          compact
          icon="chip"
          value={fmt.eflops(used)}
          label={met < 1 - 1e-9 ? `${Math.round(met * 100)}% met` : 'to labs'}
          warn={met < 1 - 1e-9}
          tip="Compute to research"
        />
        <Stat
          compact
          icon="people"
          value={String(economy.scientists.length)}
          label="{idle} unassigned"
          tip="Scientists"
        />
      </div>
      <Tabs {tabs} bind:active={research.tab} />
      <div class="split">
        <div class="main" class:treemain={research.tab === 'tree'}>
          {#if research.tab === 'tree'}
            <Tree />
          {:else if research.tab === 'programmes'}
            <ProgrammeList />
          {:else if research.tab === 'unlocks'}
            <UnlockList />
          {:else}
            <ScientistList />
          {/if}
        </div>
        <div class="side">
          {#if scientist !== null}
            <ScientistCard id={scientist} />
          {:else}
            <ProgrammeCard />
          {/if}
        </div>
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
