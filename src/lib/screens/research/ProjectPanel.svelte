<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { DefList, Panel } from '#lib/ui/index.ts';
  import { duration, number, percent } from './format.ts';
  import { research } from './research.svelte.ts';
  import { fieldLabel, techById } from './tech.ts';

  const tech = $derived(techById(research.selected));
  const status = $derived(research.stateOf(research.selected));
  const project = $derived(research.project(research.selected));
  const needs = $derived(
    (tech?.needs ?? []).map((id) => ({ name: techById(id)?.name ?? '', met: research.done.includes(id) }))
  );
  const lead = $derived(research.scientist(project?.lead ?? research.lead));
  const maxLabs = $derived(research.maxStartLabs(research.lead));
  let chosen = $state(1);
  const labs = $derived(Math.min(Math.max(1, chosen), Math.max(1, maxLabs)));
  const perYear = (rate: number) => number(rate * 365.25 * 86400);
  const bonusText = (b: number) => `+${Math.round(b * 100)}%`;

  const facts = $derived.by<[string, string | number][]>(() => {
    if (!tech) return [];
    const rows: [string, string | number][] = [
      ['Field', fieldLabel(tech.field)],
      ['Cost', number(tech.cost)],
      ['Needs', needs.length ? needs.map((n) => n.name).join(', ') : 'Nothing']
    ];
    if (status === 'done') rows.push(['Status', 'Researched']);
    else if (status === 'locked')
      rows.push([
        'Status',
        `Locked, missing ${needs
          .filter((n) => !n.met)
          .map((n) => n.name)
          .join(', ')}`
      ]);
    else rows.push(['Status', `${percent(research.fraction(tech.id))}% of the cost done`]);
    return rows;
  });

  const startRows = $derived.by<[string, string][]>(() => {
    if (!tech || maxLabs < 1) return [];
    return [
      ['Rate', `${perYear(research.rateOf(tech, research.lead, labs))} a year`],
      ['Done in', duration(research.secondsLeft(tech, research.lead, labs))]
    ];
  });

  const runRows = $derived.by<[string, string][]>(() => {
    if (!tech || !project) return [];
    return [
      ['Lead', `${lead?.name ?? ''}, ${lead?.field === tech.field ? bonusText(lead.bonus) : 'no bonus'}`],
      ['Labs', String(project.labs)],
      ['Rate', `${perYear(research.rateOf(tech, project.lead, project.labs))} a year`],
      ['Done in', duration(research.secondsLeft(tech, project.lead, project.labs))]
    ];
  });

  function start() {
    if (tech && research.start(tech.id, research.lead, labs, game)) chosen = 1;
  }

  const blocked = $derived(research.labsFree < 1 ? 'No free labs' : 'This scientist has no labs to spare');
</script>

<Panel title={tech?.name ?? 'Project'} body="col">
  <DefList rows={facts} />
  {#if status === 'open' && tech}
    <h3>Start</h3>
    <label class="field"
      >Lead
      <select id="projectLead" bind:value={research.lead}>
        {#each research.scientists as s (s.id)}
          <option value={s.id}
            >{s.name}, {fieldLabel(s.field)} {bonusText(s.bonus)}, {research.capacityLeft(s.id)} free</option
          >
        {/each}
      </select></label
    >
    {#if maxLabs >= 1}
      <label class="field"
        >Labs
        <select id="projectLabs" value={labs} onchange={(e) => (chosen = Number(e.currentTarget.value))}>
          {#each Array.from({ length: maxLabs }, (_, i) => i + 1) as n (n)}<option value={n}>{n}</option
            >{/each}
        </select></label
      >
      <DefList rows={startRows} />
      <button id="projectStart" onclick={start}>Start project</button>
    {:else}
      <div class="warn" id="projectBlocked">{blocked}</div>
    {/if}
  {:else if status === 'running' && project}
    <h3>Running</h3>
    <DefList rows={runRows} />
    {#if project.labs === 0}<div class="warn">Stalled, no labs</div>{/if}
    <div class="buttons">
      <button
        id="labsDown"
        disabled={project.labs < 1}
        onclick={() => research.setLabs(project.tech, project.labs - 1, game)}>Fewer labs</button
      ><button
        id="labsUp"
        disabled={research.labsFree < 1 || research.capacityLeft(project.lead) < 1}
        onclick={() => research.setLabs(project.tech, project.labs + 1, game)}>More labs</button
      ><button id="projectCancel" onclick={() => research.cancel(project.tech, game)}>Cancel</button>
    </div>
  {/if}
</Panel>

<style>
  .field {
    display: grid;
    grid-template-columns: 5ch minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    color: var(--dim);
  }
  .field select {
    min-width: 0;
    width: 100%;
    margin: 0;
    color: var(--text);
  }
  .warn {
    color: var(--hot);
  }
  .buttons {
    display: flex;
    margin: 0 -2px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  #projectStart {
    align-self: flex-start;
    margin-left: 0;
  }
</style>
