<script lang="ts">
  import { economy, flowsOf } from '#lib/game/economy/index.ts';
  import { game } from '#lib/game/index.ts';
  import { Icon, Panel } from '#lib/ui/index.ts';
  import { formatPeople } from './format.ts';
  import { siteBody } from './lookup.ts';
  import { ui } from './state.svelte.ts';

  const groups = $derived(
    game.world.systems
      .map((s) => ({
        system: s,
        sites: economy.sites.filter((x) => siteBody(x.worldBody)?.system === s.id)
      }))
      .filter((g) => g.sites.length)
  );
  const plural = (n: number) => `${n} ${n === 1 ? 'site' : 'sites'}`;
  const population = (xs: { population: number }[]) => xs.reduce((a, c) => a + c.population, 0);
  const troubled = (id: string) => {
    const site = economy.sites.find((s) => s.id === id);
    return site ? site.alerts.food || site.alerts.power || flowsOf(site).food.cover < 1 : false;
  };

  function onkey(e: KeyboardEvent, id: string) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    ui.site = id;
  }
</script>

<Panel title="Sites">
  <div id="colonyTree">
    {#each groups as g (g.system.id)}
      <details open>
        <summary
          ><span>{g.system.name}</span><small
            >{plural(g.sites.length)}, {formatPeople(population(g.sites))}</small
          ></summary
        >
        {#each g.sites as s (s.id)}
          <div
            class="row"
            class:on={s.id === ui.site}
            data-colony={s.id}
            role="button"
            tabindex="0"
            onclick={() => (ui.site = s.id)}
            onkeydown={(e) => onkey(e, s.id)}
          >
            <span class="name"
              >{#if troubled(s.id)}<Icon name="warn" />{/if}{s.name}</span
            >
            <span>{formatPeople(s.population)}</span>
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
