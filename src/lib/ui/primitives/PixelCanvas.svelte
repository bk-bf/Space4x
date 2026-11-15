<script lang="ts">
  import { FB, type Background } from '#lib/gfx/framebuffer.ts';
  import { onFrame } from '../frame';

  interface Props {
    width: number;
    height: number;
    scale: number;
    vignette?: number;
    bg?: Background;
    id?: string;
    class?: string;
    draw: (fb: FB, t: number) => void;
  }

  let { width, height, scale, vignette = 0.62, bg, id, class: extra = '', draw }: Props = $props();

  let canvas: HTMLCanvasElement;
  let fb = $state.raw<FB>();

  $effect(() => {
    const next = new FB(canvas, width, height, scale, vignette);
    if (bg) next.makeBg(bg);
    fb = next;
  });

  $effect(() =>
    onFrame((t) => {
      if (fb && canvas.offsetParent) draw(fb, t);
    })
  );
</script>

<canvas {id} class={extra} bind:this={canvas}></canvas>
