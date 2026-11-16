<script lang="ts">
  import type { Snippet } from 'svelte';

  let { label, children }: { label?: string; children: Snippet } = $props();
</script>

<div class="ui-sec">
  {#if label}<span class="ui-lbl">{label}</span>{/if}
  {@render children()}
</div>
