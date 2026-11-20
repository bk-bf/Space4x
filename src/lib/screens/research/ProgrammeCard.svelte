<script lang="ts">
  import { milestone, shortName, TIER_NAMES, type Milestone } from '#lib/game/data/index.ts';
  import {
    economy,
    flowsOf,
    homeSite,
    programmeCompute,
    programmeDays,
    runningProgramme,
    startProgramme,
    touch
  } from '#lib/game/economy/index.ts';
  import {
    Bar,
    Card,
    CardSection,
    Icon,
    IconList,
    Pill,
    Tile,
    dim,
    fmt,
    tipText,
    warn,
    type Chip,
    type IconItem
  } from '#lib/ui/index.ts';
  import { checkFor, milestoneIcon, openedBy, openedCount, statusOf } from './programme.ts';
  import { research } from './research.svelte.ts';

  const site = $derived(homeSite());
  const flows = $derived(flowsOf(site));
  const m = $derived(milestone(research.selected));
  const status = $derived(statusOf(economy, m));
  const running = $derived(runningProgramme(economy, m.number));
  const check = $derived(checkFor(economy, m));
  const missing = $derived(check.requires.filter((r) => !r.ok));
  const opened = $derived(openedBy(m.number));
  const opens = $derived(openedCount(opened));
  const compute = $derived(programmeCompute(m));
  const supply = $derived(flows.compute.supply);
  const days = $derived(programmeDays(m));

  const STATUS_LABEL = {
    done: 'done',
    running: 'running',
    ready: 'ready',
    locked: 'locked'
  } as const;

  const chips = $derived<Chip[]>([
    {
      icon: 'clock',
      text: fmt.days(days),
      tip: 'Programme length'
    },
    { text: m.tier, tip: TIER_NAMES[m.tier] },
    {
      icon: 'chip',
      text: compute ? fmt.eflops(compute) : 'no compute',
      tone: compute && supply < compute ? 'hot' : undefined,
      tip: tipText('Compute', compute ? `Made now ${fmt.eflops(supply)}` : '')
    }
  ]);

  const unlockItems = $derived<IconItem[]>([
    ...opened.buildings.map((b) => ({ icon: { kind: 'building' as const, id: b.id } })),
    ...opened.components.map((c) => ({ icon: { kind: 'component' as const, id: c.id } })),
    ...opened.materials.map((id) => ({ icon: { kind: 'material' as const, id } }))
  ]);

  const reason = $derived(missing.length ? `Needs ${milestone(missing[0]!.number).name}` : '');
  const icon = $derived(milestoneIcon(m.number));

  function start() {
    if (startProgramme(economy, site, m.number)) touch();
  }

  function pickRequired(n: number) {
    research.selected = n;
  }

  const needed = (n: number): Milestone => milestone(n);
</script>

<Card title="{m.number}. {m.name}" subtitle={m.unlocks} {icon} iconSize={32} {chips}>
  {#snippet aside()}
    <Pill
      text={STATUS_LABEL[status]}
      tone={status === 'done' ? 'cool' : status === 'locked' ? 'hot' : undefined}
    />
  {/snippet}
  <div class="row" id="programmeAction">
    {#if status === 'running' && running}
      <Bar value={running.progress} tone="cool" thick />
      <span id="programmeProgress">{fmt.pct(running.progress)}</span>
      <span class="dim">{fmt.days((1 - running.progress) * days)} left</span>
    {:else if status === 'done'}
      <Pill icon="check" text="Reached" tone="cool" />
    {:else}
      <button id="programmeStart" disabled={status !== 'ready'} onclick={start}>
        <Icon name="play" class="sm" />Start programme
      </button>
      {#if missing.length}
        <span class="hot" id="programmeWhy" data-missing={missing.length}
          >{missing.length === 1 ? reason : `${missing.length} things missing`}</span
        >
      {/if}
    {/if}
  </div>

  <CardSection label="Prerequisites">
    <div class="needs" id="requires">
      {#each check.requires as r (r.number)}
        <Tile
          variant="slot"
          name={shortName(r.number)}
          mark={r.ok ? 'check' : 'lock'}
          markTone={r.ok ? 'accent' : 'hot'}
          tip={tipText(
            `${r.number}. ${needed(r.number).name}`,
            dim(needed(r.number).unlocks),
            r.ok ? 'Done' : warn('Not done')
          )}
          onselect={() => pickRequired(r.number)}
        />
      {/each}
      {#if !check.requires.length}
        <span class="dim">none</span>
      {/if}
    </div>
  </CardSection>

  <CardSection label={opens ? `Unlocks (${opens})` : 'Unlocks'}>
    {#if unlockItems.length}
      <IconList items={unlockItems} variant="icons" />
    {/if}
  </CardSection>
</Card>

<style>
  .hot {
    color: var(--hot);
  }
  .dim {
    color: var(--dim);
  }
  .row {
    min-height: 26px;
  }
  .row button {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .needs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
</style>
