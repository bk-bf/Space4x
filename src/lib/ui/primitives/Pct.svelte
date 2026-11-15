<script lang="ts">
  import Meter from './Meter.svelte';

  let { value }: { value: number } = $props();
</script>

<Meter {value} />
{value}%
