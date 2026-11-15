<script lang="ts">
  import { untrack } from 'svelte';
  import { game } from '#lib/game/index.ts';
  import { MOCK_REMOTE_FLEETS } from '#lib/game/mock/fleets.ts';
  import { select, Table, Tabs, Window } from '#lib/ui/index.ts';
  import { camera, layers, resetCamera, toggleLayer, zoomBy, type Layer } from './camera.svelte';

  const TABS = [
    { id: 'fleets', label: 'Fleets' },
    { id: 'bodies', label: 'Bodies' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'display', label: 'Display' }
  ];

  let tab = $state('fleets');
  const openAtStart = untrack(() => game.selection.id);
  const world = $derived(game.world);
  const sel = $derived(game.selection);
  const system = $derived(world.systems.find((s) => s.id === world.system));
  const bodyRows = $derived(world.bodies.map((b) => [b.name, b.facts.kind, b.facts.people]));
  const contactRows = $derived(
    world.contacts.map((c) => [{ text: c.id, warn: !!c.hostile }, c.kind, c.range])
  );
  const pickedRow = (kind: string, ids: string[]) => (sel.kind === kind ? ids.indexOf(sel.id) : -1);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<Window id="side" title="System" icon="map" home="left" width={290} floatAt={() => [10, 10]}>
  {#snippet tools()}
    <select class="tools" id="sysSel" bind:value={game.world.system}>
      {#each world.systems as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
    </select>
  {/snippet}
  <Tabs tabs={TABS} bind:active={tab} />
  {#if tab === 'fleets'}
    <div id="tree">
      <details open>
        <summary><span>{system?.name}</span><small>{plural(world.fleets.length, 'fleet')}</small></summary>
        {#each world.fleets as f (f.id)}
          <details open={f.id === openAtStart}>
            <summary
              data-sel="fleet:{f.id}"
              class:on={sel.kind === 'fleet' && sel.id === f.id}
              onclick={() => select('fleet', f.id)}><span>{f.name}</span><small>{f.note}</small></summary
            >
            {#each f.ships as s (s.name)}<div><span>{s.name}</span><span>{s.className}</span></div>{/each}
          </details>
        {/each}
      </details>
      {#each MOCK_REMOTE_FLEETS as group (group.system)}
        <details>
          <summary><span>{group.system}</span><small>{plural(group.fleets.length, 'fleet')}</small></summary>
          {#each group.fleets as f (f.name)}
            <details><summary><span>{f.name}</span><small>{f.note}</small></summary></details>
          {/each}
        </details>
      {/each}
    </div>
  {:else if tab === 'bodies'}
    <Table
      head={['Body', 'Kind', '>People']}
      rows={bodyRows}
      keys={world.bodies.map((b) => 'body:' + b.id)}
      selected={pickedRow(
        'body',
        world.bodies.map((b) => b.id)
      )}
      onpick={(i) => select('body', world.bodies[i]!.id)}
    />
  {:else if tab === 'contacts'}
    <Table
      head={['Id', 'Kind', '>Range']}
      rows={contactRows}
      keys={world.contacts.map((c) => 'contact:' + c.id)}
      selected={pickedRow(
        'contact',
        world.contacts.map((c) => c.id)
      )}
      onpick={(i) => select('contact', world.contacts[i]!.id)}
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
