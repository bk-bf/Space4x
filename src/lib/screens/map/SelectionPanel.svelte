<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { hash } from '#lib/gfx/math.ts';
  import { DefList, Meter, PixelCanvas, shell, Table, Window, type Cell } from '#lib/ui/index.ts';
  import { drawSelection, PICTURE_H, PICTURE_W } from './selectionPicture';

  const ACTIONS = ['Move to', 'Survey', 'Load cargo at', 'Unload at', 'Refuel at', 'Orbit'];
  const MINERALS = ['Iron', 'Titanium', 'Copper', 'Uranium'];

  const sel = $derived(game.selection);
  const fleet = $derived(sel.kind === 'fleet' ? game.fleet(sel.id) : undefined);
  const body = $derived(sel.kind === 'body' ? game.body(sel.id) : undefined);
  const contact = $derived(sel.kind === 'contact' ? game.contact(sel.id) : undefined);
  const heading = $derived(fleet?.name ?? body?.name ?? (contact ? 'Contact ' + contact.id : 'Selection'));
  const destinations = $derived([...game.world.bodies.map((b) => b.name), 'Jump point A']);

  let action = $state(ACTIONS[0]!);
  let destination = $state('Mercury');

  function addOrder() {
    fleet?.orders.push(`${action} ${destination}`);
  }

  const shipRows = $derived(
    (fleet?.ships ?? []).map((s): Cell[] => [
      s.name,
      s.className,
      { meter: s.fuel },
      { text: s.status, warn: s.status === 'Low fuel' }
    ])
  );
  const orderRows = $derived((fleet?.orders ?? []).map((o, i): Cell[] => [i + 1, o, `+${(i + 1) * 3} d`]));
  const depositRows = $derived(
    body
      ? MINERALS.map((n, i): Cell[] => {
          const access = Math.round(hash(body.orbit, i, 3) * 90 + 5);
          return [
            n,
            `${Math.round(hash(body.orbit, i, 7) * 900 + 20)}k`,
            { meter: access, label: (access / 100).toFixed(1) }
          ];
        })
      : []
  );
</script>

<Window
  id="sel"
  title="Selection"
  icon="eye"
  home="right"
  width={310}
  {heading}
  floatAt={(w) => [w - 310 - 14, 10]}
>
  <PixelCanvas
    id="selPic"
    class="pic"
    width={PICTURE_W}
    height={PICTURE_H}
    scale={2}
    vignette={0.55}
    bg="stars"
    draw={(f, t) => drawSelection(f, game, sel, t)}
  />
  <div id="selBody">
    {#if fleet}
      <div class="row3">
        {#each [['Fuel', fleet.meters.fuel], ['Supplies', fleet.meters.supplies], ['Crew', fleet.meters.crew]] as const as [name, v] (name)}
          <div><small>{name} {v}%</small><Meter value={v} wide /></div>
        {/each}
      </div>
      <h3>Ships</h3>
      <Table head={['Ship', 'Class', 'Fuel', '>Status']} rows={shipRows} />
      <h3>Orders</h3>
      <Table rows={orderRows} selected={0} numeric={[false, false, true]} />
      <div class="add">
        <select id="oAct" bind:value={action}>
          {#each ACTIONS as a (a)}<option>{a}</option>{/each}
        </select><select id="oDst" bind:value={destination}>
          {#each destinations as d (d)}<option>{d}</option>{/each}
        </select><button data-act="order" onclick={addOrder}>Add</button>
      </div>
    {:else if body}
      <DefList
        two
        rows={[
          ['Kind', body.facts.kind],
          ['Gravity', body.facts.gravity],
          ['Surface', body.facts.surface],
          ['Air', body.facts.air],
          ['Size', body.facts.size],
          ['People', body.facts.people]
        ]}
      />
      <h3>Deposits</h3>
      <Table head={['Mineral', '>Tons', 'Access']} rows={depositRows} />
      {#if body.facts.people !== 'None'}
        <div class="add">
          <button data-go="colony" onclick={() => shell.setScreen('colony')}>Colony</button><button
            data-go="economy"
            onclick={() => shell.setScreen('economy')}>Economy</button
          >
        </div>
      {/if}
    {:else if contact}
      <DefList
        two
        rows={[
          ['Kind', contact.kind],
          ['Signal', contact.signal],
          ['Range', contact.range],
          ['Last seen', contact.seen],
          ['Speed', contact.hostile ? '1,900 km/s' : 'At rest'],
          ['Size', contact.hostile ? '9,000 t est.' : 'Small']
        ]}
      />
      <h3>Track</h3>
      <Table
        head={['Time', 'Bearing', '>Range']}
        rows={[
          ['04:12', '211°', contact.range],
          ['01:30', '214°', '3.4 AU'],
          ['Yesterday', '220°', '4.0 AU']
        ]}
      />
      {#if contact.hostile}
        <div class="add">
          <button data-go="intel" onclick={() => shell.setScreen('intel')}>Intelligence</button>
        </div>
      {/if}
    {/if}
  </div>
</Window>
