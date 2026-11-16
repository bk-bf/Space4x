<script lang="ts">
  import { type Site } from '#lib/game/economy/index.ts';
  import { CanvasView, Panel, Pill } from '#lib/ui/index.ts';
  import { siteBody } from './lookup.ts';
  import { drawColonyPlanet } from './planetView.ts';

  let { site }: { site: Site } = $props();
  const body = $derived(siteBody(site.worldBody));
  const planet = $derived(body?.type ?? 'terran');
</script>

<Panel grow body="col">
  {#snippet head()}{site.name}{/snippet}
  <CanvasView scale={2} bg="stars" draw={(fb, t) => drawColonyPlanet(fb, t, planet, site.body === 'earth')} />
  {#if body}
    <div class="facts" id="siteFacts">
      <Pill icon="down" text={body.facts.gravity} tip="Surface gravity" />
      <Pill icon="drop" text={body.facts.air} tip="Atmosphere" />
      <Pill icon="gear" text={body.facts.surface} tip="Surface" />
    </div>
  {/if}
</Panel>

<style>
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
  }
</style>
