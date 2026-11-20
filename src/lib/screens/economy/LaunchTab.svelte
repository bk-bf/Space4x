<script lang="ts">
  import { material } from '#lib/game/data/index.ts';
  import { isMass, standing, touch, type Site } from '#lib/game/economy/index.ts';
  import { formatEventTime, game } from '#lib/game/index.ts';
  import {
    designOf,
    freePads,
    cargoRoom,
    launch,
    payloadCeiling,
    planLaunch,
    ships,
    vesselById
  } from '#lib/game/ships/index.ts';
  import type { IconName } from '#lib/gfx/icons.ts';
  import {
    Bar,
    Card,
    CardSection,
    FilterChips,
    Icon,
    IconList,
    Pill,
    TileGrid,
    fmt,
    materialName,
    materialTip
  } from '#lib/ui/index.ts';
  import Field from './Field.svelte';
  import ShipArt from './ShipArt.svelte';
  import ShipTile from './ShipTile.svelte';
  import TabBody from './TabBody.svelte';
  import { launchUi, requestOf } from './launchState.svelte.ts';
  import { kms } from './shipTiles.ts';

  let { site }: { site: Site } = $props();

  const pads = $derived(standing(site, 'launch_site'));
  const here = $derived(
    ships.vessels.filter((v) => v.at.kind === 'site' && v.at.site === site.id && !v.trip)
  );
  const ship = $derived.by(() => {
    const v = vesselById(launchUi.ship);
    return v && here.includes(v) ? v : undefined;
  });
  const plan = $derived(ship ? planLaunch(game, site, requestOf(ship.id)) : undefined);
  const ceiling = $derived(ship ? payloadCeiling(game, site, ship.id) : 0);
  const bay = $derived(ship ? cargoRoom(ship) : 0);
  const cargoLines = $derived(Object.entries(launchUi.cargo).filter(([, kg]) => kg > 0));
  const stocked = $derived(
    Object.keys(site.stock)
      .filter((m) => isMass(m) && (site.stock[m] ?? 0) > 0)
      .sort((a, b) => material(a).name.localeCompare(material(b).name))
  );

  const payloadChips = [
    { id: 'none', label: 'None' },
    { id: 'cargo', label: 'Cargo', icon: 'box' as IconName }
  ];

  function go() {
    if (!plan?.ok || !ship) return;
    launch(game, site, requestOf(ship.id));
    launchUi.ship = '';
    launchUi.payload = 'none';
    launchUi.cargo = {};
    touch();
  }
</script>

