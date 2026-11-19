<script lang="ts">
  import { material } from '#lib/game/data/index.ts';
  import { economy, isMass, touch } from '#lib/game/economy/index.ts';
  import { className, game } from '#lib/game/index.ts';
  import { PROPELLANTS, PROPELLANT_KINDS, type PropellantKind } from '#lib/game/shipdesign/index.ts';
  import {
    addOrder,
    advanceShips,
    clearOrders,
    designOf,
    FLYABLE,
    foundOptions,
    foundRegions,
    foundSite,
    isPlatform,
    LANDABLE,
    needsRegion,
    projectedPlace,
    goTo,
    installModule,
    moveOrder,
    orderLabel,
    planVessel,
    removeOrder,
    ships,
    statsOf,
    vesselById,
    type Destination,
    type Item,
    type NewOrder,
    type VesselPlan
  } from '#lib/game/ships/index.ts';
  import { isSurveyable, isSurveyed, knownRegions } from '#lib/game/survey.svelte.ts';
  import type { IconName } from '#lib/gfx/icons.ts';
  import {
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
    type FilterItem
  } from '#lib/ui/index.ts';
  import Field from './Field.svelte';
  import ShipArt from './ShipArt.svelte';
  import ShipTile from './ShipTile.svelte';
  import TabBody from './TabBody.svelte';
  import { bodyGrouper, orderedGroups } from './bodyGroups.ts';
  import { bodyName, vesselWhere, whereabouts } from './shipsView.ts';
  import { daysText, kms, propellantIcon, propellantName } from './shipTiles.ts';
  import { ui } from './state.svelte.ts';

  const vessels = $derived(ships.vessels);
  const vessel = $derived(vesselById(ui.vessel ?? '') ?? vessels[0]);
  const stats = $derived(vessel ? statsOf(vessel) : undefined);

  type Kind = 'all' | 'trip' | 'site' | 'orbit' | 'surface' | 'blocked';
  let kind = $state<Kind>('all');
  const kindOf = (v: (typeof vessels)[number]): Kind[] => [
    v.trip ? 'trip' : v.at.kind,
    ...(v.blocked ? (['blocked'] as Kind[]) : [])
  ];
  const KINDS: { id: Kind; label: string; icon: IconName; tip: string }[] = [
    { id: 'trip', label: '', icon: 'rocket', tip: 'On a trip' },
    { id: 'site', label: '', icon: 'yard', tip: 'Docked or landed at a site' },
    { id: 'orbit', label: '', icon: 'ship', tip: 'Free in orbit' },
    { id: 'surface', label: '', icon: 'dome', tip: 'Landed with no site' },
    { id: 'blocked', label: '', icon: 'warn', tip: 'Blocked' }
  ];
  const chips = $derived<FilterItem[]>([
    { id: 'all', label: 'All', count: vessels.length },
    ...KINDS.filter((k) => vessels.some((v) => kindOf(v).includes(k.id))).map((k) => ({
      id: k.id,
      icon: k.icon,
      count: vessels.filter((v) => kindOf(v).includes(k.id)).length,
      tip: k.tip
    }))
  ]);
  const shown = $derived(kind === 'all' ? vessels : vessels.filter((v) => kindOf(v).includes(kind)));

  let destKey = $state('');
  let profile = $state<'cheapest' | 'balanced' | 'fastest'>('cheapest');
  let planned = $state<{ vessel: string; key: string; plan: VesselPlan } | null>(null);

  type Dest = { key: string; label: string; to: Destination; siteId?: string; group: string; rank: number };
  const jumps = $derived(game.world.systems.flatMap((s) => s.jumps));
  const dests = $derived.by<Dest[]>(() => {
    const out: Dest[] = [];
    const grouper = bodyGrouper(game);
    for (const s of economy.sites.slice(1)) {
      out.push({
        key: `site:${s.id}`,
        label: s.name,
        to:
          s.place === 'surface' && !isPlatform(s)
            ? { kind: 'surface', body: s.worldBody, angle: 0 }
            : { kind: 'orbit', body: s.worldBody, angle: s.angle },
        siteId: s.id,
        group: 'Sites',
        rank: 0
      });
    }
    for (const j of jumps)
      out.push({
        key: `jump:${j.id}`,
        label: j.name,
        to: { kind: 'orbit', body: j.id, angle: 0 },
        group: 'Jump points',
        rank: 1
      });
    for (const b of FLYABLE)
      out.push({
        key: `orbit:${b}`,
        label: `${bodyName(b)} orbit`,
        to: { kind: 'orbit', body: b, angle: 0 },
        ...grouper(b)
      });
    for (const b of LANDABLE) {
      out.push({
        key: `surface:${b}`,
        label: `${bodyName(b)} surface`,
        to: { kind: 'surface', body: b, angle: 0 },
        ...grouper(b)
      });
      for (const r of knownRegions(b))
        out.push({
          key: `surface:${b}:${r.id}`,
          label: `${bodyName(b)} surface, ${r.name.toLowerCase()}`,
          to: { kind: 'surface', body: b, angle: 0, region: r.id },
          ...grouper(b)
        });
    }
    return out;
  });
  const groups = $derived(orderedGroups(dests));
  let destGroup = $state('');
  const activeGroup = $derived(
    groups.includes(destGroup) ? destGroup : (dests.find((d) => d.key === destKey)?.group ?? groups[0] ?? '')
  );
  const inGroup = $derived(dests.filter((d) => d.group === activeGroup));
  const dest = $derived(inGroup.find((d) => d.key === destKey) ?? inGroup[0]);

  function plan() {
    if (!vessel || !dest) return;
    planned = { vessel: vessel.id, key: dest.key, plan: planVessel(game, vessel, dest.to) };
  }

  const shownPlan = $derived(
    planned && vessel && planned.vessel === vessel.id && dest && planned.key === dest.key
      ? planned.plan
      : null
  );

  function fly(p: 'cheapest' | 'balanced' | 'fastest') {
    if (!vessel || !dest) return;
    if (dest.siteId) {
      const site = economy.sites.find((s) => s.id === dest.siteId);
      if (site) goTo(vessel, site, p);
    } else
      addOrder(
        vessel,
        dest.to.kind === 'orbit'
          ? { type: 'fly', body: dest.to.body, angle: dest.to.angle, profile: p }
          : {
              type: 'land',
              body: dest.to.body,
              profile: p,
              ...(dest.to.region ? { region: dest.to.region } : {})
            }
      );
    advanceShips(game, 0);
    planned = null;
    touch();
  }

  let orderType = $state<'load' | 'unload' | 'dock' | 'wait' | 'survey' | 'sample'>('load');
  let surveyBody = $state('');
  let itemKey = $state('propellant:methalox');
  let amount = $state(1000);
  let all = $state(true);
  let waitHours = $state(24);
  let picked = $state(0);
  let dockSite = $state('');

  const here = $derived(
    vessel?.at.kind === 'site'
      ? economy.sites.find((s) => vessel.at.kind === 'site' && s.id === vessel.at.site)
      : undefined
  );
  const cargoIds = $derived(
    [
      ...new Set([
        ...Object.keys(vessel?.cargo ?? {}),
        ...Object.keys(here?.stock ?? {}).filter((m) => (here?.stock[m] ?? 0) > 0)
      ])
    ].filter((m) => isMass(m))
  );

  const items = $derived<{ key: string; label: string; item: Item }[]>([
    ...PROPELLANT_KINDS.filter((k) => (stats?.capacity[k] ?? 0) > 0 || (vessel?.propellant[k] ?? 0) > 0).map(
      (k) => ({
        key: `propellant:${k}`,
        label: PROPELLANTS[k].name,
        item: { kind: 'propellant', id: k as PropellantKind } as Item
      })
    ),
    { key: 'crew', label: 'Crew', item: { kind: 'crew' } },
    ...cargoIds.map((m) => ({
      key: `cargo:${m}`,
      label: material(m).name,
      item: { kind: 'cargo', id: m } as Item
    }))
  ]);
  const item = $derived(items.find((i) => i.key === itemKey) ?? items[0]);

  const orders = $derived(vessel?.orders ?? []);
  const row = $derived(Math.max(0, Math.min(picked, orders.length - 1)));

  function add() {
    if (!vessel) return;
    let o: NewOrder | undefined;
    if (orderType === 'wait') o = { type: 'wait', seconds: waitHours * 3600 };
    else if (orderType === 'sample') o = { type: 'sample' };
    else if (orderType === 'survey') {
      const id = surveyTarget;
      if (id) o = { type: 'survey', body: id };
    } else if (orderType === 'dock') {
      const id = dockSite || dockSites[0]?.id;
      if (id) o = { type: 'dock', site: id };
    } else if (item) o = { type: orderType, item: item.item, amount: all ? null : amount };
    if (!o) return;
    addOrder(vessel, o);
    picked = vessel.orders.length - 1;
    advanceShips(game, 0);
    touch();
  }

  const surveyable = $derived([
    ...FLYABLE.filter((b) => isSurveyable(b) && !isSurveyed(b)),
    ...jumps.filter((j) => !j.surveyed).map((j) => j.id)
  ]);
  const projected = $derived(vessel ? projectedPlace(vessel) : undefined);
  const surveyEntries = $derived.by(() => {
    const grouper = bodyGrouper(game),
      jumpIds = new Set(jumps.map((j) => j.id));
    return surveyable.map((id) => ({
      id,
      ...(jumpIds.has(id) ? { group: 'Jump points', rank: 1 } : grouper(id))
    }));
  });
  const surveyGroups = $derived(orderedGroups(surveyEntries));
  let surveyGroupPick = $state('');
  const surveyHere = $derived(
    projected?.kind === 'orbit' ? surveyEntries.find((e) => e.id === projected.body) : undefined
  );
  const surveyGroup = $derived(
    surveyGroups.includes(surveyGroupPick)
      ? surveyGroupPick
      : (surveyEntries.find((e) => e.id === surveyBody)?.group ?? surveyHere?.group ?? surveyGroups[0] ?? '')
  );
  const surveyShown = $derived(surveyEntries.filter((e) => e.group === surveyGroup).map((e) => e.id));
  const surveyTarget = $derived(
    surveyBody && surveyShown.includes(surveyBody)
      ? surveyBody
      : projected?.kind === 'orbit' && surveyShown.includes(projected.body)
        ? projected.body
        : (surveyShown[0] ?? '')
  );
  let foundRegion = $state('');
  const regions = $derived(vessel ? foundRegions(vessel) : []);
  const landedIn = $derived(vessel?.at.kind === 'surface' ? vessel.at.region : undefined);
  const chosenRegion = $derived(
    regions.find((r) => r.id === foundRegion)?.id ??
      regions.find((r) => r.id === landedIn)?.id ??
      regions[0]?.id ??
      null
  );
  const found = $derived(vessel ? foundOptions(vessel, chosenRegion) : []);
  let foundChoice = $state('');
  const foundPick = $derived(
    found.find((f) => f.building.id === foundChoice) ?? found.find((f) => !f.missing.length) ?? found[0]
  );
  let foundMessage = $state('');

  function found_() {
    if (!vessel || !foundPick) return;
    const r = foundSite(game, vessel, foundPick.building.id, chosenRegion);
    foundMessage = typeof r === 'string' ? r : '';
    if (typeof r !== 'string') {
      ui.site = r.id;
      ui.tab = 'summary';
    }
    touch();
  }

  const installable = $derived(!vessel?.trip && !!here && here.berths !== null);
  const dockSites = $derived(economy.sites.filter((s) => s.place !== 'surface' || isPlatform(s)));

  function install() {
    if (!vessel) return;
    foundMessage = installModule(game, vessel) ?? '';
    touch();
  }

  const propellants = $derived(
    PROPELLANT_KINDS.filter((k) => (vessel?.propellant[k] ?? 0) > 0).map((k) => ({
      icon: propellantIcon(k),
      amount: fmt.mass(vessel?.propellant[k] ?? 0),
      tip: tipText(propellantName(k), `${fmt.mass(vessel?.propellant[k] ?? 0)} aboard`)
    }))
  );
  const cargo = $derived(
    Object.entries(vessel?.cargo ?? {})
      .filter(([, kg]) => kg > 0)
      .map(([m, kg]) => ({
        icon: { kind: 'material' as const, id: m },
        amount: fmt.amount(kg, material(m).unit),
        tip: materialTip(m, `${fmt.amount(kg, material(m).unit)} aboard`)
      }))
  );
  const mainFuel = $derived(stats?.main ? propellantIcon(stats.main.propellant) : undefined);

  const ORDER_TYPES: FilterItem[] = [
    { id: 'load', label: 'Load' },
    { id: 'unload', label: 'Unload' },
    { id: 'dock', label: 'Dock' },
    { id: 'survey', label: 'Survey' },
    { id: 'sample', label: 'Sample' },
    { id: 'wait', label: 'Wait' }
  ];
  const PROFILE_NAMES = { cheapest: 'Cheapest', balanced: 'Balanced', fastest: 'Fastest' } as const;
  const PROFILES: FilterItem[] = Object.entries(PROFILE_NAMES).map(([id, label]) => ({ id, label }));
