<script lang="ts">
  import { Panel, ScreenGrid, Stack, Table, type Cell } from '#lib/ui/index.ts';
  import Battlefield from './Battlefield.svelte';
  import FormationTree from './FormationTree.svelte';
  import { ground } from './ground.svelte.ts';
  import { menOf } from './model.ts';
  import UnitDetail from './UnitDetail.svelte';

  const units = $derived(ground.formation ? ground.unitsOf(ground.formation.id) : []);
  const rows = $derived<Cell[][]>(
    units.map((u) => [
      u.name,
      menOf(u).toLocaleString('en'),
      { pct: Math.round(u.strength) },
      { pct: Math.round(u.morale) },
      { pct: Math.round(u.supply) },
      u.stance
    ])
  );
</script>

<ScreenGrid id="ground" columns="260px minmax(0,1fr) 300px">
  <Panel title="Formations" body="col"><FormationTree /></Panel>
  <Stack>
    <Panel title={ground.formation?.name ?? 'No formation'} body="fill" grow><Battlefield /></Panel>
    <Panel title="Units">
      <Table
        head={['Unit', '>Men', 'Strength', 'Morale', 'Supply', 'Stance']}
        {rows}
        keys={units.map((u) => u.id)}
        selected={units.findIndex((u) => u.id === ground.unitId)}
        onpick={(r) => ground.selectUnit(units[r]!.id)}
      />
    </Panel>
  </Stack>
  <Panel title={ground.unit?.name ?? 'Unit'} body="col"><UnitDetail /></Panel>
</ScreenGrid>
