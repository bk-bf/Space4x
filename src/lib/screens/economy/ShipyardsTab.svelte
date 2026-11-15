<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import type { Colony } from '#lib/game/types.ts';
  import { DefList, Table, type Cell } from '#lib/ui/index.ts';
  import { addSlipway, cancelBuild, cancelTask, expandYard, retoolYard, startBuild } from './actions.ts';
  import Bar from './Bar.svelte';
  import { SHIP_CLASSES, shipClass } from './catalog.ts';
  import Cols from './Cols.svelte';
  import { colonyName } from './lookup.ts';
  import { formatCount, formatDate, formatYears } from './format.ts';
  import {
    buildFinish,
    canYardBuild,
    expansionCost,
    expansionStep,
    retoolCost,
    retooling,
    slipwayCost,
    slipwayIdle,
    slipwayRate,
    taskFinishes,
    taskLabel,
    taskRate
  } from './sim.ts';
  import { economy } from './state.svelte.ts';

  let { colony }: { colony: Colony } = $props();

  let yardId = $state<number | null>(null);
  let slipId = $state<number | null>(null);
  let taskId = $state<number | null>(null);
  let classId = $state('');

  const yard = $derived(colony.yards.find((y) => y.id === yardId) ?? colony.yards[0]);
  const slip = $derived(
    yard?.slipways.find((s) => s.id === slipId) ?? yard?.slipways.find((s) => !s.build) ?? yard?.slipways[0]
  );
  const classes = $derived(yard ? SHIP_CLASSES.filter((c) => canYardBuild(yard, c.id)) : []);
  const chosen = $derived(
    classes.find((c) => c.id === classId) ?? classes.find((c) => c.id === yard?.tooled) ?? classes[0]
  );
  const rate = $derived(yard ? taskRate(yard, colony, economy) : 0);
  const time = (bp: number) => (rate > 0 ? formatYears(bp / rate) : 'never');

  function yardStatus(y: (typeof colony.yards)[number]): Cell {
    const task = y.tasks[0];
    if (retooling(y)) return { icon: 'gear', text: taskLabel(task!, y) };
    if (task) return { icon: 'gear', text: taskLabel(task, y) };
    if (y.slipways.some((s) => s.build)) return { icon: 'play', text: 'Building' };
    return { icon: 'pause', text: 'Idle' };
  }

  const yardRows = $derived<Cell[][]>(
    colony.yards.map((y) => [
      y.name,
      y.kind === 'commercial' ? 'Commercial' : 'Naval',
      formatCount(y.capacity),
      y.slipways.length,
      shipClass(y.tooled).name,
      yardStatus(y)
    ])
  );

  const slipRows = $derived<Cell[][]>(
    yard
      ? yard.slipways.map((s) => {
          const b = s.build;
          return [
            s.id,
            b ? shipClass(b.classId).name : retooling(yard) ? 'Retooling' : 'Free',
            b ? { pct: Math.round((b.done / b.total) * 100) } : '-',
            b ? formatCount(b.total) : '-',
            b ? formatDate(buildFinish(colony, economy, yard, s, game.time)) : '-',
            formatCount(slipwayRate(colony, economy))
          ];
        })
      : []
  );

  const taskRows = $derived<Cell[][]>(
    yard
      ? yard.tasks.map((t, i) => [
          taskLabel(t, yard),
          { pct: Math.round((t.done / t.total) * 100) },
          formatCount(t.total),
          formatDate(taskFinishes(colony, economy, yard, game.time)[i] ?? null)
        ])
      : []
  );

  const builtRows = $derived<Cell[][]>(
    SHIP_CLASSES.filter((c) => colony.built[c.id]).map((c) => [c.name, c.role, colony.built[c.id] ?? 0])
  );

  const build = () => yard && slip && chosen && startBuild(colony, yard.id, slip.id, chosen.id);
  const cancel = () => yard && slip && cancelBuild(colony, yard.id, slip.id);
  const task = $derived(yard?.tasks.find((t) => t.id === taskId));
</script>

