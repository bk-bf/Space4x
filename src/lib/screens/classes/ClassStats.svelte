<script lang="ts">
  import { DefList } from '#lib/ui/index.ts';
  import { designStats, weaponSummary } from '#lib/game/design.ts';
  import { designer } from './designer.svelte.ts';

  const stats = $derived(designStats(designer.draft));
  const number = (n: number, unit: string) => `${n.toLocaleString('en')} ${unit}`;
  const rows = $derived<[string, string][]>([
    ['Mass', number(stats.mass, 't')],
    ['Length', number(stats.length, 'm')],
    ['Sections', String(stats.sections)],
    ['Hardpoints', String(stats.hardpoints)],
    ['Crew', number(stats.crew, '')],
    ['Fuel', number(stats.fuel, 'kL')],
    ['Armour', stats.armour ? String(stats.armour) : 'None'],
    ['Cargo', stats.cargo ? number(stats.cargo, 't') : 'None'],
    ['Weapons', weaponSummary(stats.weapons)]
  ]);
</script>

<div class="big" id="dSpeed">{stats.speed ? number(stats.speed, 'km/s') : 'No drive'}</div>
<DefList {rows} />
