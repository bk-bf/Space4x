<script lang="ts">
  import { asteroids, material } from '#lib/game/data/index.ts';
  import { economy, isMass, touch } from '#lib/game/economy/index.ts';
  import { className, game } from '#lib/game/index.ts';
  import { PROPELLANTS, PROPELLANT_KINDS, type PropellantKind } from '#lib/game/shipdesign/index.ts';
  import {
    addOrder,
    advanceShips,
    clearOrders,
    FLYABLE,
    foundOptions,
    foundRegions,
    foundSite,
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
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import Bar from './Bar.svelte';
  import Field from './Field.svelte';
  import { formatMass, shortName } from './format.ts';
  import { ui } from './state.svelte.ts';
  import {
    bodyName,
    cargoText,
    dayText,
    holdText,
    propellantText,
    tankText,
    vesselWhere,
    whereabouts
  } from './shipsView.ts';

  const vessels = $derived(ships.vessels);
  const vessel = $derived(vesselById(ui.vessel ?? '') ?? vessels[0]);
  const stats = $derived(vessel ? statsOf(vessel) : undefined);
  const selected = $derived(vessel ? vessels.indexOf(vessel) : -1);

  const rows = $derived<Cell[][]>(
    vessels.map((v) => [
      v.name,
      className(v.design),
      vesselWhere(v),
      tankText(v),
      holdText(v),
      v.crew,
      v.blocked ? { icon: 'warn', text: v.blocked, warn: true } : v.run ? 'Supply run' : v.orders.length
    ])
  );

  let destKey = $state('');
  let profile = $state<'cheapest' | 'balanced' | 'fastest'>('cheapest');
  let planned = $state<{ vessel: string; key: string; plan: VesselPlan } | null>(null);

  type Dest = { key: string; label: string; to: Destination; siteId?: string; group: string };
  const rockIds = new Set(asteroids.map((a) => a.id));
  const dests = $derived.by<Dest[]>(() => {
    const out: Dest[] = [];
    for (const s of economy.sites.slice(1)) {
      out.push({
        key: `site:${s.id}`,
        label: s.name,
        to:
          s.place === 'orbit'
            ? { kind: 'orbit', body: s.worldBody, angle: s.angle }
            : { kind: 'surface', body: s.worldBody, angle: 0 },
        siteId: s.id,
        group: 'Sites'
      });
    }
    const groupOf = (b: string, what: string) =>
      rockIds.has(b) ? `${what}, asteroids` : `${what}, planets and moons`;
    for (const b of FLYABLE)
      out.push({
        key: `orbit:${b}`,
        label: `${bodyName(b)} orbit`,
        to: { kind: 'orbit', body: b, angle: 0 },
        group: groupOf(b, 'Orbit')
      });
    for (const b of LANDABLE) {
      out.push({
        key: `surface:${b}`,
        label: `${bodyName(b)} surface`,
        to: { kind: 'surface', body: b, angle: 0 },
        group: groupOf(b, 'Surface')
      });
      for (const r of knownRegions(b))
        out.push({
          key: `surface:${b}:${r.id}`,
          label: `${bodyName(b)} surface, ${r.name.toLowerCase()}`,
          to: { kind: 'surface', body: b, angle: 0, region: r.id },
          group: groupOf(b, 'Surface')
        });
    }
    return out;
  });
  const groups = $derived([...new Set(dests.map((d) => d.group))]);
  const dest = $derived(dests.find((d) => d.key === destKey) ?? dests[0]);

  function plan() {
    if (!vessel || !dest) return;
    planned = { vessel: vessel.id, key: dest.key, plan: planVessel(game, vessel, dest.to) };
  }

  const shown = $derived(
    planned && vessel && planned.vessel === vessel.id && dest && planned.key === dest.key
      ? planned.plan
      : null
  );

  const optionRows = $derived<Cell[][]>(
    (shown?.options ?? []).map((o) => [
      o.profile,
      dayText(Math.max(0, o.departure - game.elapsed)),
      dayText(o.duration),
      `${(o.dv / 1000).toFixed(2)} km/s`,
      formatMass(o.propellant),
      formatMass(o.propellantLeft),
      o.canStop ? 'Yes' : { text: 'No', warn: true },
      o.canReturn ? 'Yes' : 'No'
    ])
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

  let orderType = $state<'load' | 'unload' | 'dock' | 'wait' | 'survey'>('load');
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
  const orderRows = $derived<Cell[][]>(orders.map((o, i) => [i + 1, orderLabel(game, o)]));

  function add() {
    if (!vessel) return;
    let o: NewOrder | undefined;
    if (orderType === 'wait') o = { type: 'wait', seconds: waitHours * 3600 };
    else if (orderType === 'survey') {
      const id = surveyTarget;
      if (id) o = { type: 'survey', body: id };
    } else if (orderType === 'dock') {
      const id = dockSite || economy.sites.find((s) => s.place === 'orbit')?.id;
      if (id) o = { type: 'dock', site: id };
    } else if (item) o = { type: orderType, item: item.item, amount: all ? null : amount };
    if (!o) return;
    addOrder(vessel, o);
    picked = vessel.orders.length - 1;
    advanceShips(game, 0);
    touch();
  }

  const surveyable = $derived(FLYABLE.filter((b) => isSurveyable(b) && !isSurveyed(b)));
  const projected = $derived(vessel ? projectedPlace(vessel) : undefined);
  const surveyTarget = $derived(
    surveyBody && surveyable.includes(surveyBody)
      ? surveyBody
      : projected?.kind === 'orbit' && surveyable.includes(projected.body)
        ? projected.body
        : (surveyable[0] ?? '')
  );
  let foundRegion = $state('');
  const regions = $derived(vessel ? foundRegions(vessel) : []);
  const chosenRegion = $derived(regions.find((r) => r.id === foundRegion)?.id ?? regions[0]?.id ?? null);
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
  const orbitSites = $derived(economy.sites.filter((s) => s.place === 'orbit'));

  function install() {
    if (!vessel) return;
    foundMessage = installModule(game, vessel) ?? '';
    touch();
  }
</script>

<h3>Ships <small>{vessels.length}</small></h3>
{#if vessels.length}
  <div id="vessels">
    <Table
      head={['Ship', 'Design', 'Where', '>Tanks', '>Hold', '>Crew', 'Orders']}
      {rows}
      {selected}
      keys={vessels.map((v) => v.id)}
      onpick={(r) => (ui.vessel = vessels[r]?.id ?? null)}
    />
  </div>
{:else}
  <p class="none" id="noVessels">No ships yet. Build one on the Shipyard tab.</p>
{/if}
{#if vessel}
  <h3 id="vesselName">{vessel.name}</h3>
  <DefList
    two
    rows={[
      ['Where', vesselWhere(vessel)],
      ['Delta-v', stats?.main ? `${(stats.main.deltaV / 1000).toFixed(2)} km/s at design load` : 'No drive'],
      ['Propellant', propellantText(vessel)],
      ['Cargo', cargoText(vessel)],
      ['Crew', `${vessel.crew} of ${stats?.berths ?? 0} berths`],
      ['Mass', formatMass(stats?.dryMass ?? 0)]
    ]}
  />
  {#if vessel.blocked}<p class="warn" id="vesselBlocked">{vessel.blocked}</p>{/if}
  <h3>Orders</h3>
  {#if orderRows.length}
    <div id="vesselOrders">
      <Table
        rows={orderRows}
        selected={row}
        onpick={(i) => (picked = i)}
        keys={orders.map((o) => String(o.id))}
      />
    </div>
  {:else}
    <p class="none" id="noOrders">No orders.</p>
  {/if}
  <Bar>
    <button
      id="orderUp"
      disabled={row <= 0 || !orders.length}
      onclick={() => {
        moveOrder(vessel, orders[row]!.id, -1);
        picked = row - 1;
      }}>Up</button
    >
    <button
      id="orderDown"
      disabled={row >= orders.length - 1}
      onclick={() => {
        moveOrder(vessel, orders[row]!.id, 1);
        picked = row + 1;
      }}>Down</button
    >
    <button id="orderRemove" disabled={!orders.length} onclick={() => removeOrder(vessel, orders[row]!.id)}
      >Remove</button
    >
    <button id="orderClear" disabled={!orders.length && !vessel.run} onclick={() => clearOrders(vessel)}
      >Clear</button
    >
  </Bar>
  <Bar>
    <label class="pick"
      >Order
      <select
        id="orderType"
        value={orderType}
        onchange={(e) => (orderType = e.currentTarget.value as typeof orderType)}
      >
        <option value="load">Load</option>
        <option value="unload">Unload</option>
        <option value="dock">Dock</option>
        <option value="survey">Survey</option>
        <option value="wait">Wait</option>
      </select></label
    >
    {#if orderType === 'load' || orderType === 'unload'}
      <label class="pick"
        >Item
        <select id="orderItem" value={item?.key ?? ''} onchange={(e) => (itemKey = e.currentTarget.value)}>
          {#each items as i (i.key)}<option value={i.key}>{i.label}</option>{/each}
        </select></label
      >
      <label class="pick"><input id="orderAll" type="checkbox" bind:checked={all} /> All</label>
      <Field label="Kilograms" bind:value={amount} width={8} name="orderAmount" disabled={all} max={1e9} />
    {:else if orderType === 'survey'}
      <label class="pick"
        >Body
        <select id="orderSurvey" value={surveyTarget} onchange={(e) => (surveyBody = e.currentTarget.value)}>
          {#each surveyable as b (b)}<option value={b}>{bodyName(b)}</option>{/each}
        </select></label
      >
    {:else if orderType === 'dock'}
      <label class="pick"
        >At
        <select id="orderDock" value={dockSite} onchange={(e) => (dockSite = e.currentTarget.value)}>
          {#each orbitSites as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
        </select></label
      >
    {:else}
      <Field label="Hours" bind:value={waitHours} width={6} name="orderHours" />
    {/if}
    <button id="orderAdd" onclick={add}>Add order</button>
  </Bar>
  <h3>Trip</h3>
  <Bar>
    <label class="pick"
      >Destination
      <select id="tripTo" value={dest?.key ?? ''} onchange={(e) => (destKey = e.currentTarget.value)}>
        {#each groups as g (g)}
          <optgroup label={g}>
            {#each dests.filter((d) => d.group === g) as d (d.key)}<option value={d.key}>{d.label}</option
              >{/each}
          </optgroup>
        {/each}
      </select></label
    >
    <label class="pick"
      >Profile
      <select
        id="tripProfile"
        value={profile}
        onchange={(e) => (profile = e.currentTarget.value as typeof profile)}
      >
        <option value="cheapest">Cheapest</option>
        <option value="balanced">Balanced</option>
        <option value="fastest">Fastest</option>
      </select></label
    >
    <button id="tripPlan" disabled={!!vessel.trip} onclick={plan}>Plan trip</button>
    <button id="tripGo" disabled={!shown?.options.length} onclick={() => fly(profile)}>Fly</button>
  </Bar>
  {#if shown}
    {#if shown.options.length}
      <div id="tripOptions">
        <Table
          head={[
            'Profile',
            '>Departs in',
            '>Duration',
            '>Delta-v',
            '>Propellant',
            '>Left',
            'Stops',
            'Returns'
          ]}
          rows={optionRows}
        />
      </div>
    {:else}
      <ul id="tripReasons">
        {#each shown.reasons as r, i (i)}<li>{r}</li>{/each}
      </ul>
    {/if}
  {/if}
  {#if found.length || installable || (vessel && needsRegion(vessel))}
    <h3>Found or join a site</h3>
    {#if vessel && needsRegion(vessel)}
      <Bar>
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
        {#if !regions.length}<span class="none" id="noRegions"
            >Survey this body first, or every known region has a site.</span
          >{/if}
      </Bar>
    {/if}
    {#if found.length}
      <Bar>
        <label class="pick"
          >First building
          <select
            id="foundBuilding"
            value={foundPick?.building.id ?? ''}
            onchange={(e) => (foundChoice = e.currentTarget.value)}
          >
            {#each found as f (f.building.id)}<option value={f.building.id}
                >{f.building.name}{f.missing.length
                  ? ` (short of ${shortName(f.missing[0]!.id)})`
                  : ''}</option
              >{/each}
          </select></label
        >
        <button id="foundGo" disabled={!foundPick || foundPick.missing.length > 0} onclick={found_}
          >Found a site</button
        >
      </Bar>
    {/if}
    {#if installable}
      <Bar><button id="installGo" onclick={install}>Join this ship to the site</button></Bar>
    {/if}
    {#if foundMessage}<p class="warn" id="foundMessage">{foundMessage}</p>{/if}
  {/if}
  {#if vessel.run}
    <p class="none" id="runNote">
      Supply run: {material(vessel.run.item).name} from {whereabouts({ kind: 'site', site: vessel.run.from })} to
      {whereabouts({ kind: 'site', site: vessel.run.to })}.
    </p>
  {/if}
{/if}

<style>
  .none {
    margin: 4px 0;
    color: var(--dim);
  }
  .warn,
  ul {
    margin: 4px 0;
    color: var(--hot);
  }
  ul {
    padding-left: 18px;
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
    max-width: 36ch;
  }
  button:disabled,
  select:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
