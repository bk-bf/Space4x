<script lang="ts">
  import { Panel, ScreenGrid, Stack, Tabs } from '#lib/ui/index.ts';
  import ConstructionTab from './ConstructionTab.svelte';
  import MilestonesTab from './MilestonesTab.svelte';
  import PlanetPanel from './PlanetPanel.svelte';
  import ProductionTab from './ProductionTab.svelte';
  import SiteTree from './SiteTree.svelte';
  import StockpilesTab from './StockpilesTab.svelte';
  import SummaryTab from './SummaryTab.svelte';
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
        {:else}<MilestonesTab {site} />
        {/if}
      {/key}
    </Panel>
  </Stack>
</ScreenGrid>
