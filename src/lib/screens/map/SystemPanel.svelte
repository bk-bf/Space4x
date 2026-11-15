<script lang="ts">
  import { untrack } from 'svelte';
  import { game, type Selection } from '#lib/game/index.ts';
  import { select, Table, Tabs, Window } from '#lib/ui/index.ts';
  import { camera, layers, resetCamera, toggleLayer, zoomBy, type Layer } from './camera.svelte';
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
  const bodyRows = $derived(bodies.map((b) => [b.name, b.facts.kind, b.facts.people]));
  const contactRows = $derived(contacts.map((c) => [{ text: c.id, warn: !!c.hostile }, c.kind, c.range]));
  const pickedRow = (kind: string, ids: string[]) => (sel.kind === kind ? ids.indexOf(sel.id) : -1);
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
                  <span>{s.name}</span><span>{s.className}</span>
                </div>
              {/each}
            </details>
          {/each}
        </details>
      {/each}
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
    <h3>Show on map</h3>
    <div id="toggles">
      {#each Object.keys(layers) as Layer[] as k (k)}<button
          data-show={k}
          class:on={layers[k]}
          onclick={() => toggleLayer(k)}>{k}</button
        >{/each}
    </div>
    <h3>Zoom</h3>
    <div>
      <button data-zoom="-1" onclick={() => zoomBy(-1)}>-</button><button
        data-zoom="1"
        onclick={() => zoomBy(1)}>+</button
      ><button data-zoom="0" onclick={resetCamera}>Reset</button> <span id="zoomNow">{camera.z}x</span>
    </div>
  {/if}
</Window>

<style>
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
