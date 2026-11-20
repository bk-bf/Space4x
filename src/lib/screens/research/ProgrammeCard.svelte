<script lang="ts">
  import { project, type Project } from '#lib/game/data/index.ts';
  import { game } from '#lib/game/index.ts';
  import {
    bonusOf,
    cancelQueued,
    createProject,
    economy,
    flowsOf,
    freeLabs,
    leading,
    MONTH_HOURS,
    queuedProgramme,
    researchDaysLeft,
    researchRate,
    researchSite,
    runningProgramme,
    scientistById,
    setLabs,
    touch,
    type Scientist
  } from '#lib/game/economy/index.ts';
  import { projectIcon } from '#lib/gfx/icons/index.ts';
  import {
    Bar,
    Card,
    CardSection,
    Icon,
    IconList,
    Pill,
    Portrait,
    Tile,
    fmt,
    tipText,
    warn,
    type Chip,
    type IconItem
  } from '#lib/ui/index.ts';
  import LabsControl from './LabsControl.svelte';
  import {
    checkFor,
    effectLines,
    openedBy,
    openedCount,
    pct,
    scientistFace,
    STATUS_LABEL,
    statusOf,
    subjectName
  } from './programme.ts';
  import { planOf, research } from './research.svelte.ts';
  import ScientistTile from './ScientistTile.svelte';

  const site = $derived(researchSite(economy));
  const flows = $derived(site ? flowsOf(site) : undefined);
  const p = $derived(project(research.selected));
  const status = $derived(statusOf(economy, p));
  const running = $derived(runningProgramme(economy, p.number));
  const queued = $derived(queuedProgramme(economy, p.number));
  const lead = $derived(running ? scientistById(economy, running.lead) : undefined);
  const queuedFor = $derived(queued ? scientistById(economy, queued.lead) : undefined);
  const check = $derived(checkFor(economy, p));
  const opened = $derived(openedBy(p.number));
  const opens = $derived(openedCount(opened));
  const effects = $derived(effectLines(p));
  const free = $derived(freeLabs(economy));
  const perMonth = $derived(researchRate(flows, p.number) * MONTH_HOURS);
  const left = $derived(running ? researchDaysLeft(flows, running) : Infinity);
  const icon = $derived(projectIcon(p.number));

  const order = $derived(
    [...economy.scientists].sort(
      (a, b) => Number(b.subject === p.subject) - Number(a.subject === p.subject) || b.skill - a.skill
    )
  );

  const best = (d: Project): Scientist | undefined =>
    [...economy.scientists].sort(
      (a, b) =>
        Number(!!leading(economy, a.id)) - Number(!!leading(economy, b.id)) ||
        bonusOf(b, d.subject) - bonusOf(a, d.subject)
    )[0];

  const plan = $derived(research.plans[p.number] ?? { lead: null, labs: 0, touched: false });
  const pick = $derived(scientistById(economy, plan.lead ?? -1) ?? best(p));
  const pickBusy = $derived(pick ? !!leading(economy, pick.id) : false);
  const cap = $derived(pick ? Math.min(pick.admin, free) : 0);
  const planned = $derived(plan.touched ? Math.max(0, Math.min(plan.labs, cap)) : cap);

  const chips = $derived<Chip[]>([
    { icon: 'flask', text: `${p.rp} RP`, tip: 'Research points' },
    { text: subjectName(p.subject), tip: 'Subject' },
    ...(running ? [{ icon: 'clock' as const, text: `${fmt.num(perMonth)} RP a month`, tip: 'Rate' }] : [])
  ]);

  const unlockItems = $derived<IconItem[]>([
    ...opened.buildings.map((b) => ({ icon: { kind: 'building' as const, id: b.id } })),
    ...opened.components.map((c) => ({ icon: { kind: 'component' as const, id: c.id } })),
    ...opened.materials.map((id) => ({ icon: { kind: 'material' as const, id } }))
  ]);

  function choose(s: Scientist) {
    const pl = planOf(p.number);
    pl.lead = s.id;
    pl.touched = false;
  }

  function stepPlan(delta: number) {
    const pl = planOf(p.number);
    pl.labs = Math.max(0, Math.min(planned + delta, cap));
    pl.touched = true;
  }

  function create() {
    if (!pick || !createProject(economy, p.number, pick.id, planned)) return;
    delete research.plans[p.number];
    touch();
  }

  function stepLabs(delta: number) {
    if (running && setLabs(economy, p.number, running.labs + delta)) touch();
  }

  function cancel() {
    if (cancelQueued(economy, p.number)) touch();
  }
