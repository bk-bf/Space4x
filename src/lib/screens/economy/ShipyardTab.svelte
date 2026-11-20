<script lang="ts">
  import {
    activeYardOrders,
    costShortage,
    economy,
    flowsOf,
    freeShipyards,
    hasYard,
    moveShipOrder,
    pauseShipOrder,
    removeShipOrder,
    setShipPercent,
    shipyardsFor,
    standing,
    touch,
    yardPointsPerDay,
    type Economy,
    type Site,
    type YardOrder
  } from '#lib/game/economy/index.ts';
  import { formatDay } from '#lib/game/clock.ts';
  import { game, shipClasses, statsFor } from '#lib/game/index.ts';
  import { YARDS, builtMass, yardName, type Yard } from '#lib/game/shipdesign/index.ts';
  import { orderShips } from '#lib/game/ships/index.ts';
  import {
    Bar,
    Card,
    CardSection,
    Icon,
    IconList,
    Tile,
    TileGrid,
    dim,
    fmt,
    materialTip,
    tipText,
    tooltip,
    warn
  } from '#lib/ui/index.ts';
  import Field from './Field.svelte';
  import TabBody from './TabBody.svelte';
  import { ui } from './state.svelte.ts';
  import ShipArt from './ShipArt.svelte';
  import { kms } from './shipTiles.ts';
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
  const yards = $derived(design ? standing(site, design.yard) : 0);
  const need = $derived(stats ? shipyardsFor(builtMass(stats)) : 0);
  const pools = $derived(
    YARDS.filter((y) => hasYard(site, y) || site.yard.some((o) => o.yard === y)).map((y) => pool(y))
  );

  function pool(yard: Yard) {
    const made = yardPointsPerDay(site, yard);
    const holding = new Set(activeYardOrders(site).map((o) => o.id));
    const orders = site.yard.filter((o) => o.yard === yard);
    const used = orders.filter((o) => holding.has(o.id)).reduce((a, o) => a + o.percent, 0);
    const allocated = orders.reduce((a, o) => a + o.percent, 0);
    return {
      yard,
      made,
      stand: standing(site, yard),
      free: freeShipyards(site, yard),
      unused: (made * (100 - used)) / 100,
      orders,
      rest: Math.max(0, 100 - allocated)
    };
  }

  const designOfOrder = (o: YardOrder) => shipClasses().find((d) => d.id === o.design);
  const actorOf = (id: number) => flows.actors.find((x) => x.kind === 'yard' && x.order.id === id);
  const yardPlural = (yard: string) => `${yardName(yard as Yard).toLowerCase()}s`;

  type Status = { text: string; mark: 'hammer' | 'pause' | 'clock' | 'warn'; hot: boolean };
  function status(o: YardOrder): Status {
    if (o.paused) return { text: 'Paused', mark: 'pause', hot: false };
    if (!hasYard(site, o.yard)) return { text: `No ${yardPlural(o.yard)}`, mark: 'warn', hot: true };
    if (o.percent <= 0) return { text: 'No shipyard points', mark: 'warn', hot: true };
    const short = o.paid || o.shipyards > freeShipyards(site, o.yard) ? null : costShortage(site, o.cost);
    if (short) return { text: limitText({ kind: 'material', id: short }), mark: 'warn', hot: true };
    if (!actorOf(o.id)) return { text: `Waiting for ${yardPlural(o.yard)}`, mark: 'clock', hot: false };
    return { text: 'Building', mark: 'hammer', hot: false };
  }

  function completes(o: YardOrder): string {
    const a = actorOf(o.id);
    if (!a || a.kind !== 'yard' || a.share <= 1e-9) return '';
    const at = game.time + (((1 - a.order.done) * a.hours) / a.share) * 3600 * 1000;
    return `${formatDay(at)} ${new Date(at).getUTCFullYear()}`;
  }

  const covers = $derived(
    stats ? Object.keys(stats.cost).every((m) => (site.stock[m] ?? 0) >= (stats.cost[m] ?? 0)) : false
  );
  const costItems = $derived(
    stats
      ? Object.entries(stats.cost)
          .sort((a, b) => b[1] - a[1])
          .map(([m, need]) => {
            const have = site.stock[m] ?? 0;
            return {
              icon: { kind: 'material' as const, id: m },
              amount: fmt.amount(have),
              need: fmt.amount(need),
              ok: have >= need,
              tip: materialTip(m, `Need ${fmt.amount(need)}, have ${fmt.amount(have)}`)
            };
          })
      : []
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

  function act(f: (eco: Economy, s: Site, id: number) => void) {
    if (!sel) return;
    f(economy, site, sel.id);
    touch();
  }

  let percentEdits = $state(0);

  function setPercent(value: number) {
    if (!sel) return;
    setShipPercent(economy, site, sel.id, value);
    percentEdits++;
    touch();
  }

  const selCost = $derived(
    sel && !sel.paid
      ? Object.entries(sel.cost)
          .sort((a, b) => b[1] - a[1])
          .map(([m, n]) => {
            const have = site.stock[m] ?? 0;
            return {
              icon: { kind: 'material' as const, id: m },
              amount: fmt.amount(have),
              need: fmt.amount(n),
              ok: have >= n,
              tip: materialTip(m, `Need ${fmt.amount(n)}, have ${fmt.amount(have)}`)
            };
          })
      : []
  );

  const role = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
</script>

{#snippet main()}
  <h3><Icon name="yard" class="sm" />Ship queue</h3>
  {#each pools as p (p.yard)}
    <div class="pool" data-yard={p.yard}>
      <div class="ph">
        <Icon name="hammer" class="xs" /><span>{yardName(p.yard)}</span>
        <span class="v"
          >{fmt.num(p.made)} SP a day · {p.free} of {p.stand} free · {fmt.num(p.unused)} SP unused</span
        >
      </div>
      <div class="sbar">
        {#each p.orders as o, i (o.id)}
          {#if o.percent > 0}
            <i class="q{i % 2}" style:width="{o.percent}%" use:tooltip={tipText(o.name, `${o.percent}%`)}></i>
          {/if}
        {/each}
        {#if p.rest > 0}
          <i class="free" style:width="{p.rest}%" use:tooltip={tipText('Unallocated', `${p.rest}%`)}></i>
        {/if}
      </div>
    </div>
  {/each}
  {#if site.yard.length}
    <div id="yardQueue">
      <TileGrid min={120} gap={5}>
        {#each site.yard as o, i (o.id)}
          {@const st = status(o)}
          <Tile
            variant="q"
            name={o.name}
            corner={String(i + 1)}
            cornerRight="{o.percent}%"
            mark={st.mark}
            markTone={st.hot ? 'hot' : 'accent'}
            meter={o.done}
            meterTone={st.hot ? 'hot' : 'accent'}
            note={completes(o) || st.text}
            warn={st.hot}
            selected={ui.yardOrder === o.id}
            tip={tipText(
              o.name,
              yardName(o.yard as Yard),
              st.hot ? warn(st.text) : st.text,
              `${o.shipyards} of ${standing(site, o.yard)} ${yardPlural(o.yard)}`,
              `${o.percent}% of shipyard points`,
              `${fmt.pct(o.done)} done`,
              completes(o)
            )}
            onselect={() => (ui.yardOrder = o.id)}
          >
            {#snippet art()}<ShipArt design={designOfOrder(o)} />{/snippet}
          </Tile>
        {/each}
      </TileGrid>
    </div>
  {/if}
  <h3>
    <Icon name="ship" class="sm" />Designs <small class="dim">{designs.length} locked</small>
  </h3>
  {#if designs.length}
    <div id="yardDesigns">
      <TileGrid min={104} gap={6}>
        {#each designs as d (d.id)}
          {@const s = statsFor(d)}
          {@const costs = Object.entries(s.cost).sort((a, b) => b[1] - a[1])}
          <Tile
            variant="bld"
            name={d.name}
            corner={role(d.role)}
            minis={costs.slice(0, 3).map(([m]) => ({ kind: 'material' as const, id: m }))}
            minisMore={Math.max(0, costs.length - 3)}
            selected={design?.id === d.id}
            tip={tipText(
              d.name,
              `${role(d.role)}, built at the ${yardName(d.yard).toLowerCase()}`,
              dim(`Dry mass ${fmt.mass(s.dryMass)}`),
              s.boosters && dim(`${s.boosters.count} boosters, ${fmt.mass(s.boosters.mass)}`),
              `Needs ${shipyardsFor(builtMass(s))} ${yardPlural(d.yard)}`,
              s.main ? `Delta-v ${kms(s.main.deltaV)} at design load` : warn('No drive')
            )}
            onselect={() => (choice = d.id)}
          >
            {#snippet art()}<ShipArt design={d} />{/snippet}
          </Tile>
        {/each}
      </TileGrid>
    </div>
  {/if}
{/snippet}

{#snippet side()}
  {#if sel}
    {@const st = status(sel)}
    <Card
      title={sel.name}
      subtitle="order {selIndex + 1}, {st.text.toLowerCase()}"
      chips={[
        {
          icon: 'yard',
          text: `${sel.shipyards} / ${standing(site, sel.yard)}`,
          tone: sel.shipyards > standing(site, sel.yard) ? ('hot' as const) : undefined,
          tip: `${yardName(sel.yard as Yard)}s needed / standing`
        },
        { icon: 'clock', text: completes(sel) || '-', tip: 'Completion' }
      ]}
    >
      {#snippet art()}<ShipArt design={designOfOrder(sel)} size="card" />{/snippet}
      <Bar value={sel.done} thick full tone={st.hot ? 'hot' : 'accent'} />
      <div class="row">
        {#key `${sel.id}:${percentEdits}`}
          <Field
            label="Percentage"
            value={sel.percent}
            min={0}
            max={100}
            width={5}
            name="yardPercent"
            onchange={setPercent}
          />
        {/key}
        <span class="dim">{fmt.num(sel.points)} SP</span>
      </div>
      {#if selCost.length}
        <CardSection label="Build cost">
          <IconList variant="have" items={selCost} size={16} />
        </CardSection>
      {/if}
      <div class="btns">
        <button
          id="yardUp"
          disabled={selIndex <= 0}
          onclick={() => act((e, s, id) => moveShipOrder(e, s, id, -1))}><Icon name="up" />Up</button
        >
        <button
          id="yardDown"
          disabled={selIndex >= site.yard.length - 1}
          onclick={() => act((e, s, id) => moveShipOrder(e, s, id, 1))}><Icon name="down" />Down</button
        >
        <button id="yardPause" onclick={() => act(pauseShipOrder)}
          ><Icon name={sel.paused ? 'play' : 'pause'} />{sel.paused ? 'Resume' : 'Pause'}</button
        >
        <button id="yardRemove" onclick={() => act(removeShipOrder)}><Icon name="trash" />Remove</button>
      </div>
    </Card>
  {/if}
  {#if design && stats}
    <Card
      title={design.name}
      subtitle={yardName(design.yard)}
      chips={[
        { icon: 'box', text: fmt.mass(stats.dryMass), tip: 'Dry mass' },
        ...(stats.main
          ? [{ icon: 'rocket' as const, text: kms(stats.main.deltaV), tip: 'Delta-v at design load' }]
          : []),
        {
          icon: 'yard',
          text: `${need} / ${yards}`,
          tone: need <= yards ? ('cool' as const) : ('hot' as const),
          tip: `${yardName(design.yard)}s needed / standing`
        }
      ]}
    >
      {#snippet art()}<ShipArt {design} size="card" />{/snippet}
      <CardSection label="Build cost">
        <IconList variant="have" items={costItems} size={16} />
      </CardSection>
      <div class="row">
        <Field label="Quantity" bind:value={quantity} width={5} name="yardQuantity" />
        <button id="yardAdd" onclick={add}><Icon name="plus" />Add to queue</button>
        {#if !covers}<span class="hot">short of material</span>{/if}
      </div>
      {#if refusal}<p class="hot" id="yardRefusal">{refusal}</p>{/if}
    </Card>
  {/if}
{/snippet}

<TabBody {main} {side} />

<style>
  .pool {
    margin: 0 0 6px;
  }
  .ph {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ph .v {
    margin-left: auto;
    color: var(--dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sbar {
    display: flex;
    height: 12px;
    background: var(--bg);
    outline: 1px solid var(--line);
    overflow: hidden;
  }
  .sbar i {
    display: block;
    height: 100%;
    flex: none;
    box-shadow: inset -1px 0 0 var(--bg);
  }
  .sbar .q0 {
    background: var(--accent);
  }
  .sbar .q1 {
    background: var(--cool);
  }
  .sbar .free {
    background: transparent;
  }
  .btns {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .btns button {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .hot {
    color: var(--hot);
    margin: 0;
  }
  .dim {
    color: var(--dim);
    margin: 4px 0;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
