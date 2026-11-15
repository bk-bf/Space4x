<script lang="ts">
  import { Panel, ScreenGrid, Stack, Tabs, shell } from '#lib/ui/index.ts';
  import ColonyTree from './ColonyTree.svelte';
  import IndustryTab from './IndustryTab.svelte';
  import MiningTab from './MiningTab.svelte';
  import PlanetPanel from './PlanetPanel.svelte';
  import ShipyardsTab from './ShipyardsTab.svelte';
  import StockpilesTab from './StockpilesTab.svelte';
  import SummaryTab from './SummaryTab.svelte';
  import WealthTab from './WealthTab.svelte';
  import { colonyName, colonySystem, systemName } from './lookup.ts';
  import { TABS, applyParams, selectedColony, ui } from './state.svelte.ts';

  applyParams((name) => shell.param(name));

  const colony = $derived(selectedColony());
</script>

<ScreenGrid id="economy" columns="300px minmax(0,1fr)">
  <Stack>
    <ColonyTree />
    <PlanetPanel {colony} />
  </Stack>
  <Stack>
    <Panel grow>
      {#snippet head()}{colonyName(colony)} <small>{systemName(colonySystem(colony))}</small>{/snippet}
      <Tabs tabs={TABS} bind:active={ui.tab} />
      {#key colony.id}
        {#if ui.tab === 'summary'}<SummaryTab {colony} />
        {:else if ui.tab === 'industry'}<IndustryTab {colony} />
        {:else if ui.tab === 'mining'}<MiningTab {colony} />
        {:else if ui.tab === 'shipyards'}<ShipyardsTab {colony} />
        {:else if ui.tab === 'stockpiles'}<StockpilesTab {colony} />
        {:else}<WealthTab {colony} />
        {/if}
      {/key}
    </Panel>
  </Stack>
</ScreenGrid>
