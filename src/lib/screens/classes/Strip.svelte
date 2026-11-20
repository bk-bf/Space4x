<script lang="ts">
  import { MAX_COUNT, component } from '#lib/game/shipdesign/index.ts';
  import { Icon, Tile, componentTip, dim, requestRender } from '#lib/ui/index.ts';
  import { designer } from './designer.svelte.ts';
  import { factList } from './facts.ts';

  const lines = $derived(designer.stats?.lines ?? []);
  const locked = $derived(designer.design?.locked ?? true);

  const factsFor = (id: string) => {
    const c = component(id);
    return c ? factList(c).map(dim) : [];
  };

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<div class="strip" id="parts">
  {#each lines as l (l.component)}
    <div data-line={l.component}>
      <Tile
        variant="cmp"
        icons={[{ kind: 'component', id: l.component }]}
        name={l.name}
        tip={componentTip(l.component, ...factsFor(l.component))}
      >
        <span class="cnt">
          <button
            data-take={l.component}
            aria-label="Remove one {l.name}"
            disabled={locked}
            onclick={act(() => designer.take(l.component))}><Icon name="minus" class="xs" /></button
          >
          <input
            type="number"
            min="0"
            max={MAX_COUNT}
            value={l.count}
            disabled={locked}
            aria-label="{l.name} count"
            data-count={l.component}
            onchange={(e) => {
              designer.count(l.component, Number(e.currentTarget.value));
              requestRender();
            }}
          />
          <button
            data-more={l.component}
            aria-label="Add one {l.name}"
            disabled={locked}
            onclick={act(() => designer.add(l.component))}><Icon name="plus" class="xs" /></button
          >
        </span>
      </Tile>
    </div>
  {/each}
</div>

<style>
  .strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-content: flex-start;
    max-height: 226px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
  }
  .strip > div {
    width: 86px;
    height: 104px;
  }
  .cnt {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    margin-top: 1px;
  }
  .cnt button {
    margin: 0;
    padding: 0 3px;
    line-height: 16px;
    display: flex;
    align-items: center;
  }
  input[type='number'] {
    width: 4ch;
    margin: 0;
    padding: 0 2px;
    font: 18px 'VT';
    color: var(--accent);
    background: var(--bg);
    border: 0;
    box-shadow: var(--edge);
    text-align: center;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    display: none;
  }
</style>
