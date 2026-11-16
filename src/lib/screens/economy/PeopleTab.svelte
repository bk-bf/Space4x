<script lang="ts">
  import type { Site } from '#lib/game/economy/index.ts';

  let { site }: { site: Site } = $props();
</script>

<p>{site.name}</p>
