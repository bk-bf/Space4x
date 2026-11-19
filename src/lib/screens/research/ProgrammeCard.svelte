<script lang="ts">
  import { material, milestone, shortName, TIER_NAMES, type Milestone } from '#lib/game/data/index.ts';
  import {
    describeMissing,
    economy,
    flowsOf,
    homeSite,
    missingFor,
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
    buildingName,
    buildingTip,
    componentTip,
    dim,
    fmt,
    materialName,
    materialTip,
    tipText,
    tooltip,
    warn,
    type Chip,
    type IconItem
  } from '#lib/ui/index.ts';
  import { go } from './go.ts';
  import { liveWorld, stepFor, waysToMake } from './next.ts';
  import { checkFor, milestoneIcon, openedBy, openedCount, statusOf, type BillRow } from './programme.ts';
  import { research } from './research.svelte.ts';

  const site = $derived(homeSite());
  const flows = $derived(flowsOf(site));
  const world = $derived(liveWorld(economy, site, flowsOf));
  const m = $derived(milestone(research.selected));
  const status = $derived(statusOf(economy, site, m));
  const running = $derived(runningProgramme(economy, m.number));
  const check = $derived(checkFor(economy, site, m, flows));
  const missing = $derived(missingFor(economy, site, m));
  const step = $derived(missing[0] ? stepFor(world, m, missing[0]) : undefined);
  const opened = $derived(openedBy(m.number));
  const opens = $derived(openedCount(opened));
  const compute = $derived(programmeCompute(m));
  const supply = $derived(flows.compute.supply);
  const days = $derived(programmeDays(m));

  const STATUS_LABEL = {
    done: 'done',
    running: 'running',
    ready: 'ready',
    waiting: 'waiting',
    locked: 'locked'
  } as const;

  const chips = $derived<Chip[]>([
    {
      icon: 'clock',
      text: fmt.days(days),
      tip: tipText('Programme length', dim('How long it runs once started.'))
    },
    { text: m.tier, tip: tipText(TIER_NAMES[m.tier], dim('How firm the science behind it is.')) },
    {
      icon: 'chip',
      text: compute ? `${fmt.group(compute)} cu an hour` : 'no compute',
      tone: compute && supply < compute ? 'hot' : undefined,
      tip: tipText(
        'Compute',
        dim('Cycles the programme draws while it runs.'),
        compute ? `Made now ${fmt.group(supply)} cu an hour` : ''
      )
    }
  ]);

  const eta = (r: BillRow): string => {
    if (r.ok) return 'in store';
    if (r.days !== undefined && Number.isFinite(r.days)) return fmt.days(r.days);
    return (flows.produced[r.id] ?? 0) > 0 ? 'no gain' : 'not made';
  };

  const makers = (id: string): string => {
    const names = [...new Set(waysToMake(world, site, id).map((w) => buildingName(w.building)))];
    return names.length ? `Made by ${names.join(', ')}` : 'Nothing open makes it at home';
  };

  const billItems = $derived<IconItem[]>(
    check.bill.map((r) => ({
      icon: { kind: 'material', id: r.id },
      amount: fmt.amount(r.have, material(r.id).unit),
      need: fmt.amount(r.need, material(r.id).unit),
      ok: r.ok,
      note: eta(r),
      noteTone: r.ok ? 'cool' : Number.isFinite(r.days ?? Infinity) ? 'dim' : 'hot',
      tip: materialTip(
        r.id,
        `Need ${fmt.amount(r.need, material(r.id).unit)}, have ${fmt.amount(r.have, material(r.id).unit)}`,
        r.ok
          ? ''
          : Number.isFinite(r.days ?? Infinity)
            ? `Met in ${fmt.days(r.days ?? 0)} at the current rate`
            : warn(`${materialName(r.id)} short and not gaining`),
        dim(makers(r.id)),
        dim('Click to open its stockpile card')
      ),
      onpick: () => go({ kind: 'stockpiles', site: site.id, material: r.id })
    }))
  );

  const standItems = $derived<IconItem[]>(
    check.stand.map((r) => ({
      icon: { kind: r.kind, id: r.id },
      amount: r.ok ? 'yes' : 'no',
      ok: r.ok,
      tip:
        r.kind === 'building'
          ? buildingTip(r.id, r.ok ? 'Standing' : warn('Not standing at any site'))
          : componentTip(
              r.id,
              r.ok
                ? 'Can be built at home'
                : warn(`No ${r.builder ? buildingName(r.builder) : 'builder'} to build parts`)
            )
    }))
  );

  const unlockItems = $derived<IconItem[]>([
    ...opened.buildings.map((b) => ({ icon: { kind: 'building' as const, id: b.id } })),
    ...opened.components.map((c) => ({ icon: { kind: 'component' as const, id: c.id } })),
    ...opened.materials.map((id) => ({ icon: { kind: 'material' as const, id } }))
  ]);

  const reason = $derived(missing.length ? describeMissing(missing[0]!) : '');
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
  {#if step && status !== 'running' && status !== 'done'}
    <button
      id="programmeNext"
      class="next"
      data-place={step.place.kind}
      onclick={() => go(step.place)}
      use:tooltip={tipText(reason, dim('Opens the place where it is done'))}
      ><Icon name="arrowR" class="sm" /><span>{step.text}</span></button
    >
  {/if}

  <CardSection label="Bill, have / need">
    {#if billItems.length}
      <div id="programmeBill"><IconList items={billItems} variant="have" /></div>
    {:else}
      <span class="dim">no materials</span>
    {/if}
  </CardSection>

  <CardSection label="Must stand">
    {#if standItems.length}
      <IconList items={standItems} variant="stand" />
    {:else}
      <span class="dim">no buildings or parts</span>
    {/if}
    {#if check.sites.length}
      <div class="sites" id="siteNeeds">
        {#each check.sites as s (s.label)}
          <div class="site" class:short={!s.ok} data-site-need={s.ok ? 'met' : 'missing'}>
            <div class="head">
              <Icon name={s.ok ? 'check' : 'cross'} class="sm" />
              <span class="label">{s.label}</span>
              {#if s.progress !== undefined && !s.ok}<span data-progress>{fmt.pct(s.progress)}</span>{/if}
            </div>
            {#if !s.ok}
              <div class="where dim">{s.site ? `Best match: ${s.site}` : 'No site there yet'}</div>
              <ul class="criteria">
                {#each s.criteria as c (c.text)}
                  <li class:ok={c.ok} data-criterion={c.ok ? 'met' : 'missing'}>
                    <Icon name={c.ok ? 'check' : 'cross'} class="xs" /><span>{c.text}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </CardSection>

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
    {:else}
      <span class="dim">nothing new, it is a gate for later ones</span>
    {/if}
    {#if opened.alsoNeeds && unlockItems.length}
      <div class="dim" id="alsoNeeds">Some also wait for their other prerequisites.</div>
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
  .sites {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
  }
  .next {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 4px 0 0;
    max-width: 100%;
    color: var(--cool);
    text-align: left;
    line-height: 1.05;
  }
  .site {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 3px 6px;
    background: var(--bg);
    box-shadow: 0 0 0 1px var(--line);
    color: var(--cool);
    line-height: 1.05;
  }
  .site.short {
    box-shadow: 0 0 0 1px var(--hot);
    color: var(--hot);
  }
  .site .head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .site .label {
    flex: 1;
    min-width: 0;
    color: var(--text);
  }
  .site .where {
    font-size: 15px;
  }
  .criteria {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 15px;
  }
  .criteria li {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--hot);
  }
  .criteria li.ok {
    color: var(--cool);
  }
  .criteria li span {
    color: var(--text);
  }
  .needs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
</style>
