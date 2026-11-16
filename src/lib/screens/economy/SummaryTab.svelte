<script lang="ts">
  import {
    asteroidRecord,
    building,
    materials,
    milestone,
    milestones,
    region as regionRecord
  } from '#lib/game/data/index.ts';
  import {
    activeOrders,
    economy,
    flowsOf,
    foodIds,
    kcalOf,
    programmeDays,
    remainingMass,
    siteDeposits,
    type Site
  } from '#lib/game/economy/index.ts';
  import { BUILDING_KIND_DESCRIPTIONS, BUILDING_KIND_NAMES } from '#lib/gfx/icons/index.ts';
  import {
    Icon,
    Pill,
    Stat,
    Tile,
    TileGrid,
    dim,
    fmt,
    materialName,
    materialTip,
    tipText,
    warn
  } from '#lib/ui/index.ts';
  import { PERIODS } from '#lib/ui/format.ts';
  import CalorieBar from './CalorieBar.svelte';
  import GroupTile from './GroupTile.svelte';
  import StockTile from './StockTile.svelte';
  import TabBody from './TabBody.svelte';
  import { type KindTotal, groupViews, kindIcon, kindTotals, milestoneIcon, stockView } from './model.ts';
  import { bld, mat } from './refs.ts';
  import { ui } from './state.svelte.ts';
  import { limitText } from './view.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const food = $derived(flows.food);
  const period = $derived(PERIODS[ui.period]);
  const views = $derived(groupViews(site, flows));

  const growth = $derived(flows.growthPerHour * 8766);
  const spareFood = $derived(food.demand > 0 ? food.made / food.demand - 1 : 0);
  const spareKw = $derived(flows.power.supply - flows.power.demand);
  const kcalEach = $derived(site.population > 0 ? (food.made * 24) / site.population : 0);
  const computeText = $derived(
    flows.compute.supply > 0 || flows.compute.demand > 0
      ? fmt.rate(flows.compute.supply, ui.period, 'cu')
      : 'None'
  );

  const foods = $derived(foodIds.filter((m) => (site.stock[m] ?? 0) > 0 || (flows.produced[m] ?? 0) > 0));
  const foodParts = $derived(
    Object.entries(food.madeBy)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ id, kcalPerHour: v, share: food.made > 0 ? v / food.made : 0 }))
  );
  const eatenShares = $derived(
    Object.entries(food.eatenBy)
      .filter(([, kcal]) => food.eaten > 0 && kcal / food.eaten >= 0.005)
      .sort((a, b) => b[1] - a[1])
      .map(([id, kcal]) => ({ id, share: kcal / food.eaten }))
  );
  const foodStockKcal = $derived(foodIds.reduce((a, m) => a + (site.stock[m] ?? 0) * kcalOf(m), 0));
  const foodStockKg = $derived(foodIds.reduce((a, m) => a + (site.stock[m] ?? 0), 0));
  const foodDays = $derived(
    food.made >= food.demand ? Infinity : foodStockKcal / Math.max(1e-9, food.demand - food.made) / 24
  );

  const place = $derived(regionRecord(site.region ?? ''));
  const deposits = $derived(siteDeposits(site));
  const rock = $derived(asteroidRecord(site.worldBody));
  const deposited = $derived([
    ...deposits.ground.map((d) => ({ ...d, where: 'Ground' })),
    ...deposits.air.map((d) => ({ ...d, where: 'Atmosphere' }))
  ]);

  const shortIds = $derived(
    materials
      .map((m) => stockView(site, flows, m.id))
      .filter((v) => v.short && !v.empty)
      .slice(0, 14)
      .map((v) => v.id)
  );
  const limited = $derived(views.filter((v) => v.warn));

  const kinds = $derived(kindTotals(views));
  const maxPower = $derived(Math.max(1, ...kinds.map((k) => k.power)));

  const programmes = $derived(economy.running.filter((p) => p.site === site.id));
  const activeBuilds = $derived(activeOrders(site));

  const peopleText = (n: number) => fmt.population(n);
  const pickMaterial = (id: string) => {
    ui.material = id;
    ui.category = 'all';
    ui.tab = 'stockpiles';
  };
  const pickGroup = (id: number) => {
    ui.group = id;
    ui.groupKind = 'all';
    ui.tab = 'production';
  };
  const pickOrder = (id: number) => {
    ui.order = id;
    ui.side = 'order';
    ui.tab = 'construction';
  };
  const orderLeft = (id: number) => {
    const a = flows.actors.find((x) => x.kind === 'build' && x.order.id === id);
    if (!a || a.kind !== 'build' || a.share <= 1e-9) return undefined;
    return fmt.days(((1 - a.order.done) * a.hours) / a.share / 24);
  };
  const kindTip = (k: string, r: KindTotal) =>
    tipText(
      BUILDING_KIND_NAMES[k] ?? k,
      dim(BUILDING_KIND_DESCRIPTIONS[k] ?? ''),
      `${fmt.count(r.count)} buildings in ${r.groups} groups`,
      `${peopleText(r.workers)} workers`,
      `${fmt.power(r.power)} power`
    );
