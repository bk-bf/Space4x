<script lang="ts">
  import type { Snippet } from 'svelte';

  let { id, columns, children }: { id: string; columns: string; children: Snippet } = $props();
</script>

<main class="screen" data-screen={id} style:grid-template-columns={columns} style:gap="12px">
  {@render children()}
</main>
