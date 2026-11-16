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
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import Bar from './Bar.svelte';
  import Field from './Field.svelte';
  import { formatAmount, formatMass } from './format.ts';
  import { launchUi, stackOf } from './launchState.svelte.ts';

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
  const stack = $derived.by(() => {
    const s = stackOf();
    return { ...s, stages: stages.map((v) => v.id) };
  });
  const pickId = $derived(free.some((v) => v.id === launchUi.pick) ? launchUi.pick : (free[0]?.id ?? ''));
  const payloadShips = $derived(free);
  const plan = $derived(stages.length ? planStack(game, site, stack) : undefined);
  const cargoLines = $derived(Object.entries(launchUi.cargo).filter(([, kg]) => kg > 0));
  const stocked = $derived(
    Object.keys(site.stock)
      .filter((m) => isMass(m) && (site.stock[m] ?? 0) > 0)
      .sort((a, b) => material(a).name.localeCompare(material(b).name))
  );

  const FATE: Record<Fate, string> = {
    returns: 'Returns to the pad',
    expended: 'Lost',
    orbit: 'Reaches orbit',
    carried: 'Carried to orbit'
  };

  const stageRows = $derived<Cell[][]>(
    (plan?.stages ?? []).map((s, i) => [
      i + 1,
      s.name,
      FATE[s.fate],
      formatMass(s.dry),
      formatMass(s.propellant),
      formatMass(s.mass0),
      `${(s.dv / 1000).toFixed(2)} km/s`
    ])
  );

  const logRows = $derived<Cell[][]>(
    [...ships.launches]
      .reverse()
      .slice(0, 12)
      .map((l) => [
        formatEventTime(l.at, game.time),
        l.stages.join(' + '),
        formatMass(l.payload),
        formatMass(l.propellant),
        `${l.returned} back, ${l.lost} lost`
      ])
  );

  function addStage() {
    if (pickId) launchUi.stages = [...stages.map((v) => v.id), pickId];
    launchUi.pick = '';
  }

  function go() {
    if (!plan?.ok) return;
    launch(game, site, stack);
    launchUi.stages = [];
    launchUi.payload = 'none';
    launchUi.cargo = {};
    touch();
  }

  const name = (v: Vessel) => v.name;
</script>

<h3>
  Launch stack <small id="padCount"
    >{pads > 0 ? `${freePads(site, game.elapsed)} of ${pads} pads free` : 'no launch site'}</small
  >
</h3>
{#if pads <= 0}
  <p class="none" id="launchNone">{site.name} has no launch site, so nothing launches from here.</p>
{:else}
  {#if stages.length}
    <div id="stages">
      <Table
        head={['>Stage', 'Ship', 'Fate', '>Dry', '>Propellant', '>Ignition mass', '>Delta-v']}
        rows={stageRows}
      />
    </div>
  {:else}
    <p class="none" id="stagesEmpty">
      The stack is empty. Add the first stage, then the stages above it. Ships are built on the Shipyard tab.
    </p>
  {/if}
  <Bar>
    <label class="pick"
      >Stage
      <select
        id="launchStage"
        value={pickId}
        onchange={(e) => (launchUi.pick = e.currentTarget.value)}
        disabled={!free.length}
      >
        {#each free as v (v.id)}<option value={v.id}>{name(v)}</option>{/each}
      </select></label
    >
    <button id="launchAdd" disabled={!free.length} onclick={addStage}>Add stage</button>
    <button
      id="launchRemove"
      disabled={!stages.length}
      onclick={() => (launchUi.stages = stages.slice(0, -1).map((v) => v.id))}>Remove top stage</button
    >
    <button id="launchClear" disabled={!stages.length} onclick={() => (launchUi.stages = [])}>Clear</button>
  </Bar>
  <Bar>
    <label class="pick"
      >Payload
      <select
        id="launchPayload"
        value={launchUi.payload}
        onchange={(e) => (launchUi.payload = e.currentTarget.value as 'none' | 'cargo' | 'ship')}
      >
        <option value="none">None</option>
        <option value="cargo">Cargo in the top stage</option>
        <option value="ship">A ship</option>
      </select></label
    >
    {#if launchUi.payload === 'cargo'}
      <label class="pick"
        >Material
        <select
          id="launchMaterial"
          value={launchUi.material}
          onchange={(e) => (launchUi.material = e.currentTarget.value)}
        >
          {#each stocked as m (m)}<option value={m}>{material(m).name}</option>{/each}
        </select></label
      >
      <Field label="Kilograms" bind:value={launchUi.amount} min={0} max={1e9} width={9} name="launchAmount" />
      <button
        id="launchCargoAdd"
        onclick={() =>
          (launchUi.cargo = {
            ...launchUi.cargo,
            [launchUi.material]: (launchUi.cargo[launchUi.material] ?? 0) + Math.max(0, launchUi.amount)
          })}>Add cargo</button
      >
      <button id="launchCargoClear" disabled={!cargoLines.length} onclick={() => (launchUi.cargo = {})}
        >Clear cargo</button
      >
    {:else if launchUi.payload === 'ship'}
      <label class="pick"
        >Ship
        <select
          id="launchShip"
          value={launchUi.ship}
          onchange={(e) => (launchUi.ship = e.currentTarget.value)}
        >
          <option value="">Choose</option>
          {#each payloadShips as v (v.id)}<option value={v.id}>{name(v)}</option>{/each}
        </select></label
      >
    {/if}
  </Bar>
  {#if launchUi.payload === 'cargo' && cargoLines.length}
    <p class="none" id="launchCargo">
      Cargo: {cargoLines.map(([m, kg]) => `${material(m).name} ${formatAmount(m, kg)}`).join(', ')}
    </p>
  {/if}
  {#if plan}
    <div id="launchPlan">
      <DefList
        two
        rows={[
          ['Lift-off mass', formatMass(plan.liftoffMass)],
          ['Lift-off thrust', `${(plan.liftoffThrust / 1e6).toFixed(2)} MN`],
          ['Thrust to weight', `${plan.twr.toFixed(2)}, first stage only`],
          ['Delta-v', `${(plan.dv / 1000).toFixed(2)} km/s of ${(plan.need / 1000).toFixed(2)} km/s`],
          ['Payload', formatMass(plan.payloadMass)],
          ['Left in orbit', formatMass(plan.leftover)],
          ['Propellant burned', formatMass(plan.burned)],
          [
            'Taken from stock',
            Object.entries(plan.draw)
              .slice(0, 3)
              .map(([m, kg]) => `${material(m).name} ${formatAmount(m, kg)}`)
              .join(', ')
          ]
        ]}
      />
    </div>
    {#if plan.reasons.length}
      <ul id="launchReasons">
        {#each plan.reasons as r, i (i)}<li>{r}</li>{/each}
      </ul>
    {/if}
    <Bar>
      <button id="launchGo" disabled={!plan.ok} onclick={go}>Launch</button>
    </Bar>
  {/if}
{/if}
<h3>Launches <small>{ships.launches.length}</small></h3>
{#if logRows.length}
  <div id="launchLog">
    <Table head={['Date', 'Stages', '>Payload', '>Propellant', 'Stages after']} rows={logRows} />
  </div>
{:else}
  <p class="none" id="launchNoneYet">Nothing has launched yet.</p>
{/if}

<style>
  .none {
    margin: 4px 0;
    color: var(--dim);
  }
  ul {
    margin: 4px 0;
    padding-left: 18px;
    color: var(--hot);
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
    max-width: 26ch;
  }
  button:disabled,
  select:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