{#if !yard}
  <p class="none" id="noYards">There are no shipyards at {colonyName(colony)}.</p>
{:else}
  <h3>Shipyards</h3>
  <div id="yards">
    <Table
      head={['Yard', 'Kind', '>Capacity, t', '>Slipways', 'Tooled for', 'Task']}
      rows={yardRows}
      selected={colony.yards.indexOf(yard)}
      keys={colony.yards.map((y) => String(y.id))}
      onpick={(row) => {
        yardId = colony.yards[row]?.id ?? null;
        slipId = null;
        taskId = null;
      }}
    />
  </div>
  <Cols columns="minmax(0,3fr) minmax(0,2fr)">
    <div>
      <h3>Slipways of {yard.name}</h3>
      <div id="slipways">
        <Table
          head={['>#', 'Building', 'Progress', '>BP', '>Done by', '>BP a year']}
          rows={slipRows}
          selected={yard.slipways.findIndex((s) => s.id === slip?.id)}
          keys={yard.slipways.map((s) => String(s.id))}
          onpick={(row) => (slipId = yard.slipways[row]?.id ?? null)}
        />
      </div>
      <h3>Yard tasks</h3>
      {#if taskRows.length}
        <div id="tasks">
          <Table
            head={['Task', 'Progress', '>BP', '>Done by']}
            rows={taskRows}
            selected={yard.tasks.findIndex((t) => t.id === taskId)}
            keys={yard.tasks.map((t) => String(t.id))}
            onpick={(row) => (taskId = yard.tasks[row]?.id ?? null)}
          />
        </div>
        <Bar
          ><button
            id="taskCancel"
            disabled={!task}
            onclick={() => task && cancelTask(colony, yard.id, task.id)}>Cancel task</button
          ></Bar
        >
      {:else}
        <p class="none">No tasks queued.</p>
      {/if}
    </div>
    <div>
      <h3>Build a ship</h3>
      <Bar>
        <select id="shipClass" value={chosen?.id} onchange={(e) => (classId = e.currentTarget.value)}>
          {#each classes as c (c.id)}<option value={c.id}>{c.name}, {c.role}</option>{/each}
        </select>
      </Bar>
      <DefList
        rows={[
          ['Tooled for', shipClass(yard.tooled).name],
          ['Size', chosen ? `${formatCount(chosen.tons)} t` : '-'],
          ['Cost', chosen ? `${formatCount(chosen.bp)} BP` : '-'],
          ['Time on a slipway', chosen ? formatYears(chosen.bp / slipwayRate(colony, economy)) : '-']
        ]}
      />
      <Bar>
        <button
          id="yardBuild"
          disabled={!slip || !chosen || !slipwayIdle(yard, slip) || chosen.id !== yard.tooled}
          onclick={build}>Build on slipway {slip?.id ?? ''}</button
        >
        <button id="yardCancelBuild" disabled={!slip?.build} onclick={cancel}>Cancel build</button>
      </Bar>
      <h3>Modify the yard</h3>
      <Bar>
        <button id="yardSlipway" onclick={() => addSlipway(colony, yard.id)}>Add slipway</button>
        <button id="yardExpand" onclick={() => expandYard(colony, yard.id)}>Expand capacity</button>
        <button
          id="yardRetool"
          disabled={!chosen ||
            chosen.id === yard.tooled ||
            retooling(yard) ||
            yard.slipways.some((s) => s.build)}
          onclick={() => chosen && retoolYard(colony, yard.id, chosen.id)}>Retool</button
        >
      </Bar>
      <DefList
        rows={[
          ['Add slipway', `${formatCount(slipwayCost(yard))} BP, ${time(slipwayCost(yard))}`],
          [
            'Expand capacity',
            `+${formatCount(expansionStep(yard))} t, ${formatCount(expansionCost(yard))} BP, ${time(expansionCost(yard))}`
          ],
          [
            'Retool',
            chosen && chosen.id !== yard.tooled
              ? `${formatCount(retoolCost(yard, chosen.id))} BP, ${time(retoolCost(yard, chosen.id))}`
              : 'Pick another class'
          ],
          ['Yard work', `${formatCount(rate)} BP a year`]
        ]}
      />
    </div>
  </Cols>
{/if}
<h3>Ships delivered</h3>
{#if builtRows.length}
  <Table head={['Class', 'Role', '>Delivered']} rows={builtRows} />
{:else}
  <p class="none">No ships delivered yet.</p>
{/if}

<style>
  .none {
    margin: 0;
    color: var(--dim);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  select {
    flex: 1;
    min-width: 0;
  }
</style>
