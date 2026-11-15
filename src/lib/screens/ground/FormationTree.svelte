<script lang="ts">
  import { requestRender } from '#lib/ui/index.ts';
  import { ground } from './ground.svelte.ts';
  import { KINDS, KIND_ORDER, PLACES, plural } from './model.ts';

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };

  const place = $derived(ground.formation?.place ?? PLACES[0]);
</script>

<div id="formations">
  {#each PLACES as p (p)}
    {@const here = ground.formationsAt(p)}
    <details bind:open={ground.open[p]}>
      <summary data-place={p}><span>{p}</span><small>{plural(here.length, 'formation')}</small></summary>
      {#each here as f (f.id)}
        {@const units = ground.unitsOf(f.id)}
        <details bind:open={ground.open[f.id]}>
          <summary
            data-formation={f.name}
            class:on={f.id === ground.formationId}
            onclick={act(() => ground.selectFormation(f.id))}
            ><span>{f.name}</span><small>{plural(units.length, 'unit')}</small></summary
          >
          {#each KIND_ORDER as k (k)}
            {@const n = units.filter((u) => u.kind === k).length}
            {#if n}<div><span>{n === 1 ? KINDS[k].label : KINDS[k].plural}</span><span>{n}</span></div>{/if}
          {/each}
        </details>
      {/each}
    </details>
  {/each}
</div>
<div class="add">
  <button data-act="create" onclick={act(() => ground.create(place ?? 'Earth'))}>New formation</button>
  <button
    data-act="disband"
    disabled={!ground.formation || !ground.disbandable(ground.formationId)}
    onclick={act(() => ground.disband(ground.formationId))}>Disband</button
  >
</div>

<style>
  .add {
    margin-top: auto;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
