<script lang="ts">
  import { type Site } from '#lib/game/economy/index.ts';
  import { game } from '#lib/game/index.ts';
  import { smallBodyOf } from '#lib/game/smallBodies.ts';
  import { CanvasView, Panel, Pill } from '#lib/ui/index.ts';
  import { siteBody } from './lookup.ts';
  import { drawColonyPlanet, drawJumpPoint } from './planetView.ts';

  let { site }: { site: Site } = $props();
  const body = $derived(siteBody(site.worldBody));
  const planet = $derived(body?.type ?? 'terran');
  const small = $derived(body ? smallBodyOf(body) : undefined);
  const jump = $derived(site.place === 'point' ? game.jump(site.worldBody)?.point : undefined);
</script>

<Panel grow body="col">
  {#snippet head()}{site.name}{/snippet}
  <CanvasView
    scale={2}
    bg="stars"
    draw={(fb, t) =>
      jump
        ? drawJumpPoint(fb, t, !!jump.stable)
        : drawColonyPlanet(fb, t, planet, site.body === 'earth', small)}
  />
  {#if jump}
    <div class="facts" id="siteFacts">
      <Pill icon="flask" text={jump.stable ? 'Stable' : 'Unstable'} tip="Jump point" />
    </div>
  {:else if body}
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
