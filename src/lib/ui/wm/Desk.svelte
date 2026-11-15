<script lang="ts">
  import type { Snippet } from 'svelte';
  import PanelsPopup from './PanelsPopup.svelte';
  import { wm } from './wm.svelte';

  let {
    screen,
    visible,
    background,
    children
  }: { screen: string; visible: boolean; background?: Snippet; children: Snippet } = $props();

  let desk: HTMLElement;

  $effect(() => {
    wm.desk = desk;
    const resize = new ResizeObserver(() => wm.scheduleTile());
    resize.observe(desk);
    return () => {
      resize.disconnect();
      if (wm.desk === desk) wm.desk = null;
    };
  });
</script>

<svelte:window onpointermove={(e) => wm.moveDrag(e)} onpointerup={(e) => wm.endDrag(e)} />

<div id="desk" data-screen={screen} data-snap={wm.snap || undefined} hidden={!visible} bind:this={desk}>
  {#if background}{@render background()}{/if}
  {@render children()}
  <PanelsPopup />
</div>
