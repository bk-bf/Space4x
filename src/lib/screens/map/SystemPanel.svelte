<script lang="ts">
  import { untrack } from 'svelte';
  import { economy } from '#lib/game/economy/index.ts';
  import { className, game, type Selection } from '#lib/game/index.ts';
  import { ships } from '#lib/game/ships/index.ts';
  import { vesselWhere } from '#lib/screens/economy/shipsView.ts';
  import { DefList, select, Table, Tabs, Window } from '#lib/ui/index.ts';
  import { flyTo, layers, mapPresets, readout, toggleLayer, zoomBy, type Layer } from './camera.svelte';
  import type { Preset } from './targets';
  import { peopleAt } from '#lib/screens/economy/lookup.ts';
  import { focus, showSystem } from './focus';

  const TABS = [
    { id: 'fleets', label: 'Fleets' },
    { id: 'bodies', label: 'Bodies' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'display', label: 'Display' }
  ];

  let tab = $state('fleets');
  const openAtStart = untrack(() => [game.world.system, game.selection.id]);
  const world = $derived(game.world);
  const sel = $derived(game.selection);
  const bodies = $derived(world.bodies.filter((b) => b.system === world.system));
  const contacts = $derived(world.contacts.filter((c) => c.system === world.system));
  const groups = $derived(
    world.systems.map((s) => ({ system: s, fleets: world.fleets.filter((f) => f.system === s.id) }))
  );
  const vessels = $derived(ships.vessels);
  const bases = $derived(economy.sites.filter((x) => x.place === 'orbit'));
  const vesselRows = $derived(vessels.map((v) => [v.name, vesselWhere(v)]));
  const baseRows = $derived(bases.map((b) => [b.name, Math.round(b.population)]));
  const bodyRows = $derived(bodies.map((b) => [b.name, b.facts.kind, peopleAt(b.id)]));
  const contactRows = $derived(contacts.map((c) => [{ text: c.id, warn: !!c.hostile }, c.kind, c.range]));

  function fly(p: Preset) {
    if (typeof p.aim === 'string' && p.aim.startsWith('site:')) select('site', p.id);
    flyTo(p.id);
  }
  const pickedRow = (kind: string, ids: string[]) => (sel.kind === kind ? ids.indexOf(sel.id) : -1);
  const TIERS = [
    { id: 'far', label: 'Far' },
    { id: 'mid', label: 'Mid' },
    { id: 'near', label: 'Near' }
  ] as const;
  const flights = $derived(tab === 'display' && world.system ? mapPresets() : []);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const fleetSel = (id: string): Selection => ({ kind: 'fleet', id });

  function onKey(e: KeyboardEvent, id: string) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    focus(fleetSel(id));
  }
</script>

