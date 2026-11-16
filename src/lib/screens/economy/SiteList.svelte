<script lang="ts">
  import { economy, flowsOf } from '#lib/game/economy/index.ts';
  import { game } from '#lib/game/index.ts';
  import { smallBodyOf } from '#lib/game/smallBodies.ts';
  import type { PlanetType } from '#lib/gfx/planets.ts';
  import { Icon, Panel, dim, fmt, tipText, tooltip, warn } from '#lib/ui/index.ts';
  import { siteBody, siteKind } from './lookup.ts';
  import { planetSprite } from './planetSprite.ts';
  import { ui } from './state.svelte.ts';

  const groups = $derived(
    game.world.systems
      .map((s) => ({
        system: s,
        sites: economy.sites.filter((x) => game.placeSystem(x.worldBody) === s.id)
      }))
      .filter((g) => g.sites.length)
  );
  const plural = (n: number) => `${n} ${n === 1 ? 'site' : 'sites'}`;
  const population = (xs: { population: number }[]) => xs.reduce((a, c) => a + c.population, 0);
  const troubled = (id: string) => {
    const site = economy.sites.find((s) => s.id === id);
    return site ? site.alerts.food || site.alerts.power || flowsOf(site).food.cover < 1 : false;
  };
  const planetOf = (worldBody: string): PlanetType => siteBody(worldBody)?.type ?? 'terran';
  const smallOf = (worldBody: string) => {
    const body = siteBody(worldBody);
    return body ? smallBodyOf(body) : undefined;
  };
</script>

<Panel title="Sites">
  <div id="siteList">
    {#each groups as g (g.system.id)}
      <div class="system">
        <b>{g.system.name}</b><span class="dim"
          >{plural(g.sites.length)}, {fmt.population(population(g.sites))}</span
        >
      </div>
      {#each g.sites as s (s.id)}
        <button
          type="button"
          class="ui-tile site"
          class:sel={s.id === ui.site}
          class:warn={troubled(s.id)}
          data-site={s.id}
          aria-pressed={s.id === ui.site}
          onclick={() => (ui.site = s.id)}
          use:tooltip={tipText(
            s.name,
            dim(siteKind(s)),
            `${fmt.population(s.population)} people`,
            troubled(s.id) && warn('Short of food or power')
          )}
        >
          {#if s.place === 'point'}
            <span class="point"><Icon name="net" /></span>
          {:else}
            <img
              class="ui-px"
              src={planetSprite(planetOf(s.worldBody), 30, smallOf(s.worldBody))}
              width="30"
              height="30"
              alt=""
              draggable="false"
            />
          {/if}
          <span class="nm">{s.name}</span>
          <span class="dim">{fmt.population(s.population)}</span>
          {#if troubled(s.id)}<span class="hot"><Icon name="warn" class="sm" /></span>{/if}
        </button>
      {/each}
    {/each}
  </div>
</Panel>

<style>
  .system {
    display: flex;
    justify-content: space-between;
    padding: 2px 6px;
  }
  .system b {
    font: 600 14px 'Pixelify';
  }
  .point {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    color: var(--cool);
  }
  .site {
    flex-direction: row;
    justify-content: flex-start;
    gap: 8px;
    width: 100%;
    padding: 4px 8px;
    margin: 2px 0;
    text-align: left;
  }
  .site .nm {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .site .hot {
    color: var(--hot);
    display: flex;
  }
</style>
