<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="bar">{@render children()}</div>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin: 6px -2px 0;
  }
  .bar > :global(.gap) {
    flex: 1;
  }
</style>
