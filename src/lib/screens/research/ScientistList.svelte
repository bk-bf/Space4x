<script lang="ts">
  import { economy } from '#lib/game/economy/index.ts';
  import { TileGrid } from '#lib/ui/index.ts';
  import { research } from './research.svelte.ts';
  import ScientistTile from './ScientistTile.svelte';
</script>

<div id="scientists">
  <TileGrid min={112} gap={6}>
    {#each economy.scientists as s (s.id)}
      <ScientistTile
        {s}
        selected={(research.scientist ?? economy.scientists[0]?.id) === s.id}
        onselect={() => (research.scientist = s.id)}
      />
    {/each}
  </TileGrid>
</div>
