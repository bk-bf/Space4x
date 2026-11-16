<script lang="ts">
  import {
    activeOrders,
    buildable,
    buildHours,
    economy,
    flowsOf,
    lockedBuildings,
    moveOrder,
    pauseOrder,
    process,
    queueBuilding,
    removeOrder,
    standing,
    touch,
    unlockedAfter,
    unlockedProcesses,
    type Site
  } from '#lib/game/economy/index.ts';
  import { Table, type Cell } from '#lib/ui/index.ts';
  import Bar from './Bar.svelte';
  import Field from './Field.svelte';
  import { formatAmount, formatCount, formatDays, shortName } from './format.ts';
  import { ui } from './state.svelte.ts';
  import { buildingName, kindName, limitText } from './view.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const active = $derived(new Set(activeOrders(site).map((o) => o.id)));
  const selIndex = $derived(site.queue.findIndex((o) => o.id === ui.order));
  const selOrder = $derived(selIndex >= 0 ? site.queue[selIndex] : undefined);
  const open = $derived(buildable(economy, site));
  const locked = $derived(lockedBuildings(economy, site));
  const catalogue = $derived([...open, ...locked]);
  const picked = $derived(open.find((b) => b.id === ui.pick) ?? open[0]);
  const recipes = $derived(picked ? unlockedProcesses(economy, site, picked.id) : []);
  let recipeChoice = $state('');
  const recipe = $derived(recipes.some((r) => r.id === recipeChoice) ? recipeChoice : (recipes[0]?.id ?? ''));
  let quantity = $state(1);

  const costText = (cost: Record<string, number>) => {
    const items = Object.entries(cost).sort((a, b) => b[1] - a[1]);
    const shown = items.slice(0, 2).map(([m, v]) => `${shortName(m)} ${formatAmount(m, v)}`);
    return items.length > 2 ? `${shown.join(', ')}, +${items.length - 2}` : shown.join(', ');
  };

  function orderStatus(id: number): Cell {
    const o = site.queue.find((x) => x.id === id);
    if (!o) return '';
    if (o.paused) return { icon: 'pause', text: 'Paused' };
    if (!active.has(o.id)) return 'Waiting for a crew';
    const a = flows.actors.find((x) => x.kind === 'build' && x.order.id === id);
    if (a && a.share < 1 - 1e-9) return { icon: 'warn', text: limitText(a.limit), warn: true };
    return { icon: 'gear', text: 'Building' };
  }

  const left = (id: number): string => {
    const a = flows.actors.find((x) => x.kind === 'build' && x.order.id === id);
    if (!a || a.kind !== 'build' || a.share <= 1e-9) return '-';
    return formatDays(((1 - a.order.done) * a.hours) / a.share / 24);
  };

  const queueRows = $derived<Cell[][]>(
    site.queue.map((o, i) => [
      i + 1,
      buildingName(o.building),
      o.process ? process(o.process, site.body).name : 'None',
      { pct: Math.floor(o.done * 100) },
      left(o.id),
      orderStatus(o.id)
    ])
  );

  const catalogueRows = $derived<Cell[][]>(
    catalogue.map((b) => {
      const isOpen = open.includes(b);
      return [
        b.name,
        kindName(b.kind),
        costText(b.cost),
        formatCount(b.workers),
        formatDays(buildHours(b.id) / 24),
        formatCount(standing(site, b.id)),
        isOpen ? 'Open' : `Needs milestone ${unlockedAfter(b.milestone)}`
      ];
    })
  );

  function add() {
    if (!picked) return;
    const chosen = recipe || null;
    const made = queueBuilding(economy, site, picked.id, chosen, quantity);
    ui.order = made[made.length - 1]?.id ?? ui.order;
    touch();
  }

  function act(f: (site: Site, id: number) => void) {
    if (!selOrder) return;
    f(site, selOrder.id);
    touch();
  }

  function remove() {
    act(removeOrder);
    ui.order = null;
  }
</script>

<h3>
  Construction queue <small>{activeOrders(site).length} of 3 crews busy</small>
  {#if !queueRows.length}<small id="queueEmpty">queue empty</small>{/if}
</h3>
{#if queueRows.length}
  <div id="queue">
    <Table
      head={['>#', 'Building', 'Recipe', 'Done', '>Left', 'Status']}
      rows={queueRows}
      selected={selIndex}
      keys={site.queue.map((o) => String(o.id))}
      onpick={(row) => (ui.order = site.queue[row]?.id ?? null)}
    />
  </div>
{/if}
<Bar>
  <button id="orderUp" disabled={selIndex <= 0} onclick={() => act((s, id) => moveOrder(s, id, -1))}
    >Move up</button
  >
  <button
    id="orderDown"
    disabled={selIndex < 0 || selIndex >= site.queue.length - 1}
    onclick={() => act((s, id) => moveOrder(s, id, 1))}>Move down</button
  >
  <button id="orderPause" disabled={!selOrder} onclick={() => act(pauseOrder)}
    >{selOrder?.paused ? 'Resume' : 'Pause'}</button
  >
  <button id="orderRemove" disabled={!selOrder} onclick={remove}>Remove</button>
  <span class="gap"></span>
  <span class="chosen" id="chosen">{picked?.name ?? ''}</span>
  <label class="pick"
    >Recipe
    <select
      id="buildRecipe"
      value={recipe}
      onchange={(e) => (recipeChoice = e.currentTarget.value)}
      disabled={recipes.length < 2}
    >
      {#each recipes as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
    </select></label
  >
  <Field label="Quantity" bind:value={quantity} width={5} name="quantity" />
  <button id="orderAdd" disabled={!picked} onclick={add}>Add to queue</button>
</Bar>
<h3>Buildings <small>{open.length} open, {locked.length} locked</small></h3>
<div id="items">
  <Table
    head={['Building', 'Kind', 'Cost', '>Workers', '>Build time', '>Standing', 'Available']}
    rows={catalogueRows}
    selected={catalogue.findIndex((b) => b.id === picked?.id)}
    keys={catalogue.map((b) => b.id)}
    onpick={(row) => {
      const b = catalogue[row];
      if (b && open.includes(b)) {
        ui.pick = b.id;
        recipeChoice = '';
      }
    }}
  />
</div>

<style>
  .chosen {
    color: var(--accent);
    margin: 0 8px;
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
  button:disabled,
  select:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
