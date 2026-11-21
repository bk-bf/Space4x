<script lang="ts">
  import { digClasses } from '#lib/game/data/index.ts';
  import { DIG_CLASS_NAMES, DIG_CLASSES, newRobot, robotStats } from '#lib/game/robots/index.ts';
  import {
    Icon,
    IconList,
    Panel,
    ScreenGrid,
    Stack,
    Stat,
    fmt,
    materialTip,
    requestRender,
    tooltip,
    type IconItem
  } from '#lib/ui/index.ts';
  import { robotDesigner as designer } from './designer.svelte.ts';
  import { kgPerDay, robotFigures } from './figures.ts';
  import Flags from './Flags.svelte';
  import Palette from './Palette.svelte';
  import RobotBar from './RobotBar.svelte';
  import Strip from './Strip.svelte';

  const EMPTY_STATS = robotStats(newRobot(''));

  const design = $derived(designer.design);
  const stats = $derived(designer.stats ?? EMPTY_STATS);
  const figures = $derived(robotFigures(stats));
  const costs = $derived<IconItem[]>(
    Object.entries(stats.cost)
      .sort((a, b) => b[1] - a[1])
      .map(([id, kg]) => ({
        icon: { kind: 'material', id },
        amount: `${Math.round(kg * 10) / 10} kg`,
        tip: materialTip(id, `Needed ${fmt.mass(kg)}`)
      }))
  );
  const rates = $derived(
    DIG_CLASSES.map((k) => ({
      key: k,
      name: DIG_CLASS_NAMES[k],
      rate: stats.rates[k],
      items: digClasses[k].map((id): IconItem => ({
        icon: { kind: 'material', id },
        amount: stats.rates[k] > 0 ? kgPerDay(stats.rates[k]) : '0',
        tip: materialTip(id)
      }))
    }))
  );

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<ScreenGrid id="robots" columns="var(--palette-w) minmax(0,1fr) 320px">
  <Panel grow>
    {#snippet head()}
      <Icon name="wrench" />Parts
      <small>{design?.locked ? 'locked' : ''}</small>
    {/snippet}
    <Palette />
  </Panel>
  <Stack>
    <Panel class="robotpan">
      {#snippet head()}
        <Icon name="list" />Robot
        <small>{design ? `${stats.lines.reduce((n, l) => n + l.count, 0)} parts` : ''}</small>
        <span class="flex"></span>
        <button data-act="new" onclick={act(() => designer.start())}
          ><Icon name="plus" class="sm" />New</button
        >
        <button data-act="copy" disabled={!design} onclick={act(() => designer.copy())}>Copy</button>
        <span
          class="tipwrap"
          use:tooltip={design && !designer.canLock && !design.locked && 'Resolve the errors first'}
          ><button data-act="lock" disabled={!designer.canLock} onclick={act(() => designer.lockIt())}
            ><Icon name="lock" class="sm" />Lock</button
          ></span
        >
        <span class="tipwrap" use:tooltip={designer.inService && 'Robots of this design exist'}
          ><button data-act="delete" disabled={!designer.canDelete} onclick={act(() => designer.remove())}
            ><Icon name="trash" class="sm" />Delete</button
          ></span
        >
      {/snippet}
      <RobotBar />
      <Strip />
    </Panel>
    <Panel grow>
      {#snippet head()}<Icon name="hammer" />Dig rates{/snippet}
      <div class="rates" id="digRates">
        {#each rates as r (r.key)}
          <div class="class" data-class={r.key}>
            <h3>{r.name} <small>{r.rate > 0 ? kgPerDay(r.rate) : '0'}</small></h3>
            <IconList items={r.items} variant="icons" />
          </div>
        {/each}
      </div>
    </Panel>
  </Stack>
  <Panel grow>
    {#snippet head()}<Icon name="gear" />Stats{/snippet}
    <div class="figures">
      {#each figures as f (f.key)}
        <div data-stat={f.key}>
          <Stat dense icon={f.icon} value={f.value} label={f.label} warn={f.warn} tip={f.tip} />
        </div>
      {/each}
    </div>
    <h3>Design</h3>
    <Flags />
    <h3>Build cost</h3>
    {#if costs.length}
      <IconList items={costs} variant="rate" plus={false} />
    {:else}
      <span class="dim">Empty.</span>
    {/if}
  </Panel>
</ScreenGrid>

<style>
  .figures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .figures > div {
    min-width: 0;
  }
  .rates {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .class h3 {
    margin-top: 0;
  }
  .dim {
    color: var(--dim);
  }
  .flex {
    flex: 1;
  }
  :global(.robotpan > h2 button) {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 2px 0 2px 4px;
    padding: 0 7px;
  }
  small {
    font: 18px 'VT';
    white-space: nowrap;
  }
  :global(main[data-screen='robots']) {
    --palette-w: 384px;
  }
  @media (max-width: 1279px) {
    :global(main[data-screen='robots']) {
      --palette-w: 293px;
    }
  }
</style>
