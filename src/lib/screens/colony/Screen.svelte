<script lang="ts">
  import { building } from '#lib/game/data/index.ts';
  import type { BuildingKind } from '#lib/game/data/index.ts';
  import { economy, flowsOf } from '#lib/game/economy/index.ts';
  import { surfaceScene } from '#lib/gfx/index.ts';
  import {
    CanvasView,
    DefList,
    Panel,
    ScreenGrid,
    Split,
    Stack,
    Table,
    shell,
    type Cell
  } from '#lib/ui/index.ts';
  import {
    formatCount,
    formatDays,
    formatMass,
    formatPeople,
    formatPercent,
    formatPower,
    formatRate,
    shortName
  } from '#lib/screens/economy/format.ts';
  import { siteBody } from '#lib/screens/economy/lookup.ts';
  import { drawColonyPlanet } from '#lib/screens/economy/planetView.ts';
  import { selectedSite, ui } from '#lib/screens/economy/state.svelte.ts';
  import { coverDays, kindName } from '#lib/screens/economy/view.ts';

  const site = $derived(selectedSite());
  const flows = $derived(flowsOf(site));
  const body = $derived(siteBody(site.worldBody));

  const kinds = $derived.by(() => {
    const by: Partial<Record<BuildingKind, number>> = {};
    for (const g of site.groups) {
      const k = building(g.building).kind;
      by[k] = (by[k] ?? 0) + g.count;
    }
    return (Object.entries(by) as [BuildingKind, number][]).map(([k, n]): [string, string] => [
      kindName(k),
      formatCount(n)
    ]);
  });

  const stockRows = $derived<Cell[][]>(
    Object.entries(site.stock)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, v]) => {
        const days = coverDays(site, flows, id);
        return [shortName(id), formatMass(v), Number.isFinite(days) ? formatDays(days) : 'growing'];
      })
  );
</script>

<ScreenGrid id="colony" columns="minmax(0,5fr) minmax(0,7fr)">
  <Panel title={site.name} body="fill">
    <CanvasView
      scale={4}
      vignette={0.66}
      bg="space"
      draw={(fb, t) => drawColonyPlanet(fb, t, body?.type ?? 'terran', site.body === 'earth')}
    />
  </Panel>
  <Stack>
    <Panel title="Surface" body="fill">
      {#snippet tools()}
        <select id="colonyPick" aria-label="Site" bind:value={ui.site}>
          {#each economy.sites as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
        </select>
      {/snippet}
      <CanvasView scale={3} vignette={0.7} height={258} draw={(fb, t) => surfaceScene(fb, t)} />
    </Panel>
    <Split grow>
      <Panel title="Site">
        <DefList
          rows={[
            ['People', formatPeople(site.population)],
            ['Growth', `${formatRate(flows.growthPerHour * 8766)} a year`],
            ['Fed', formatPercent(flows.food.cover)],
            ['Workforce', formatPeople(flows.workers.available)],
            ['Power', `${formatPower(flows.power.demand)} of ${formatPower(flows.power.supply)}`],
            ['Air', body?.facts.air ?? ''],
            ['Gravity', body?.facts.gravity ?? ''],
            ['Surface', body?.facts.surface ?? '']
          ]}
        />
        <div class="add">
          <button id="openEconomy" onclick={() => shell.setScreen('economy')}>Open in Economy</button>
        </div>
      </Panel>
      <Panel title="Buildings">
        <DefList rows={kinds} />
      </Panel>
      <Panel title="Largest stocks">
        <Table head={['Material', '>Stock', '>Cover']} rows={stockRows} />
      </Panel>
    </Split>
  </Stack>
</ScreenGrid>
