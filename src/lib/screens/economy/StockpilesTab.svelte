<script lang="ts">
  import { building, material, materials, recipes } from '#lib/game/data/index.ts';
  import { flowsOf, type Site } from '#lib/game/economy/index.ts';
  import { CATEGORY_EXAMPLES, CATEGORY_ORDER, categoryName, type IconRef } from '#lib/gfx/icons/index.ts';
  import {
    Bar,
    Card,
    CardSection,
    FilterChips,
    Icon,
    IconList,
    PixIcon,
    TileGrid,
    fmt,
    materialName,
    type FilterItem
  } from '#lib/ui/index.ts';
  import { PERIODS } from '#lib/ui/format.ts';
  import Facts from './Facts.svelte';
  import StockTile from './StockTile.svelte';
  import TabBody from './TabBody.svelte';
  import { COVER_BAD_DAYS, stockView } from './model.ts';
  import { bld, mat } from './refs.ts';
  import { ui } from './state.svelte.ts';
  import { coverText, stockAmount } from './tips.ts';

  let { site }: { site: Site } = $props();
  const flows = $derived(flowsOf(site));
  const period = $derived(PERIODS[ui.period]);

  const listed = $derived(
    materials.filter((m) => ui.showEmpty || m.id === ui.material || !stockView(site, flows, m.id).empty)
  );
  const categories = $derived(
    CATEGORY_ORDER.map((c) => ({
      id: c,
      ids: listed.filter((m) => m.category === c).map((m) => m.id)
    })).filter((c) => c.ids.length)
  );
  const shown = $derived(ui.category === 'all' ? categories : categories.filter((c) => c.id === ui.category));
  const chips = $derived<FilterItem[]>([
    { id: 'all', label: 'All', count: categories.reduce((a, c) => a + c.ids.length, 0) },
    ...categories.map((c) => ({
      id: c.id,
      icon: mat(CATEGORY_EXAMPLES[c.id] ?? c.ids[0] ?? 'iron'),
      count: c.ids.length,
      tip: categoryName(c.id)
    }))
  ]);

  const picked = $derived(materials.find((m) => m.id === ui.material) ?? materials[0]);
  const view = $derived(picked ? stockView(site, flows, picked.id) : undefined);
  const kcal = $derived(picked?.kcalPerKg ?? 0);
  const here = (buildingId: string) => building(buildingId).where.includes(site.body);
  const madeBy = $derived(
    picked ? recipes.filter((r) => r.outputs[picked.id] && here(r.building)).slice(0, 6) : []
  );
  const usedBy = $derived(
    picked ? recipes.filter((r) => r.inputs[picked.id] && here(r.building)).slice(0, 6) : []
  );
  const takenBy = $derived([
    ...new Set((picked?.sources ?? []).filter((s) => s.body === site.body).map((s) => s.building))
  ]);
  const coverTone = $derived(
    view && Number.isFinite(view.cover) && view.cover < COVER_BAD_DAYS ? ('hot' as const) : undefined
  );
  const HOURS_A_YEAR = 8766;
  const inAYear = $derived(view ? view.stock + view.net * HOURS_A_YEAR : 0);
  const refs = (ids: string[]): { icon: IconRef }[] => ids.slice(0, 4).map((id) => ({ icon: mat(id) }));
</script>