</script>

{#snippet main()}
  <h3><Icon name="ship" class="sm" />Ships <small class="dim">{vessels.length}</small></h3>
  {#if vessels.length}
    <FilterChips items={chips} value={kind} onchange={(id) => (kind = id as Kind)} />
    <div id="vessels">
      <TileGrid min={120} gap={5}>
        {#each shown as v (v.id)}
          <ShipTile vessel={v} selected={v.id === vessel?.id} onselect={() => (ui.vessel = v.id)} />
        {/each}
      </TileGrid>
    </div>
  {:else}
    <p class="dim" id="noVessels">No ships yet. Build one on the Shipyard tab.</p>
  {/if}
{/snippet}

{#snippet side()}
  {#if vessel}
    <Card
      title={vessel.name}
      subtitle="{className(vessel.design)}, {vesselWhere(vessel)}"
      chips={[
        ...(stats?.main
          ? [{ icon: 'rocket' as const, text: kms(stats.main.deltaV), tip: 'Delta-v at design load' }]
          : [{ icon: 'warn' as const, text: 'No drive', tone: 'hot' as const }]),
        { icon: 'people', text: `${vessel.crew} of ${stats?.berths ?? 0}`, tip: 'Crew and berths' },
        { icon: 'box', text: fmt.mass(stats?.dryMass ?? 0), tip: 'Dry mass' }
      ]}
    >
      {#snippet art()}<ShipArt design={designOf(vessel)} size="card" />{/snippet}
      {#if vessel.blocked}<p class="hot" id="vesselBlocked">{vessel.blocked}</p>{/if}
      <CardSection label="Propellant">
        {#if propellants.length}
          <IconList items={propellants} size={16} />
        {:else}
          <span class="dim">None</span>
        {/if}
      </CardSection>
      <CardSection label="Cargo">
        {#if cargo.length}
          <IconList items={cargo} size={16} />
        {:else}
          <span class="dim">Empty</span>
        {/if}
      </CardSection>
      {#if vessel.run}
        <p class="dim" id="runNote">
          Supply run: {material(vessel.run.item).name} from {whereabouts({
            kind: 'site',
            site: vessel.run.from
          })}
          to {whereabouts({ kind: 'site', site: vessel.run.to })}.
        </p>
      {/if}

      <CardSection label="Orders">
        {#if orders.length}
          <div id="vesselOrders" class="orders">
            {#each orders as o, i (o.id)}
              <button
                type="button"
                class="ord"
                class:on={i === row}
                aria-pressed={i === row}
                onclick={() => (picked = i)}><span class="dim">{i + 1}</span>{orderLabel(game, o)}</button
              >
            {/each}
          </div>
        {:else}
          <span class="dim" id="noOrders">No orders.</span>
        {/if}
        <div class="row">
          <button
            id="orderUp"
            disabled={row <= 0 || !orders.length}
            onclick={() => {
              moveOrder(vessel, orders[row]!.id, -1);
              picked = row - 1;
            }}><Icon name="up" />Up</button
          >
          <button
            id="orderDown"
            disabled={row >= orders.length - 1}
            onclick={() => {
              moveOrder(vessel, orders[row]!.id, 1);
              picked = row + 1;
            }}><Icon name="down" />Down</button
          >
          <button
            id="orderRemove"
            disabled={!orders.length}
            onclick={() => removeOrder(vessel, orders[row]!.id)}><Icon name="trash" />Remove</button
          >
          <button id="orderClear" disabled={!orders.length && !vessel.run} onclick={() => clearOrders(vessel)}
            >Clear</button
          >
        </div>
      </CardSection>

      <CardSection label="Add an order">
        <div id="orderType">
          <FilterChips
            items={ORDER_TYPES}
            value={orderType}
            onchange={(id) => (orderType = id as typeof orderType)}
          />
        </div>
        <div class="row">
          {#if orderType === 'load' || orderType === 'unload'}
            <label class="pick"
              >Item
              <select
                id="orderItem"
                value={item?.key ?? ''}
                onchange={(e) => (itemKey = e.currentTarget.value)}
              >
                {#each items as i (i.key)}<option value={i.key}>{i.label}</option>{/each}
              </select></label
            >
            <label class="pick"><input id="orderAll" type="checkbox" bind:checked={all} /> All</label>
            <Field
              label="Kilograms"
              bind:value={amount}
              width={8}
              name="orderAmount"
              disabled={all}
              max={1e9}
            />
          {:else if orderType === 'survey'}
            <label class="pick"
              >Group
              <select
                id="orderSurveyGroup"
                value={surveyGroup}
                onchange={(e) => {
                  surveyGroupPick = e.currentTarget.value;
                  surveyBody = '';
                }}
              >
                {#each surveyGroups as g (g)}<option value={g}>{g}</option>{/each}
              </select></label
            >
            <label class="pick"
              >Body
              <select
                id="orderSurvey"
                value={surveyTarget}
                onchange={(e) => (surveyBody = e.currentTarget.value)}
              >
                {#each surveyShown as b (b)}<option value={b}>{bodyName(b)}</option>{/each}
              </select></label
            >
          {:else if orderType === 'dock'}
            <label class="pick"
              >At
              <select id="orderDock" value={dockSite} onchange={(e) => (dockSite = e.currentTarget.value)}>
                {#each dockSites as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
              </select></label
            >
          {:else if orderType === 'wait'}
            <Field label="Hours" bind:value={waitHours} width={6} name="orderHours" />
          {/if}
          <button id="orderAdd" onclick={add}><Icon name="plus" />Add order</button>
        </div>
      </CardSection>

      <CardSection label="Trip">
        <div class="row">
          <label class="pick"
            >Group
            <select
              id="tripGroup"
              value={activeGroup}
              onchange={(e) => {
                destGroup = e.currentTarget.value;
                destKey = '';
              }}
            >
              {#each groups as g (g)}<option value={g}>{g}</option>{/each}
            </select></label
          >
        </div>
        <div class="row">
          <label class="pick"
            >To
            <select id="tripTo" value={dest?.key ?? ''} onchange={(e) => (destKey = e.currentTarget.value)}>
              {#each inGroup as d (d.key)}<option value={d.key}>{d.label}</option>{/each}
            </select></label
          >
        </div>
        <div id="tripProfile">
          <FilterChips items={PROFILES} value={profile} onchange={(id) => (profile = id as typeof profile)} />
        </div>
        <div class="row">
          <button id="tripPlan" disabled={!!vessel.trip} onclick={plan}><Icon name="clock" />Plan trip</button
          >
          <button id="tripGo" disabled={!shownPlan?.options.length} onclick={() => fly(profile)}
            ><Icon name="rocket" />Fly</button
          >
        </div>
        {#if shownPlan}
          {#if shownPlan.options.length}
            <div id="tripOptions">
              <TileGrid min={86} gap={4}>
                {#each shownPlan.options as o (o.profile)}
                  <Tile
                    variant="cmp"
                    icons={mainFuel ? [mainFuel] : []}
                    iconSize={16}
                    name={PROFILE_NAMES[o.profile]}
                    corner={daysText(Math.max(0, o.departure - game.elapsed))}
                    mark={o.canStop ? undefined : 'warn'}
                    markTone="hot"
                    value={daysText(o.duration)}
                    selected={profile === o.profile}
                    tip={tipText(
                      PROFILE_NAMES[o.profile],
                      `Departs in ${daysText(Math.max(0, o.departure - game.elapsed))}`,
                      `Takes ${daysText(o.duration)}`,
                      `Delta-v ${kms(o.dv)}`,
                      `Propellant ${fmt.mass(o.propellant)}, ${fmt.mass(o.propellantLeft)} left`,
                      o.canStop ? 'Can stop at the target' : warn('Cannot stop at the target'),
                      o.canReturn ? 'Can come back' : dim('Cannot come back')
                    )}
                    onselect={() => (profile = o.profile)}
                  >
                    <span class="mini">{kms(o.dv)}</span>
                  </Tile>
                {/each}
              </TileGrid>
            </div>
          {:else}
            <ul id="tripReasons">
              {#each shownPlan.reasons as r, i (i)}<li><Icon name="warn" class="xs" />{r}</li>{/each}
            </ul>
          {/if}
        {/if}
      </CardSection>

      {#if found.length || installable || needsRegion(vessel)}
        <CardSection label="Found or join a site">
          {#if needsRegion(vessel)}
            <div class="row">
              <label class="pick"
                >Region
                <select
                  id="foundRegion"
                  value={chosenRegion ?? ''}
                  onchange={(e) => (foundRegion = e.currentTarget.value)}
                  disabled={!regions.length}
                >
                  {#each regions as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
                </select></label
              >
              {#if !regions.length}<span class="dim" id="noRegions"
                  >Survey this body first, or every known region has a site.</span
                >{/if}
            </div>
          {/if}
          {#if found.length}
            <div id="foundBuilding">
              <TileGrid min={86} gap={4}>
                {#each found as f (f.building.id)}
                  <Tile
                    variant="cmp"
                    icons={[{ kind: 'building', id: f.building.id }]}
                    iconSize={32}
                    name={f.building.name}
                    dimmed={f.missing.length > 0}
                    selected={foundPick?.building.id === f.building.id}
                    tip={buildingTip(
                      f.building.id,
                      ...f.missing.map(
                        (m) =>
                          `Short of ${materialName(m.id)}: need ${fmt.mass(m.need)}, have ${fmt.mass(m.have)}`
                      )
                    )}
                    onselect={() => (foundChoice = f.building.id)}
                  />
                {/each}
              </TileGrid>
            </div>
            {#if foundPick?.missing.length}
              <IconList
                variant="have"
                size={16}
                items={foundPick.missing.map((m) => ({
                  icon: { kind: 'material', id: m.id },
                  amount: fmt.mass(m.have),
                  need: fmt.mass(m.need),
                  ok: false,
                  tip: materialTip(m.id)
                }))}
              />
            {/if}
            <div class="row">
              <button id="foundGo" disabled={!foundPick || foundPick.missing.length > 0} onclick={found_}
                ><Icon name="plus" />Found a site</button
              >
            </div>
          {/if}
          {#if installable}
            <div class="row">
              <button id="installGo" onclick={install}>Join this ship to the site</button>
            </div>
          {/if}
          {#if foundMessage}<p class="hot" id="foundMessage">{foundMessage}</p>{/if}
        </CardSection>
      {/if}
    </Card>
  {:else}
    <Card title="No ship selected" subtitle="build one on the Shipyard tab" />
  {/if}
{/snippet}

<TabBody {main} {side} />

<style>
  .dim {
    color: var(--dim);
  }
  .hot {
    color: var(--hot);
    margin: 0;
  }
  p {
    margin: 0;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
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
  .pick select {
    color: var(--text);
    max-width: 220px;
  }
  .orders {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ord {
    color: var(--text);
    display: flex;
    gap: 6px;
    text-align: left;
    margin: 0;
    padding: 1px 6px;
  }
  .ord.on {
    background: var(--panel2);
    box-shadow: 0 0 0 1px var(--accent);
  }
  ul {
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
    color: var(--hot);
  }
  li {
    display: flex;
    gap: 4px;
    align-items: baseline;
  }
  .mini {
    font-size: 14px;
    color: var(--dim);
  }
  button:disabled,
  select:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
