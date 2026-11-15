<script lang="ts">
  import type { Snippet } from 'svelte';

  let { grow = false, children }: { grow?: boolean; children: Snippet } = $props();
</script>

<div class="split" class:grow>{@render children()}</div>
