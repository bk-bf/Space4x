<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { Panel, ScreenGrid, Stack, Tabs } from '#lib/ui/index.ts';
  import ConstructionTab from './ConstructionTab.svelte';
  import LaunchTab from './LaunchTab.svelte';
  import PeopleTab from './PeopleTab.svelte';
  import PlanetPanel from './PlanetPanel.svelte';
  import MineralsTab from './MineralsTab.svelte';
  import ProductionTab from './ProductionTab.svelte';
  import RateSwitch from './RateSwitch.svelte';
  import ShipsTab from './ShipsTab.svelte';
  import ShipyardTab from './ShipyardTab.svelte';
  import SiteList from './SiteList.svelte';
  import StockpilesTab from './StockpilesTab.svelte';
  import SummaryTab from './SummaryTab.svelte';
  import SupplyTab from './SupplyTab.svelte';
  import { systemName } from './lookup.ts';
  import { TABS, selectedSite, ui } from './state.svelte.ts';

  const site = $derived(selectedSite());
</script>

<ScreenGrid id="economy" columns="300px minmax(0,1fr)">
  <Stack>
    <SiteList />
    <PlanetPanel {site} />
  </Stack>
  <Stack>
    <Panel grow>
      {#snippet head()}{site.name}
        <small>{systemName(game.placeSystem(site.worldBody) ?? '')}</small>{/snippet}
      {#snippet tools()}<RateSwitch />{/snippet}
      <div class="page">
        <Tabs tabs={TABS} bind:active={ui.tab} />
        {#key site.id}
          {#if ui.tab === 'summary'}<SummaryTab {site} />
          {:else if ui.tab === 'production'}<ProductionTab {site} />
          {:else if ui.tab === 'construction'}<ConstructionTab {site} />
          {:else if ui.tab === 'stockpiles'}<StockpilesTab {site} />
          {:else if ui.tab === 'minerals'}<MineralsTab {site} />
          {:else if ui.tab === 'people'}<PeopleTab {site} />
          {:else if ui.tab === 'yard'}<ShipyardTab {site} />
          {:else if ui.tab === 'launch'}<LaunchTab {site} />
          {:else if ui.tab === 'ships'}<ShipsTab />
          {:else}<SupplyTab {site} />
          {/if}
        {/key}
      </div>
    </Panel>
  </Stack>
</ScreenGrid>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
</style>
