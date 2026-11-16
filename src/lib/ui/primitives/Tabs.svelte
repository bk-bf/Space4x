<script lang="ts">
  import Icon from '../Icon.svelte';
  import type { Tab } from './cells';

  let { tabs, active = $bindable() }: { tabs: readonly Tab[]; active: string } = $props();

  const withIcons = $derived(tabs.some((t) => t.icon));
</script>

<div class="tabs2" class:icons={withIcons}>
  {#each tabs as t (t.id)}<button data-tab={t.id} class:on={t.id === active} onclick={() => (active = t.id)}
      >{#if t.icon}<Icon name={t.icon} />{/if}{t.label}</button
    >{/each}
</div>
