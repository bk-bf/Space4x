<script lang="ts">
  import { requestRender } from '#lib/ui/index.ts';
  import { ground } from './ground.svelte.ts';
  import { KINDS, KIND_ORDER, plural } from './model.ts';
  import { placesOf } from './places.ts';

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };

  const places = $derived(placesOf());
  const place = $derived(ground.formation?.place ?? places[0]?.id);
</script>

<div id="formations">
  {#each places as p (p.id)}
    {@const here = ground.formationsAt(p.id)}
    <details bind:open={ground.open[p.id]}>
      <summary data-place={p.name}
        ><span>{p.name}</span><small>{plural(here.length, 'formation')}</small></summary
      >
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
  <button data-act="create" onclick={act(() => place && ground.create(place))}>New formation</button>
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
