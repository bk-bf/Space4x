<script lang="ts">
  import { designStats, newDesign } from '#lib/game/shipdesign/index.ts';
  import { shipBeamMetres, shipLengthMetres } from '#lib/gfx/topdown/index.ts';
  import {
    CanvasView,
    Icon,
    IconList,
    Panel,
    ScreenGrid,
    Stack,
    Stat,
    fmt,
    materialTip,
    requestRender,
    type IconItem,
    tooltip
  } from '#lib/ui/index.ts';
  import ClassBar from './ClassBar.svelte';
  import { designer } from './designer.svelte.ts';
  import { drawDesign } from './drawDesign.ts';
  import { loadedWith, primaryFigures, secondaryFigures } from './figures.ts';
  import Flags from './Flags.svelte';
  import Load from './Load.svelte';
  import Palette from './Palette.svelte';
  import StackTry from './StackTry.svelte';
  import Strip from './Strip.svelte';

  const EMPTY = newDesign('');
  const EMPTY_STATS = designStats(EMPTY);

  const design = $derived(designer.design);
  const spec = $derived(design ? designer.specOf(design) : undefined);
  const stats = $derived(designer.stats ?? EMPTY_STATS);
  const loaded = $derived(designer.loaded ?? loadedWith(EMPTY, EMPTY_STATS, 0));
  const primary = $derived(primaryFigures(stats, loaded));
  const secondary = $derived(secondaryFigures(stats, loaded));
  const costs = $derived<IconItem[]>(
    Object.entries(stats.cost)
      .sort((a, b) => b[1] - a[1])
      .map(([id, kg]) => ({
        icon: { kind: 'material', id },
        amount: fmt.mass(kg),
        tip: materialTip(id, `Needed ${fmt.mass(kg)}`)
      }))
  );
  const size = $derived(
    spec && (spec.stern || spec.parts.length || spec.bow)
      ? `${Math.round(shipLengthMetres(spec))} m long, ${Math.round(shipBeamMetres(spec))} m across`
      : ''
  );
  const empty = $derived(!design || !stats.lines.length);

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<ScreenGrid id="classes" columns="var(--palette-w) minmax(0,1fr) 320px">
  <Panel grow>
    {#snippet head()}
      <Icon name="ship" />Components
      <small>{designer.design?.locked ? 'locked' : 'no premade classes'}</small>
    {/snippet}
    <Palette />
  </Panel>
  <Stack>
    <Panel grow body="fill">
      {#snippet head()}
        <Icon name="ship" />Drawing <small id="shipSize">{size}</small>
      {/snippet}
      <CanvasView scale={2} bg="stars" draw={(fb, t) => drawDesign(fb, spec, t)}>
        {#snippet labels()}
          {#if empty}
            <div class="ph">
              <div class="empty" id="emptyDesign">
                <Icon name="plus" class="lg" />
                <div class="pf">New design</div>
              </div>
            </div>
          {/if}
        {/snippet}
      </CanvasView>
    </Panel>
    <Panel class="classpan">
      {#snippet head()}
        <Icon name="list" />Class
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
        <span class="tipwrap" use:tooltip={designer.inService && 'A fleet is using this class'}
          ><button data-act="delete" disabled={!designer.canDelete} onclick={act(() => designer.remove())}
            ><Icon name="trash" class="sm" />Delete</button
          ></span
        >
      {/snippet}
      <ClassBar />
      <Strip />
    </Panel>
  </Stack>
  <Panel grow>
    {#snippet head()}<Icon name="gear" />Stats{/snippet}
    <div class="sidebody">
      <div class="figures">
        {#each primary as f (f.key)}
          <div data-stat={f.key}>
            <Stat dense icon={f.icon} value={f.value} label={f.label} warn={f.warn} tip={f.tip} />
          </div>
        {/each}
      </div>
      <h3>Propellant and payload</h3>
      <Load />
      <h3>Launch stack</h3>
      <StackTry />
      <h3>Design</h3>
      <Flags />
      <h3>Build cost</h3>
      {#if costs.length}
        <IconList items={costs} variant="rate" plus={false} />
      {:else}
        <span class="dim">Empty.</span>
      {/if}
      {#if design}
        <h3>More figures</h3>
        <div class="figures">
          {#each secondary as f (f.key)}
            <div data-stat={f.key}>
              <Stat dense icon={f.icon} value={f.value} label={f.label} warn={f.warn} tip={f.tip} />
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </Panel>
</ScreenGrid>

<style>
  .figures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .sidebody {
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }
  .sidebody > :global(.ui-eq) {
    flex: none;
  }
  .figures > div {
    min-width: 0;
  }
  .dim {
    color: var(--dim);
  }
  .flex {
    flex: 1;
  }
  .ph {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--dim);
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    max-width: 70%;
    padding: 16px 24px;
    text-align: center;
    background: rgba(20, 17, 42, 0.85);
    border: 2px dashed var(--line);
  }
  .pf {
    font: 600 16px 'Pixelify';
    color: var(--text);
  }
  :global(.classpan > h2 button) {
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
  :global(main[data-screen='classes']) {
    --palette-w: 384px;
  }
  @media (max-width: 1279px) {
    :global(main[data-screen='classes']) {
      --palette-w: 293px;
    }
    :global(.classpan > h2 button) {
      padding: 0 5px;
    }
  }
</style>
