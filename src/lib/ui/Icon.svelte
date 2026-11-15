<script lang="ts">
  import { iconPath, type IconName } from '#lib/gfx/icons.ts';

  let { name }: { name: IconName } = $props();
  const d = $derived(iconPath(name));
</script>

<svg class="ic" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true"
  ><path fill="currentColor" {d} /></svg
>
