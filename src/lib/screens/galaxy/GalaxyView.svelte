<script lang="ts">
  import type { FB } from '#lib/gfx/framebuffer.ts';
  import { CanvasView, requestRender } from '#lib/ui/index.ts';
  import { wheelFactor, zoomAbout } from './camera.ts';
  import { galaxy } from './galaxy.svelte.ts';
  import { GALAXY_SCALE, drawGalaxy, pickStar, placeLabels } from './drawGalaxy.ts';

  const PAN_THRESHOLD = 4;

  let catcher = $state<HTMLDivElement>();
  let fit = $state.raw<FB>();
  let pan: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;

  function onfit(f: FB) {
    fit = f;
    galaxy.size = { w: f.w, h: f.h };
    if (!galaxy.fitted) galaxy.showAll();
  }

  $effect(() => {
    const el = catcher;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!fit) return;
      const r = el.getBoundingClientRect();
      galaxy.camera = zoomAbout(
        galaxy.camera,
        fit.w,
        fit.h,
        (e.clientX - r.left) / GALAXY_SCALE,
        (e.clientY - r.top) / GALAXY_SCALE,
        wheelFactor(e.deltaY, e.deltaMode)
      );
      requestRender();
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });

  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pan = { x: e.clientX, y: e.clientY, cx: galaxy.camera.x, cy: galaxy.camera.y, moved: false };
  }

  function move(e: PointerEvent) {
    if (!pan) return;
    if (!pan.moved && Math.hypot(e.clientX - pan.x, e.clientY - pan.y) < PAN_THRESHOLD) return;
    pan.moved = true;
    const z = galaxy.camera.z;
    galaxy.camera = {
      z,
      x: pan.cx - (e.clientX - pan.x) / GALAXY_SCALE / z,
      y: pan.cy - (e.clientY - pan.y) / GALAXY_SCALE / z
    };
    requestRender();
  }

  function up(e: PointerEvent) {
    const was = pan;
    pan = null;
    if (!was || was.moved || !fit) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = pickStar(
      galaxy.camera,
      fit.w,
      fit.h,
      (e.clientX - r.left) / GALAXY_SCALE,
      (e.clientY - r.top) / GALAXY_SCALE,
      placeLabels(galaxy.camera, fit.w, fit.h, galaxy.selected)
    );
    if (id) galaxy.select(id);
    requestRender();
  }
</script>

<CanvasView
  scale={GALAXY_SCALE}
  bg="space"
  id="galCv"
  pickableLabels
  {onfit}
  draw={(f, t) => drawGalaxy(f, galaxy.camera, galaxy.selected, t)}
>
  {#snippet labels(f)}
    <div
      class="catch"
      role="application"
      aria-label="Star map"
      bind:this={catcher}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={() => (pan = null)}
    ></div>
    {#each placeLabels(galaxy.camera, f.w, f.h, galaxy.selected) as l (l.system.id)}
      <span
        class="lab"
        class:sel={l.system.id === galaxy.selected}
        data-system={l.system.name}
        data-cx={l.cx}
        data-cy={l.cy}
        style:left="{l.left}px"
        style:top="{l.top}px">{l.system.name}</span
      >
    {/each}
  {/snippet}
</CanvasView>

<style>
  .catch {
    position: absolute;
    inset: 0;
    pointer-events: auto;
    cursor: grab;
    touch-action: none;
  }
  .catch:active {
    cursor: grabbing;
  }
  .lab {
    pointer-events: none;
  }
</style>
