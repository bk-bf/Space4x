<script lang="ts">
  import { materials } from '#lib/game/data/index.ts';
  import { flowsOf, isStockless, type Site } from '#lib/game/economy/index.ts';
  import { Table, type Cell } from '#lib/ui/index.ts';
  import { categoryName, formatAmount, formatDays, formatSignedAmount } from './format.ts';
  import { coverDays } from './view.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));

  const used = (id: string) => (flows.consumed[id] ?? 0) + (flows.eaten[id] ?? 0);

  const sections = $derived.by(() => {
    const by: Record<string, Cell[][]> = {};
    for (const m of materials) {
      const stock = site.stock[m.id] ?? 0;
      const made = flows.produced[m.id] ?? 0;
      const use = used(m.id);
      if (stock <= 0 && made <= 0 && use <= 0) continue;
      const net = made - use;
      const days = coverDays(site, flows, m.id);
      const rows = (by[m.category] ??= []);
      rows.push([
        m.name,
        isStockless(m.id) ? '-' : formatAmount(m.id, stock),
        formatAmount(m.id, made * 24),
        formatAmount(m.id, use * 24),
        { text: formatSignedAmount(m.id, net * 24), warn: net < -1e-9 },
        isStockless(m.id)
          ? made + 1e-9 >= use
            ? 'enough'
            : { text: 'short', warn: true }
          : Number.isFinite(days)
            ? { text: formatDays(days), warn: days < 365 }
            : stock <= 0 && use > made - 1e-9 && use > 0
              ? { text: 'none', warn: true }
              : 'growing'
      ]);
    }
    return Object.entries(by).sort(([a], [b]) => categoryName(a).localeCompare(categoryName(b)));
  });
</script>

<div id="stockpiles">
  {#each sections as [category, rows] (category)}
    <h3>{categoryName(category)}</h3>
    <Table head={['Material', '>Stock', '>Made a day', '>Used a day', '>Balance a day', '>Cover']} {rows} />
  {/each}
</div>
