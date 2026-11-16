<script lang="ts">
  import { material } from '#lib/game/data/index.ts';
  import { touch, type Site } from '#lib/game/economy/index.ts';
  import { game } from '#lib/game/index.ts';
  import {
    advanceShips,
    clearOrders,
    runsList,
    ships,
    startRun,
    statsOf,
    supplyRows,
    type SupplyRow,
    type Vessel
  } from '#lib/game/ships/index.ts';
  import { Table, type Cell } from '#lib/ui/index.ts';
  import Bar from './Bar.svelte';
  import Field from './Field.svelte';
  import { formatAmount, formatMass } from './format.ts';
  import { dayText, whereabouts } from './shipsView.ts';

  let { site }: { site: Site } = $props();

  const off = $derived(site.id !== 'earth');
  const rows = $derived<SupplyRow[]>(off ? supplyRows(game, site) : []);
  let materialId = $state('');
  const row = $derived(rows.find((r) => r.material === materialId) ?? rows[0]);
  let sourceId = $state('');
  const source = $derived(row?.options.find((o) => o.from === sourceId) ?? row?.options[0]);
  const freighters = $derived(
    ships.vessels.filter((v) => {
      const s = statsOf(v);
      return !v.run && !v.trip && !!s?.main && s.payloadCapacity > 0;
    })
  );
  let shipId = $state('');
  const ship = $derived(freighters.find((v) => v.id === shipId) ?? freighters[0]);
  let amount = $state(0);
  let message = $state('');
  const cap = $derived(ship ? (statsOf(ship)?.payloadCapacity ?? 0) : 0);
  const load = $derived(amount > 0 ? Math.min(amount, cap) : cap);

  const tableRows = $derived<Cell[][]>(
    rows.map((r) => {
      const best = r.options
        .filter((o) => o.perTonne !== null)
        .sort((a, b) => (a.perTonne ?? 0) - (b.perTonne ?? 0))[0];
      return [
        material(r.material).name,
        formatAmount(r.material, r.need),
        r.made > 1e-9 ? formatAmount(r.material, r.made) : { text: 'Not made', warn: r.stock <= 0 },
        formatAmount(r.material, r.stock),
        best ? best.fromName : r.options.length ? 'No route' : { text: 'Nowhere', warn: true },
        best?.perTonne != null ? `${Math.round(best.perTonne).toLocaleString('en-US')} kg` : '-',
        best?.days != null && best.days > 0 ? dayText(best.days * 86400) : '-'
      ];
    })
  );

  const runRows = $derived<Cell[][]>(
    runsList().map((v) => [
      v.name,
      material(v.run!.item).name,
      `${whereabouts({ kind: 'site', site: v.run!.from })} to ${whereabouts({ kind: 'site', site: v.run!.to })}`,
      formatMass(v.run!.amount),
      v.blocked ? { text: v.blocked, warn: true } : v.trip ? 'On a trip' : 'Handling cargo'
    ])
  );

  function start() {
    if (!row || !source || !ship) return;
    const run = { item: row.material, amount: Math.round(load), from: source.from, to: site.id };
    const refusal = startRun(game, ship, run);
    message = refusal ?? '';
    if (!refusal) advanceShips(game, 0);
    touch();
  }

  const stop = (v: Vessel) => {
    clearOrders(v);
    touch();
  };
</script>

<h3>Make or import <small>{site.name}</small></h3>
{#if !off}
  <p class="none" id="supplyEarth">
    Earth makes what it needs. Pick a site off Earth in the list to see what it would cost to import.
  </p>
{:else if rows.length}
  <div id="supplyTable">
    <Table
      head={[
        'Material',
        '>Needed a day',
        '>Made a day',
        '>In stock',
        'Best source',
        '>Propellant a tonne',
        '>Trip'
      ]}
      rows={tableRows}
      selected={rows.findIndex((r) => r === row)}
      keys={rows.map((r) => r.material)}
      onpick={(i) => {
        materialId = rows[i]?.material ?? '';
        sourceId = '';
      }}
    />
  </div>
  <Bar>
    <label class="pick"
      >Source
      <select
        id="supplySource"
        value={source?.from ?? ''}
        onchange={(e) => (sourceId = e.currentTarget.value)}
      >
        {#each row?.options ?? [] as o (o.from)}<option value={o.from}>{o.fromName}</option>{/each}
      </select></label
    >
    <label class="pick"
      >Ship
      <select id="supplyShip" value={ship?.id ?? ''} onchange={(e) => (shipId = e.currentTarget.value)}>
        {#each freighters as v (v.id)}<option value={v.id}>{v.name}</option>{/each}
      </select></label
    >
    <Field label="Kilograms a trip" bind:value={amount} min={0} max={1e9} width={9} name="supplyAmount" />
    <button id="supplyStart" disabled={!row || !source || !ship} onclick={start}>Start supply run</button>
  </Bar>
  {#if source}<p class="none" id="supplyNote">
      {source.designName ? `${source.designName}: ` : ''}{source.note}.
    </p>{/if}
  {#if message}<p class="warn" id="supplyMessage">{message}</p>{/if}
{:else}
  <p class="none" id="supplyNone">{site.name} needs nothing yet that a ship could bring.</p>
{/if}
<h3>Supply runs <small>{runRows.length}</small></h3>
{#if runRows.length}
  <div id="supplyRuns">
    <Table head={['Ship', 'Material', 'Route', '>Per trip', 'Status']} rows={runRows} />
  </div>
  <Bar>
    {#each runsList() as v (v.id)}<button data-stop={v.id} onclick={() => stop(v)}>Stop {v.name}</button
      >{/each}
  </Bar>
{:else}
  <p class="none" id="noRuns">No supply runs.</p>
{/if}

<style>
  .none {
    margin: 4px 0;
    color: var(--dim);
  }
  .warn {
    margin: 4px 0;
    color: var(--hot);
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
