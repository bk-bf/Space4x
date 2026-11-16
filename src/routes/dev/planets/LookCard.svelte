<script lang="ts">
  import type { FB } from '#lib/gfx/framebuffer.ts';
  import { RAD } from '#lib/gfx/bodies/looks/math.ts';
  import type { Look } from '#lib/gfx/bodies/looks/types.ts';
  import { drawSphere, sphereReach } from '#lib/gfx/bodies/sphere.ts';
  import { PixelCanvas } from '#lib/ui/index.ts';
  import { bakes } from '#lib/ui/bakes.svelte.ts';

  interface Props {
    look: Look;
    name: string;
    text?: string;
    big: number;
    tilt?: number;
    spin?: number;
    pitch?: number;
    lights?: boolean;
    sizes?: readonly number[];
  }

  let { look, name, text, big, tilt, spin = 0.35, pitch, lights, sizes = [30, 14, 5] }: Props = $props();

  const PAD = 4;
  const GAP = 8;
  const SCALE = 2;
  const TURN_PER_TICK = 0.02;

  const bigR = $derived(look.rings ? Math.round(big * 0.5) : big),
    rb = $derived(Math.ceil(sphereReach(look, bigR))),
    reaches = $derived(sizes.map((s) => Math.ceil(sphereReach(look, s)))),
    column = $derived(
      Math.max(
        2 * reaches[0]!,
        reaches.slice(1).reduce((a, r) => a + 2 * r + GAP, -GAP)
      )
    ),
    x0 = $derived(PAD + 2 * rb + GAP),
    width = $derived(x0 + column + PAD),
    rowsH = $derived(2 * reaches[0]! + GAP + 2 * Math.max(...reaches.slice(1), 0)),
    height = $derived(Math.max(2 * rb, rowsH) + 2 * PAD);

  let visible = $state(false);
  let host: HTMLElement;

  $effect(() => {
    const watch = new IntersectionObserver((es) => {
      for (const e of es) visible = e.isIntersecting;
    });
    watch.observe(host);
    return () => watch.disconnect();
  });

  function draw(fb: FB, t: number) {
    if (!visible) return;
    const state = {
      rot: (look.facing ?? 0) * RAD + t * TURN_PER_TICK * spin,
      tilt: tilt ?? look.tilt,
      pitch: look.pitch ?? pitch,
      lights
    };
    fb.start();
    drawSphere(fb, look, state, PAD + rb, height / 2, bigR);
    drawSphere(fb, look, state, x0 + reaches[0]!, PAD + reaches[0]!, sizes[0]!);
    let x = x0;
    const row = PAD + 2 * reaches[0]! + GAP + Math.max(...reaches.slice(1), 0);
    for (let i = 1; i < sizes.length; i++) {
      drawSphere(fb, look, state, x + reaches[i]!, row, sizes[i]!);
      x += 2 * reaches[i]! + GAP;
    }
    fb.present();
  }
</script>

<article
  class="look"
  data-look={look.id}
  data-baked={bakes.n >= 0 && look.ready ? '1' : '0'}
  bind:this={host}
>
  <PixelCanvas {width} {height} scale={SCALE} bg="stars" vignette={0.8} {draw} />
  <h3>{name}</h3>
  {#if text}<p>{text}</p>{/if}
</article>

<style>
  .look {
    display: flex;
    flex-direction: column;
    width: fit-content;
    gap: 2px;
  }
  h3 {
    font: 600 16px 'Pixelify';
    margin: 4px 0 0;
  }
  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.75;
    max-width: 320px;
  }
</style>
