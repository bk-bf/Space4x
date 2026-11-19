<script lang="ts">
  import { className } from '#lib/game/index.ts';
  import { designOf, type Vessel } from '#lib/game/ships/index.ts';
  import { Tile } from '#lib/ui/index.ts';
  import ShipArt from './ShipArt.svelte';
  import { tankFill, tileWhere, vesselTip } from './shipTiles.ts';

  let {
    vessel,
    selected = false,
    onselect
  }: { vessel: Vessel; selected?: boolean; onselect?: () => void } = $props();
</script>

{#snippet art()}<ShipArt design={designOf(vessel)} />{/snippet}

<Tile
  variant="q"
  {art}
  name={vessel.name}
  sub={className(vessel.design)}
  note={tileWhere(vessel)}
  noteTone={vessel.blocked ? 'hot' : 'dim'}
  meter={tankFill(vessel)}
  meterTone="cool"
  mark={vessel.blocked ? 'warn' : vessel.trip ? 'rocket' : vessel.run ? 'arrowR' : undefined}
  markTone={vessel.blocked ? 'hot' : 'accent'}
  warn={!!vessel.blocked}
  {selected}
  tip={vesselTip(vessel)}
  {onselect}
/>
