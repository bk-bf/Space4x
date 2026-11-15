<script lang="ts">
  import type { Snippet } from 'svelte';

  let { columns = '1fr 1fr', children }: { columns?: string; children: Snippet } = $props();
</script>

<div class="cols" style:grid-template-columns={columns}>{@render children()}</div>

<style>
  .cols {
    display: grid;
    gap: 0 16px;
    align-items: start;
  }
  .cols > :global(*) {
    min-width: 0;
  }
</style>