<TabBody>
  {#snippet main()}
    <div class="filters">
      <FilterChips items={chips} bind:value={ui.category} />
      <span class="gap"></span>
      <button
        id="showEmpty"
        type="button"
        class:on={ui.showEmpty}
        aria-pressed={ui.showEmpty}
        onclick={() => (ui.showEmpty = !ui.showEmpty)}><Icon name="filter" class="sm" />Show empty</button
      >
    </div>
    <div id="stockpiles">
      {#each shown as c (c.id)}
        {#if ui.category === 'all'}
          <h3>
            <PixIcon
              kind="material"
              id={CATEGORY_EXAMPLES[c.id] ?? c.ids[0] ?? 'iron'}
              tip={false}
            />{categoryName(c.id)}
            <small class="dim">{c.ids.length}</small>
          </h3>
        {/if}
        <div class="grid">
          <TileGrid min={116} gap={5}>
            {#each c.ids as id (id)}
              <StockTile {site} {id} selected={id === ui.material} onselect={() => (ui.material = id)} />
            {/each}
          </TileGrid>
        </div>
      {/each}
    </div>
  {/snippet}
  {#snippet side()}
    {#if picked && view}
      <Card title={materialName(picked.id)} subtitle={categoryName(picked.category)} icon={mat(picked.id)}>
        <Facts
          rows={[
            ...(view.stockless
              ? []
              : [{ icon: 'box' as const, label: 'In store', value: stockAmount(picked.id, view.stock) }]),
            ...(kcal && !view.stockless
              ? [{ icon: 'box' as const, label: 'Mass in store', value: fmt.mass(view.stock) }]
              : []),
            {
              icon: 'up' as const,
              label: `Made ${period.word}`,
              value: stockAmount(picked.id, view.made * period.hours),
              tone: 'cool' as const
            },
            {
              icon: 'down' as const,
              label: `Used ${period.word}`,
              value: stockAmount(picked.id, view.used * period.hours)
            },
            {
              icon: view.net < 0 ? ('down' as const) : ('up' as const),
              label: `Balance ${period.word}`,
              value: fmt.signedAmount(view.net * period.hours, picked.unit),
              tone: view.net < 0 ? ('hot' as const) : ('cool' as const)
            },
            ...(view.stockless
              ? []
              : [
                  {
                    icon: 'box' as const,
                    label: 'In a year',
                    value: stockAmount(picked.id, Math.max(0, inAYear)),
                    tone: inAYear <= 0 ? ('hot' as const) : undefined
                  }
                ]),
            ...(kcal
              ? [{ icon: 'grain' as const, label: 'Energy', value: `${fmt.group(kcal)} kcal a kg` }]
              : []),
            ...(view.stockless
              ? []
              : [{ icon: 'clock' as const, label: 'Cover', value: coverText(view), tone: coverTone }])
          ]}
        />
        {#if !view.stockless}<Bar
            value={view.coverFraction}
            tone={view.bad ? 'hot' : 'cool'}
            thick
            full
          />{/if}
        {#if takenBy.length}
          <CardSection label="Taken from the ground by">
            <IconList variant="icons" size={16} items={takenBy.map((b) => ({ icon: bld(b) }))} />
          </CardSection>
        {/if}
        {#if madeBy.length}
          <CardSection label="Made by">
            <div class="recipes">
              {#each madeBy as r (r.id)}
                <div class="recipe">
                  <PixIcon kind="building" id={r.building} />
                  <IconList
                    variant="rate"
                    plus={false}
                    size={16}
                    items={refs(Object.keys(r.inputs))}
                    to={refs(Object.keys(r.outputs))}
                  />
                </div>
              {/each}
            </div>
          </CardSection>
        {/if}
        {#if usedBy.length}
          <CardSection label="Used by">
            <div class="recipes">
              {#each usedBy as r (r.id)}
                <div class="recipe">
                  <PixIcon kind="building" id={r.building} />
                  <IconList
                    variant="rate"
                    plus={false}
                    size={16}
                    items={refs(Object.keys(r.inputs))}
                    to={refs(Object.keys(r.outputs))}
                  />
                </div>
              {/each}
            </div>
          </CardSection>
        {/if}
        <div class="dim why">{material(picked.id).why}</div>
      </Card>
    {/if}
  {/snippet}
</TabBody>

<style>
  .filters {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .filters :global(.ui-filters) {
    flex: 1;
  }
  .filters button {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .grid {
    margin-bottom: 6px;
  }
  .recipes {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .recipe {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .dim {
    color: var(--dim);
  }
  .why {
    font-size: 16px;
  }
</style>
