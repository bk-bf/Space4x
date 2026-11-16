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
  import {
    Card,
    CardSection,
    Icon,
    Pill,
    Tile,
    TileGrid,
    dim,
    fmt,
    materialName,
    materialTip,
    tipText,
    warn
  } from '#lib/ui/index.ts';
  import Field from './Field.svelte';
  import { PERIODS } from '#lib/ui/format.ts';
  import ShipTile from './ShipTile.svelte';
  import TabBody from './TabBody.svelte';
  import { whereabouts } from './shipsView.ts';
  import { ui } from './state.svelte.ts';
  import { daysText } from './shipTiles.ts';

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
  const runs = $derived(runsList());

  const best = (r: SupplyRow) =>
    r.options.filter((o) => o.perTonne !== null).sort((a, b) => (a.perTonne ?? 0) - (b.perTonne ?? 0))[0];

  const span = $derived(PERIODS[ui.period]);
  const perPeriod = (perDay: number) => (perDay * span.hours) / 24;
  const balance = (r: SupplyRow) => perPeriod(r.made - r.need);

  function rowTip(r: SupplyRow): string {
    const b = best(r);
    return materialTip(
      r.material,
      `Needed ${fmt.amount(perPeriod(r.need), material(r.material).unit)} ${span.word}`,
      r.made > 1e-9
        ? `Made here ${fmt.amount(perPeriod(r.made), material(r.material).unit)} ${span.word}`
        : warn('Not made here'),
      `In stock ${fmt.amount(r.stock, material(r.material).unit)}`,
      b
        ? `Best source ${b.fromName}${b.perTonne != null ? `, ${Math.round(b.perTonne).toLocaleString('en-US')} kg of propellant a tonne` : ''}${b.days != null && b.days > 0 ? `, ${daysText(b.days * 86400)}` : ''}`
        : r.options.length
          ? dim('No route')
          : warn('Nowhere to import from')
    );
  }

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

