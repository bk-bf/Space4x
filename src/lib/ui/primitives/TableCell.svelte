<script lang="ts">
  import Meter from './Meter.svelte';
  import Pct from './Pct.svelte';
  import type { Cell } from './cells';

  let { cell, numeric }: { cell: Cell; numeric: boolean } = $props();
  const warn = $derived(typeof cell === 'object' && 'warn' in cell && !!cell.warn);
</script>

<td class:n={numeric} class:w={warn}>
  {#if typeof cell === 'function'}{@render cell()}
  {:else if typeof cell !== 'object'}{cell}
  {:else if 'text' in cell}{cell.text}
  {:else if 'meter' in cell}<Meter value={cell.meter} wide={cell.wide} />{cell.label ? ' ' + cell.label : ''}
  {:else}<Pct value={cell.pct} />
  {/if}
</td>
