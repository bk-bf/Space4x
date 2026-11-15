<script lang="ts">
  import { Desk, shell } from '#lib/ui/index.ts';
  import EventsPanel from './EventsPanel.svelte';
  import MapView from './MapView.svelte';
  import SelectionPanel from './SelectionPanel.svelte';
  import SystemPanel from './SystemPanel.svelte';
</script>

<Desk screen="map" visible={shell.screen === 'map'}>
  {#snippet background()}<MapView />{/snippet}
  <SystemPanel />
  <SelectionPanel />
  <EventsPanel />
</Desk>
