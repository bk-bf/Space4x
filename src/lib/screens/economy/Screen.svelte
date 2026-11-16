<script lang="ts">
  import { Panel, ScreenGrid, Stack, Tabs } from '#lib/ui/index.ts';
  import ConstructionTab from './ConstructionTab.svelte';
  import LaunchTab from './LaunchTab.svelte';
  import MilestonesTab from './MilestonesTab.svelte';
  import PlanetPanel from './PlanetPanel.svelte';
  import ProductionTab from './ProductionTab.svelte';
  import ShipsTab from './ShipsTab.svelte';
  import ShipyardTab from './ShipyardTab.svelte';
  import SiteTree from './SiteTree.svelte';
  import StockpilesTab from './StockpilesTab.svelte';
  import SummaryTab from './SummaryTab.svelte';
  import SupplyTab from './SupplyTab.svelte';
  import { siteBody, systemName } from './lookup.ts';
  import { TABS, selectedSite, ui } from './state.svelte.ts';

  const site = $derived(selectedSite());
</script>

<ScreenGrid id="economy" columns="300px minmax(0,1fr)">
  <Stack>
    <SiteTree />
    <PlanetPanel {site} />
  </Stack>
  <Stack>
    <Panel grow>
      {#snippet head()}{site.name}
        <small>{systemName(siteBody(site.worldBody)?.system ?? '')}</small>{/snippet}
      <Tabs tabs={TABS} bind:active={ui.tab} />
      {#key site.id}
        {#if ui.tab === 'summary'}<SummaryTab {site} />
        {:else if ui.tab === 'production'}<ProductionTab {site} />
        {:else if ui.tab === 'construction'}<ConstructionTab {site} />
        {:else if ui.tab === 'stockpiles'}<StockpilesTab {site} />
        {:else if ui.tab === 'yard'}<ShipyardTab {site} />
        {:else if ui.tab === 'launch'}<LaunchTab {site} />
        {:else if ui.tab === 'ships'}<ShipsTab />
        {:else if ui.tab === 'supply'}<SupplyTab {site} />
        {:else}<MilestonesTab {site} />
        {/if}
      {/key}
    </Panel>
  </Stack>
</ScreenGrid>