</script>

<Card title="{p.number}. {p.name}" {icon} iconSize={32} {chips}>
  {#snippet aside()}
    <Pill
      text={STATUS_LABEL[status]}
      tone={status === 'done' ? 'cool' : status === 'locked' ? 'hot' : undefined}
    />
  {/snippet}
  <div class="body" id="programmeAction">
    {#if running && lead}
      <div class="row">
        <Bar value={running.rp / p.rp} tone="cool" thick />
        <span id="programmeProgress">{fmt.num(running.rp)} / {p.rp} RP</span>
        <span class="dim">{Number.isFinite(left) ? `${fmt.days(left)} left` : 'stalled'}</span>
      </div>
      <div class="row" id="programmeLead">
        <Portrait spec={scientistFace(lead, game.time)} view="head" scale={1} />
        <span>{lead.name}</span>
        <Pill text="{lead.subject === p.subject ? '★ ' : ''}{pct(bonusOf(lead, p.subject))}" />
      </div>
      <LabsControl
        id="programmeLabs"
        labs={running.labs}
        cap={Math.min(lead.admin, running.labs + free)}
        {free}
        onstep={stepLabs}
      />
    {:else if queued && queuedFor}
      <div class="row" id="programmeQueued">
        <Portrait spec={scientistFace(queuedFor, game.time)} view="head" scale={1} />
        <span>Queued for {queuedFor.name}</span>
        <button id="programmeCancel" onclick={cancel}><Icon name="cross" class="xs" /></button>
      </div>
    {:else if status === 'ready'}
      <CardSection label="Scientist">
        <div class="grid" id="programmeScientists">
          {#each order as s (s.id)}
            <ScientistTile {s} subject={p.subject} selected={pick?.id === s.id} onselect={() => choose(s)} />
          {/each}
        </div>
      </CardSection>
      {#if !pickBusy}
        <LabsControl id="programmePlanLabs" labs={planned} {cap} {free} onstep={stepPlan} />
      {/if}
      <div class="row">
        <button id="programmeStart" disabled={!pick} onclick={create}>
          <Icon name={pickBusy ? 'list' : 'play'} class="sm" />{pickBusy && pick
            ? `Queue for ${pick.name.split(' ')[0]}`
            : 'Create project'}
        </button>
      </div>
    {:else if status === 'done'}
      <div class="row"><Pill icon="check" text="Researched" tone="cool" /></div>
    {:else}
      <div class="row">
        <span class="hot" id="programmeWhy" data-missing={check.blockers}
          >Needs {check.requires
            .filter((r) => !r.ok)
            .map((r) => project(r.number).name)
            .join(' and ')}</span
        >
      </div>
    {/if}
  </div>

  {#if check.requires.length}
    <CardSection label="Prerequisites">
      <div class="needs" id="requires">
        {#each check.requires as r (r.number)}
          <Tile
            variant="slot"
            name={project(r.number).name}
            mark={r.ok ? 'check' : 'lock'}
            markTone={r.ok ? 'accent' : 'hot'}
            tip={tipText(
              `${r.number}. ${project(r.number).name}`,
              r.ok ? 'Researched' : warn('Not researched')
            )}
            onselect={() => (research.selected = r.number)}
          />
        {/each}
      </div>
    </CardSection>
  {/if}

  {#if effects.length}
    <CardSection label="Effect">
      <div class="effects" id="effects">
        {#each effects as e (e)}<span>{e}</span>{/each}
      </div>
    </CardSection>
  {:else}
    <CardSection label={opens ? `Unlocks (${opens})` : 'Unlocks'}>
      {#if unlockItems.length}
        <IconList items={unlockItems} variant="icons" />
      {/if}
    </CardSection>
  {/if}
</Card>

<style>
  .hot {
    color: var(--hot);
  }
  .dim {
    color: var(--dim);
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    min-height: 26px;
  }
  .row button {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 112px);
    gap: 6px;
  }
  .needs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
  .effects {
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: var(--cool);
  }
</style>
