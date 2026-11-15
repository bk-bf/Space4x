<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { Icon, Panel } from '#lib/ui/index.ts';
  import { formatPeople } from './format.ts';
  import { colonyWarnings } from './lookup.ts';
  import { economy, ui } from './state.svelte.ts';

  const groups = $derived(
    game.world.systems
      .map((s) => ({ system: s, colonies: economy.colonies.filter((c) => c.system === s.id) }))
      .filter((g) => g.colonies.length)
  );
  const plural = (n: number) => `${n} ${n === 1 ? 'colony' : 'colonies'}`;
  const population = (cs: { population: number }[]) => cs.reduce((a, c) => a + c.population, 0);

  function onkey(e: KeyboardEvent, id: string) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    ui.colony = id;
  }
</script>

<Panel title="Colonies">
  <div id="colonyTree">
    {#each groups as g (g.system.id)}
      <details open>
        <summary
          ><span>{g.system.name}</span><small
            >{plural(g.colonies.length)}, {formatPeople(population(g.colonies))}</small
          ></summary
        >
        {#each g.colonies as c (c.id)}
          <div
            class="row"
            class:on={c.id === ui.colony}
            data-colony={c.id}
            role="button"
            tabindex="0"
            onclick={() => (ui.colony = c.id)}
            onkeydown={(e) => onkey(e, c.id)}
          >
            <span class="name"
              >{#if colonyWarnings(c).length}<Icon name="warn" />{/if}{c.name}</span
            >
            <span>{formatPeople(c.population)}</span>
          </div>
        {/each}
      </details>
    {/each}
  </div>
</Panel>

<style>
  .row {
    cursor: pointer;
    padding: 0 4px;
  }
  .row:hover {
    background: var(--panel2);
  }
  .row.on {
    background: var(--accent);
    color: var(--bg);
  }
  .row.on :global(.ic) {
    color: var(--bg);
  }
  .name {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .name :global(.ic) {
    width: 16px;
    height: 16px;
    color: var(--hot);
  }
</style>