<Window id="side" title="System" heading="" icon="map" home="left" width={290} floatAt={() => [10, 10]}>
  {#snippet tools()}
    <select
      class="tools"
      id="sysSel"
      value={world.system}
      onchange={(e) => showSystem(e.currentTarget.value)}
    >
      {#each world.systems as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
    </select>
  {/snippet}
  <Tabs tabs={TABS} bind:active={tab} />
  {#if tab === 'fleets'}
    <div id="tree">
      {#each groups as g (g.system.id)}
        <details open={g.system.id === openAtStart[0]} data-system={g.system.id}>
          <summary><span>{g.system.name}</span><small>{plural(g.fleets.length, 'fleet')}</small></summary>
          {#each g.fleets as f (f.id)}
            <details open={f.id === openAtStart[1]}>
              <summary
                data-sel="fleet:{f.id}"
                class:on={sel.kind === 'fleet' && sel.id === f.id}
                onclick={() => focus(fleetSel(f.id))}><span>{f.name}</span><small>{f.note}</small></summary
              >
              {#each f.ships as s, i (i)}
                <div
                  role="button"
                  tabindex="0"
                  data-ship={s.name}
                  onclick={() => focus(fleetSel(f.id))}
                  onkeydown={(e) => onKey(e, f.id)}
                >
                  <span>{s.name}</span><span>{className(s.classId)}</span>
                </div>
              {/each}
            </details>
          {/each}
        </details>
      {/each}
      {#if vessels.length}
        <h3>Ships <small>{vessels.length}</small></h3>
        <div id="shipList">
          <Table
            rows={vesselRows}
            keys={vessels.map((v) => 'ship:' + v.id)}
            selected={pickedRow(
              'ship',
              vessels.map((v) => v.id)
            )}
            onpick={(i) => focus({ kind: 'ship', id: vessels[i]!.id })}
          />
        </div>
      {/if}
      {#if bases.length}
        <h3>Sites <small>{bases.length}</small></h3>
        <div id="baseList">
          <Table
            head={['Site', '>People']}
            rows={baseRows}
            keys={bases.map((b) => 'base:' + b.id)}
            selected={pickedRow(
              'base',
              bases.map((b) => b.id)
            )}
            onpick={(i) => focus({ kind: 'base', id: bases[i]!.id })}
          />
        </div>
      {/if}
      {#if !world.fleets.length && !vessels.length}<p class="none" id="noFleets">
          No fleets. Nothing of ours flies beyond Earth yet.
        </p>{/if}
    </div>
  {:else if tab === 'bodies'}
    <Table
      head={['Body', 'Kind', '>People']}
      rows={bodyRows}
      keys={bodies.map((b) => 'body:' + b.id)}
      selected={pickedRow(
        'body',
        bodies.map((b) => b.id)
      )}
      onpick={(i) => select('body', bodies[i]!.id)}
    />
  {:else if tab === 'contacts'}
    {#if contacts.length}
      <Table
        head={['Id', 'Kind', '>Range']}
        rows={contactRows}
        keys={contacts.map((c) => 'contact:' + c.id)}
        selected={pickedRow(
          'contact',
          contacts.map((c) => c.id)
        )}
        onpick={(i) => select('contact', contacts[i]!.id)}
      />
    {:else}
      <p class="none" id="noContacts">No contacts.</p>
    {/if}
  {:else}
    <h3>Show on map</h3>
    <div id="toggles">
      {#each Object.keys(layers) as Layer[] as k (k)}<button
          data-show={k}
          class:on={layers[k]}
          onclick={() => toggleLayer(k)}>{k}</button
        >{/each}
    </div>
    <h3>Scale</h3>
    <div id="mapScale">
      <span class="barbox"><i id="scaleBar" style:width="{readout.bar}px"></i></span><span id="scaleDist"
        >{readout.dist}</span
      >
    </div>
    <div id="mapZoom">
      <span id="zoomNow" data-mpp={readout.mpp}>{readout.px}</span>
      <span id="tiers"
        >{#each TIERS as t (t.id)}<i data-tier={t.id} class:on={readout.tier === t.id}>{t.label}</i
          >{/each}</span
      >
    </div>
    <div>
      <button data-zoom="-1" onclick={() => zoomBy(-1)}>-</button><button
        data-zoom="1"
        onclick={() => zoomBy(1)}>+</button
      ><button data-zoom="0" onclick={() => flyTo('system')}>Reset</button>
    </div>
    <h3>Camera</h3>
    <div id="mapCam">
      <DefList
        rows={[
          ['Focus', readout.focus],
          ['x', readout.x + ' m'],
          ['y', readout.y + ' m']
        ]}
      />
    </div>
    <h3>Fly to</h3>
    <div id="presets">
      {#each flights as p (p.id)}<button data-preset={p.id} onclick={() => fly(p)}>{p.label}</button>{/each}
    </div>
  {/if}
</Window>

<style>
  .none {
    margin: 0;
    color: var(--dim);
  }
  #mapScale,
  #mapZoom {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .barbox {
    flex: none;
    width: 104px;
    display: flex;
    justify-content: flex-end;
  }
  #scaleBar {
    height: 7px;
    border: 2px solid var(--text);
    border-top: 0;
  }
  #zoomNow {
    flex: none;
    width: 150px;
  }
  #tiers {
    display: flex;
    gap: 4px;
  }
  #tiers i {
    font-style: normal;
    padding: 0 5px;
    color: var(--dim);
    box-shadow: var(--edge);
  }
  #tiers i.on {
    background: var(--accent);
    color: var(--bg);
  }
  #sysSel {
    flex: none;
    field-sizing: content;
  }
  [data-ship] {
    cursor: pointer;
  }
  [data-ship]:hover {
    background: var(--panel2);
  }
</style>
