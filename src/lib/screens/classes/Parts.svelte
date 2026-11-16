<script lang="ts">
  import { material } from '#lib/game/data/index.ts';
  import { MAX_COUNT } from '#lib/game/shipdesign/index.ts';
  import { requestRender } from '#lib/ui/index.ts';
  import { formatMass } from '#lib/screens/economy/format.ts';
  import { designer } from './designer.svelte.ts';

  const lines = $derived(designer.stats?.lines ?? []);
  const locked = $derived(designer.design?.locked ?? true);

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };

  const bill = (cost: Record<string, number>) =>
    Object.entries(cost)
      .sort((a, b) => b[1] - a[1])
      .map(([id, kg]) => `${formatMass(kg)} ${material(id).name.toLowerCase()}`)
      .join(', ');
  const total = (cost: Record<string, number>) => Object.values(cost).reduce((a, b) => a + b, 0);
</script>

{#if lines.length}
  <table id="parts">
    <tbody>
      <tr><th>Component</th><th class="n">Count</th><th class="n">Mass</th><th class="n">Cost</th></tr>
      {#each lines as l (l.component)}
        <tr data-line={l.component}>
          <td>{l.name}</td>
          <td class="n count">
            <button
              data-take={l.component}
              aria-label="Remove one {l.name}"
              disabled={locked}
              onclick={act(() => designer.take(l.component))}>-</button
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
              onclick={act(() => designer.add(l.component))}>+</button
            >
          </td>
          <td class="n">{formatMass(l.mass)}</td>
          <td class="n cost" title={bill(l.cost)}>{formatMass(total(l.cost))}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <p class="none" id="noParts">No components yet. Add some from the list on the left.</p>
{/if}

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-weight: 400;
    color: var(--dim);
  }
  td,
  th {
    padding: 1px 6px 1px 0;
  }
  .n {
    text-align: right;
  }
  .count {
    white-space: nowrap;
  }
  .count button {
    margin: 0 2px;
    padding: 0 6px;
  }
  input[type='number'] {
    width: 4ch;
    font: inherit;
    color: inherit;
    background: var(--panel2);
    border: 0;
    text-align: right;
    padding: 0 2px;
  }
  .cost {
    color: var(--dim);
  }
  .none {
    margin: 0;
    color: var(--dim);
  }
</style>
