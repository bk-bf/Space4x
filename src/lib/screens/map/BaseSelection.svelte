<script lang="ts">
  import { building, region } from '#lib/game/data/index.ts';
  import { berthsOf, flowsOf, type Site } from '#lib/game/economy/index.ts';
  import { game } from '#lib/game/index.ts';
  import { ships } from '#lib/game/ships/index.ts';
  import { formatPower } from '#lib/screens/economy/format.ts';
  import { siteKind } from '#lib/screens/economy/lookup.ts';
  import { ui } from '#lib/screens/economy/state.svelte.ts';
  import { DefList, shell } from '#lib/ui/index.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const docked = $derived(
    ships.vessels.filter((v) => !v.trip && v.at.kind === 'site' && v.at.site === site.id)
  );
  const made = $derived(
    site.groups.map((g) => `${g.count} ${building(g.building).name.toLowerCase()}`).join(', ')
  );
  const facts = $derived<[string, string][]>([
    ['Kind', siteKind(site)],
    ['Around', game.placeName(site.worldBody) ?? site.worldBody],
    ...(site.region ? [['Region', region(site.region)?.name ?? ''] as [string, string]] : []),
    ['People', `${Math.round(site.population)} of ${berthsOf(site) ?? 0} berths`],
    ['Fed', `${Math.round(flows.food.cover * 100)}%`],
    ['Power', `${formatPower(flows.power.used)} of ${formatPower(flows.power.supply)}`],
    ['Buildings', made || 'None'],
    ['Docked', docked.length ? docked.map((v) => v.name).join(', ') : 'No ships']
  ]);

  function open(tab: 'summary' | 'ships') {
    ui.site = site.id;
    ui.tab = tab;
    shell.setScreen('economy');
  }
</script>

<DefList rows={facts} />
<div class="add">
  <button data-go="economy" onclick={() => open('summary')}>Economy</button>
  <button data-go="ships" onclick={() => open('ships')}>Ships</button>
</div>
