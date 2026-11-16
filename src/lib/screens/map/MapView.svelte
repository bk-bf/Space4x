<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { onBaked, want } from '#lib/gfx/bodies/looks/bake.ts';
  import { lookById } from '#lib/gfx/bodies/looks/index.ts';
  import { prebakeStar } from '#lib/gfx/bodies/star.ts';
  import { FB } from '#lib/gfx/framebuffer.ts';
  import { onFrame, requestRender, shell, wm } from '#lib/ui/index.ts';
  import { runBench } from './bench';
  import {
    applyPending,
    cam,
    flyTo,
    layers,
    MAP_SCALE,
    mapFrame,
    resetCamera,
    updateReadout,
    zoomBy,
    zoomLimit
  } from './camera.svelte';
  import { drawMap } from './drawMap';
  import { LabelLayer, type Anchor } from './labels';
  import { wheelNotches } from './mapCamera';
  import { locate } from './targets';

  const MAX_DT = 0.1;
  const SCENE_FRAME_MS = 33;

  let canvas: HTMLCanvasElement;
  let labelHost: HTMLDivElement;
  let fb: FB | null = null;
  let anchors: Anchor[] = [];
  let marks: Anchor[] = [];
  let last = 0;
  let benched = false;
  let live = false;
  let sceneTimer: ReturnType<typeof setTimeout> | null = null;

  const desk = () => canvas.parentElement!;

  function fitCanvas() {
    const d = desk(),
      w = Math.floor(d.clientWidth / MAP_SCALE),
      h = Math.floor(d.clientHeight / MAP_SCALE);
    if (w < 20 || h < 20) return;
    if (fb && fb.w === w && fb.h === h) return;
    fb = new FB(canvas, w, h, MAP_SCALE).makeBg('space');
    requestRender();
  }

  function blocks() {
    return wm
      .visibleElements()
      .map(
        (w) =>
          [
            w.offsetLeft - 4,
            w.offsetTop - 4,
            w.offsetLeft + w.offsetWidth + 4,
            w.offsetTop + w.offsetHeight + 4
          ] as const
      );
  }

  function frame(layer: LabelLayer, t: number, dt: number): number {
    if (!fb) return 0;
    const view = mapFrame();
    applyPending(view);
    zoomLimit();
    cam.step(dt, locate, view);
    const t0 = performance.now(),
      drawn = drawMap(fb, game, t, dt);
    anchors = drawn.anchors;
    marks = drawn.marks;
    live = drawn.live.length > 0 || drawn.spinning;
    const painted = performance.now() - t0,
      d = desk(),
      ships = `${drawn.ships.marker} ${drawn.ships.icon} ${drawn.ships.true}`,
      sites = drawn.live.join(' ');
    if (canvas.dataset.ships !== ships) canvas.dataset.ships = ships;
    if (canvas.dataset.live !== sites) canvas.dataset.live = sites;
    layer.place(anchors, fb.scale, d.clientWidth, d.clientHeight, blocks(), layers.Names);
    return painted;
  }

  function render(layer: LabelLayer, t: number) {
    if (!fb || shell.screen !== 'map') return;
    const now = performance.now(),
      dt = last ? Math.min(MAX_DT, (now - last) / 1000) : 0;
    last = now;
    if (!benched) {
      benched = true;
      const params = new URLSearchParams(location.search);
      if (params.has('bench')) runBench(params, (step) => frame(layer, t, step));
    }
    frame(layer, t, dt);
    updateReadout();
    if (cam.moving()) requestRender();
    else if (live && !sceneTimer)
      sceneTimer = setTimeout(() => {
        sceneTimer = null;
        requestRender();
      }, SCENE_FRAME_MS);
  }

  function at(e: MouseEvent): [number, number] {
    const r = desk().getBoundingClientRect();
    return [(e.clientX - r.left) / MAP_SCALE, (e.clientY - r.top) / MAP_SCALE];
  }

  function under(e: MouseEvent): Anchor | undefined {
    const [x, y] = at(e);
    let best: Anchor | undefined,
      bd = Infinity;
    for (const q of [anchors, marks].flat()) {
      if (!q.pick || Math.abs(x - q.x) >= q.rx + 4 || Math.abs(y - q.y) >= q.ry + 4) continue;
      const d = Math.hypot(x - q.x, y - q.y);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  function onDoubleClick(e: MouseEvent) {
    if (e.target === canvas) under(e)?.centre?.();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.target !== canvas) return;
    cam.down(...at(e));
  }

  function onPointerMove(e: PointerEvent) {
    if (cam.move(...at(e))) requestRender();
  }

  function onPointerUp(e: PointerEvent) {
    if (cam.up()) under(e)?.pick?.();
    requestRender();
  }

  function onWheel(e: WheelEvent) {
    if ((e.target as Element).closest('.win')) return;
    e.preventDefault();
    const n = wheelNotches(e.deltaY, e.deltaMode),
      [x, y] = at(e);
    const named = (e.target as HTMLElement).dataset?.target;
    cam.zoom(n, x, y, n < 0 ? (named ?? under(e)?.target ?? null) : null);
    requestRender();
  }

  function onKey(e: KeyboardEvent) {
    if (shell.screen !== 'map' || (e.target as Element).closest?.('input,select,textarea')) return;
    if (e.key === '+' || e.key === '=') zoomBy(1);
    else if (e.key === '-') zoomBy(-1);
    else if (e.key === '0') flyTo('system');
  }

  const HOME_LOOKS = ['earth', 'mars', 'venus', 'jupiter', 'saturn', 'uranus', 'neptune', 'mercury', 'luna'];

  function bakeWhenIdle() {
    let stopped = false;
    const idle = (fn: () => void) =>
      typeof requestIdleCallback === 'function' ? requestIdleCallback(fn) : setTimeout(fn, 50);
    const stopBaked = onBaked(requestRender);
    idle(() => {
      if (stopped) return;
      for (const id of HOME_LOOKS) want(lookById(id)!);
      prebakeStar();
    });
    return () => {
      stopped = true;
      stopBaked();
    };
  }

  $effect(() => {
    const d = desk(),
      layer = new LabelLayer(labelHost),
      resize = new ResizeObserver(fitCanvas),
      stopFrames = onFrame((t) => render(layer, t)),
      stopReset = wm.onReset(resetCamera),
      stopBake = bakeWhenIdle();
    resize.observe(d);
    d.addEventListener('wheel', onWheel, { passive: false });
    d.addEventListener('pointerdown', onPointerDown);
    d.addEventListener('dblclick', onDoubleClick);
    return () => {
      resize.disconnect();
      stopFrames();
      stopReset();
      stopBake();
      if (sceneTimer) clearTimeout(sceneTimer);
      layer.clear();
      d.removeEventListener('wheel', onWheel);
      d.removeEventListener('pointerdown', onPointerDown);
      d.removeEventListener('dblclick', onDoubleClick);
    };
  });
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} onkeydown={onKey} />

<canvas id="mapCv" bind:this={canvas}></canvas>
<div class="labels" id="mapLabels" bind:this={labelHost}></div>
