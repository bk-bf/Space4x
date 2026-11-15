<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { FB } from '#lib/gfx/framebuffer.ts';
  import { onFrame, requestRender, shell, wm } from '#lib/ui/index.ts';
  import { camera, layers, MAP_SCALE, resetCamera, zoomBy } from './camera.svelte';
  import { drawMap } from './drawMap';
  import { LabelLayer, type Anchor } from './labels';

  const PAN_THRESHOLD = 4;

  let canvas: HTMLCanvasElement;
  let labelHost: HTMLDivElement;
  let fb: FB | null = null;
  let anchors: Anchor[] = [];
  let pan: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;

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

  function render(layer: LabelLayer, t: number) {
    if (!fb || shell.screen !== 'map') return;
    anchors = drawMap(fb, game, t);
    const d = desk();
    layer.place(anchors, fb.scale, d.clientWidth, d.clientHeight, blocks(), layers.Names);
  }

  function under(e: MouseEvent): Anchor | undefined {
    const r = desk().getBoundingClientRect(),
      x = (e.clientX - r.left) / MAP_SCALE,
      y = (e.clientY - r.top) / MAP_SCALE;
    return anchors.find((q) => q.pick && Math.abs(x - q.x) < q.rx + 4 && Math.abs(y - q.y) < q.ry + 4);
  }

  function pick(e: PointerEvent) {
    under(e)?.pick?.();
  }

  function onDoubleClick(e: MouseEvent) {
    if (e.target === canvas) under(e)?.centre?.();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.target === canvas) pan = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y, moved: false };
  }

  function onPointerMove(e: PointerEvent) {
    if (!pan) return;
    if (!pan.moved && Math.hypot(e.clientX - pan.x, e.clientY - pan.y) < PAN_THRESHOLD) return;
    pan.moved = true;
    camera.x = pan.cx - (e.clientX - pan.x) / MAP_SCALE / camera.z;
    camera.y = pan.cy - (e.clientY - pan.y) / MAP_SCALE / camera.z;
    requestRender();
  }

  function onPointerUp(e: PointerEvent) {
    if (pan && !pan.moved) pick(e);
    pan = null;
  }

  function onWheel(e: WheelEvent) {
    if ((e.target as Element).closest('.win')) return;
    e.preventDefault();
    const r = desk().getBoundingClientRect();
    zoomBy(e.deltaY < 0 ? 1 : -1, { x: e.clientX - r.left, y: e.clientY - r.top });
  }

  function onKey(e: KeyboardEvent) {
    if (shell.screen !== 'map' || (e.target as Element).closest?.('input,select,textarea')) return;
    if (e.key === '+' || e.key === '=') zoomBy(1);
    else if (e.key === '-') zoomBy(-1);
    else if (e.key === '0') resetCamera();
  }

  $effect(() => {
    const d = desk(),
      layer = new LabelLayer(labelHost),
      resize = new ResizeObserver(fitCanvas),
      stopFrames = onFrame((t) => render(layer, t)),
      stopReset = wm.onReset(resetCamera);
    resize.observe(d);
    d.addEventListener('wheel', onWheel, { passive: false });
    d.addEventListener('pointerdown', onPointerDown);
    d.addEventListener('dblclick', onDoubleClick);
    return () => {
      resize.disconnect();
      stopFrames();
      stopReset();
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
