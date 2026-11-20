<script lang="ts">
  import { building } from '#lib/game/data/index.ts';
  import type { Grid } from '#lib/game/economy/index.ts';
  import { Icon, fmt, tipText, tooltip } from '#lib/ui/index.ts';
  import Facts from './Facts.svelte';

  let { grid }: { grid: Grid } = $props();

  const TONES = ['var(--accent)', 'var(--cool)', '#c98f4a', '#8a7fc4'];
  const sources = $derived(
    Object.entries(grid.bySource)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id, v], i) => ({ id, name: building(id).name, kw: v, tone: TONES[i % TONES.length] }))
  );
  const scale = $derived(Math.max(grid.average, grid.demand, 1e-9));
  const short = $derived(grid.average < grid.demand);
</script>

<h3 id="powerBlock"><Icon name="bolt" class="sm" />Power</h3>
<div class="pool" class:short>
  <div class="ph2">
    <Icon name="bolt" class="sm" /><span>Generation</span><span class="v"
      >{fmt.gigawatts(grid.average)} average · {fmt.gigawatts(grid.demand)} demand</span
    >
  </div>
  <div class="sbar" id="generationBar">
    {#each sources as s (s.id)}
      <i
        data-source={s.id}
        style:width="{(s.kw / scale) * 100}%"
        style:background={s.tone}
        use:tooltip={tipText(s.name, fmt.gigawatts(s.kw))}
      ></i>
    {/each}
  </div>
  <div class="legend">
    {#each sources as s (s.id)}
      <span><b style:background={s.tone}></b>{s.name} {fmt.gigawatts(s.kw)}</span>
    {/each}
  </div>
</div>
<div class="cols" id="powerFacts">
  <Facts
    rows={[
      { icon: 'factory', label: 'Industry demand', value: fmt.gigawatts(grid.demand) },
      { icon: 'bolt', label: 'Installed capacity', value: fmt.gigawatts(grid.capacity) }
    ]}
  />
  <Facts
    rows={[
      {
        icon: 'bolt',
        label: 'Firm capacity',
        value: fmt.gigawatts(grid.firm),
        tone: grid.firmShort ? 'hot' : undefined
      },
      { icon: 'up', label: 'Peak demand', value: fmt.gigawatts(grid.peak) },
      { icon: 'box', label: 'Storage', value: fmt.gigawattHours(grid.storage) }
    ]}
  />
</div>

<style>
  .pool {
    margin-bottom: 8px;
  }
  .ph2 {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 17px;
    margin-bottom: 2px;
  }
  .ph2 :global(.ic) {
    color: var(--dim);
  }
  .ph2 .v {
    margin-left: auto;
    color: var(--dim);
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .short .ph2 .v,
  .short .ph2 :global(.ic) {
    color: var(--hot);
  }
  .sbar {
    display: flex;
    height: 12px;
    background: var(--bg);
    outline: 1px solid var(--line);
    overflow: hidden;
  }
  .sbar i {
    display: block;
    height: 100%;
    flex: none;
    box-shadow: inset -1px 0 0 var(--bg);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 15px;
    color: var(--dim);
    margin: 3px 0 0;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .legend b {
    width: 9px;
    height: 9px;
    display: inline-block;
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
    margin-bottom: 6px;
  }
</style>
