<script lang="ts">
  import { requestRender } from '#lib/ui/index.ts';
  import {
    MAX_CARGO_LAYERS,
    MAX_ENGINES,
    attachmentAt,
    attachmentKey,
    attachmentName,
    cargoLayers,
    targetLabel
  } from '#lib/game/design.ts';
  import { designer } from './designer.svelte.ts';

  const sel = $derived(designer.selection);
  const draft = $derived(designer.draft);
  const section = $derived(sel.kind === 'section' ? draft.parts[sel.index] : undefined);
  const count = $derived(draft.parts.length);
  const engines = $derived(draft.stern?.[0] === 'engines' ? (draft.stern[1] ?? 2) : 0);

  const slotName = (slot: 'top' | 'bottom') =>
    sel.kind === 'section' ? attachmentAt(draft, sel.index, slot) : undefined;
  const layersOf = $derived.by(() => {
    if (sel.kind !== 'section') return 0;
    const name = attachmentAt(draft, sel.index, sel.slot);
    return name && attachmentKey(name) === 'cargo' ? cargoLayers(name) : 0;
  });

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<div class="controls">
  <div class="line">
    <b id="partLabel">{targetLabel(draft, sel)}</b>
    {#if sel.kind === 'section'}
      <button data-act="left" disabled={sel.index === 0} onclick={act(() => designer.shift(-1))}
        >Move left</button
      >
      <button data-act="right" disabled={sel.index >= count - 1} onclick={act(() => designer.shift(1))}
        >Move right</button
      >
    {/if}
    {#if sel.kind === 'stern' && engines}
      <button data-act="engines-less" disabled={engines <= 1} onclick={act(() => designer.engines(-1))}
        >Fewer engines</button
      >
      <button
        data-act="engines-more"
        disabled={engines >= MAX_ENGINES}
        onclick={act(() => designer.engines(1))}>More engines</button
      >
    {/if}
    <button data-act="remove" onclick={act(() => designer.removeSelected())}>Remove</button>
    {#if !draft.aft}
      <button data-act="aft" onclick={act(() => designer.addAft())}>Add aft cap</button>
    {/if}
  </div>
  <div class="line">
    {#if section}
      {#each ['top', 'bottom'] as const as slot (slot)}
        {@const name = slotName(slot)}
        <button
          data-slot={slot}
          class:on={sel.kind === 'section' && sel.slot === slot}
          onclick={act(() => designer.selectSlot(slot))}
          >{slot === 'top' ? 'Top' : 'Bottom'} hardpoint: {name ? attachmentName(name) : 'empty'}</button
        >
        <button data-clear={slot} disabled={!name} onclick={act(() => designer.clearAttachment(slot))}
          >Clear</button
        >
      {/each}
      {#if layersOf}
        <button data-act="layers-less" disabled={layersOf <= 1} onclick={act(() => designer.layers(-1))}
          >Fewer layers</button
        >
        <button
          data-act="layers-more"
          disabled={layersOf >= MAX_CARGO_LAYERS}
          onclick={act(() => designer.layers(1))}>More layers</button
        >
      {/if}
    {:else}
      <span class="hint">Pick a section to give it hardpoints.</span>
    {/if}
  </div>
</div>

<style>
  .controls {
    flex: none;
    padding: 4px 8px;
    border-top: 2px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    min-height: 28px;
  }
  .line b {
    font:
      600 14px 'Pixelify',
      sans-serif;
    margin: 0 10px 0 2px;
    min-width: 25ch;
    color: var(--accent);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .hint {
    color: var(--dim);
    padding-left: 2px;
  }
</style>
