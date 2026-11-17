<script lang="ts">
  import { onMount } from 'svelte';
  import { asteroids } from '#lib/game/data/index.ts';
  import {
    drawSmallBody,
    FAMILY_NAMES,
    NAMED_BODIES,
    smallBody,
    smallReach,
    type ShapeFamily,
    type SmallBody,
    type SmallInfo
  } from '#lib/gfx/bodies/small/index.ts';
  import type { FB } from '#lib/gfx/framebuffer.ts';
  import { gallery } from '#lib/shell/mode.ts';
  import { FilterChips, Icon, Panel, PixelCanvas, ScreenGrid } from '#lib/ui/index.ts';
  import { frameTick, startRendering } from '#lib/ui/frame.ts';
  import { layoutCheck } from '#lib/ui/layoutCheck.ts';

  const TICK_MS = 100;
  const CELL = 120;
  const GALLERY_TURN = 0.012;
  const FIT = 52;
  const SIZES = [
    { id: 'fit', label: 'Fitted' },
    { id: 'map', label: 'On the map', radius: 9 },
    { id: 'near', label: 'Near', radius: 22 },
    { id: 'close', label: 'Close', radius: 40 }
  ];
  const GENERIC: readonly SmallInfo[] = [
    { id: 'sample-rubble-pile', name: 'Rubble pile', type: 'carbonaceous', diameter: 0.6 },
    { id: 'sample-small-stony', name: 'Small stony', type: 'stony', diameter: 2.4 },
    { id: 'sample-stony-30', name: 'Stony, 30 km', type: 'stony', diameter: 30 },
    { id: 'sample-metal-90', name: 'Metallic, 90 km', type: 'metallic', diameter: 90 },
    { id: 'sample-dark-180', name: 'Dark, 180 km', type: 'carbonaceous', diameter: 180 },
    { id: 'sample-big-stony', name: 'Large stony', type: 'stony', diameter: 450 },
    { id: 'sample-comet', name: 'Comet nucleus', type: 'comet', diameter: 4 },
    { id: 'sample-comet-2', name: 'Comet nucleus', type: 'comet', diameter: 9 }
  ];

  const named: SmallBody[] = NAMED_BODIES.map((id) => {
    const rec = asteroids.find((a) => a.id === id);
    return smallBody(
      rec
        ? { id: rec.id, name: rec.name, type: rec.type, diameter: rec.diameter }
        : { id, name: id[0]!.toUpperCase() + id.slice(1), type: 'stony', diameter: 60 }
    );
  });
  const generic = GENERIC.map(smallBody);

  const families = Object.keys(FAMILY_NAMES) as ShapeFamily[];
  const sections = families
    .map((family) => ({
      family,
      cells: [...named, ...generic]
        .filter((b) => b.family === family)
        .map((b) => ({ body: b, label: b.name, named: NAMED_BODIES.includes(b.key) }))
    }))
    .filter((s) => s.cells.length > 0);

  let size = $state('fit');
  const chips = SIZES.map((s) => ({ id: s.id, label: s.label }));
  const radiusOf = (b: SmallBody): number =>
    SIZES.find((s) => s.id === size)?.radius ?? Math.floor(FIT / smallReach(b));

  function draw(fb: FB, b: SmallBody, t: number) {
    fb.start();
    drawSmallBody(fb, b, CELL / 2, CELL / 2, radiusOf(b), -t * GALLERY_TURN);
    fb.present();
  }

  onMount(() => {
    window.space4xLayoutCheck = () => layoutCheck('bodies');
    startRendering();
    const timer = setInterval(frameTick, TICK_MS);
    return () => clearInterval(timer);
  });
</script>

<header id="top"><span class="tag">bodies</span></header>
<div id="stage">
  <ScreenGrid id="bodies" columns="minmax(0,1fr)">
    {#if gallery}
      <Panel grow>
        {#snippet head()}<Icon name="eye" />Small bodies
          <small>{named.length + generic.length} shapes</small>{/snippet}
        <FilterChips items={chips} value={size} onchange={(id) => (size = id)} />
        {#each sections as s (s.family)}
          <h3 data-section={s.family}>
            {FAMILY_NAMES[s.family]} <small class="dim">{s.cells.length}</small>
          </h3>
          <div class="cells">
            {#each s.cells as c (c.body.key)}
              <span class="bcell" data-body={c.body.key}>
                <PixelCanvas
                  width={CELL}
                  height={CELL}
                  scale={2}
                  bg="stars"
                  vignette={0.8}
                  draw={(fb, t) => draw(fb, c.body, t)}
                />
                <em>{c.label}</em>
                <small class="dim">{c.body.type}</small>
              </span>
            {/each}
          </div>
        {/each}
      </Panel>
    {:else}
      <Panel title="Small bodies" grow
        ><p class="dim">The small body catalogue is part of the gallery build.</p></Panel
      >
    {/if}
  </ScreenGrid>
</div>

<style>
  .cells {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .bcell {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    width: 240px;
  }
  .bcell em {
    font-style: normal;
    font-size: 15px;
    margin-top: 3px;
  }
</style>
