<script lang="ts">
  import {
    activePlants,
    averageOutput,
    assign,
    economy,
    flowsOf,
    isExtraction,
    POWER,
    process,
    setActive,
    setOn,
    touch,
    unlockedProcesses,
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
    Pill,
    Tile,
    TileGrid,
    fmt,
    materialName,
    materialTip,
    tipText,
    type FilterItem,
    type IconItem,
    tooltip
  } from '#lib/ui/index.ts';
  import GroupTile from './GroupTile.svelte';
  import Facts from './Facts.svelte';
  import Field from './Field.svelte';
  import TabBody from './TabBody.svelte';
  import { KIND_ORDER, groupViews, kindIcon } from './model.ts';
  import { bld, mat } from './refs.ts';
  import { ui } from './state.svelte.ts';
  import { rateText } from './tips.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const views = $derived(groupViews(site, flows));
  const kinds = $derived(KIND_ORDER.filter((k) => views.some((v) => v.building.kind === k)));
  const shown = $derived(views.filter((v) => ui.groupKind === 'all' || v.building.kind === ui.groupKind));
  const sel = $derived(views.find((v) => v.actor.group.id === ui.group) ?? shown[0]);
  const chips = $derived<FilterItem[]>([
    { id: 'all', label: 'All', count: views.length },
    ...kinds.map((k) => ({
      id: k,
      icon: kindIcon(k),
      count: views.filter((v) => v.building.kind === k).length,
      tip: BUILDING_KIND_NAMES[k] ?? k
    }))
  ]);

  const choices = $derived(sel ? unlockedProcesses(economy, site, sel.building.id) : []);
  const others = $derived(choices.filter((p) => p.id !== sel?.actor.group.process));
  const target = $derived(others.find((p) => p.id === ui.target) ?? others[0]);
  const count = $derived(Math.min(Math.max(1, ui.switchCount), sel?.actor.group.count ?? 1));

  function pick(id: number, groupCount: number) {
    ui.group = id;
    ui.target = '';
    ui.switchCount = groupCount;
  }

  function switchRecipe() {
    if (!sel || !target) return;
    const made = assign(economy, site, sel.actor.group.id, target.id, count);
    if (made) {
      ui.group = made.id;
      ui.switchCount = made.count;
    }
    ui.target = '';
    touch();
  }

  function toggle() {
    if (!sel) return;
    setOn(site, sel.actor.group.id, !sel.actor.group.on);
    touch();
  }

  const items = (amounts: Record<string, number>, share: number): IconItem[] =>
    Object.entries(amounts)
      .filter(([m]) => m !== POWER)
      .map(([m, v]) => ({
        icon: mat(m),
        amount: rateText(m, v * share, ui.period),
        tip: materialTip(m)
      }));
  const chosen = $derived(sel?.actor);
  const power = $derived(chosen ? (chosen.inputs[POWER] ?? 0) * chosen.share : 0);
  const generated = $derived(chosen ? (chosen.outputs[POWER] ?? 0) * chosen.share : 0);
  const inputs = $derived(chosen ? items(chosen.inputs, chosen.share) : []);
  const outputs = $derived(chosen ? items(chosen.outputs, chosen.share) : []);
  const recipeName = $derived(
    chosen?.group.process ? process(chosen.group.process, site.body).name : 'No recipe'
  );

  const plant = $derived(sel?.plant);
  const active = $derived(chosen ? activePlants(chosen.group) : 0);
  const HOURS_PER_YEAR = 8766;
  const plantRows = $derived(
    plant
      ? [
          { icon: 'bolt' as const, label: 'Capacity each', value: fmt.gigawatts(plant.capacityKw) },
          plant.storageKwh !== undefined
            ? { icon: 'box' as const, label: 'Storage each', value: fmt.gigawattHours(plant.storageKwh) }
            : {
                icon: 'clock' as const,
                label: 'Capacity factor',
                value: fmt.pct(plant.capacityFactor ?? 0)
              },
          { icon: 'check' as const, label: 'Firm share', value: fmt.pct(plant.firmShare) },
          ...(plant.co2PerMwh
            ? [{ icon: 'leaf' as const, label: 'CO₂', value: `${plant.co2PerMwh} t/MWh` }]
            : []),
          ...(plant.waterPerMwh
            ? [{ icon: 'drop' as const, label: 'Water', value: `${plant.waterPerMwh} t/MWh` }]
            : []),
          {
            icon: 'bolt' as const,
            label: 'Average output',
            value: fmt.gigawatts(averageOutput(plant, active))
          },
          {
            icon: 'leaf' as const,
            label: 'CO₂ a year',
            value: `${(((averageOutput(plant, active) / 1000) * HOURS_PER_YEAR * plant.co2PerMwh) / 1e9).toFixed(2)} Gt`
          }
        ]
      : []
  );

  function step(by: number) {
    if (!sel || !chosen) return;
    setActive(site, chosen.group.id, active + by);
    touch();
  }
</script>

