<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import {
    cargoMass,
    foundOptionsAt,
    placeNeedsRegion,
    regionsAt,
    ships,
    vesselById
  } from '#lib/game/ships/index.ts';
  import { knownRegions } from '#lib/game/survey.svelte.ts';
  import {
    Icon,
    IconList,
    Tile,
    TileGrid,
    buildingTip,
    fmt,
    materialName,
    materialTip,
    warn
  } from '#lib/ui/index.ts';
  import { orderedGroups } from './bodyGroups.ts';
  import { LAUNCH_CARGO, foundPlan, planPlaces, siteHere } from './foundPlan.svelte.ts';
  import { launchUi } from './launchState.svelte.ts';
  import { bodyName } from './shipsView.ts';
  import { ui } from './state.svelte.ts';

  const places = $derived(planPlaces(game));
  const groups = $derived(orderedGroups(places));
  const group = $derived(
    groups.includes(foundPlan.group)
      ? foundPlan.group
      : (places.find((p) => p.key === foundPlan.place)?.group ?? groups[0] ?? '')
  );
  const inGroup = $derived(places.filter((p) => p.group === group));
  const place = $derived(inGroup.find((p) => p.key === foundPlan.place) ?? inGroup[0]);
  const needsRegion = $derived(!!place && placeNeedsRegion(place.at));
  const regions = $derived(place ? regionsAt(place.at) : []);
  const region = $derived(
    needsRegion ? ((regions.find((r) => r.id === foundPlan.region) ?? regions[0])?.id ?? null) : null
  );
  const taken = $derived(!!place && siteHere(place.at, region));

  const launchCargo = $derived.by(() => {
    const top = vesselById(launchUi.ship);
    const out: Record<string, number> = { ...(top?.cargo ?? {}) };
    for (const [m, kg] of Object.entries(launchUi.cargo)) out[m] = (out[m] ?? 0) + kg;
    return out;
  });
  const carrier = $derived(foundPlan.carrier === LAUNCH_CARGO ? undefined : vesselById(foundPlan.carrier));
  const cargo = $derived(carrier ? carrier.cargo : launchCargo);
  const options = $derived(place ? foundOptionsAt(place.at, cargo, region) : []);
  const pick = $derived(options.find((o) => o.building.id === foundPlan.pick) ?? options[0]);
  const why = $derived.by(() => {
    if (!place) return '';
    if (needsRegion && !regions.length)
      return !knownRegions(place.at.worldBody).length
        ? `Survey ${bodyName(place.at.worldBody)} first: its regions are unknown.`
        : `Every known region of ${bodyName(place.at.worldBody)} has a site.`;
    if (taken) return 'There is a site here already.';
    if (place.at.place === 'point' && !game.jump(place.at.worldBody)?.point.surveyed)
      return `${place.label} has not been surveyed; the founding ship must survey it first.`;
    if (!options.length) return 'No building that can start a site here is unlocked yet.';
    return '';
  });

  function addMissing() {
    if (!pick) return;
    const next = { ...launchUi.cargo };
    for (const m of pick.missing) next[m.id] = (next[m.id] ?? 0) + (m.need - m.have);
    launchUi.cargo = next;
    launchUi.payload = 'cargo';
  }
</script>

<div id="foundPlan">
  <div class="row">
    <label class="pick"
      >Where
      <select
        id="planGroup"
        value={group}
        onchange={(e) => {
          foundPlan.group = e.currentTarget.value;
          foundPlan.place = '';
        }}
      >
        {#each groups as g (g)}<option value={g}>{g}</option>{/each}
      </select></label
    >
    <select
      id="planPlace"
      aria-label="Place"
      value={place?.key ?? ''}
      onchange={(e) => (foundPlan.place = e.currentTarget.value)}
    >
      {#each inGroup as p (p.key)}<option value={p.key}>{p.label}</option>{/each}
    </select>
    {#if needsRegion && regions.length}
      <select
        id="planRegion"
        aria-label="Region"
        value={region ?? ''}
        onchange={(e) => (foundPlan.region = e.currentTarget.value)}
      >
        {#each regions as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
      </select>
    {/if}
  </div>
  <div class="row">
    <label class="pick"
      >Against
      <select
        id="planCarrier"
        value={carrier ? carrier.id : LAUNCH_CARGO}
        onchange={(e) => (foundPlan.carrier = e.currentTarget.value)}
      >
        <option value={LAUNCH_CARGO}
          >Cargo planned for launch, {fmt.mass(Object.values(launchCargo).reduce((a, x) => a + x, 0))}</option
        >
        {#each ships.vessels as v (v.id)}<option value={v.id}
            >{v.name}, {fmt.mass(cargoMass(v))} aboard</option
          >{/each}
      </select></label
    >
  </div>
  {#if why}
    <p class="dim" id="planWhy">{why}</p>
  {/if}
  {#if options.length && !taken}
    <div id="planBuildings">
      <TileGrid min={104} gap={6}>
        {#each options as o (o.building.id)}
          {@const costs = Object.entries(o.building.cost).sort((x, y) => y[1] - x[1])}
          <Tile
            variant="bld"
            icons={[{ kind: 'building', id: o.building.id }]}
            name={o.building.name}
            kind={o.building.kind}
            mark={o.missing.length ? undefined : 'check'}
            markTone="cool"
            minis={costs.slice(0, 3).map(([m]) => ({ kind: 'material' as const, id: m }))}
            minisMore={Math.max(0, costs.length - 3)}
            selected={pick?.building.id === o.building.id}
            tip={buildingTip(
              o.building.id,
              ...o.missing.map((m) =>
                warn(`Short of ${materialName(m.id)}: need ${fmt.mass(m.need)}, have ${fmt.mass(m.have)}`)
              )
            )}
            onselect={() => (foundPlan.pick = o.building.id)}
          />
        {/each}
      </TileGrid>
    </div>
    {#if pick}
      <h3>
        <Icon name="box" class="sm" />{pick.building.name}
        <small class="dim" id="planCost"
          >costs {fmt.mass(Object.values(pick.building.cost).reduce((a, x) => a + x, 0))}</small
        >
      </h3>
      <div id="planHave">
        <IconList
          variant="have"
          size={32}
          items={Object.entries(pick.building.cost).map(([m, need]) => ({
            icon: { kind: 'material' as const, id: m },
            amount: fmt.mass(cargo[m] ?? 0),
            need: fmt.mass(need),
            ok: (cargo[m] ?? 0) + 1e-9 >= need,
            tip: materialTip(m, `Needed ${fmt.mass(need)}`, `Carried ${fmt.mass(cargo[m] ?? 0)}`)
          }))}
        />
      </div>
      <div class="row">
        <button
          id="planToLaunch"
          disabled={!pick.missing.length || foundPlan.carrier !== LAUNCH_CARGO}
          onclick={addMissing}><Icon name="plus" />Add what is missing to the launch cargo</button
        >
        <button id="planOpenLaunch" onclick={() => (ui.tab = 'launch')}
          ><Icon name="rocket" />Launch tab</button
        >
      </div>
    {/if}
  {/if}
</div>

<style>
  #foundPlan {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .row button {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .pick {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--dim);
  }
  select {
    color: var(--text);
    max-width: 40ch;
  }
  .dim {
    color: var(--dim);
    margin: 2px 0;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
