<script lang="ts">
  import Icon from '../Icon.svelte';
  import PixIcon from './PixIcon.svelte';
  import { tooltip } from './tooltip.ts';
  import type { IconItem } from './types.ts';

  interface Props {
    items: readonly IconItem[];
    to?: readonly IconItem[];
    variant?: 'rate' | 'have' | 'stand' | 'icons';
    size?: 16 | 32 | 48;
    plus?: boolean;
  }

  let { items, to, variant = 'rate', size = 32, plus = true }: Props = $props();

  const status = (it: IconItem) => (it.ok === undefined ? '' : it.ok ? 'ok' : 'short');
</script>

{#snippet have(it: IconItem)}
  <PixIcon kind={it.icon.kind} id={it.icon.id} {size} tip={false} />
  {#if it.amount !== undefined}<span>{it.amount}</span>{/if}
  {#if it.need !== undefined}<span class="need">/ {it.need}</span>{/if}
  {#if it.note !== undefined}<span class="note {it.noteTone ?? ''}">{it.note}</span>{/if}
{/snippet}

{#snippet row(list: readonly IconItem[])}
  {#each list as it, i (i)}
    {#if i > 0 && plus && variant === 'rate'}<span class="ui-plus"><Icon name="plus" class="xs" /></span>{/if}
    {#if variant === 'rate'}
      <span class="ui-rate" use:tooltip={it.tip}>
        <PixIcon kind={it.icon.kind} id={it.icon.id} {size} tip={false} />
        {#if it.amount !== undefined}<span>{it.amount}</span>{/if}
      </span>
    {:else if variant === 'have' && it.onpick}
      <button type="button" class="ui-have pick {status(it)}" onclick={it.onpick} use:tooltip={it.tip}>
        {@render have(it)}
      </button>
    {:else if variant === 'have'}
      <span class="ui-have {status(it)}" use:tooltip={it.tip}>{@render have(it)}</span>
    {:else if variant === 'stand'}
      <span class="ui-have stand {status(it)}" use:tooltip={it.tip}>
        <span class="ui-ibox"><PixIcon kind={it.icon.kind} id={it.icon.id} {size} tip={false} /></span>
        {#if it.amount !== undefined}<span>{it.amount}</span>{/if}
      </span>
    {:else}
      <span class="ui-ibox" use:tooltip={it.tip}
        ><PixIcon kind={it.icon.kind} id={it.icon.id} {size} tip={false} /></span
      >
    {/if}
  {/each}
{/snippet}

<div class="ui-eq">
  {@render row(items)}
  {#if to}<span class="ui-arr"><Icon name="arrowR" /></span>{@render row(to)}{/if}
</div>