<TabBody>
  {#snippet main()}
    <FilterChips items={chips} bind:value={ui.groupKind} />
    <div id="groups">
      <TileGrid min={104} gap={6}>
        {#each shown as v (v.actor.group.id)}
          <GroupTile
            view={v}
            selected={v.actor.group.id === sel?.actor.group.id}
            onselect={() => pick(v.actor.group.id, v.actor.group.count)}
          />
        {/each}
      </TileGrid>
    </div>
  {/snippet}
  {#snippet side()}
    {#if sel && chosen}
      <Card
        title={sel.building.name}
        subtitle={recipeName}
        icon={bld(sel.building.id)}
        chips={[
          { icon: 'factory', text: fmt.count(chosen.group.count), tip: 'Buildings in this group' },
          {
            icon: 'people',
            text: fmt.population(sel.building.workers * chosen.group.count),
            tip: tipText('Workers', `${sel.building.workers} a building`)
          },
          ...(chosen.group.process && isExtraction(chosen.group.process)
            ? [
                {
                  icon: 'drop' as const,
                  text: `grade ${chosen.grade.toFixed(2)}`,
                  tip: 'Grade'
                }
              ]
            : [])
        ]}
      >
        {#if plant}
          <Facts rows={plantRows} />
          <div class="row sp" id="plantActive">
            <span class="lbl">Active</span>
            <span class="ctl">
              <button
                id="plantFewer"
                disabled={active <= 0}
                onclick={() => step(-1)}
                use:tooltip={'One fewer'}><Icon name="minus" class="xs" /></button
              ><span class="val">{fmt.count(active)} / {fmt.count(chosen.group.count)}</span><button
                id="plantMore"
                disabled={active >= chosen.group.count}
                onclick={() => step(1)}
                use:tooltip={'One more'}><Icon name="plus" class="xs" /></button
              >
            </span>
          </div>
        {:else if chosen.group.process}
          {#if outputs.length}
            <CardSection label="Output">
              <IconList items={outputs} plus={false} />
            </CardSection>
          {/if}
          <CardSection label="Input">
            {#if inputs.length}<IconList items={inputs} plus={false} />{:else}<Pill
                icon="drop"
                text="From the ground"
              />{/if}
          </CardSection>
          <Facts
            rows={[
              {
                icon: 'bolt',
                label: 'Power',
                value: generated > 0 ? `+${fmt.power(generated)}` : fmt.power(power)
              }
            ]}
          />
        {/if}
        {#if !plant}
          <CardSection label="Active">
            <div class="row">
              <Bar value={chosen.share} thick full tone={sel.warn ? 'hot' : 'accent'} />
              <span class:hot={sel.warn} class="share">{fmt.pct(chosen.share)}</span>
            </div>
            {#if sel.limit}
              <div class={sel.quiet ? 'dim' : 'hot'} id="groupLimit">
                <Icon name={sel.quiet ? 'minus' : 'warn'} class="xs" />
                {sel.limit}
              </div>
            {/if}
          </CardSection>
          <div class="btns">
            <button id="groupToggle" onclick={toggle}
              ><Icon name="power" />{chosen.group.on ? 'Switch off' : 'Switch on'}</button
            >
          </div>
        {/if}
        {#if !plant && (choices.length > 1 || !chosen.group.process)}
          <CardSection label="Switch recipe">
            <div class="recipes" id="recipes">
              {#each others.slice(0, 30) as p (p.id)}
                {@const o = Object.keys(p.outputs).filter((m) => m !== POWER)[0]}
                <Tile
                  icons={o ? [mat(o)] : [bld(sel.building.id)]}
                  iconSize={32}
                  selected={target?.id === p.id}
                  label={p.name}
                  tip={tipText(
                    p.name,
                    Object.keys(p.outputs)
                      .filter((m) => m !== POWER)
                      .map((m) => `→ ${materialName(m)}`),
                    Object.keys(p.inputs).filter((m) => m !== POWER).length > 0 &&
                      `from ${Object.keys(p.inputs)
                        .filter((m) => m !== POWER)
                        .map(materialName)
                        .join(', ')}`
                  )}
                  onselect={() => (ui.target = p.id)}
                />
              {/each}
            </div>
            {#if target}
              <div class="dim target" id="chosenRecipe">{target.name}</div>
              <div class="row">
                <Field
                  label="How many"
                  bind:value={ui.switchCount}
                  max={chosen.group.count}
                  width={7}
                  name="switchCount"
                />
                <button id="recipeSwitch" onclick={switchRecipe}
                  ><Icon name="arrowR" />Switch {fmt.count(count)}</button
                >
                <button
                  id="recipeAll"
                  use:tooltip={'All of them'}
                  onclick={() => (ui.switchCount = chosen.group.count)}>all</button
                >
              </div>
            {/if}
          </CardSection>
        {/if}
      </Card>
    {:else}
      <Card title="Buildings" />
    {/if}
  {/snippet}
</TabBody>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .row :global(.ui-bar) {
    flex: 1;
  }
  .share {
    min-width: 34px;
    text-align: right;
  }
  .hot {
    color: var(--hot);
  }
  .btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .btns button,
  .row button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .recipes {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .target {
    margin: 6px 0 2px;
  }
  .dim {
    color: var(--dim);
  }
  .sp {
    justify-content: space-between;
  }
  .lbl {
    color: var(--dim);
    font-size: 15px;
  }
  .ctl {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .ctl button {
    display: inline-flex;
    align-items: center;
    padding: 2px 5px;
  }
  .val {
    min-width: 84px;
    text-align: center;
  }
</style>
