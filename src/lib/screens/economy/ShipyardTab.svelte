<script lang="ts">
  import {
    flowsOf,
    hasYard,
    moveShipOrder,
    pauseShipOrder,
    removeShipOrder,
    touch,
    type Site,
    type YardOrder
  } from '#lib/game/economy/index.ts';
  import { shipClasses, statsFor } from '#lib/game/index.ts';
  import { yardName } from '#lib/game/shipdesign/index.ts';
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
    warn
  } from '#lib/ui/index.ts';
  import Field from './Field.svelte';
  import TabBody from './TabBody.svelte';
  import { ui } from './state.svelte.ts';
  import { designIcon, kms } from './shipTiles.ts';
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
  const hasAnyYard = $derived(
    site.groups.some((g) => g.building === 'rocket_factory' || g.building === 'orbital_shipyard')
  );

  const designOfOrder = (o: YardOrder) => shipClasses().find((d) => d.id === o.design);
  const actorOf = (id: number) => flows.actors.find((x) => x.kind === 'yard' && x.order.id === id);

  type Status = { text: string; mark: 'hammer' | 'pause' | 'clock' | 'warn'; hot: boolean };
  function status(o: YardOrder): Status {
    if (o.paused) return { text: 'Paused', mark: 'pause', hot: false };
    const a = actorOf(o.id);
    if (!a)
      return hasYard(site, o.yard)
        ? { text: 'Waiting for a yard', mark: 'clock', hot: false }
        : { text: 'No yard', mark: 'warn', hot: true };
    if (a.share < 1 - 1e-9) return { text: limitText(a.limit), mark: 'warn', hot: true };
    return { text: 'Building', mark: 'hammer', hot: false };
  }

  function left(o: YardOrder): string {
    const a = actorOf(o.id);
    if (!a || a.kind !== 'yard' || a.share <= 1e-9) return '';
    return `${fmt.days(((1 - a.order.done) * a.hours) / a.share / 24)} left`;
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

  function act(f: (s: Site, id: number) => void) {
    if (!sel) return;
    f(site, sel.id);
    touch();
  }

  const role = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
</script>

{#snippet main()}
  <h3>
    <Icon name="yard" class="sm" />Ship queue <small class="dim">{yards} yards standing</small>
  </h3>
  {#if site.yard.length}
    <div id="yardQueue">
      <TileGrid min={120} gap={5}>
        {#each site.yard as o, i (o.id)}
          {@const st = status(o)}
          <Tile
            variant="q"
            icons={[designIcon(designOfOrder(o))]}
            name={o.name}
            corner={String(i + 1)}
            mark={st.mark}
            markTone={st.hot ? 'hot' : 'accent'}
            meter={o.done}
            meterTone={st.hot ? 'hot' : 'accent'}
            note={left(o) || st.text}
            warn={st.hot}
            selected={ui.yardOrder === o.id}
            tip={tipText(
              o.name,
              yardName(o.yard as 'rocket_factory'),
              st.hot ? warn(st.text) : st.text,
              `${fmt.pct(o.done)} done`,
              left(o)
            )}
            onselect={() => (ui.yardOrder = o.id)}
          />
        {/each}
      </TileGrid>
    </div>
  {:else}
    <p class="dim" id="yardEmpty">
      {#if hasAnyYard}
        No ships are being built. Pick a locked design below and add it.
      {:else}
        This site has no yard.
      {/if}
    </p>
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
            icons={[designIcon(d)]}
            name={d.name}
            corner={role(d.role)}
            minis={costs.slice(0, 3).map(([m]) => ({ kind: 'material' as const, id: m }))}
            minisMore={Math.max(0, costs.length - 3)}
            selected={design?.id === d.id}
            tip={tipText(
              d.name,
              `${role(d.role)}, built at the ${yardName(d.yard).toLowerCase()}`,
              dim(`Dry mass ${fmt.mass(s.dryMass)}`),
              s.main ? `Delta-v ${kms(s.main.deltaV)} at design load` : warn('No drive')
            )}
            onselect={() => (choice = d.id)}
          />
        {/each}
      </TileGrid>
    </div>
  {:else}
    <p class="dim" id="yardNone">No locked design. Lock one on the Ship classes screen.</p>
  {/if}
{/snippet}

{#snippet side()}
  {#if sel}
    {@const st = status(sel)}
    <Card
      title={sel.name}
      subtitle="order {selIndex + 1}, {st.text.toLowerCase()}"
      icon={designIcon(designOfOrder(sel))}
      chips={[
        { icon: 'yard', text: yardName(sel.yard as 'rocket_factory') },
        { icon: 'clock', text: left(sel) || '-', tip: 'Time left' }
      ]}
    >
      <Bar value={sel.done} thick full tone={st.hot ? 'hot' : 'accent'} />
      <div class="btns">
        <button id="yardUp" disabled={selIndex <= 0} onclick={() => act((s, id) => moveShipOrder(s, id, -1))}
          ><Icon name="up" />Up</button
        >
        <button
          id="yardDown"
          disabled={selIndex >= site.yard.length - 1}
          onclick={() => act((s, id) => moveShipOrder(s, id, 1))}><Icon name="down" />Down</button
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
      icon={designIcon(design)}
      chips={[
        { icon: 'box', text: fmt.mass(stats.dryMass), tip: 'Dry mass' },
        ...(stats.main
          ? [{ icon: 'rocket' as const, text: kms(stats.main.deltaV), tip: 'Delta-v at design load' }]
          : []),
        {
          icon: 'yard',
          text: `${yards} standing`,
          tone: yards ? ('cool' as const) : ('hot' as const),
          tip: 'Yards at this site'
        }
      ]}
    >
      <CardSection label="Cost for one, have / need">
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
