<script lang="ts">
  import type { FB } from '#lib/gfx/framebuffer.ts';
  import { CanvasView, requestRender, tooltip } from '#lib/ui/index.ts';
  import { ground } from './ground.svelte.ts';
  import { fitView, invasionFor, type Placed } from './invasion.ts';

  const FRAME_MS = 33;
  const MAX_DT = 0.1;
  const GRID = 2;

  const units = $derived(ground.formation ? ground.unitsOf(ground.formation.id) : []);
  let boxes = $state.raw<Placed[]>([]);
  let shown = '';
  let last = 0;
  let frame = 0;

  const snap = (v: number) => Math.round(v / GRID) * GRID;

  function draw(f: FB) {
    const now = performance.now(),
      dt = last ? Math.min(MAX_DT, (now - last) / 1000) : 0;
    last = now;
    const placed = invasionFor(ground.formationId, units).draw(f, fitView(f), dt, frame++, ground.unitId);
    f.present();
    const next = placed.map((p) => ({ ...p, x: snap(p.x), y: snap(p.y), w: snap(p.w), h: snap(p.h) })),
      sig = next.map((p) => `${p.unit.id}@${p.x},${p.y},${p.w},${p.h}`).join(' ');
    if (sig !== shown) {
      shown = sig;
      boxes = next;
    }
  }

  function pick(id: string) {
    ground.selectUnit(id);
    requestRender();
  }

  $effect(() => {
    const timer = setInterval(requestRender, FRAME_MS);
    return () => clearInterval(timer);
  });
</script>

<CanvasView scale={2} vignette={0.75} id="groundCv" pickableLabels {draw}>
  {#snippet labels(f)}
    <span class="tag mock">mock scene</span>
    {#each boxes as p (p.unit.id)}
      <button
        class="hit"
        data-unit={p.unit.name}
        aria-label={p.unit.name}
        use:tooltip={p.unit.name}
        tabindex="-1"
        style:left="{Math.max(0, p.x) * f.scale}px"
        style:top="{Math.max(0, p.y) * f.scale}px"
        style:width="{Math.max(2, Math.min(p.x + p.w, f.w) - Math.max(0, p.x)) * f.scale}px"
        style:height="{Math.max(2, Math.min(p.y + p.h, f.h) - Math.max(0, p.y)) * f.scale}px"
        onclick={() => pick(p.unit.id)}
      ></button>
    {/each}
  {/snippet}
</CanvasView>

<style>
  .mock {
    position: absolute;
    left: 6px;
    top: 6px;
  }
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
