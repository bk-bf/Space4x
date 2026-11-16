<script lang="ts">
  import {
    flowsOf,
    hasYard,
    moveShipOrder,
    pauseShipOrder,
    removeShipOrder,
    touch,
    type Site
  } from '#lib/game/economy/index.ts';
  import { shipClasses, statsFor } from '#lib/game/index.ts';
  import { yardName } from '#lib/game/shipdesign/index.ts';
  import { orderShips } from '#lib/game/ships/index.ts';
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import Bar from './Bar.svelte';
  import Field from './Field.svelte';
  import { formatAmount, formatDays, formatMass, shortName } from './format.ts';
  import { ui } from './state.svelte.ts';
  import { limitText } from './view.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const designs = $derived(shipClasses().filter((d) => d.locked));
  let choice = $state('');
  const design = $derived(designs.find((d) => d.id === choice) ?? designs[0]);
  let quantity = $state(1);
  let refusal = $state('');
  const selIndex = $derived(site.yard.findIndex((o) => o.id === ui.yardOrder));
  const sel = $derived(selIndex >= 0 ? site.yard[selIndex] : undefined);
  const stats = $derived(design ? statsFor(design) : undefined);
  const yards = $derived(
    design ? site.groups.filter((g) => g.building === design.yard).reduce((a, g) => a + g.count, 0) : 0
  );

  const costText = $derived(
    stats
      ? Object.entries(stats.cost)
          .sort((a, b) => b[1] - a[1])
          .map(([m, v]) => `${shortName(m)} ${formatAmount(m, v)}`)
          .join(', ')
      : ''
  );

  function status(id: number): Cell {
    const o = site.yard.find((x) => x.id === id);
    if (!o) return '';
    if (o.paused) return { icon: 'pause', text: 'Paused' };
    const a = flows.actors.find((x) => x.kind === 'yard' && x.order.id === id);
    if (!a) return hasYard(site, o.yard) ? 'Waiting for a yard' : { text: 'No yard', warn: true };
    if (a.share < 1 - 1e-9) return { icon: 'warn', text: limitText(a.limit), warn: true };
    return { icon: 'gear', text: 'Building' };
  }

  const left = (id: number): string => {
    const a = flows.actors.find((x) => x.kind === 'yard' && x.order.id === id);
    if (!a || a.kind !== 'yard' || a.share <= 1e-9) return '-';
    return formatDays(((1 - a.order.done) * a.hours) / a.share / 24);
  };

  const rows = $derived<Cell[][]>(
    site.yard.map((o, i) => [
      i + 1,
      o.name,
      yardName(o.yard as 'rocket_factory'),
      { pct: Math.floor(o.done * 100) },
      left(o.id),
      status(o.id)
    ])
  );

  function add() {
    if (!design) return;
    const made = orderShips(site, design.id, quantity);
    if (typeof made === 'string') {
      refusal = made;
      return;
    }
    refusal = '';
    ui.yardOrder = made[made.length - 1]?.id ?? ui.yardOrder;
    touch();
  }

  function act(f: (s: Site, id: number) => void) {
    if (!sel) return;
    f(site, sel.id);
    touch();
  }
</script>

<h3>Ship queue <small>{yards} yards standing</small></h3>
{#if rows.length}
  <div id="yardQueue">
    <Table
      head={['>#', 'Ship', 'Yard', 'Done', '>Left', 'Status']}
      {rows}
      selected={selIndex}
      keys={site.yard.map((o) => String(o.id))}
      onpick={(r) => (ui.yardOrder = site.yard[r]?.id ?? null)}
    />
  </div>
{:else}
  <p class="none" id="yardEmpty">
    {#if site.groups.some((g) => g.building === 'rocket_factory' || g.building === 'orbital_shipyard')}
      No ships are being built. Pick a locked design below and add it.
    {:else}
      This site has no yard.
    {/if}
  </p>
{/if}
<Bar>
  <button id="yardUp" disabled={selIndex <= 0} onclick={() => act((s, id) => moveShipOrder(s, id, -1))}
    >Move up</button
  >
  <button
    id="yardDown"
    disabled={selIndex < 0 || selIndex >= site.yard.length - 1}
    onclick={() => act((s, id) => moveShipOrder(s, id, 1))}>Move down</button
  >
  <button id="yardPause" disabled={!sel} onclick={() => act(pauseShipOrder)}
    >{sel?.paused ? 'Resume' : 'Pause'}</button
  >
  <button id="yardRemove" disabled={!sel} onclick={() => act(removeShipOrder)}>Remove</button>
</Bar>
<h3>Build a ship <small>{designs.length} locked designs</small></h3>
{#if designs.length}
  <Bar>
    <label class="pick"
      >Design
      <select id="yardDesign" value={design?.id ?? ''} onchange={(e) => (choice = e.currentTarget.value)}>
        {#each designs as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
      </select></label
    >
    <Field label="Quantity" bind:value={quantity} width={5} name="yardQuantity" />
    <button id="yardAdd" disabled={!design} onclick={add}>Add to queue</button>
  </Bar>
  {#if stats}
    <div id="yardCost">
      <DefList
        rows={[
          ['Yard', design ? yardName(design.yard) : ''],
          ['Dry mass', formatMass(stats.dryMass)],
          ['Cost', costText],
          [
            'Stock',
            Object.keys(stats.cost).every((m) => (site.stock[m] ?? 0) >= (stats.cost[m] ?? 0))
              ? 'Covers one'
              : 'Short of material'
          ]
        ]}
      />
    </div>
  {/if}
  {#if refusal}<p class="none" id="yardRefusal">{refusal}</p>{/if}
{:else}
  <p class="none" id="yardNone">No locked design. Lock one on the Ship classes screen.</p>
{/if}

<style>
  .none {
    margin: 4px 0;
    color: var(--dim);
  }
  .pick {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 2px 4px;
    color: var(--dim);
  }
  .pick select {
    color: var(--text);
    max-width: 26ch;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
