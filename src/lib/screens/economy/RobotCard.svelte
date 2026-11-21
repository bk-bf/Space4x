<script lang="ts">
  import {
    assignRobots,
    diggable,
    economy,
    gradeAt,
    POWER,
    touch,
    type RobotActor,
    type Site
  } from '#lib/game/economy/index.ts';
  import { digRate, robotName, robotStatsOf } from '#lib/game/robots/index.ts';
  import {
    Bar,
    Card,
    CardSection,
    Icon,
    IconList,
    Tile,
    fmt,
    materialName,
    materialTip,
    tipText,
    type IconItem
  } from '#lib/ui/index.ts';
  import Field from './Field.svelte';
  import { mat } from './refs.ts';
  import { ui } from './state.svelte.ts';
  import { rateText } from './tips.ts';
  import { limitText } from './view.ts';

  let { site, actor }: { site: Site; actor: RobotActor } = $props();

  const g = $derived(actor.robots);
  const stats = $derived(robotStatsOf(g.design));
  const choices = $derived(diggable(site).filter((m) => m !== g.material));
  let target = $state('');
  const picked = $derived(target === 'idle' ? null : (choices.find((m) => m === target) ?? null));
  let howMany = $state(1);
  const count = $derived(Math.min(Math.max(1, howMany), g.count));

  const items = (amounts: Record<string, number>): IconItem[] =>
    Object.entries(amounts)
      .filter(([m, v]) => m !== POWER && v > 0)
      .map(([m, v]) => ({
        icon: mat(m),
        amount: rateText(m, v * actor.share, ui.period),
        tip: materialTip(m)
      }));
  const outputs = $derived(items(actor.outputs));
  const inputs = $derived(items(actor.inputs));
  const power = $derived((actor.inputs[POWER] ?? 0) * actor.share);
  const limit = $derived(limitText(actor.limit));
  const warned = $derived(!!actor.limit && actor.limit.kind !== 'idle');

  function choose(next: string) {
    target = next;
    howMany = g.count;
  }

  function move() {
    if (!target) return;
    assignRobots(economy, site, g.id, picked, count);
    const next = site.robots.find((r) => r.design === g.design && r.material === picked);
    if (next) ui.robots = next.id;
    target = '';
    touch();
  }
</script>

<Card
  title={robotName(g.design)}
  subtitle={g.material ? materialName(g.material) : 'idle'}
  chips={[
    { icon: 'wrench', text: fmt.count(g.count), tip: 'Robots in this group' },
    ...(g.material && actor.grade > 0
      ? [{ icon: 'drop' as const, text: `grade ${actor.grade.toFixed(2)}`, tip: 'Grade' }]
      : []),
    ...(actor.remote ? [{ icon: 'chip' as const, text: 'Earth', tip: 'Run from Earth' }] : [])
  ]}
>
  {#if outputs.length}
    <CardSection label="Output"><IconList items={outputs} plus={false} /></CardSection>
  {/if}
  {#if inputs.length}
    <CardSection label="Input"><IconList items={inputs} plus={false} /></CardSection>
  {/if}
  {#if power > 0}
    <div class="dim row" id="robotPower"><Icon name="bolt" class="xs" />{power.toFixed(2)} kW</div>
  {/if}
  <CardSection label="Active">
    <div class="row">
      <Bar value={actor.share} thick full tone={warned ? 'hot' : 'accent'} />
      <span class:hot={warned} class="share">{fmt.pct(actor.share)}</span>
    </div>
    {#if limit}
      <div class={warned ? 'hot' : 'dim'} id="robotLimit">
        <Icon name={warned ? 'warn' : 'minus'} class="xs" />{limit}
      </div>
    {/if}
  </CardSection>
  {#if choices.length || g.material}
    <CardSection label="Material">
      <div class="recipes" id="robotMaterials">
        {#each choices as m (m)}
          {@const rate = stats ? digRate(stats, m) * (gradeAt(site, m) ?? 0) : 0}
          <Tile
            icons={[mat(m)]}
            iconSize={32}
            selected={target === m}
            tip={tipText(materialName(m), rateText(m, rate * g.count, ui.period))}
            onselect={() => choose(m)}
          />
        {/each}
        {#if g.material}
          <button id="robotIdle" aria-pressed={target === 'idle'} onclick={() => choose('idle')}>Idle</button>
        {/if}
      </div>
      {#if target}
        <div class="row">
          <Field label="How many" bind:value={howMany} max={g.count} width={7} name="robotCount" />
          <button id="robotSwitch" onclick={move}><Icon name="arrowR" />Switch {fmt.count(count)}</button>
        </div>
      {/if}
    </CardSection>
  {/if}
</Card>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .row :global(.ui-bar) {
    flex: 1;
  }
  .share {
    min-width: 34px;
    text-align: right;
  }
  .hot {
    color: var(--hot);
  }
  .dim {
    color: var(--dim);
  }
  .recipes {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .row button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
</style>
