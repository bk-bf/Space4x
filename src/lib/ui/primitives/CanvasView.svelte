<script lang="ts">
  import type { Snippet } from 'svelte';
  import { FB, type Background } from '#lib/gfx/framebuffer.ts';
  import { onFrame, requestRender } from '../frame';

  interface Props {
    scale: number;
    vignette?: number;
    bg?: Background;
    height?: number;
    fit?: boolean;
    id?: string;
    draw: (fb: FB, t: number) => void;
    onfit?: (fb: FB) => void;
    labels?: Snippet<[FB]>;
    labelsId?: string;
    pickableLabels?: boolean;
  }

  let {
    scale,
    vignette = 0.7,
    bg,
    height,
    fit = true,
    id,
    draw,
    onfit,
    labels,
    labelsId,
    pickableLabels = false
  }: Props = $props();

  let view: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let fb = $state.raw<FB>();

  function refit() {
    const w = Math.max(8, Math.floor(view.clientWidth / scale)),
      h = Math.max(8, Math.floor(view.clientHeight / scale));
    if (!view.clientWidth || (fb && fb.w === w && fb.h === h && fb.scale === scale)) return;
    const next = new FB(canvas, w, h, scale, vignette);
    if (bg) next.makeBg(bg);
    fb = next;
    onfit?.(next);
    requestRender();
  }

  $effect(() => {
    const resize = new ResizeObserver(refit);
    resize.observe(view);
    return () => resize.disconnect();
  });

  $effect(() =>
    onFrame((t) => {
      if (fb && view.offsetParent) draw(fb, t);
    })
  );
</script>

<div
  class="view"
  class:fit
  class:fixedh={fit && height != null}
  style:height={height != null ? height + 'px' : undefined}
  bind:this={view}
>
  <canvas {id} bind:this={canvas}></canvas>
  {#if labels && fb}<div class="labels" class:plain={!pickableLabels} id={labelsId}>
      {@render labels(fb)}
    </div>{/if}
</div>
