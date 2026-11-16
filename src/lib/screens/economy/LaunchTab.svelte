<script lang="ts">
  import { material } from '#lib/game/data/index.ts';
  import { isMass, standing, touch, type Site } from '#lib/game/economy/index.ts';
  import { formatEventTime, game } from '#lib/game/index.ts';
  import {
    freePads,
    launch,
    planStack,
    ships,
    vesselById,
    type Fate,
    type Vessel
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
    Tile,
    TileGrid,
    fmt,
    materialName,
    materialTip,
    tipText
  } from '#lib/ui/index.ts';
  import Field from './Field.svelte';
  import ShipTile from './ShipTile.svelte';
  import TabBody from './TabBody.svelte';
  import { launchUi, stackOf } from './launchState.svelte.ts';
  import { kms, vesselIcon } from './shipTiles.ts';

  let { site }: { site: Site } = $props();

  const pads = $derived(standing(site, 'launch_site'));
  const here = $derived(
    ships.vessels.filter((v) => v.at.kind === 'site' && v.at.site === site.id && !v.trip)
  );
  const free = $derived(here.filter((v) => !launchUi.stages.includes(v.id)));
  const stages = $derived(
    launchUi.stages.flatMap((id) => {
      const v = vesselById(id);
      return v && here.includes(v) ? [v] : [];
    })
  );
  const stack = $derived({ ...stackOf(), stages: stages.map((v) => v.id) });
  const plan = $derived(stages.length ? planStack(game, site, stack) : undefined);
  const cargoLines = $derived(Object.entries(launchUi.cargo).filter(([, kg]) => kg > 0));
  const stocked = $derived(
    Object.keys(site.stock)
      .filter((m) => isMass(m) && (site.stock[m] ?? 0) > 0)
      .sort((a, b) => material(a).name.localeCompare(material(b).name))
  );

  const FATE: Record<Fate, { text: string; mark: IconName; tone: 'accent' | 'hot' | 'cool' }> = {
    returns: { text: 'Returns to the pad', mark: 'down', tone: 'cool' },
    expended: { text: 'Lost', mark: 'flame', tone: 'hot' },
    orbit: { text: 'Reaches orbit', mark: 'check', tone: 'accent' },
    carried: { text: 'Carried to orbit', mark: 'up', tone: 'accent' }
  };

  const payloadChips = [
    { id: 'none', label: 'None' },
    { id: 'cargo', label: 'Cargo', icon: 'box' as IconName },
    { id: 'ship', label: 'A ship', icon: 'ship' as IconName }
  ];

  function addStage(id: string) {
    launchUi.stages = [...stages.map((v) => v.id), id];
  }

  function go() {
    if (!plan?.ok) return;
    launch(game, site, stack);
    launchUi.stages = [];
    launchUi.payload = 'none';
    launchUi.cargo = {};
    touch();
  }

  const stageVessel = (id: string): Vessel | undefined => vesselById(id);
</script>

