<script lang="ts">
  import { formatEventTime, game, type EventCategory, type GameEvent } from '#lib/game/index.ts';
  import { Icon, Window } from '#lib/ui/index.ts';
  import { focus } from './focus';

  const FILTERS: readonly { value: EventCategory | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'ship', label: 'Fleets' },
    { value: 'eye', label: 'Contacts' },
    { value: 'factory', label: 'Economy' },
    { value: 'flask', label: 'Research' }
  ];

  let filter = $state<EventCategory | ''>('');

  const known = (e: GameEvent) => !!e.subject && !!game.systemOf(e.subject);

  function open(e: GameEvent) {
    if (e.subject && known(e)) focus(e.subject);
  }

  function onKey(ev: KeyboardEvent, e: GameEvent) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    open(e);
  }
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
      {#if known(e)}
        <div
          class="ev pick"
          class:w={e.warn}
          data-cat={e.category}
          data-sel="{e.subject!.kind}:{e.subject!.id}"
          hidden={!!filter && e.category !== filter}
          role="button"
          tabindex="0"
          onclick={() => open(e)}
          onkeydown={(ev) => onKey(ev, e)}
        >
          <time>{formatEventTime(e.at, game.time)}</time><Icon name={e.category} /><span>{e.text}</span>
        </div>
      {:else}
        <div class="ev" class:w={e.warn} data-cat={e.category} hidden={!!filter && e.category !== filter}>
          <time>{formatEventTime(e.at, game.time)}</time><Icon name={e.category} /><span>{e.text}</span>
        </div>
      {/if}
    {/each}
  </div>
</Window>

<style>
  .pick {
    cursor: pointer;
  }
  .pick:hover {
    background: var(--panel2);
  }
</style>
