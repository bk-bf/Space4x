<script lang="ts">
  import { formatDay, formatTimeOfDay, game } from '#lib/game/index.ts';
  import {
    CanvasView,
    DefList,
    Panel,
    ScreenGrid,
    select,
    shell,
    Split,
    Stack,
    Table,
    type Cell
  } from '#lib/ui/index.ts';
  import { drawClass } from './drawClass.ts';
  import { factsOf, intel, STANCES, type Stance } from './intel.svelte.ts';

  const group = $derived(intel.groupOf(intel.group));
  const classes = $derived((group?.classes ?? []).map((id) => intel.classOf(id)));
  const sightings = $derived(intel.visible());
  const picked = $derived(intel.sightings.find((s) => s.id === intel.sighting));
  const contact = $derived(picked?.contact ? game.contact(picked.contact) : undefined);
  const systemName = (id: string) => game.world.systems.find((s) => s.id === id)?.name ?? id;

  const groupRows = $derived<Cell[][]>(
    intel.groups.map((g) => [
      { text: g.name, warn: g.stance === 'Unknown' || g.stance === 'Hostile' },
      `${intel.seen(g.id)} times`
    ])
  );
  const facts = $derived<[string, string | number][]>(
    group
      ? [
          ['First seen', formatDay(group.firstSeen)],
          ['Classes', group.classes.length],
          ['Home', group.home],
          ['Largest ship', group.largest]
        ]
      : []
  );
  const sightingRows = $derived<Cell[][]>(
    sightings.map((s) => [
      `${formatDay(s.at)} ${formatTimeOfDay(s.at)}`,
      s.place ? `${systemName(s.system)}, ${s.place}` : systemName(s.system),
      s.what,
      s.range
    ])
  );

  function showOnMap() {
    if (!contact) return;
    select('contact', contact.id);
    shell.setScreen('map');
  }
</script>

<ScreenGrid id="intel" columns="300px minmax(0,1fr)">
  <Stack>
    <Panel title="Groups">
      {#if intel.groups.length}
        <Table
          head={['Group', '>Seen']}
          rows={groupRows}
          keys={intel.groups.map((g) => g.id)}
          selected={intel.groups.findIndex((g) => g.id === intel.group)}
          onpick={(row) => intel.pickGroup(intel.groups[row]!.id)}
        />
      {/if}
    </Panel>
    <Panel title={group?.name ?? 'No group'} grow body="col">
      {#if group}
        <label class="field"
          >Stance
          <select
            id="stance"
            value={group.stance}
            onchange={(e) => intel.setStance(group.id, e.currentTarget.value as Stance, game)}
          >
            {#each STANCES as s (s)}<option value={s}>{s}</option>{/each}
          </select></label
        >
        <DefList rows={facts} />
      {/if}
    </Panel>
  </Stack>
  <Stack>
    <Split>
      {#if !classes.length}
        <Panel title="Classes" />
      {/if}
      {#each classes as c, i (c?.id ?? i)}
        <Panel title={c ? `${c.name}, ${c.likely}` : ''} body="col">
          {#if c}
            <CanvasView scale={4} height={200} draw={(fb, t) => drawClass(fb, c.look, t)} />
            <DefList rows={factsOf(c)} />
          {/if}
        </Panel>
      {/each}
    </Split>
    <Panel grow>
      {#snippet head()}Sightings <small id="sightingCount">{sightings.length}</small>{/snippet}
      {#snippet tools()}
        <select
          id="sightGroup"
          aria-label="Group"
          value={intel.filterGroup}
          onchange={(e) => intel.setGroupFilter(e.currentTarget.value)}
        >
          <option value="all">All groups</option>
          {#each intel.groups as g (g.id)}<option value={g.id}>{g.name}</option>{/each}
        </select>
        <select id="sightClass" aria-label="Class" bind:value={intel.filterClass}>
          <option value="all">All classes</option>
          {#each intel.classOptions() as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
        <button id="showOnMap" disabled={!contact} onclick={showOnMap}>Show on map</button>
      {/snippet}
      {#if sightings.length}
        <Table
          head={['When', 'Where', 'What', '>Range']}
          rows={sightingRows}
          keys={sightings.map((s) => s.id)}
          selected={sightings.findIndex((s) => s.id === intel.sighting)}
          onpick={(row) => (intel.sighting = sightings[row]!.id)}
        />
      {/if}
    </Panel>
  </Stack>
</ScreenGrid>

<style>
  .field {
    display: grid;
    grid-template-columns: 7ch minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    color: var(--dim);
  }
  .field select {
    min-width: 0;
    width: 100%;
    margin: 0;
    color: var(--text);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
