<script lang="ts">
  import type { IconName } from '#lib/gfx/icons.ts';
  import { Icon } from '#lib/ui/index.ts';

  interface Fact {
    icon: IconName;
    label: string;
    value: string;
    tone?: 'hot' | 'cool' | 'dim';
  }

  let { rows }: { rows: readonly Fact[] } = $props();
</script>

<div class="flow">
  {#each rows as r (r.label)}
    <div class="fr">
      <Icon name={r.icon} class="sm" /><span class="nm">{r.label}</span><span class="v {r.tone ?? ''}"
        >{r.value}</span
      >
    </div>
  {/each}
</div>

<style>
  .flow {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .fr {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .nm {
    font-size: 17px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .v {
    margin-left: auto;
    color: var(--dim);
    font-size: 17px;
    white-space: nowrap;
  }
  .v.hot {
    color: var(--hot);
  }
  .v.cool {
    color: var(--cool);
  }
  .fr :global(.ic) {
    flex: none;
  }
</style>
