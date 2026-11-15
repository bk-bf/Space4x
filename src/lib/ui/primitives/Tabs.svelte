<script lang="ts">
  import type { Tab } from './cells';

  let { tabs, active = $bindable() }: { tabs: readonly Tab[]; active: string } = $props();
</script>

<div class="tabs2">
  {#each tabs as t (t.id)}<button data-tab={t.id} class:on={t.id === active} onclick={() => (active = t.id)}
      >{t.label}</button
    >{/each}
</div>
