<script lang="ts">
  import Icon from '../Icon.svelte';
  import PixIcon from './PixIcon.svelte';
  import { tooltip } from './tooltip.ts';
  import type { FilterItem } from './types.ts';

  interface Props {
    items: readonly FilterItem[];
    value: string;
    onchange?: (id: string) => void;
  }

  let { items, value = $bindable(), onchange }: Props = $props();

  function pick(id: string) {
    value = id;
    onchange?.(id);
  }
</script>

<div class="ui-filters" role="group">
  {#each items as it (it.id)}
    <button
      type="button"
      class:on={value === it.id}
      aria-pressed={value === it.id}
      data-filter={it.id}
      onclick={() => pick(it.id)}
      use:tooltip={it.tip}
    >
      {#if typeof it.icon === 'string'}<Icon name={it.icon} class="sm" />{:else if it.icon}<PixIcon
          kind={it.icon.kind}
          id={it.icon.id}
          tip={false}
        />{/if}
      {[it.label, it.count].filter((v) => v !== undefined).join(' ')}
    </button>
  {/each}
</div>
