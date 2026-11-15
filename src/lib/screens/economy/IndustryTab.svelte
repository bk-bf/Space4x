<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import type { Colony } from '#lib/game/types.ts';
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import { addOrder, moveOrder, pauseOrder, removeOrder, setShare } from './actions.ts';
  import Bar from './Bar.svelte';
  import { ITEMS, MINERALS, item, mineralName, type ItemDef } from './catalog.ts';
  import Cols from './Cols.svelte';
  import Field from './Field.svelte';
  import { formatCount, formatDate, formatPercent, formatYears } from './format.ts';
  import {
    allocate,
    industrialCapacity,
    orderFinish,
    orderProgress,
    productionModifier,
    staffing,
    unusedShare
  } from './sim.ts';
  import { economy, ui } from './state.svelte.ts';

  let { colony }: { colony: Colony } = $props();

  let selected = $state<number | null>(null);
  let quantity = $state(1);
  let share = $state(25);

  const plan = $derived(allocate(colony, economy));
  const capacity = $derived(industrialCapacity(colony, economy));
  const unused = $derived(unusedShare(colony, economy));
  const selIndex = $derived(colony.queue.findIndex((o) => o.id === selected));
  const selOrder = $derived(selIndex >= 0 ? colony.queue[selIndex] : undefined);
  const picked = $derived(item(ui.pick));

  const kindLabel = (kind: 'installation' | 'component') =>
    kind === 'installation' ? 'Installation' : 'Component';

  function status(a: (typeof plan)[number]): Cell {
    if (a.order.paused) return { icon: 'pause', text: 'Paused' };
    if (a.order.waiting) return { icon: 'warn', text: `No ${mineralName(a.order.waiting)}`, warn: true };
    if (capacity <= 0) return { icon: 'warn', text: 'No factories', warn: true };
    if (a.fraction < a.order.share / 100) return { icon: 'warn', text: 'Over capacity', warn: true };
    return { icon: 'gear', text: 'Building' };
  }

  const queueRows = $derived<Cell[][]>(
    plan.map((a, i) => {
      const def = item(a.order.item);
      return [
        i + 1,
        def.name,
        kindLabel(def.kind),
        `${a.order.quantity} of ${a.order.ordered}`,
        `${a.order.share}%`,
        formatCount(a.bpPerYear),
        { pct: Math.round(orderProgress(a.order) * 100) },
        a.order.paused ? '-' : formatDate(orderFinish(a, game.time)),
        status(a)
      ];
    })
  );

  const costOf = (def: ItemDef) =>
    MINERALS.filter((m) => def.minerals[m.id])
      .map((m) => `${m.name} ${def.minerals[m.id]}`)
      .join(', ');

  const itemRows = $derived<Cell[][]>(
    ITEMS.map((def) => [
      def.name,
      kindLabel(def.kind),
      formatCount(def.bp),
      costOf(def),
      def.kind === 'installation' ? formatCount(def.workers) : '-',
      def.kind === 'installation'
        ? colony.installations[def.id as keyof Colony['installations']]
        : colony.components[def.id as keyof Colony['components']],
      capacity > 0 ? formatYears(def.bp / capacity) : 'never'
    ])
  );

  function add() {
    addOrder(colony, ui.pick, quantity, share);
    selected = colony.queue[colony.queue.length - 1]?.id ?? null;
  }

  function remove() {
    if (selOrder) removeOrder(colony, selOrder.id);
    selected = null;
  }
</script>

<DefList
  two
  rows={[
    ['Factories', `${colony.installations.factory}, staffed ${formatPercent(staffing(colony))}`],
    ['Industrial capacity', `${formatCount(capacity)} BP a year`],
    ['Allocated', formatPercent(1 - unused)],
    ['Unused capacity', formatPercent(unused)],
    ['Governor bonus', `+${formatPercent(colony.governor.bonus)}`],
    ['Production modifier', formatPercent(productionModifier(economy))]
  ]}
/>
<h3>Construction queue</h3>
{#if queueRows.length}
  <div id="queue">
    <Table
      head={['>#', 'Item', 'Kind', '>Left', '>Share', '>BP a year', 'Progress', '>Done by', 'Status']}
      rows={queueRows}
      selected={selIndex}
      keys={colony.queue.map((o) => String(o.id))}
      onpick={(row) => (selected = colony.queue[row]?.id ?? null)}
    />
  </div>
{:else}
  <p class="none" id="queueEmpty">The queue is empty. Pick an item below and add it.</p>
{/if}
<Bar>
  <button id="orderUp" disabled={selIndex <= 0} onclick={() => selOrder && moveOrder(colony, selOrder.id, -1)}
    >Move up</button
  >
  <button
    id="orderDown"
    disabled={selIndex < 0 || selIndex >= colony.queue.length - 1}
    onclick={() => selOrder && moveOrder(colony, selOrder.id, 1)}>Move down</button
  >
  <button id="orderPause" disabled={!selOrder} onclick={() => selOrder && pauseOrder(colony, selOrder.id)}
    >{selOrder?.paused ? 'Resume' : 'Pause'}</button
  >
  <button id="orderRemove" disabled={!selOrder} onclick={remove}>Remove</button>
  <span class="gap"></span>
  <Field
    label="Share of capacity, %"
    value={selOrder?.share ?? 0}
    min={1}
    max={100}
    width={5}
    name="orderShare"
    disabled={!selOrder}
    onchange={(v) => selOrder && setShare(colony, selOrder.id, v)}
  />
</Bar>
<h3>Add to the queue</h3>
<Bar>
  <span class="chosen" id="chosen">{picked.name}</span>
  <span class="gap"></span>
  <Field label="Quantity" bind:value={quantity} width={6} name="quantity" />
  <Field label="Share of capacity, %" bind:value={share} max={100} width={5} name="share" />
  <button id="orderAdd" onclick={add}>Add to queue</button>
</Bar>
<Cols columns="1fr">
  <div>
    <h3>Things to build</h3>
    <div id="items">
      <Table
        head={['Item', 'Kind', '>Cost BP', 'Minerals', '>Workers', '>Have', '>One at full capacity']}
        rows={itemRows}
        selected={ITEMS.findIndex((d) => d.id === ui.pick)}
        keys={ITEMS.map((d) => d.id)}
        onpick={(row) => (ui.pick = ITEMS[row]?.id ?? ui.pick)}
      />
    </div>
  </div>
</Cols>

<style>
  .none {
    margin: 0;
    color: var(--dim);
  }
  .chosen {
    color: var(--accent);
    margin: 0 8px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
