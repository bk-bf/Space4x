<script lang="ts">
  import {
    bearing,
    className,
    formatAu,
    formatEventTime,
    game,
    isColony,
    nearest,
    observers,
    type Body,
    type Contact,
    type Fleet
  } from '#lib/game/index.ts';
  import { bodyTypeOf } from '#lib/game/data/index.ts';
  import { economy } from '#lib/game/economy/index.ts';
  import { vesselById } from '#lib/game/ships/index.ts';
  import { peopleAt } from '#lib/screens/economy/lookup.ts';
  import { showColony } from '#lib/screens/economy/state.svelte.ts';
  import { intel } from '#lib/screens/intel/intel.svelte.ts';
  import { DefList, Meter, PixelCanvas, shell, Table, Window, type Cell } from '#lib/ui/index.ts';
  import BaseSelection from './BaseSelection.svelte';
  import { flyTo } from './camera.svelte';
  import ShipSelection from './ShipSelection.svelte';
  import { asteroidRows, surveyText } from './bodyFacts';
  import RegionsPanel from './RegionsPanel.svelte';
  import { resourcesOf } from './resources';
  import { drawSelection, PICTURE_H, PICTURE_W } from './selectionPicture';

  const TRACK_ROWS = 4;

  const sel = $derived(game.selection);
  const fleet = $derived(sel.kind === 'fleet' ? game.fleet(sel.id) : undefined);
  const body = $derived(sel.kind === 'body' ? game.body(sel.id) : undefined);
  const contact = $derived(sel.kind === 'contact' ? game.contact(sel.id) : undefined);
  const site = $derived(sel.kind === 'site' ? game.site(sel.id) : undefined);
  const vessel = $derived(sel.kind === 'ship' ? vesselById(sel.id) : undefined);
  const base = $derived(sel.kind === 'base' ? economy.sites.find((s) => s.id === sel.id) : undefined);
  const heading = $derived(
    fleet?.name ??
      vessel?.name ??
      base?.name ??
      body?.name ??
      site?.name ??
      (contact ? 'Contact ' + contact.id : 'Selection')
  );

  const km = (n: number) => `${n.toLocaleString('en')} km/s`;
  const systemName = (id: string) => game.starSystem(id)?.name ?? '';

  function openColony(b: Body) {
    showColony(b.id);
    shell.setScreen('economy');
  }

  function openIntel(c: Contact) {
    intel.showContact(c.id);
    shell.setScreen('intel');
  }

  function fleetFacts(f: Fleet): [string, string][] {
    const rows: [string, string][] = [['Doing', f.activity]];
    if (f.kind === 'civ')
      rows.push(
        ['Cargo', f.cargo ? 'From ' + (game.body(f.cargo)?.name ?? '?') : 'Empty'],
        ['System', systemName(f.system)]
      );
    return rows;
  }

  function bodyFacts(b: Body): [string, string][] {
    return [
      ['Kind', b.facts.kind],
      ['Gravity', b.facts.gravity],
      ['Surface', b.facts.surface],
      ['Air', b.facts.air],
      ['Size', b.facts.size],
      ['People', peopleAt(b.id)],
      ['Survey', surveyText(b)],
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
    return fleet.orders.map((o, i): Cell[] => [
      i + 1,
      `${o.type} ${game.body(o.target)?.name ?? o.target}`,
      ''
    ]);
  });
  const resources = $derived(body ? resourcesOf(body.id) : '');
  const regional = $derived(!!body && !!bodyTypeOf(body.id) && bodyTypeOf(body.id) !== 'earth');
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
      {#if fleet.orders.length}
        <Table rows={orderRows} numeric={[false, false, true]} />
      {:else}
        <Table rows={[['-', 'No orders', '']]} numeric={[false, false, true]} />
      {/if}
    {:else if vessel}
      <ShipSelection {vessel} />
    {:else if base}
      <BaseSelection site={base} />
    {:else if body}
      <DefList two rows={bodyFacts(body)} />
      {#if asteroidRows(body).length}<div id="asteroidFacts"><DefList rows={asteroidRows(body)} /></div>{/if}
      {#if regional}
        <RegionsPanel world={body.id} />
      {:else}
        <h3>Resources</h3>
        <p class="res" id="resources">{resources}</p>
      {/if}
      <div class="add">
        <button data-go="show" onclick={() => flyTo(body.id)}>Show</button>
        {#if isColony(body)}
          <button data-go="economy" onclick={() => openColony(body)}>Economy</button>
        {/if}
      </div>
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
  button:disabled {
    color: var(--dim);
    cursor: default;
    background: var(--panel);
  }
</style>
