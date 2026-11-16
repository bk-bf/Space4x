<script lang="ts">
  import type { Snippet } from 'svelte';

  let { main, side }: { main: Snippet; side?: Snippet } = $props();
</script>

<div class="body" class:single={!side}>
  <div class="main">{@render main()}</div>
  {#if side}<div class="side">{@render side()}</div>{/if}
</div>

<style>
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    gap: 12px;
    min-height: 0;
    flex: 1;
  }
  .body.single {
    grid-template-columns: minmax(0, 1fr);
  }
  .main,
  .side {
    overflow: auto;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
  }
  .main {
    padding: 4px 6px 8px 4px;
  }
  .side {
    padding: 4px 4px 8px;
  }
  .main :global(h3) {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }
  .main :global(h3 .ic),
  .main :global(h3 .ui-px) {
    align-self: center;
  }
</style>
