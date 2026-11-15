<script lang="ts">
  import { surfaceScene } from '#lib/gfx/index.ts';
  import { CanvasView, DefList, Panel, ScreenGrid, Split, Stack, Table, shell } from '#lib/ui/index.ts';
  import { INSTALLATIONS, MINERALS } from '#lib/screens/economy/catalog.ts';
  import { formatCount, formatPeople, formatRate } from '#lib/screens/economy/format.ts';
  import { drawColonyPlanet } from '#lib/screens/economy/planetView.ts';
  import { growthRate, workersFree } from '#lib/screens/economy/sim.ts';
  import { applyParams, economy, selectedColony, ui } from '#lib/screens/economy/state.svelte.ts';

  applyParams((name) => shell.param(name));

  const colony = $derived(selectedColony());
  const fill = (tons: number) => Math.min(100, Math.round((tons / colony.target) * 100));
  const stockRows = $derived([
    ...MINERALS.map((m) => [m.name, { pct: fill(colony.stock[m.id]) }]),
    ['Fuel', { pct: fill(colony.fuel) }]
  ]);

  function openInEconomy() {
    shell.setScreen('economy');
  }
</script>

<ScreenGrid id="colony" columns="minmax(0,5fr) minmax(0,7fr)">
  <Panel title={colony.name} body="fill">
    <CanvasView
      scale={4}
      vignette={0.66}
      bg="space"
      draw={(fb, t) => drawColonyPlanet(fb, t, colony.planet, colony.moon)}
    />
  </Panel>
  <Stack>
    <Panel title="Surface" body="fill">
      {#snippet tools()}
        <select id="colonyPick" aria-label="Colony" bind:value={ui.colony}>
          {#each economy.colonies as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      {/snippet}
      <CanvasView scale={3} vignette={0.7} height={258} draw={(fb, t) => surfaceScene(fb, t)} />
    </Panel>
    <Split grow>
      <Panel title="Colony">
        <DefList
          rows={[
            ['People', formatPeople(colony.population)],
            ['Growth', `${formatRate(growthRate(colony))} a year`],
            ['Workers free', formatCount(workersFree(colony))],
            ['Air', colony.environment.air],
            ['Gravity', colony.environment.gravity],
            ['Surface', colony.environment.surface],
            ['Governor', colony.governor.name],
            ['Garrison', `${colony.garrison} units`]
          ]}
        />
        <div class="add"><button id="openEconomy" onclick={openInEconomy}>Open in Economy</button></div>
      </Panel>
      <Panel title="Installations">
        <DefList
          rows={INSTALLATIONS.map((i) => [
            i.plural.charAt(0).toUpperCase() + i.plural.slice(1),
            colony.installations[i.id]
          ])}
        />
      </Panel>
      <Panel title="Stockpile">
        <Table numeric={[false, false]} rows={stockRows} />
      </Panel>
    </Split>
  </Stack>
</ScreenGrid>