{#snippet main()}
  <h3><Icon name="box" class="sm" />Make or import <small class="dim">{site.name}</small></h3>
  {#if !off}
    <p class="dim" id="supplyEarth">
      Earth makes what it needs. Pick a site off Earth in the list to see what it would cost to import.
    </p>
  {:else if rows.length}
    <div id="supplyTable">
      <TileGrid min={116} gap={5}>
        {#each rows as r (r.material)}
          {@const b = best(r)}
          {@const short = r.made + 1e-9 < r.need}
          {@const unit = material(r.material).unit}
          <Tile
            variant="stk"
            icons={[{ kind: 'material', id: r.material }]}
            name={materialName(r.material)}
            value={fmt.amount(r.stock, unit)}
            note={`${fmt.signedAmount(balance(r), unit)}/${span.unit}`}
            noteTone={short ? 'hot' : 'cool'}
            trend={short ? 'down' : 'up'}
            meter={r.need > 0 ? Math.min(1, r.made / r.need) : 1}
            meterTone={short ? 'hot' : 'cool'}
            warn={short && r.stock <= 0 && !b}
            selected={row?.material === r.material}
            tip={rowTip(r)}
            onselect={() => {
              materialId = r.material;
              sourceId = '';
            }}
          />
        {/each}
      </TileGrid>
    </div>
  {:else}
    <p class="dim" id="supplyNone">{site.name} needs nothing yet that a ship could bring.</p>
  {/if}
  <h3><Icon name="rocket" class="sm" />Supply runs <small class="dim">{runs.length}</small></h3>
  {#if runs.length}
    <div id="supplyRuns">
      <TileGrid min={120} gap={5}>
        {#each runs as v (v.id)}
          {@const run = v.run!}
          <Tile
            variant="q"
            icons={[{ kind: 'material', id: run.item }]}
            name={v.name}
            sub={materialName(run.item)}
            value={fmt.mass(run.amount)}
            note={v.blocked ? v.blocked.slice(0, 18) : v.trip ? 'On a trip' : 'Handling cargo'}
            noteTone={v.blocked ? 'hot' : 'dim'}
            warn={!!v.blocked}
            tip={tipText(
              v.name,
              `${materialName(run.item)}, ${fmt.mass(run.amount)} a trip`,
              `${whereabouts({ kind: 'site', site: run.from })} to ${whereabouts({ kind: 'site', site: run.to })}`,
              v.blocked ? warn(v.blocked) : v.trip ? 'On a trip' : 'Handling cargo'
            )}
          >
            <button class="stop" data-stop={v.id} onclick={() => stop(v)}
              ><Icon name="cross" class="xs" />Stop</button
            >
          </Tile>
        {/each}
      </TileGrid>
    </div>
  {:else}
    <p class="dim" id="noRuns">No supply runs.</p>
  {/if}
{/snippet}

{#snippet side()}
  {#if off && row}
    <Card
      title={materialName(row.material)}
      subtitle="for {site.name}"
      icon={{ kind: 'material', id: row.material }}
      chips={[
        {
          icon: 'down',
          text: fmt.amount(perPeriod(row.need), material(row.material).unit),
          tip: `Needed ${span.word}`
        },
        {
          icon: 'up',
          text: fmt.amount(perPeriod(row.made), material(row.material).unit),
          tone: row.made + 1e-9 < row.need ? 'hot' : 'cool',
          tip: `Made here ${span.word}`
        },
        { icon: 'box', text: fmt.amount(row.stock, material(row.material).unit), tip: 'In stock' }
      ]}
    >
      <CardSection label="Source">
        <label class="pick">
          <select
            id="supplySource"
            value={source?.from ?? ''}
            onchange={(e) => (sourceId = e.currentTarget.value)}
          >
            {#each row.options as o (o.from)}<option value={o.from}>{o.fromName}</option>{/each}
          </select>
        </label>
        {#if source}
          <div class="row">
            <Pill
              icon="flame"
              text={source.perTonne != null
                ? `${Math.round(source.perTonne).toLocaleString('en-US')} kg/t`
                : '-'}
              tip="Propellant a tonne"
            />
            <Pill
              icon="clock"
              text={source.days != null && source.days > 0 ? daysText(source.days * 86400) : '-'}
              tip="Trip"
            />
            <Pill
              icon="box"
              text={fmt.amount(source.stock, material(row.material).unit)}
              tip="In stock there"
            />
          </div>
          <p class="dim" id="supplyNote">
            {source.designName ? `${source.designName}: ` : ''}{source.note}.
          </p>
        {/if}
      </CardSection>
      <CardSection label="Ship">
        {#if freighters.length}
          <div id="supplyShip">
            <TileGrid min={120} gap={4}>
              {#each freighters as v (v.id)}
                <ShipTile vessel={v} selected={ship?.id === v.id} onselect={() => (shipId = v.id)} />
              {/each}
            </TileGrid>
          </div>
        {:else}
          <p class="dim">No idle freighter.</p>
        {/if}
      </CardSection>
      <div class="row">
        <Field label="Kilograms a trip" bind:value={amount} min={0} max={1e9} width={9} name="supplyAmount" />
        <button id="supplyStart" disabled={!row || !source || !ship} onclick={start}
          ><Icon name="rocket" />Start supply run</button
        >
      </div>
      {#if ship}<span class="dim">Takes {fmt.mass(load)} a trip in {ship.name}</span>{/if}
      {#if message}<p class="hot" id="supplyMessage">{message}</p>{/if}
    </Card>
  {:else}
    <Card title="Supply" subtitle="select a material tile">
      <p class="dim">Pick what the site needs to see where it could come from.</p>
    </Card>
  {/if}
{/snippet}

<TabBody {main} {side} />

<style>
  .dim {
    color: var(--dim);
    margin: 4px 0;
  }
  .hot {
    color: var(--hot);
    margin: 0;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }
  .row button {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .pick select {
    color: var(--text);
    max-width: 100%;
  }
  .stop {
    display: flex;
    align-items: center;
    gap: 3px;
    margin: 0;
    padding: 0 6px;
    font-size: 15px;
    line-height: 16px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
