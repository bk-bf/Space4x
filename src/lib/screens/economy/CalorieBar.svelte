<script lang="ts">
  import { materialLook } from '#lib/gfx/icons/index.ts';
  import { fmt, materialName, tipText, tooltip } from '#lib/ui/index.ts';
  import { PERIODS, type Period } from '#lib/ui/format.ts';

  interface Part {
    id: string;
    kcalPerHour: number;
    share: number;
  }

  let { parts, need, period }: { parts: readonly Part[]; need: number; period: Period } = $props();

  const total = $derived(parts.reduce((a, p) => a + p.kcalPerHour, 0));
  const top = $derived(Math.max(total, need, 1e-9));
  const hours = $derived(PERIODS[period].hours);
  const word = $derived(PERIODS[period].word);
  const tip = $derived(
    tipText(
      'Calories made, by source',
      parts.map((p) => `${materialName(p.id)} ${fmt.kcal(p.kcalPerHour * hours)} ${word}`),
      `Need ${fmt.kcal(need * hours)} ${word}`
    )
  );
  const rgb = (id: string) => `rgb(${materialLook(id).base.join(',')})`;
</script>

<div class="cbar" id="calorieBar" use:tooltip={tip}>
  {#each parts as p (p.id)}
    <i
      data-food={p.id}
      data-share={p.share.toFixed(3)}
      style:width="{(p.kcalPerHour / top) * 100}%"
      style:background={rgb(p.id)}
      >{p.kcalPerHour / top > 0.07 ? `${materialName(p.id)} ${fmt.pct(p.share)}` : ''}</i
    >
  {/each}
  <u style:left="{(need / top) * 100}%"></u>
</div>

<style>
  .cbar {
    position: relative;
    display: flex;
    height: 22px;
    background: var(--bg);
    box-shadow: 0 0 0 1px var(--line);
    margin: 2px 0 8px;
  }
  i {
    display: flex;
    align-items: center;
    padding: 0 5px;
    font-style: normal;
    color: var(--bg);
    font-size: 17px;
    white-space: nowrap;
    overflow: hidden;
    border-right: 2px solid var(--bg);
  }
  u {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 3px;
    background: var(--text);
    margin-left: -1px;
  }
</style>
