<script lang="ts">
  import { CanvasView, DefList, requestRender } from '#lib/ui/index.ts';
  import { ground } from './ground.svelte.ts';
  import { KINDS, STANCES, menOf, supplyUseOf } from './model.ts';
  import { drawUnitPicture } from './invasion.ts';

  const unit = $derived(ground.unit);
  const info = $derived(unit ? KINDS[unit.kind] : undefined);

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

{#if unit && info}
  <CanvasView scale={2} vignette={0.7} height={160} id="unitCv" draw={(f) => drawUnitPicture(f, unit)} />
  <DefList
    rows={[
      ['Men', `${menOf(unit).toLocaleString('en')} of ${info.men.toLocaleString('en')}`],
      ['Attack', info.attack],
      ['Defence', info.defence],
      ['Supply use', `${supplyUseOf(unit)} a day`],
      ['Transport size', `${info.transport.toLocaleString('en')} t`],
      ['Trained at', unit.trainedAt]
    ]}
  />
  <div>
    <h3>Stance</h3>
    <div class="tabs2" id="stances">
      {#each STANCES as s (s)}
        <button data-stance={s} class:on={unit.stance === s} onclick={act(() => ground.setStance(unit.id, s))}
          >{s}</button
        >
      {/each}
    </div>
  </div>
  <div>
    <h3>Formation</h3>
    <div class="add">
      <select
        id="unitFormation"
        aria-label="Formation"
        value={unit.formation}
        onchange={(e) => {
          ground.moveUnit(unit.id, e.currentTarget.value);
          requestRender();
        }}
      >
        {#each ground.formations as f (f.id)}<option value={f.id}>{f.name}, {f.place}</option>{/each}
      </select>
    </div>
  </div>
{:else}
  <p class="none">No unit selected.</p>
{/if}

<style>
  .none {
    margin: 0;
    color: var(--dim);
  }
</style>
