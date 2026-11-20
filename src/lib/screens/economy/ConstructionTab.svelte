<script lang="ts">
  import { building } from '#lib/game/data/index.ts';
  import {
    activeOrders,
    BUILD_SLOTS,
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
    waitingOn,
    unlockedProcesses,
    workersAt,
    type BuildOrder,
    type Site
  } from '#lib/game/economy/index.ts';
  import { BUILDING_KIND_NAMES } from '#lib/gfx/icons/index.ts';
  import {
    Bar,
    Card,
    CardSection,
    FilterChips,
    Icon,
    IconList,
    Tile,
    TileGrid,
    buildingTip,
    dim,
    fmt,
    materialName,
    materialTip,
    tipText,
    warn,
    type FilterItem,
    type IconItem
  } from '#lib/ui/index.ts';
  import Field from './Field.svelte';
  import TabBody from './TabBody.svelte';
  import { KIND_ORDER, kindIcon } from './model.ts';
  import { bld, mat } from './refs.ts';
  import { ui } from './state.svelte.ts';
  import { stockAmount } from './tips.ts';
  import { limitText } from './view.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const active = $derived(new Set(activeOrders(site).map((o) => o.id)));
  const open = $derived(buildable(economy, site));
  const locked = $derived(lockedBuildings(economy, site));
  const catalogue = $derived(
    [...open, ...locked].sort(
      (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.milestone - b.milestone
    )
  );
  const kinds = $derived(KIND_ORDER.filter((k) => catalogue.some((b) => b.kind === k)));
  const shown = $derived(catalogue.filter((b) => ui.buildKind === 'all' || b.kind === ui.buildKind));
  const chips = $derived<FilterItem[]>([
    { id: 'all', label: 'All', count: catalogue.length },
    ...kinds.map((k) => ({
      id: k,
      icon: kindIcon(k),
      count: catalogue.filter((b) => b.kind === k).length,
      tip: BUILDING_KIND_NAMES[k] ?? k
    }))
  ]);
  const picked = $derived(catalogue.find((b) => b.id === ui.pick) ?? open[0]);
  const isOpen = $derived(!!picked && open.some((b) => b.id === picked.id));
  const recipes = $derived(picked && isOpen ? unlockedProcesses(economy, site, picked.id) : []);
  const recipe = $derived(recipes.find((r) => r.id === ui.recipe)?.id ?? recipes[0]?.id ?? '');
  const selOrder = $derived(site.queue.find((o) => o.id === ui.order));
  const selIndex = $derived(selOrder ? site.queue.indexOf(selOrder) : -1);
  const showOrder = $derived(ui.side === 'order' && !!selOrder);

  const orderActor = (o: BuildOrder) => flows.actors.find((x) => x.kind === 'build' && x.order.id === o.id);
  const leftDays = (o: BuildOrder): string | undefined => {
    const a = orderActor(o);
    if (!a || a.kind !== 'build' || a.share <= 1e-9) return undefined;
    return fmt.days(((1 - o.done) * a.hours) / a.share / 24);
  };
  const slowOf = (o: BuildOrder): string => {
    const a = orderActor(o);
    return a && a.share < 1 - 1e-9 && active.has(o.id) ? limitText(a.limit) : '';
  };
  const noteOf = (o: BuildOrder): string =>
    o.paused ? 'paused' : !active.has(o.id) ? 'waiting' : slowOf(o) || `${leftDays(o) ?? 'never'} left`;

  function costItems(cost: Record<string, number>, quantity: number): IconItem[] {
    return Object.entries(cost)
      .sort((a, b) => b[1] - a[1])
      .map(([m, v]) => {
        const have = site.stock[m] ?? 0;
        const need = v * quantity;
        return {
          icon: mat(m),
          amount: stockAmount(m, have),
          need: stockAmount(m, need),
          ok: have >= need,
          tip: materialTip(m, `Need ${stockAmount(m, need)}, have ${stockAmount(m, have)}`)
        };
      });
  }

  function addToQueue() {
    if (!picked || !isOpen) return;
    const made = queueBuilding(economy, site, picked.id, recipe || null, ui.quantity);
    const last = made[made.length - 1];
    if (last) {
      ui.order = last.id;
      ui.side = 'order';
    }
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
    ui.side = 'pick';
  }

  const pickBuilding = (id: string) => {
    ui.pick = id;
    ui.side = 'pick';
    ui.recipe = '';
  };
  const pickOrder = (id: number) => {
    ui.order = id;
    ui.side = 'order';
  };
</script>

<TabBody>
  {#snippet main()}
    <h3>
      <Icon name="hammer" class="sm" />Construction queue
      <small class="dim" id="queueCrews">{active.size} of {BUILD_SLOTS} crews busy</small>
    </h3>
    <div id="queue">
      {#if site.queue.length}
        <TileGrid min={120} gap={5}>
          {#each site.queue as o, i (o.id)}
            {@const slow = slowOf(o)}
            <Tile
              variant="q"
              icons={[bld(o.building)]}
              name={building(o.building).name}
              corner={String(i + 1)}
              mark={o.paused ? 'pause' : active.has(o.id) ? 'hammer' : 'clock'}
              markTone={active.has(o.id) && !o.paused ? 'accent' : 'dim'}
              meter={o.done}
              meterTone={active.has(o.id) ? 'accent' : 'cool'}
              note={noteOf(o)}
              noteTone={slow ? 'hot' : 'dim'}
              warn={!!slow}
              idle={o.paused}
              selected={showOrder && o.id === ui.order}
              tip={buildingTip(
                o.building,
                o.paused ? dim('Paused') : active.has(o.id) ? 'Building' : dim('Waiting for a crew'),
                `${fmt.pct(o.done)} done`,
                o.process ? process(o.process, site.body).name : false,
                slow && warn(slow)
              )}
              onselect={() => pickOrder(o.id)}
            />
          {/each}
        </TileGrid>
      {/if}
    </div>

    <h3>
      <Icon name="factory" class="sm" />Buildings
      <small class="dim">{open.length} open, {locked.length} locked</small>
    </h3>
    <FilterChips items={chips} bind:value={ui.buildKind} />
    <div id="items">
      <TileGrid min={104} gap={6}>
        {#each shown as b (b.id)}
          {@const isOpenB = open.some((x) => x.id === b.id)}
          {@const standingN = standing(site, b.id)}
          {@const costs = Object.entries(b.cost).sort((x, y) => y[1] - x[1])}
          <Tile
            variant="bld"
            icons={[bld(b.id)]}
            name={b.name}
            kind={b.kind}
            corner={standingN ? `×${fmt.count(standingN)}` : undefined}
            mark={isOpenB ? undefined : 'lock'}
            minis={costs.slice(0, 3).map(([m]) => mat(m))}
            minisMore={Math.max(0, costs.length - 3)}
            dimmed={!isOpenB}
            selected={ui.side === 'pick' && picked?.id === b.id}
            tip={buildingTip(
              b.id,
              isOpenB ? 'Open' : warn(`Needs ${waitingOn(economy, b.milestone).join(' and ')}`),
              standingN ? `${fmt.count(standingN)} standing` : dim('None standing'),
              `Build time ${fmt.days(buildHours(b.id) / 24)}`
            )}
            onselect={() => pickBuilding(b.id)}
          />
        {/each}
      </TileGrid>
    </div>
  {/snippet}
  {#snippet side()}
    {#if showOrder && selOrder}
      {@const b = building(selOrder.building)}
      <Card
        title={b.name}
        subtitle="order {selIndex + 1}, {selOrder.paused
          ? 'paused'
          : active.has(selOrder.id)
            ? 'building'
            : 'waiting for a crew'}"
        icon={bld(b.id)}
      >
        <CardSection label="Progress">
          <div class="row">
            <Bar value={selOrder.done} thick full />
            <span class="share">{fmt.pct(selOrder.done)}</span>
          </div>
          {#if active.has(selOrder.id)}
            <div class="dim">{leftDays(selOrder) ?? 'never'} left</div>
          {/if}
          {#if slowOf(selOrder)}<div class="hot" id="orderLimit">
              <Icon name="warn" class="xs" />
              {slowOf(selOrder)}
            </div>{/if}
        </CardSection>
        <CardSection label="Build cost">
          <IconList variant="have" items={costItems(b.cost, 1)} />
        </CardSection>
        <div class="btns">
          <button id="orderUp" disabled={selIndex <= 0} onclick={() => act((s, id) => moveOrder(s, id, -1))}
            ><Icon name="up" />Up</button
          >
          <button
            id="orderDown"
            disabled={selIndex < 0 || selIndex >= site.queue.length - 1}
            onclick={() => act((s, id) => moveOrder(s, id, 1))}><Icon name="down" />Down</button
          >
          <button id="orderPause" onclick={() => act(pauseOrder)}
            ><Icon name={selOrder.paused ? 'play' : 'pause'} />{selOrder.paused ? 'Resume' : 'Pause'}</button
          >
          <button id="orderRemove" onclick={remove}><Icon name="trash" />Remove</button>
        </div>
      </Card>
    {:else if picked}
      <Card
        title={picked.name}
        subtitle={BUILDING_KIND_NAMES[picked.kind] ?? picked.kind}
        icon={bld(picked.id)}
        chips={[
          { icon: 'people', text: workersAt(picked, site.body), tip: 'Workers' },
          { icon: 'clock', text: fmt.days(buildHours(picked.id) / 24), tip: 'Build time' },
          { icon: 'factory', text: fmt.count(standing(site, picked.id)), tip: 'Standing' },
          ...(picked.start
            ? [
                {
                  icon: 'check' as const,
                  text: 'start',
                  tone: 'cool' as const,
                  tip: 'Exists on Earth at the start'
                }
              ]
            : [])
        ]}
      >
        <CardSection label="Build cost">
          <IconList variant="have" items={costItems(picked.cost, ui.quantity)} />
        </CardSection>
        {#if isOpen}
          {#if recipes.length}
            <CardSection label="Recipe">
              <div class="recipes" id="buildRecipes">
                {#each recipes.slice(0, 30) as r (r.id)}
                  {@const o = Object.keys(r.outputs).filter((m) => m !== '@power')[0]}
                  <Tile
                    icons={o ? [mat(o)] : [bld(picked.id)]}
                    iconSize={32}
                    selected={recipe === r.id}
                    label={r.name}
                    tip={tipText(
                      r.name,
                      Object.keys(r.outputs)
                        .filter((m) => m !== '@power')
                        .map((m) => `→ ${materialName(m)}`)
                    )}
                    onselect={() => (ui.recipe = r.id)}
                  />
                {/each}
              </div>
            </CardSection>
          {/if}
          <div class="row">
            <Field label="Quantity" bind:value={ui.quantity} width={6} name="quantity" />
            <button id="orderAdd" onclick={addToQueue}><Icon name="plus" />Add to queue</button>
          </div>
        {:else}
          <div class="hot" id="lockedNote">
            <Icon name="lock" class="sm" /> Needs {waitingOn(economy, picked.milestone).join(' and ')}
          </div>
        {/if}
      </Card>
    {/if}
  {/snippet}
</TabBody>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .row :global(.ui-bar) {
    flex: 1;
  }
  .share {
    min-width: 34px;
    text-align: right;
  }
  .btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .recipes {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .hot {
    color: var(--hot);
  }
  .dim {
    color: var(--dim);
  }
  #queue {
    margin-bottom: 6px;
  }
</style>
