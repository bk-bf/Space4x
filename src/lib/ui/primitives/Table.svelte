<script lang="ts">
  import TableCell from './TableCell.svelte';
  import { columnLabel, isNumericColumn, type Cell } from './cells';

  interface Props {
    head?: readonly string[];
    rows: readonly (readonly Cell[])[];
    selected?: number;
    onpick?: (row: number) => void;
    keys?: readonly string[];
    numeric?: readonly boolean[];
  }

  let { head = [], rows, selected = -1, onpick, keys, numeric: alignRight }: Props = $props();

  const numeric = $derived(alignRight ?? head.map(isNumericColumn));

  function onkey(e: KeyboardEvent, row: number) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onpick?.(row);
  }
</script>

<table>
  <tbody>
    {#if head.length}
      <tr>
        {#each head as h, i (i)}<th class:n={numeric[i]}>{columnLabel(h)}</th>{/each}
      </tr>
    {/if}
    {#each rows as row, r (keys?.[r] ?? r)}
      {#if onpick}
        <tr
          class="pick"
          class:on={r === selected}
          data-key={keys?.[r]}
          tabindex="0"
          onclick={() => onpick(r)}
          onkeydown={(e) => onkey(e, r)}
        >
          {#each row as cell, i (i)}<TableCell {cell} numeric={!!numeric[i]} />{/each}
        </tr>
      {:else}
        <tr class:on={r === selected}>
          {#each row as cell, i (i)}<TableCell {cell} numeric={!!numeric[i]} />{/each}
        </tr>
      {/if}
    {/each}
  </tbody>
</table>