{#snippet main()}
  <h3>
    <Icon name="rocket" class="sm" />Launch
    <small class="dim" id="padCount"
      >{pads > 0 ? `${freePads(site, game.elapsed)} of ${pads} pads free` : 'no launch site'}</small
    >
  </h3>
  {#if pads > 0}
    <h3><Icon name="ship" class="sm" />Ships at the pad <small class="dim">{here.length}</small></h3>
    {#if here.length}
      <div id="launchShips">
        <TileGrid min={120} gap={5}>
          {#each here as v (v.id)}
            <ShipTile
              vessel={v}
              selected={ship?.id === v.id}
              onselect={() => (launchUi.ship = ship?.id === v.id ? '' : v.id)}
            />
          {/each}
        </TileGrid>
      </div>
    {/if}
    <h3><Icon name="box" class="sm" />Payload</h3>
    <div id="launchPayload">
      <FilterChips
        items={payloadChips}
        value={launchUi.payload}
        onchange={(id) => (launchUi.payload = id as 'none' | 'cargo')}
      />
    </div>
    {#if launchUi.payload === 'cargo'}
      <div class="row">
        <label class="pick"
          >Material
          <select id="launchMaterial" bind:value={launchUi.material}>
            {#each stocked as m (m)}<option value={m}>{materialName(m)}</option>{/each}
          </select></label
        >
        <Field
          label="Kilograms"
          bind:value={launchUi.amount}
          min={0}
          max={1e9}
          width={9}
          name="launchAmount"
        />
        <button
          id="launchCargoAdd"
          onclick={() =>
            (launchUi.cargo = {
              ...launchUi.cargo,
              [launchUi.material]: (launchUi.cargo[launchUi.material] ?? 0) + Math.max(0, launchUi.amount)
            })}><Icon name="plus" />Add cargo</button
        >
        <button id="launchCargoClear" disabled={!cargoLines.length} onclick={() => (launchUi.cargo = {})}
          ><Icon name="trash" />Clear cargo</button
        >
      </div>
      {#if cargoLines.length}
        <div id="launchCargo">
          <IconList
            items={cargoLines.map(([m, kg]) => ({
              icon: { kind: 'material', id: m },
              amount: fmt.mass(kg),
              tip: materialTip(m, `Cargo ${fmt.mass(kg)}`)
            }))}
          />
        </div>
      {/if}
    {/if}
  {/if}
  <h3><Icon name="list" class="sm" />Launches <small class="dim">{ships.launches.length}</small></h3>
  {#if ships.launches.length}
    <div id="launchLog" class="log">
      {#each [...ships.launches].reverse().slice(0, 12) as l, i (i)}
        <div class="entry">
          <Pill icon="clock" text={formatEventTime(l.at, game.time)} />
          <span class="stages">{l.ship}</span>
          <Pill icon="box" text={fmt.mass(l.payload)} tip="Payload" />
          <Pill icon="flame" text={fmt.mass(l.propellant)} tip="Propellant" />
          <span class="dim">{l.boosters} {l.boosters === 1 ? 'booster' : 'boosters'} dropped</span>
        </div>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet side()}
  {#if pads > 0}
    <Card title="Launch plan" subtitle={ship ? ship.name : 'no ship'}>
      {#snippet art()}{#if ship}<ShipArt design={designOf(ship)} size="card" />{/if}{/snippet}
      {#if plan}
        <div id="launchPlan">
          <CardSection label="Delta-v, against what orbit needs">
            <Bar
              value={plan.need > 0 ? plan.deltaV / plan.need : 0}
              thick
              full
              tone={plan.deltaV >= plan.need ? 'cool' : 'hot'}
            />
            <div class="flow">
              <div class="fr">
                <Icon name="rocket" class="sm" /><span class="nm">Delta-v</span><span
                  class="v {plan.deltaV >= plan.need ? '' : 'hot'}"
                  >{kms(plan.deltaV)} of {kms(plan.need)}</span
                >
              </div>
              <div class="fr">
                <Icon name="up" class="sm" /><span class="nm">Boosters</span><span class="v"
                  >{kms(plan.boosterDv)}</span
                >
              </div>
              <div class="fr">
                <Icon name="flame" class="sm" /><span class="nm">Own drive</span><span class="v"
                  >{kms(plan.shipDv)}</span
                >
              </div>
            </div>
          </CardSection>
          <CardSection label="Lift-off">
            <div class="flow">
              <div class="fr">
                <Icon name="box" class="sm" /><span class="nm">Lift-off mass</span><span class="v"
                  >{fmt.mass(plan.liftoffMass)}</span
                >
              </div>
              <div class="fr">
                <Icon name="up" class="sm" /><span class="nm">Lift-off thrust</span><span class="v"
                  >{fmt.thrust(plan.liftoffThrust)}</span
                >
              </div>
              <div class="fr">
                <Icon name="gear" class="sm" /><span class="nm">Thrust to weight</span><span class="v"
                  >{plan.twr.toFixed(2)}</span
                >
              </div>
              <div class="fr" id="launchBoosters">
                <Icon name="down" class="sm" /><span class="nm">Boosters dropped</span><span class="v"
                  >{plan.boosters}, {fmt.mass(plan.boosterMass)}</span
                >
              </div>
            </div>
          </CardSection>
          <CardSection label="Payload, against what the ship can lift">
            <div id="launchCeiling">
              <Bar
                value={ceiling > 0 ? Math.min(1, plan.payloadMass / ceiling) : plan.payloadMass > 0 ? 1 : 0}
                thick
                full
                tone={plan.payloadMass > ceiling ? 'hot' : 'accent'}
              />
              <div class="flow">
                <div class="fr" data-ceiling={Math.round(ceiling)}>
                  <Icon name="up" class="sm" /><span class="nm">Payload</span><span
                    class="v {plan.payloadMass > ceiling ? 'hot' : ''}"
                    >{fmt.mass(plan.payloadMass)} of {fmt.mass(ceiling)}</span
                  >
                </div>
                <div class="fr">
                  <Icon name="box" class="sm" /><span class="nm">Room in the bay</span><span class="v"
                    >{fmt.mass(bay)}</span
                  >
                </div>
              </div>
            </div>
          </CardSection>
          <CardSection label="Propellant">
            <div class="flow">
              <div class="fr">
                <Icon name="check" class="sm" /><span class="nm">Left in orbit</span><span class="v"
                  >{fmt.mass(plan.leftover)}</span
                >
              </div>
              <div class="fr">
                <Icon name="flame" class="sm" /><span class="nm">Propellant burned</span><span class="v"
                  >{fmt.mass(plan.burned)}</span
                >
              </div>
            </div>
          </CardSection>
          {#if Object.keys(plan.draw).length}
            <CardSection label="Taken from stock">
              <IconList
                items={Object.entries(plan.draw).map(([m, kg]) => ({
                  icon: { kind: 'material', id: m },
                  amount: fmt.mass(kg),
                  tip: materialTip(m, `Drawn ${fmt.mass(kg)}`)
                }))}
                size={16}
              />
            </CardSection>
          {/if}
          {#if plan.reasons.length}
            <ul id="launchReasons">
              {#each plan.reasons as r, i (i)}<li><Icon name="warn" class="xs" />{r}</li>{/each}
            </ul>
          {/if}
        </div>
        <div class="row">
          <button id="launchGo" disabled={!plan.ok} onclick={go}><Icon name="rocket" />Launch</button>
          {#if !plan.ok}<span class="hot">refused</span>{/if}
        </div>
      {/if}
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
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin: 4px 0;
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
    max-width: 26ch;
  }
  .flow {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .fr {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .fr .v {
    margin-left: auto;
    color: var(--dim);
    white-space: nowrap;
  }
  .fr .v.hot {
    color: var(--hot);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--hot);
  }
  li {
    display: flex;
    gap: 4px;
    align-items: baseline;
  }
  .log {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .entry {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .stages {
    min-width: 0;
  }
  button:disabled,
  select:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
