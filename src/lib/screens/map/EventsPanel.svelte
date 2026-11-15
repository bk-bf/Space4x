<script lang="ts">
  import { formatEventTime, game, type EventCategory } from '#lib/game/index.ts';
  import { Icon, Window } from '#lib/ui/index.ts';

  const FILTERS: readonly { value: EventCategory | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'ship', label: 'Fleets' },
    { value: 'eye', label: 'Contacts' },
    { value: 'factory', label: 'Economy' },
    { value: 'flask', label: 'Research' }
  ];

  let filter = $state<EventCategory | ''>('');
</script>

<Window
  id="events"
  title="Events"
  icon="list"
  home="bottom"
  width={640}
  grow
  floatAt={(w, h) => [Math.round((w - 640) / 2), h - 340]}
>
  {#snippet tools()}
    <select class="tools" id="evFilter" bind:value={filter}>
      {#each FILTERS as f (f.value)}<option value={f.value}>{f.label}</option>{/each}
    </select>
  {/snippet}
  <div id="events">
    {#each game.events as e, i (i)}
      <div class="ev" class:w={e.warn} data-cat={e.category} hidden={!!filter && e.category !== filter}>
        <time>{formatEventTime(e.at, game.time)}</time><Icon name={e.category} /><span>{e.text}</span>
      </div>
    {/each}
  </div>
</Window>
