<script lang="ts">
  import { className, game } from '#lib/game/index.ts';
  import { orderLabel, statsOf, type Vessel } from '#lib/game/ships/index.ts';
  import { ui } from '#lib/screens/economy/state.svelte.ts';
  import {
    cargoText,
    dateText,
    dayText,
    propellantText,
    vesselWhere,
    whereabouts
  } from '#lib/screens/economy/shipsView.ts';
  import { DefList, fmt, shell, Table, type Cell } from '#lib/ui/index.ts';

  let { vessel }: { vessel: Vessel } = $props();

  const stats = $derived(statsOf(vessel));
  const facts = $derived<[string, string][]>([
    ['Design', className(vessel.design)],
    ['Where', vesselWhere(vessel)],
    ['Propellant', propellantText(vessel)],
    ['Cargo', cargoText(vessel)],
    ['Crew', `${vessel.crew} of ${stats?.berths ?? 0} berths`],
    ['Dry mass', fmt.mass(stats?.dryMass ?? 0)]
  ]);
  const trip = $derived(vessel.trip);
  const tripFacts = $derived<[string, string][]>(
    trip
      ? [
          ['To', whereabouts(trip.to)],
          ['Plan', trip.profile],
          ['Leaves', trip.departure > game.elapsed ? dateText(trip.departure) : 'Under way'],
          ['Arrives', dateText(trip.arrival)],
          ['Duration', dayText(trip.arrival - trip.departure)],
          ['Delta-v', `${(trip.dv / 1000).toFixed(2)} km/s`],
          ['Burns', fmt.mass(trip.propellant)]
        ]
      : []
  );
  const orders = $derived<Cell[][]>(vessel.orders.map((o, i) => [i + 1, orderLabel(game, o)]));

  function manage() {
    ui.vessel = vessel.id;
    ui.tab = 'ships';
    shell.setScreen('economy');
  }
</script>

<DefList rows={facts} />
{#if vessel.blocked}<p class="warn" id="shipBlocked">{vessel.blocked}</p>{/if}
{#if trip}
  <h3>Trip</h3>
  <div id="shipTrip"><DefList rows={tripFacts} /></div>
{/if}
<h3>Orders</h3>
<div id="shipOrders">
  {#if orders.length}
    <Table rows={orders} numeric={[true, false]} />
  {:else}
    <Table rows={[['-', 'No orders']]} numeric={[true, false]} />
  {/if}
</div>
<div class="add">
  <button data-go="ships" onclick={manage}>Orders and trips</button>
</div>

<style>
  .warn {
    margin: 4px 0;
    color: var(--hot);
  }
</style>
