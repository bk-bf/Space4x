<script lang="ts">
  import { building, material, milestone, shipComponent } from '#lib/game/data/index.ts';
  import {
    economy,
    missingFor,
    opensRecords,
    process,
    programmeBill,
    programmeCompute,
    programmeDays,
    programmeStatus,
    runningProgramme,
    standing,
    startProgramme,
    touch,
    type Site
  } from '#lib/game/economy/index.ts';
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import { formatAmount, formatCount, formatDays } from './format.ts';
  import { statusCell, tierName } from './milestones.ts';

  let { site, number, bill = true }: { site: Site; number: number; bill?: boolean } = $props();

  const m = $derived(milestone(number));
  const status = $derived(programmeStatus(economy, site, m));
  const running = $derived(runningProgramme(economy, number));
  const missing = $derived(missingFor(economy, site, m));
  const opened = $derived(opensRecords(number));
  const statusText = $derived.by(() => {
    const c = statusCell(economy, site, m);
    return typeof c === 'object' && c && 'text' in c ? String(c.text) : '';
  });

  const billRows = $derived<Cell[][]>(
    Object.entries(programmeBill(m)).map(([id, need]) => {
      const have = site.stock[id] ?? 0;
      return [material(id).name, formatAmount(id, need), { text: formatAmount(id, have), warn: have < need }];
    })
  );

  const needRows = $derived<Cell[][]>([
    ...m.needs.buildings.map((id): Cell[] => {
      const n = economy.sites.reduce((a, x) => a + standing(x, id), 0);
      return [building(id).name, 'Building', { text: n > 0 ? formatCount(n) : 'None', warn: n <= 0 }];
    }),
    ...m.needs.components.map((id): Cell[] => {
      const c = shipComponent(id);
      const ok = c.builtAt.some((b) => standing(site, b) > 0);
      return [c.name, 'Part', { text: ok ? 'Can build' : 'No builder', warn: !ok }];
    })
  ]);

  const opensText = $derived(
    [
      ...opened.buildings.map((b) => b.name),
      ...opened.recipes.map((r) => process(r.id, site.body).name),
      ...opened.components.map((c) => c.name)
    ].join(', ') || 'Nothing more'
  );

  function start() {
    if (startProgramme(economy, site, number)) touch();
  }
</script>

<div id="milestoneDetail">
  <h3>{m.number}. {m.name}</h3>
  <DefList
    rows={[
      ['Tier', tierName(m.tier)],
      ['Gives', m.unlocks],
      ['Needs first', m.requires.map((r) => `${r}. ${milestone(r).name}`).join(', ') || 'Nothing'],
      [
        'Programme',
        `${formatDays(programmeDays(m))}${programmeCompute(m) ? `, ${formatCount(programmeCompute(m))} cu an hour` : ''}`
      ],
      ['Status', statusText],
      ['Opens', opensText]
    ]}
  />
  {#if status === 'ready'}
    <button id="programmeStart" onclick={start}>Start programme</button>
  {:else if status === 'running' && running}
    <p class="run">
      Running, {Math.floor(running.progress * 100)}% done, {formatDays(
        (1 - running.progress) * programmeDays(m)
      )} left
    </p>
  {:else if status === 'waiting'}
    <p class="warn">
      {missing.length}
      {missing.length === 1 ? 'thing' : 'things'} missing before it can start
    </p>
  {/if}
  {#if bill && status !== 'done' && status !== 'running'}
    <h3>Bill <small>spent when it starts, placeholder amounts</small></h3>
    <Table head={['Material', '>Needed', '>In stock']} rows={billRows} />
    {#if needRows.length}
      <h3>Standing</h3>
      <Table head={['Needs', 'Kind', '>Have']} rows={needRows} />
    {/if}
  {/if}
</div>

<style>
  .warn {
    margin: 2px 0;
    color: var(--hot);
  }
  .run {
    margin: 2px 0;
    color: var(--accent);
  }
  #programmeStart {
    margin-left: 0;
  }
</style>
