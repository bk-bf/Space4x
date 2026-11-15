<script lang="ts">
  import { requestRender } from '#lib/ui/index.ts';
  import ClassCard from './ClassCard.svelte';
  import { designer } from './designer.svelte.ts';
</script>

<div id="gallery">
  {#each designer.saved as ship (ship.id)}
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
    max-height: 340px;
    overflow-y: auto;
    padding: 2px;
    margin: -2px;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
  }
</style>