</script>

<TabBody>
  {#snippet main()}
    <div class="stats" id="summaryStats">
      <Stat
        icon="people"
        value={peopleText(site.population)}
        label="{growth >= 0 ? '+' : ''}{(growth * 100).toFixed(2)}% a year"
        tip={tipText(
          'People',
          dim('Everyone at this site. They eat, work and grow in number while fed.'),
          `Workforce ${peopleText(flows.workers.available)}`
        )}
      />
      <Stat
        icon="grain"
        value={fmt.signedPct(spareFood)}
        label="{fmt.group(kcalEach)} kcal each a day"
        warn={spareFood < 0 || food.cover < 1}
        tip={tipText(
          'Food',
          dim('Counted in food calories (kcal).'),
          `Need ${fmt.kcal(food.demand * period.hours)} ${period.word}, ${fmt.group(site.kcalPerPersonDay)} kcal a person a day`,
          `Made ${fmt.kcal(food.made * period.hours)} ${period.word}`,
          `Stored ${fmt.kcal(foodStockKcal)}`
        )}
      />
      <Stat
        icon="bolt"
        value="{spareKw >= 0 ? '+' : '-'}{fmt.power(Math.abs(spareKw))}"
        label="demand {fmt.power(flows.power.demand)}"
        warn={spareKw < 0}
        tip={tipText(
          'Power',
          dim('Grid plus generators, against what every running building draws.'),
          `Grid ${fmt.power(site.gridKw)}`,
          `Generated ${fmt.power(flows.power.supply - site.gridKw)}`,
          `Demand ${fmt.power(flows.power.demand)}`
        )}
      />
      <Stat
        icon="chip"
        value={computeText}
        label="wanted {fmt.rate(flows.compute.demand, ui.period, 'cu')}"
        warn={flows.compute.demand > flows.compute.supply + 1e-9}
        tip={tipText(
          'Compute',
          dim('Cycles for programmes and building. Made by data centres.'),
          `Made ${fmt.rate(flows.compute.supply, ui.period, 'cu')}`,
          `Wanted ${fmt.rate(flows.compute.demand, ui.period, 'cu')}`
        )}
      />
      <Stat
        icon="gear"
        value={fmt.pct(flows.workers.share)}
        label="{peopleText(flows.workers.needed)} needed"
        warn={flows.workers.share < 1}
        tip={tipText(
          'Staffing',
          dim('Workers available against workers every running building needs.'),
          `Workforce ${peopleText(flows.workers.available)}`,
          `Needed ${peopleText(flows.workers.needed)}`
        )}
      />
    </div>

    <h3>
      <Icon name="grain" class="sm" />Food, counted in calories
      <small class="dim"
        >{fmt.group(kcalEach)} kcal a person a day made against {fmt.group(site.kcalPerPersonDay)} needed</small
      >
    </h3>
    <div class="pills">
      <Pill
        icon="people"
        text="{fmt.pct(food.cover)} fed"
        tone={food.cover < 1 ? 'hot' : undefined}
        tip="Share of the calorie need met"
      />
      <Pill
        icon="box"
        text="{fmt.mass(foodStockKg)}, {Number.isFinite(foodDays) ? fmt.days(foodDays) : 'growing'} in store"
        tip="Food in store, and how long it lasts"
      />
    </div>
    <CalorieBar parts={foodParts} need={food.demand} period={ui.period} />
    {#if eatenShares.length}
      <div class="pills" id="calorieShares">
        <span class="dim">Eaten</span>
        {#each eatenShares as e (e.id)}
          <Pill text="{materialName(e.id)} {fmt.pct(e.share)}" tip="Share of the calories people eat" />
        {/each}
      </div>
    {/if}
    <div class="grid">
      <TileGrid min={116} gap={5}>
        {#each foods as id (id)}
          <StockTile {site} {id} onselect={() => pickMaterial(id)} />
        {/each}
      </TileGrid>
    </div>

    {#if place || deposits.air.length}
      <h3 id="siteRegion">
        <Icon name="drop" class="sm" />Region
        <small class="dim">{place?.name ?? 'Atmosphere only'}</small>
      </h3>
      {#if rock}
        <div class="pills">
          <Pill
            icon="flat"
            text="{fmt.pct(remainingMass(economy, site.worldBody) / rock.mass)} of the body left"
            tip="Mass not yet mined"
          />
        </div>
      {/if}
      <div class="grid">
        <TileGrid min={86} gap={5}>
          {#each deposited as d (d.where + d.material)}
            <Tile
              variant="cmp"
              icons={[mat(d.material)]}
              name={materialName(d.material)}
              value={d.grade.toFixed(2)}
              cornerRight={d.where === 'Atmosphere' ? 'air' : undefined}
              tip={materialTip(
                d.material,
                `${d.where}, grade ${d.grade.toFixed(2)}`,
                dim('1 is the nominal yield of one extractor; 2 yields twice that for the same power.')
              )}
            />
          {/each}
        </TileGrid>
      </div>
    {/if}

    <h3>
      <Icon name="warn" class="sm" />What is short
      <small class="dim">{shortIds.length} materials, {limited.length} building groups</small>
    </h3>
    <div class="grid">
      <TileGrid min={116} gap={5}>
        {#each shortIds as id (id)}
          <StockTile {site} {id} onselect={() => pickMaterial(id)} />
        {/each}
      </TileGrid>
      {#if !shortIds.length && !limited.length}<p class="none">Nothing is short.</p>{/if}
    </div>
    {#if limited.length}
      <div class="grid">
        <TileGrid min={104} gap={6}>
          {#each limited as v (v.actor.group.id)}
            <GroupTile view={v} onselect={() => pickGroup(v.actor.group.id)} />
          {/each}
        </TileGrid>
      </div>
    {/if}

    <div class="cols">
      <div>
        <h3>Industry by kind</h3>
        <TileGrid min={104} gap={5}>
          {#each kinds as k (k.kind)}
            <Tile
              variant="prod"
              icons={[kindIcon(k.kind)]}
              name={BUILDING_KIND_NAMES[k.kind] ?? k.kind}
              value={fmt.count(k.count)}
              meter={k.power / maxPower}
              kind={k.kind}
              tip={kindTip(k.kind, k)}
            />
          {/each}
        </TileGrid>
      </div>
      <div>
        <h3>
          Programmes
          <small class="dim">{economy.done.length} of {milestones.length} milestones reached</small>
        </h3>
        {#if programmes.length}
          <TileGrid min={120} gap={5}>
            {#each programmes as p (p.number)}
              {@const m = milestone(p.number)}
              {@const left = (1 - p.progress) * programmeDays(m)}
              <Tile
                variant="q"
                icons={[milestoneIcon(p.number)]}
                name={m.name}
                corner="M{p.number}"
                meter={p.progress}
                meterTone="cool"
                note="{fmt.days(left)} left"
                tip={tipText(
                  m.name,
                  dim(m.unlocks),
                  `Programme ${p.number}`,
                  `${fmt.pct(p.progress)} done`,
                  `${fmt.days(left)} left`
                )}
              />
            {/each}
          </TileGrid>
        {:else}
          <p class="none">No programme is running. Start one from Research.</p>
        {/if}
        <h3>Building now</h3>
        {#if activeBuilds.length}
          <TileGrid min={120} gap={5}>
            {#each activeBuilds as o (o.id)}
              {@const a = flows.actors.find((x) => x.kind === 'build' && x.order.id === o.id)}
              {@const slow = !!a && a.share < 1 - 1e-9}
              <Tile
                variant="q"
                icons={[bld(o.building)]}
                name={building(o.building).name}
                corner={String(site.queue.indexOf(o) + 1)}
                mark="hammer"
                markTone="accent"
                meter={o.done}
                warn={slow}
                note={slow && a ? limitText(a.limit) : `${orderLeft(o.id) ?? 'never'} left`}
                noteTone={slow ? 'hot' : 'dim'}
                tip={tipText(
                  building(o.building).name,
                  'Building',
                  `${fmt.pct(o.done)} done`,
                  slow && a && warn(limitText(a.limit))
                )}
                onselect={() => pickOrder(o.id)}
              />
            {/each}
          </TileGrid>
        {:else}
          <p class="none">Nothing is being built.</p>
        {/if}
      </div>
    </div>
  {/snippet}
</TabBody>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 4px;
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
  }
  .grid {
    margin-bottom: 6px;
  }
  .pills {
    display: flex;
    gap: 6px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  .dim {
    color: var(--dim);
  }
  .none {
    color: var(--dim);
    margin: 0;
  }
  h3 :global(small) {
    font-weight: normal;
  }
</style>
