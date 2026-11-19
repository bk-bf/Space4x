<script lang="ts">
  import { specFor } from '#lib/game/index.ts';
  import type { ShipDesign } from '#lib/game/shipdesign/index.ts';
  import { shipPicture } from '#lib/gfx/topdown/picture.ts';
  import { PixIcon } from '#lib/ui/index.ts';
  import { designIcon } from './shipTiles.ts';

  const SIZES = {
    tile: { w: 52, h: 20, zoom: 2 },
    card: { w: 32, h: 16, zoom: 2 }
  } as const;

  let { design, size = 'tile' }: { design: ShipDesign | undefined; size?: keyof typeof SIZES } = $props();

  const box = $derived(SIZES[size]);
  const picture = $derived(design ? shipPicture(specFor(design), box.w, box.h) : null);
  const fallback = $derived(designIcon(design));
</script>

{#if picture}
  <img
    class="ship-pic"
    src={picture.url}
    width={picture.width * box.zoom}
    height={picture.height * box.zoom}
    alt=""
    draggable="false"
  />
{:else}
  <PixIcon kind={fallback.kind} id={fallback.id} size={32} tip={false} />
{/if}

<style>
  .ship-pic {
    image-rendering: pixelated;
    display: block;
    flex: none;
  }
</style>