{#snippet main()}
  <h3>
    <Icon name="rocket" class="sm" />Launch stack
    <small class="dim" id="padCount"
      >{pads > 0 ? `${freePads(site, game.elapsed)} of ${pads} pads free` : 'no launch site'}</small
    >
  </h3>
  {#if pads <= 0}
    <p class="dim" id="launchNone">{site.name} has no launch site, so nothing launches from here.</p>
  {:else}
    {#if stages.length}
      <div id="stages">
        <TileGrid min={120} gap={5}>
          {#each plan?.stages ?? stages.map( (v) => ({ vessel: v.id, name: v.name, fate: undefined, dv: 0, dry: 0, propellant: 0, mass0: 0 }) ) as s, i (s.vessel)}
            {@const v = stageVessel(s.vessel)}
            <Tile
              variant="q"
              icons={v ? [vesselIcon(v)] : []}
              name={s.name}
              corner={String(i + 1)}
              mark={s.fate ? FATE[s.fate].mark : undefined}
              markTone={s.fate ? FATE[s.fate].tone : 'dim'}
              value={s.fate ? kms(s.dv) : undefined}
              note={s.fate ? FATE[s.fate].text : undefined}
              noteTone={s.fate === 'expended' ? 'hot' : s.fate === 'returns' ? 'cool' : 'dim'}
              tip={tipText(
                `Stage ${i + 1}: ${s.name}`,
                s.fate ? FATE[s.fate].text : '',
                s.fate && `Dry mass ${fmt.mass(s.dry)}`,
                s.fate && `Propellant ${fmt.mass(s.propellant)}`,
                s.fate && `Ignition mass ${fmt.mass(s.mass0)}`,
                s.fate && `Delta-v ${kms(s.dv)}`
              )}
            />
          {/each}
        </TileGrid>
      </div>
    {:else}
      <p class="dim" id="stagesEmpty">
        The stack is empty. Add the first stage, then the stages above it. Ships are built on the Shipyard
        tab.
      </p>
    {/if}
    <div class="row">
      <button
        id="launchRemove"
        disabled={!stages.length}
        onclick={() => (launchUi.stages = stages.slice(0, -1).map((v) => v.id))}
        ><Icon name="minus" />Remove top stage</button
      >
      <button id="launchClear" disabled={!stages.length} onclick={() => (launchUi.stages = [])}
        ><Icon name="trash" />Clear</button
      >
    </div>
    <h3><Icon name="ship" class="sm" />Ships at the pad <small class="dim">{free.length}</small></h3>
    {#if free.length}
      <div id="launchStage">
        <TileGrid min={120} gap={5}>
          {#each free as v (v.id)}
            <ShipTile vessel={v} onselect={() => addStage(v.id)} />
          {/each}
        </TileGrid>
      </div>
    {:else}
      <p class="dim" id="launchNoShips">No free ship here. Click a ship to add it as the next stage.</p>
    {/if}
    <h3><Icon name="box" class="sm" />Payload</h3>
    <div id="launchPayload">
      <FilterChips
        items={payloadChips}
        value={launchUi.payload}
        onchange={(id) => (launchUi.payload = id as 'none' | 'cargo' | 'ship')}
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
    {:else if launchUi.payload === 'ship'}
      <div id="launchShip">
        {#if free.length}
          <TileGrid min={120} gap={5}>
            {#each free as v (v.id)}
              <ShipTile
                vessel={v}
                selected={launchUi.ship === v.id}
                onselect={() => (launchUi.ship = v.id)}
              />
            {/each}
          </TileGrid>
        {:else}
          <p class="dim">No free ship here to carry.</p>
        {/if}
      </div>
    {/if}
  {/if}
  <h3><Icon name="list" class="sm" />Launches <small class="dim">{ships.launches.length}</small></h3>
  {#if ships.launches.length}
    <div id="launchLog" class="log">
      {#each [...ships.launches].reverse().slice(0, 12) as l, i (i)}
        <div class="entry">
          <Pill icon="clock" text={formatEventTime(l.at, game.time)} />
          <span class="stages">{l.stages.join(' + ')}</span>
          <Pill icon="box" text={fmt.mass(l.payload)} tip="Payload" />
          <Pill icon="flame" text={fmt.mass(l.propellant)} tip="Propellant" />
          <span class="dim">{l.returned} back, {l.lost} lost</span>
        </div>
      {/each}
    </div>
  {:else}
    <p class="dim" id="launchNoneYet">Nothing has launched yet.</p>
  {/if}
{/snippet}

{#snippet side()}
  {#if pads > 0}
    <Card
      title="Launch plan"
      subtitle={plan ? `${stages.length} ${stages.length === 1 ? 'stage' : 'stages'}` : 'no stack yet'}
      icon={stages[0] ? vesselIcon(stages[0]) : undefined}
    >
      {#if plan}
        <div id="launchPlan">
          <CardSection label="Delta-v, against what orbit needs">
            <Bar
              value={plan.need > 0 ? plan.dv / plan.need : 0}
              thick
              full
              tone={plan.dv >= plan.need ? 'cool' : 'hot'}
            />
            <div class="flow">
              <div class="fr">
                <Icon name="rocket" class="sm" /><span class="nm">Delta-v</span><span
                  class="v {plan.dv >= plan.need ? '' : 'hot'}">{kms(plan.dv)} of {kms(plan.need)}</span
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
                  >{plan.twr.toFixed(2)}, first stage only</span
                >
              </div>
            </div>
          </CardSection>
          <CardSection label="Payload and propellant">
            <div class="flow">
              <div class="fr">
                <Icon name="box" class="sm" /><span class="nm">Payload</span><span class="v"
                  >{fmt.mass(plan.payloadMass)}</span
                >
              </div>
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
      {:else}
        <p class="dim">Click ships under Ships at the pad to build the stack, first stage first.</p>
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
