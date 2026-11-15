<script lang="ts">
  import { DefList, Panel, ScreenGrid, Stack, Table, requestRender, shell } from '#lib/ui/index.ts';
  import { applyGalaxyParams, galaxy } from './galaxy.svelte.ts';
  import GalaxyView from './GalaxyView.svelte';
  import { SYSTEMS, systemById } from './stars.ts';

  applyGalaxyParams(shell.params);

  const system = $derived(systemById(galaxy.selected) ?? SYSTEMS[0]!);
  const count = (n: number | null) => (n === null ? '?' : n);
  const rows = $derived<[string, string | number][]>([
    ['Star', system.star],
    ['Bodies', count(system.bodies)],
    ['Colonies', count(system.colonies)],
    ['Fleets', count(system.fleets)],
    ['Jump points', system.jumps]
  ]);
  const table = $derived(SYSTEMS.map((s) => [s.name, s.jumps]));

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<ScreenGrid id="galaxy" columns="minmax(0,1fr) 320px">
  <Panel body="fill">
    {#snippet head()}Known systems <small id="galZoom">{galaxy.camera.z.toFixed(1)}x</small>{/snippet}
    {#snippet tools()}
      <span class="spacer"></span>
      <button data-act="centre" onclick={act(() => galaxy.centreOn(galaxy.selected))}
        >Centre on selected</button
      >
      <button data-act="fit" onclick={act(() => galaxy.showAll())}>Show all</button>
    {/snippet}
    <GalaxyView />
  </Panel>
  <Stack>
    <Panel title={system.name}>
      <DefList {rows} />
      <div class="add">
        <button
          data-act="open-map"
          disabled={!galaxy.canOpenOnMap(system.id)}
          title={galaxy.canOpenOnMap(system.id) ? '' : 'The system map has no data for this system'}
          onclick={act(() => galaxy.openOnMap(system.id))}>Open on system map</button
        >
      </div>
    </Panel>
    <Panel title="Systems" grow>
      <Table
        head={['System', '>Jump points']}
        rows={table}
        keys={SYSTEMS.map((s) => s.id)}
        selected={SYSTEMS.findIndex((s) => s.id === galaxy.selected)}
        onpick={(r) => {
          galaxy.select(SYSTEMS[r]!.id);
          requestRender();
        }}
      />
    </Panel>
  </Stack>
</ScreenGrid>

<style>
  .spacer {
    flex: 1;
  }
  button {
    padding: 0 7px;
    margin: 0 2px;
  }
  .add button {
    padding: 2px 7px;
    margin: 2px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
