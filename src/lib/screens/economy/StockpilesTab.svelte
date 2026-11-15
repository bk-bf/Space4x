<script lang="ts">
  import type { Colony } from '#lib/game/types.ts';
  import { Table, type Cell } from '#lib/ui/index.ts';
  import { buildClasses, COMPONENTS, INSTALLATIONS, MINERALS } from './catalog.ts';
  import Cols from './Cols.svelte';
  import { formatCount, formatSigned, formatTons, formatYears } from './format.ts';
  import { annualUse, fuelOutput, mineOutput } from './sim.ts';
  import { economy } from './state.svelte.ts';

  let { colony }: { colony: Colony } = $props();

  const fill = (stock: number) => Math.min(100, Math.round((stock / colony.target) * 100));
  const cover = (stock: number, use: number, made: number) =>
    use > made ? formatYears(stock / (use - made)) : 'growing';

  const mineralRows = $derived<Cell[][]>([
    ...MINERALS.map((m) => {
      const made = mineOutput(colony, m.id, economy);
      const use = annualUse(colony, m.id, economy);
      return [
        m.name,
        formatTons(colony.stock[m.id]),
        { pct: fill(colony.stock[m.id]) },
        formatCount(made),
        formatCount(use),
        { text: formatSigned(made - use), warn: made < use },
        cover(colony.stock[m.id], use, made)
      ];
    }),
    (() => {
      const made = fuelOutput(colony, economy);
      const use = colony.draw.fuel;
      return [
        'Fuel',
        formatTons(colony.fuel),
        { pct: fill(colony.fuel) },
        formatCount(made),
        formatCount(use),
        { text: formatSigned(made - use), warn: made < use },
        cover(colony.fuel, use, made)
      ];
    })()
  ]);

  const queued = (id: string) =>
    colony.queue.filter((o) => o.item === id).reduce((a, o) => a + o.quantity, 0);

  const componentRows = $derived<Cell[][]>(
    COMPONENTS.map((c) => [c.name, colony.components[c.id], queued(c.id)])
  );
  const installationRows = $derived<Cell[][]>(
    INSTALLATIONS.map((i) => [i.name, colony.installations[i.id], queued(i.id)])
  );
  const shipRows = $derived<Cell[][]>(buildClasses().map((c) => [c.name, c.role, colony.built[c.id] ?? 0]));
</script>

<h3>Minerals and fuel</h3>
<Table
  head={['Mineral', '>Stock, t', 'Against target', '>Mined a year', '>Used a year', '>Balance', '>Cover']}
  rows={mineralRows}
/>
<Cols columns="1fr 1fr">
  <div>
    <h3>Components</h3>
    <Table head={['Component', '>Held', '>Queued']} rows={componentRows} />
    <h3>Ships delivered</h3>
    <Table head={['Class', 'Role', '>Delivered']} rows={shipRows} />
  </div>
  <div>
    <h3>Installations</h3>
    <Table head={['Installation', '>Held', '>Queued']} rows={installationRows} />
  </div>
</Cols>
