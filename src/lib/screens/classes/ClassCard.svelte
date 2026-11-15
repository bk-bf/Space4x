<script lang="ts">
  import { CanvasView } from '#lib/ui/index.ts';
  import type { ShipClass } from '#lib/game/design.ts';
  import { CARD_SCALE, drawCard } from './drawDesign.ts';

  let { ship, on, onpick }: { ship: ShipClass; on: boolean; onpick: () => void } = $props();

  let width = $state(0);
</script>

<button class="card" class:on data-cls={ship.name} bind:clientWidth={width} onclick={onpick}>
  {#if width > 0}
    <CanvasView scale={CARD_SCALE} vignette={0.6} height={120} draw={(f, t) => drawCard(f, ship, t)} />
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
