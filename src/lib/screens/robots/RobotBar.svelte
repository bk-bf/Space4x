<script lang="ts">
  import { Pill, requestRender } from '#lib/ui/index.ts';
  import { robotDesigner as designer } from './designer.svelte.ts';

  const design = $derived(designer.design);

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<div class="row" id="robotList">
  {#each designer.saved as r (r.id)}
    <button class:on={r.id === design?.id} data-robot={r.id} onclick={act(() => designer.pick(r.id))}
      >{r.name}{r.locked ? ' (locked)' : ''}</button
    >
  {/each}
</div>
{#if design}
  <div class="row">
    <input
      id="robotName"
      aria-label="Robot name"
      maxlength="24"
      value={design.name}
      disabled={design.locked}
      oninput={(e) => designer.rename(e.currentTarget.value)}
    />
    {#if design.locked}<span id="robotLocked"><Pill icon="lock" text="locked" /></span>{/if}
  </div>
{/if}

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    margin-bottom: 6px;
  }
  .row button {
    margin: 0;
  }
  #robotName {
    margin: 0;
    width: 18ch;
    font: 600 16px 'Pixelify';
    color: var(--text);
    background: var(--bg);
    border: 0;
    box-shadow: var(--edge);
    padding: 3px 6px;
  }
  #robotName:disabled {
    opacity: 0.7;
  }
  #robotLocked {
    display: inline-flex;
  }
</style>
