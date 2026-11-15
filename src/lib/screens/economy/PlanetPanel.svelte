<script lang="ts">
  import { flowsOf, type Site } from '#lib/game/economy/index.ts';
  import { CanvasView, DefList, Panel, shell } from '#lib/ui/index.ts';
  import { formatPeople, formatPercent, formatRate } from './format.ts';
  import { siteBody } from './lookup.ts';
  import { drawColonyPlanet } from './planetView.ts';

  let { site }: { site: Site } = $props();
  const flows = $derived(flowsOf(site));
  const planet = $derived(siteBody(site.worldBody)?.type ?? 'terran');
</script>

<Panel title={site.name} grow body="col">
  <CanvasView scale={2} bg="stars" draw={(fb, t) => drawColonyPlanet(fb, t, planet, site.body === 'earth')} />
  <DefList
    rows={[
      ['People', formatPeople(site.population)],
      ['Growth', `${formatRate(flows.growthPerHour * 8766)} a year`],
      ['Fed', formatPercent(flows.food.cover)],
      ['Buildings', site.groups.reduce((a, g) => a + g.count, 0).toLocaleString('en-US')],
      ['Building now', site.queue.length]
    ]}
  />
  <div class="add">
    <button id="openColony" onclick={() => shell.setScreen('colony')}>Open colony</button>
  </div>
</Panel>
