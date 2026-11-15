<script lang="ts">
  import {
    addOrder,
    bearing,
    className,
    clearOrders,
    formatAu,
    fleetSpeed,
    formatEventTime,
    game,
    isColony,
    moveOrder,
    nearest,
    observers,
    ORDER_TYPES,
    orderEtas,
    orderLabel,
    orderTargets,
    orderTypesFor,
    removeOrder,
    type Body,
    type Contact,
    type Fleet,
    type OrderType
  } from '#lib/game/index.ts';
  import { peopleAt } from '#lib/screens/economy/lookup.ts';
  import { showColony } from '#lib/screens/economy/state.svelte.ts';
  import { intel } from '#lib/screens/intel/intel.svelte.ts';
  import { DefList, Meter, PixelCanvas, shell, Table, Window, type Cell } from '#lib/ui/index.ts';
  import { flyTo } from './camera.svelte';
  import { resourcesOf } from './resources';
  import { drawSelection, PICTURE_H, PICTURE_W } from './selectionPicture';

  const TRACK_ROWS = 4;

  const sel = $derived(game.selection);
  const fleet = $derived(sel.kind === 'fleet' ? game.fleet(sel.id) : undefined);
  const body = $derived(sel.kind === 'body' ? game.body(sel.id) : undefined);
  const contact = $derived(sel.kind === 'contact' ? game.contact(sel.id) : undefined);
  const site = $derived(sel.kind === 'site' ? game.site(sel.id) : undefined);
  const heading = $derived(
    fleet?.name ?? body?.name ?? site?.name ?? (contact ? 'Contact ' + contact.id : 'Selection')
  );

  let chosenType = $state<OrderType>('move');
  let chosenTarget = $state('');
  let picked = $state({ fleet: '', index: 0 });

  const types = $derived(fleet ? orderTypesFor(fleet) : []);
  const type = $derived(types.includes(chosenType) ? chosenType : 'move');
  const targets = $derived(fleet ? orderTargets(game, fleet, type) : []);
  const target = $derived(targets.some((t) => t.id === chosenTarget) ? chosenTarget : (targets[0]?.id ?? ''));
  const count = $derived(fleet?.orders.length ?? 0);
  const row = $derived(
    fleet && picked.fleet === fleet.id ? Math.max(0, Math.min(picked.index, count - 1)) : 0
  );

  const pick = (f: Fleet, index: number) => (picked = { fleet: f.id, index });
  const km = (n: number) => `${n.toLocaleString('en')} km/s`;
  const systemName = (id: string) => game.starSystem(id)?.name ?? '';

  function openColony(b: Body, screen: 'colony' | 'economy') {
    showColony(b.id);
    shell.setScreen(screen);
  }

  function openIntel(c: Contact) {
    intel.showContact(c.id);
    shell.setScreen('intel');
  }

  function add(f: Fleet) {
    if (!target) return;
    addOrder(f, type, target);
    pick(f, f.orders.length - 1);
  }

  function fleetFacts(f: Fleet): [string, string][] {
    const rows: [string, string][] = [
      ['Doing', f.activity],
      ['Speed', km(fleetSpeed(f))]
    ];
    if (f.kind === 'civ')
      rows.push(
        ['Cargo', f.cargo ? 'From ' + (game.body(f.cargo)?.name ?? '?') : 'Empty'],
        ['System', systemName(f.system)]
      );
    return rows;
  }

  function bodyFacts(b: Body): [string, string][] {
    const surveying = game.world.fleets.find(
      (f) => f.orders[0]?.type === 'survey' && f.orders[0].target === b.id
    );
    return [
      ['Kind', b.facts.kind],
      ['Gravity', b.facts.gravity],
      ['Surface', b.facts.surface],
      ['Air', b.facts.air],
      ['Size', b.facts.size],
      ['People', peopleAt(b.id)],
      ['Survey', b.surveyed ? 'Done' : surveying ? 'Under way' : 'None'],
      ['System', systemName(b.system)]
    ];
  }

  function contactHeading(c: Contact): string {
    if (!c.route.length || c.speedKmS <= 0) return '-';
    const [tx, ty] = c.route[c.leg % c.route.length]!;
    return bearing(c, tx, ty) + '°';
  }

  function contactFacts(c: Contact): [string, string][] {
    return [
      ['Kind', c.kind],
      ['Signal', c.signal],
      ['Range', c.range],
      ['Last seen', c.fixes.length ? formatEventTime(c.fixes.at(-1)!.at, game.time) : c.seen],
      ['Speed', c.speedKmS > 0 ? km(c.speedKmS) : 'At rest'],
      ['Heading', contactHeading(c)],
      ['Size', c.hostile ? '9,000 t est.' : 'Small'],
      ['Tracked', c.held ? 'Yes' : 'Lost']
    ];
  }

  function trackRows(c: Contact): Cell[][] {
    const eyes = observers(game, c.system);
    return c.fixes
      .slice(-TRACK_ROWS)
      .reverse()
      .map((fix) => {
        const near = nearest(eyes, fix.x, fix.y);
        return [
          formatEventTime(fix.at, game.time),
          near ? bearing(near.o, fix.x, fix.y) + '°' : '-',
          near ? formatAu(near.d) : '-'
        ];
      });
  }

  const shipRows = $derived(
    (fleet?.ships ?? []).map((s): Cell[] => [
      s.name,
      className(s.classId),
      { meter: Math.round(s.fuel) },
      { text: s.status, warn: s.status === 'Low fuel' || s.status === 'Out of fuel' }
    ])
  );
  const orderRows = $derived.by(() => {
    if (!fleet) return [];
    const etas = orderEtas(game, fleet);
    return fleet.orders.map((o, i): Cell[] => [i + 1, orderLabel(game, o), etas[i]!]);
  });
  const resources = $derived(body ? resourcesOf(body.id) : '');
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
          <div><small>{name} {Math.round(v)}%</small><Meter value={Math.round(v)} wide /></div>
        {/each}
      </div>
      <DefList two rows={fleetFacts(fleet)} />
      <h3>Ships</h3>
      <Table head={['Ship', 'Class', 'Fuel', '>Status']} rows={shipRows} />
      <h3>Orders</h3>
      {#if count}
        <Table
          rows={orderRows}
          keys={fleet.orders.map((o) => 'order:' + o.id)}
          selected={row}
          onpick={(i) => pick(fleet, i)}
          numeric={[false, false, true]}
        />
      {:else}
        <Table rows={[['-', 'No orders', '']]} numeric={[false, false, true]} />
      {/if}
      <div class="add" id="queue">
        <button data-act="up" disabled={row <= 0} onclick={() => pick(fleet, moveOrder(fleet, row, -1))}
          >Up</button
        ><button
          data-act="down"
          disabled={row >= count - 1}
          onclick={() => pick(fleet, moveOrder(fleet, row, 1))}>Down</button
        ><button data-act="remove" disabled={!count} onclick={() => removeOrder(fleet, row)}>Remove</button
        ><button data-act="clear" disabled={!count} onclick={() => clearOrders(fleet)}>Clear</button>
      </div>
      <div class="add">
        <select id="oAct" value={type} onchange={(e) => (chosenType = e.currentTarget.value as OrderType)}>
          {#each ORDER_TYPES.filter((o) => types.includes(o.type)) as o (o.type)}<option value={o.type}
              >{o.label}</option
            >{/each}
        </select><select id="oDst" value={target} onchange={(e) => (chosenTarget = e.currentTarget.value)}>
          {#each targets as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select><button data-act="order" disabled={!target} onclick={() => add(fleet)}>Add</button>
      </div>
    {:else if body}
      <DefList two rows={bodyFacts(body)} />
      <h3>Resources</h3>
      <p class="res" id="resources">{resources}</p>
      {#if isColony(body)}
        <div class="add">
          <button data-go="colony" onclick={() => openColony(body, 'colony')}>Colony</button><button
            data-go="economy"
            onclick={() => openColony(body, 'economy')}>Economy</button
          >
        </div>
      {/if}
    {:else if site}
      <p class="mock" id="siteMock"><span class="tag">mock scene</span></p>
      <DefList rows={site.facts} />
      <div class="add">
        <button data-go="watch" onclick={() => flyTo(site.id)}>Watch</button>
      </div>
    {:else if contact}
      <DefList rows={contactFacts(contact)} />
      <h3>Track</h3>
      <Table head={['Time', 'Bearing', '>Range']} rows={trackRows(contact)} />
      <div class="add">
        <button data-go="intel" onclick={() => openIntel(contact)}>Intelligence</button>
      </div>
    {/if}
  </div>
</Window>

<style>
  .mock {
    margin: 0;
  }
  .res {
    margin: 0;
  }
  #queue button {
    flex: 1;
  }
  button:disabled {
    color: var(--dim);
    cursor: default;
    background: var(--panel);
  }
</style>
