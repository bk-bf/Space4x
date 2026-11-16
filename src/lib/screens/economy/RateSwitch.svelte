<script lang="ts">
  import { PERIODS, type Period } from '#lib/ui/format.ts';
  import { dim, tipText, tooltip } from '#lib/ui/index.ts';
  import { ui } from './state.svelte.ts';

  const periods = Object.keys(PERIODS) as Period[];
  const tip = tipText('Rates', dim('Every rate on the economy screens is shown over this period.'));
</script>

<span class="per" use:tooltip={tip}>
  <small>rates a</small>
  {#each periods as p (p)}
    <button
      type="button"
      data-period={p}
      class:on={ui.period === p}
      aria-pressed={ui.period === p}
      onclick={() => (ui.period = p)}>{p}</button
    >
  {/each}
</span>

<style>
  .per {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .per button {
    padding: 0 6px;
    margin: 2px 0;
    font-size: 17px;
    line-height: 20px;
  }
  .per small {
    margin-right: 4px;
  }
</style>
