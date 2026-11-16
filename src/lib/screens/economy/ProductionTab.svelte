<script lang="ts">
  import { material } from '#lib/game/data/index.ts';
  import {
    assign,
    economy,
    flowsOf,
    isExtraction,
    POWER,
    process,
    setOn,
    touch,
    unlockedProcesses,
    type GroupActor,
    type Site
  } from '#lib/game/economy/index.ts';
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import Bar from './Bar.svelte';
  import Field from './Field.svelte';
  import { formatAmount, formatCount, formatPercent, formatPower } from './format.ts';
  import { ui } from './state.svelte.ts';
  import { buildingName, limitText, mainOutput } from './view.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const actors = $derived(flows.actors.filter((a): a is GroupActor => a.kind === 'group'));
  const selIndex = $derived(actors.findIndex((a) => a.group.id === ui.group));
  const sel = $derived(selIndex >= 0 ? actors[selIndex] : undefined);
  const choices = $derived(sel ? unlockedProcesses(economy, site, sel.group.building) : []);
  let picked = $state('');
  let count = $state(1);
  const others = $derived(choices.filter((p) => p.id !== sel?.group.process));
  const target = $derived(others.find((p) => p.id === picked) ?? others[0]);

  function status(a: GroupActor): Cell {
    if (a.limit && a.share < 1 - 1e-9) return { text: limitText(a.limit), warn: a.limit.kind !== 'off' };
    return 'Running';
  }

  const makes = (a: GroupActor): string => {
    if (!a.group.process) return '-';
    const out = mainOutput(site, a.group.process);
    if (!out) return a.outputs[POWER] ? formatPower((a.outputs[POWER] ?? 0) * a.share) : '-';
    return `${formatAmount(out, (a.outputs[out] ?? 0) * a.share * 24)} ${material(out).name}`;
  };

  const rows = $derived<Cell[][]>(
    actors.map((a) => [
      buildingName(a.group.building),
      a.group.process ? process(a.group.process, site.body).name : 'None',
      formatCount(a.group.count),
      a.group.process && isExtraction(a.group.process) ? a.grade.toFixed(2) : '-',
      a.group.process ? { pct: Math.round(a.share * 100) } : '-',
      makes(a),
      status(a)
    ])
  );

  function pick(row: number) {
    const a = actors[row];
    if (!a) return;
    ui.group = a.group.id;
    count = a.group.count;
    picked = '';
  }

  function switchRecipe() {
    if (!sel || !target) return;
    const made = assign(economy, site, sel.group.id, target.id, count);
    if (made) {
      ui.group = made.id;
      count = made.count;
    }
    picked = '';
    touch();
  }

  function toggle() {
    if (!sel) return;
    setOn(site, sel.group.id, !sel.group.on);
    touch();
  }

  const flowRows = $derived<[string, string][]>(
    sel?.group.process
      ? [
          ...Object.entries(sel.inputs)
            .filter(([m]) => m !== POWER)
            .map(([m, v]): [string, string] => [
              `Uses ${material(m).name}`,
              `${formatAmount(m, v * sel.share * 24)} a day`
            ]),
          ...Object.entries(sel.outputs)
            .filter(([m]) => m !== POWER)
            .map(([m, v]): [string, string] => [
              `Makes ${material(m).name}`,
              `${formatAmount(m, v * sel.share * 24)} a day`
            ]),
          ...(isExtraction(sel.group.process) ? [['Grade', sel.grade.toFixed(2)] as [string, string]] : []),
          ['Power', formatPower((sel.inputs[POWER] ?? 0) * sel.share)],
          ['Running', formatPercent(sel.share)]
        ]
      : []
  );
</script>

<Bar>
  {#if sel}
    <span class="chosen" id="chosenGroup">{buildingName(sel.group.building)}</span>
    <span class="gap"></span>
    <label class="pick"
      >Recipe
      <select
        id="recipePick"
        value={target?.id ?? ''}
        onchange={(e) => (picked = e.currentTarget.value)}
        disabled={others.length < 1}
      >
        {#each others as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
      </select></label
    >
    <Field label="How many" bind:value={count} max={sel.group.count} width={9} name="switchCount" />
    <button id="recipeSwitch" disabled={!target || target.id === sel.group.process} onclick={switchRecipe}
      >Switch</button
    >
    <button id="groupToggle" onclick={toggle}>{sel.group.on ? 'Switch off' : 'Switch on'}</button>
  {:else}
    <span class="none">Pick a row to change its recipe or switch it off.</span>
  {/if}
</Bar>
{#if flowRows.length}
  <h3>{sel ? process(sel.group.process ?? '', site.body).name : ''}</h3>
  <DefList two rows={flowRows} />
{/if}

<h3>Buildings <small>{actors.length} groups</small></h3>
<div id="groups">
  <Table
    head={['Building', 'Recipe', '>Count', '>Grade', 'Running', 'Makes a day', 'Status']}
    {rows}
    selected={selIndex}
    keys={actors.map((a) => String(a.group.id))}
    onpick={pick}
  />
</div>

<style>
  .none {
    color: var(--dim);
    margin: 2px 4px;
  }
  .chosen {
    color: var(--accent);
    margin: 0 8px;
  }
  .pick {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 2px 4px;
    color: var(--dim);
  }
  .pick select {
    color: var(--text);
    max-width: 30ch;
  }
  button:disabled,
  select:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
