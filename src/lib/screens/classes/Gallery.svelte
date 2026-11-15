<script lang="ts">
  import { requestRender } from '#lib/ui/index.ts';
  import ClassCard from './ClassCard.svelte';
  import { designer } from './designer.svelte.ts';
</script>

<div id="gallery">
  {#each designer.visible as ship (ship.id)}
    <ClassCard
      {ship}
      on={ship.id === designer.baseId}
      onpick={() => {
        designer.pick(ship.id);
        requestRender();
      }}
    />
  {/each}
</div>

<style>
  #gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
</style>
