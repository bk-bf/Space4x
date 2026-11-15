<script lang="ts">
  import { milestone } from '#lib/game/data/index.ts';
  import { COMPONENT_KINDS, KIND_NAMES, catalogue, countOf } from '#lib/game/shipdesign/index.ts';
  import { Tabs, requestRender } from '#lib/ui/index.ts';
  import { designer, view } from './designer.svelte.ts';
  import { factsOf } from './facts.ts';

  const items = catalogue();
  const tabs = COMPONENT_KINDS.map((kind) => ({ id: kind, label: KIND_NAMES[kind] ?? kind }));
  const shown = $derived(items.filter((c) => c.kind === view.kind));

  const editable = $derived(!!designer.design && !designer.design.locked);

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<Tabs {tabs} bind:active={view.kind} />
<div id="catalogue">
  {#each shown as c (c.id)}
    {@const open = c.milestone <= designer.unlocked}
    <div class="item" class:locked={!open} data-part={c.id}>
      <div class="line">
        <span class="name">{c.name}</span>
        {#if designer.design}<small class="have">{countOf(designer.design, c.id) || ''}</small>{/if}
        {#if open}
          <button
            data-add={c.id}
            aria-label="Add {c.name}"
            disabled={!editable}
            onclick={act(() => designer.add(c.id))}>+</button
          >
        {:else}
          <small class="lock">Locked</small>
        {/if}
      </div>
      <small class="facts">{factsOf(c)}</small>
      {#if !open}<small class="lock" data-locked={c.id}>Waits for {milestone(c.milestone).name}</small>{/if}
    </div>
  {/each}
</div>

<style>
  .item {
    display: flex;
    flex-direction: column;
    padding: 2px 0 3px;
    border-bottom: 1px solid var(--line);
  }
  .line {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .name {
    flex: 1;
    min-width: 0;
  }
  .facts,
  .lock {
    color: var(--dim);
  }
  .have {
    color: var(--accent);
  }
  .locked .name {
    color: var(--dim);
  }
  .line button {
    margin: 0;
    padding: 0 8px;
  }
</style>
