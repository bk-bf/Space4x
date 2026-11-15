<script lang="ts">
  import { CanvasView } from '#lib/ui/index.ts';
  import type { ShipClass } from '#lib/game/design.ts';
  import { cardScale, drawCard } from './drawDesign.ts';

  let { ship, on, onpick }: { ship: ShipClass; on: boolean; onpick: () => void } = $props();

  let width = $state(0);
  const scale = $derived(cardScale(ship, width));
</script>

<button class="card" class:on data-cls={ship.name} bind:clientWidth={width} onclick={onpick}>
  {#if width > 0}
    {#key scale}
      <CanvasView {scale} vignette={0.6} height={120} draw={(f, t) => drawCard(f, ship, t)} />
    {/key}
  {:else}
    <div class="view" style:height="120px"></div>
  {/if}
  <b>{ship.name}</b>
  <small>{ship.role}</small>
</button>

<style>
  .card {
    flex: 1 1 calc(25% - 9px);
    min-width: 0;
  }
</style>
