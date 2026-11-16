<script lang="ts">
  import { material } from '#lib/game/data/index.ts';
  import { DefList } from '#lib/ui/index.ts';
  import { PROPELLANTS, yardName, type Condition } from '#lib/game/shipdesign/index.ts';
  import { formatAmount, formatMass } from '#lib/screens/economy/format.ts';
  import { designer } from './designer.svelte.ts';
  import { formatAccel, formatDv, formatKw } from './facts.ts';

  const stats = $derived(designer.stats);

  const lift = (c: Condition, body: 'earth' | 'moon' | 'mars') =>
    `${c.thrustToWeight[body].toFixed(2)}${c.liftoff[body] ? ', lifts off' : ', too low'}`;

  const days = (d: number | undefined) => (d === undefined ? 'No crew' : `${Math.floor(d)} days`);

  const rows = $derived.by<[string, string][]>(() => {
    const s = stats;
    if (!s) return [];
    const carried = Object.entries(s.propellant)
      .filter(([, kg]) => kg > 0)
      .map(([k, kg]) => `${formatMass(kg)} ${PROPELLANTS[k as keyof typeof PROPELLANTS].name.toLowerCase()}`)
      .join(', ');
    return [
      ['Dry mass', formatMass(s.dryMass)],
      ['Propellant', carried || 'None'],
      ['Payload', s.payloadCapacity ? formatMass(s.payloadCapacity) : 'None'],
      ['Total mass', formatMass(s.loaded.mass)],
      ['Delta-v full', s.main ? formatDv(s.loaded.deltaV) : 'No drive'],
      ['Delta-v empty', s.main ? formatDv(s.empty.deltaV) : 'No drive'],
      ['Earth thrust/weight', s.main ? lift(s.loaded, 'earth') : 'No drive'],
      ['Moon thrust/weight', s.main ? lift(s.loaded, 'moon') : 'No drive'],
      ['Mars thrust/weight', s.main ? lift(s.loaded, 'mars') : 'No drive'],
      ['Acceleration', s.main ? formatAccel(s.loaded.acceleration) : 'No drive'],
      ['Crew', `${s.crew} of ${s.berths} berths`],
      ['Life support', days(s.endurance)],
      ['Power', `${formatKw(s.power.made)} made, ${formatKw(s.power.used)} used`],
      ['Heat', `${formatKw(s.heat.produced)} made, ${formatKw(s.heat.radiated)} shed`],
      ['Can be built at', s.builtAt.map(yardName).join(', ') || 'Nowhere']
    ];
  });

  const bill = $derived<[string, string][]>(
    Object.entries(stats?.cost ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, kg]) => [material(id).name, formatAmount(id, kg)])
  );
</script>

{#if stats}
  <DefList {rows} />
  {#if bill.length}
    <h3>Materials</h3>
    <table id="bill">
      <tbody>
        {#each bill as [name, amount] (name)}
          <tr><td>{name}</td><td class="n">{amount}</td></tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:else}
  <p class="none">No class is open.</p>
{/if}

<style>
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }
  td:first-child {
    white-space: normal;
    overflow-wrap: anywhere;
  }
  td {
    padding: 1px 0;
    vertical-align: top;
  }
  .n {
    width: 7ch;
    text-align: right;
    white-space: nowrap;
  }
  .none {
    margin: 0;
    color: var(--dim);
  }
</style>
