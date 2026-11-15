<script lang="ts">
  import Panel from './Panel.svelte';
  import ScreenGrid from './ScreenGrid.svelte';

  let { id, title }: { id: string; title: string } = $props();
</script>

<ScreenGrid {id} columns="minmax(0,1fr)">
  <Panel {title} grow>
    <p>Not built yet.</p>
  </Panel>
</ScreenGrid>
