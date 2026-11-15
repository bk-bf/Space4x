<script lang="ts">
  import { Panel, ScreenGrid, Stack, Table, type Cell } from '#lib/ui/index.ts';
  import { duration, number } from './format.ts';
  import ProjectPanel from './ProjectPanel.svelte';
  import { POINTS_PER_LAB_YEAR, research, YEAR_SECONDS } from './research.svelte.ts';
  import { fieldLabel, techById } from './tech.ts';
  import TechTree from './TechTree.svelte';

  const bonusText = (b: number) => `+${Math.round(b * 100)}%`;
  const open = $derived(research.open());
  const openRows = $derived<Cell[][]>(
    open.map((t) => [
      t.name,
      fieldLabel(t.field),
      number(t.cost),
      t.needs.map((n) => techById(n)?.name ?? '').join(', ') || 'Nothing',
      duration((t.cost / POINTS_PER_LAB_YEAR) * YEAR_SECONDS)
    ])
  );
  const runningRows = $derived<Cell[][]>(
    research.running.map((p) => {
      const stalled = p.labs === 0;
      return [
        { text: techById(p.tech)?.name ?? '', warn: stalled },
        research.scientist(p.lead)?.name ?? '',
        { pct: Math.floor(research.fraction(p.tech) * 100) }
      ];
    })
  );
  const scientistRows = $derived<Cell[][]>(
    research.scientists.map((s) => {
      const used = research.labsOf(s.id);
      return [s.name, fieldLabel(s.field), used ? `${used} of ${s.capacity}` : 'Free', bonusText(s.bonus)];
    })
  );
  const labsLine = $derived(`${research.labsUsed} of ${research.totalLabs} labs busy`);
</script>

<ScreenGrid id="research" columns="minmax(0,1fr) 340px">
  <Stack>
    <TechTree />
    <Panel grow>
      {#snippet head()}Open projects <small>{open.length}</small>{/snippet}
      <Table
        head={['Project', 'Field', '>Cost', 'Needs', '>With 1 lab']}
        rows={openRows}
        keys={open.map((t) => t.id)}
        selected={open.findIndex((t) => t.id === research.selected)}
        onpick={(row) => research.select(open[row]!.id)}
      />
    </Panel>
  </Stack>
  <Stack>
    <Panel>
      {#snippet head()}Running <small id="labsLine">{labsLine}</small>{/snippet}
      <Table
        head={['Project', 'Lead', 'Done']}
        rows={runningRows}
        keys={research.running.map((p) => p.tech)}
        selected={research.running.findIndex((p) => p.tech === research.selected)}
        onpick={(row) => research.select(research.running[row]!.tech)}
      />
    </Panel>
    <ProjectPanel />
    <Panel title="Scientists" grow>
      <Table
        head={['Name', 'Field', '>Labs', '>Bonus']}
        rows={scientistRows}
        keys={research.scientists.map((s) => s.id)}
        selected={research.scientists.findIndex((s) => s.id === research.lead)}
        onpick={(row) => (research.lead = research.scientists[row]!.id)}
      />
    </Panel>
  </Stack>
</ScreenGrid>
