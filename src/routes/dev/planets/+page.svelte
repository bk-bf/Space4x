<script lang="ts">
  import { onMount } from 'svelte';
  import { FAMILY_KINDS } from '#lib/gfx/bodies/looks/families.ts';
  import { familyId, lookById } from '#lib/gfx/bodies/looks/index.ts';
  import { gallery } from '#lib/shell/mode.ts';
  import { Icon, Panel, ScreenGrid } from '#lib/ui/index.ts';
  import { frameTick, startRendering } from '#lib/ui/frame.ts';
  import { layoutCheck } from '#lib/ui/layoutCheck.ts';
  import { FAMILY_TEXT, GROUPS } from './catalogue.ts';
  import LookCard from './LookCard.svelte';

  const TICK_MS = 100;
  const BIG = 64;
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
  const count = GROUPS.reduce((n, g) => n + g.bodies.length, 0);

  onMount(() => {
    window.space4xLayoutCheck = () => layoutCheck('planets');
    startRendering();
    const timer = setInterval(frameTick, TICK_MS);
    return () => clearInterval(timer);
  });
</script>

<header id="top"><span class="tag">planets</span></header>
<div id="stage">
  <ScreenGrid id="planets" columns="minmax(0,1fr)">
    {#if gallery}
      <Panel grow>
        {#snippet head()}<Icon name="eye" />Planets and moons
          <small>{count} looks, 3 families</small>{/snippet}
        {#each GROUPS as g (g.id)}
          <h2 data-section={g.id}>{g.name}</h2>
          <div class="cards">
            {#each g.bodies as b (b.id)}
              <LookCard
                look={lookById(b.look)!}
                name={b.name}
                text={b.text}
                big={BIG}
                tilt={b.tilt}
                spin={b.spin}
                pitch={b.pitch}
                lights={b.lights}
              />
            {/each}
          </div>
        {/each}
        <h2 data-section="families">Moon families</h2>
        <p class="note">
          Every other moon is a seeded variation of one of three families. Eight seeds each, at 28 px and 9
          px.
        </p>
        {#each FAMILY_KINDS as kind (kind)}
          <h3 class="family" data-family={kind}>
            {FAMILY_TEXT.find((f) => f.id === kind)!.name}
            <small>{FAMILY_TEXT.find((f) => f.id === kind)!.text}</small>
          </h3>
          <div class="cards">
            {#each SEEDS as seed (seed)}
              <LookCard
                look={lookById(familyId(kind, seed))!}
                name={`${kind} seed ${seed}`}
                big={28}
                sizes={[9]}
                spin={0.25 + (seed % 3) * 0.12}
                tilt={((seed * 0.37) % 0.6) - 0.2}
              />
            {/each}
          </div>
        {/each}
      </Panel>
    {:else}
      <Panel title="Planets and moons" grow
        ><p class="dim">The planet and moon gallery is part of the gallery build.</p></Panel
      >
    {/if}
  </ScreenGrid>
</div>

<style>
  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  h2 {
    font: 600 20px 'Pixelify';
    margin: 14px 0 6px;
  }
  .family {
    font: 600 16px 'Pixelify';
    margin: 10px 0 4px;
  }
  .family small {
    margin-left: 8px;
    font: 400 14px sans-serif;
    opacity: 0.7;
  }
  .note {
    margin: 0 0 6px;
    opacity: 0.75;
  }
</style>
