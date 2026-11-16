<script lang="ts">
  import { milestones } from '#lib/game/data/index.ts';
  import { economy, homeSite } from '#lib/game/economy/index.ts';
  import { PixIcon } from '#lib/ui/index.ts';
  import { shortName } from './names.ts';
  import { openedBy, openedCount, statusOf } from './programme.ts';
  import { research } from './research.svelte.ts';

  const site = $derived(homeSite());

  const rows = $derived([
    {
      number: 0,
      label: 'At the start',
      unlocks: 'Buildings and parts open before any research.',
      status: 'done'
    },
    ...milestones.map((m) => ({
      number: m.number,
      label: shortName(m.number),
      unlocks: m.unlocks,
      status: statusOf(economy, site, m)
    }))
  ]);

  const pick = (n: number) => (research.selected = n);
</script>

{#snippet body(r: (typeof rows)[number])}
  {@const o = openedBy(r.number)}
  {@const n = openedCount(o)}
  <div class="uh">
    <span class="num">{r.number || '-'}</span><b>{r.label}</b><small class="dim">{n} items</small>
  </div>
  <div class="eq">
    {#each o.buildings as b (b.id)}<PixIcon kind="building" id={b.id} size={16} />{/each}
    {#each o.components as c (c.id)}<PixIcon kind="component" id={c.id} size={32} />{/each}
    {#each o.materials as id (id)}<PixIcon kind="material" {id} size={32} />{/each}
    {#if !n}<span class="dim">a gate for later milestones</span>{/if}
  </div>
{/snippet}

<div class="urows">
  {#each rows as r (r.number)}
    {#if r.number}
      <button
        type="button"
        class="urow"
        class:done={r.status === 'done'}
        class:lock={r.status === 'locked'}
        class:sel={r.number === research.selected}
        data-unlock={r.number}
        onclick={() => pick(r.number)}
      >
        {@render body(r)}
      </button>
    {:else}
      <div class="urow done" data-unlock="0">{@render body(r)}</div>
    {/if}
  {/each}
</div>

<style>
  .urows {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
    align-content: start;
  }
  .urow {
    margin: 0;
    text-align: left;
    font: inherit;
    color: var(--text);
    background: var(--panel2);
    box-shadow: var(--edge);
    padding: 4px 6px 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
  }
  .urow.done {
    box-shadow:
      0 -2px 0 var(--accent),
      0 2px 0 var(--accent),
      -2px 0 0 var(--accent),
      2px 0 0 var(--accent);
  }
  .urow.lock {
    opacity: 0.55;
  }
  .urow.sel {
    background: #38306e;
  }
  .urow:focus-visible {
    outline: 2px solid var(--cool);
    outline-offset: 2px;
  }
  .uh {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .uh b {
    font: 500 14px 'Pixelify';
  }
  .num {
    font: 600 13px 'Pixelify';
    color: var(--dim);
    min-width: 18px;
  }
  .dim {
    color: var(--dim);
  }
  .eq {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 3px;
  }
</style>
