<script lang="ts">
  import type { FB } from '#lib/gfx/framebuffer.ts';
  import { CanvasView, requestRender } from '#lib/ui/index.ts';
  import { ground } from './ground.svelte.ts';
  import { drawBattlefield, layoutUnits } from './sprites.ts';

  const units = $derived(ground.formation ? ground.unitsOf(ground.formation.id) : []);

  function pick(id: string) {
    ground.selectUnit(id);
    requestRender();
  }

  const hits = (f: FB) => layoutUnits(units, f.w);
</script>

<CanvasView
  scale={4}
  vignette={0.75}
  height={240}
  id="groundCv"
  pickableLabels
  draw={(f, t) => drawBattlefield(f, units, t, ground.unitId)}
>
  {#snippet labels(f)}
    {#each hits(f) as p (p.unit.id)}
      <button
        class="hit"
        data-unit={p.unit.name}
        aria-label={p.unit.name}
        tabindex="-1"
        style:left="{p.x * f.scale}px"
        style:top="{(p.base - p.h) * f.scale}px"
        style:width="{Math.min(p.w, f.w - p.x) * f.scale}px"
        style:height="{p.h * f.scale}px"
        onclick={() => pick(p.unit.id)}
      ></button>
    {/each}
  {/snippet}
</CanvasView>

<style>
  .hit {
    position: absolute;
    margin: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
    pointer-events: auto;
  }
  .hit:hover {
    background: rgba(242, 179, 93, 0.16);
  }
</style>
