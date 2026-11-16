<script lang="ts">
  import {
    ROLES,
    ROLE_NAMES,
    YARDS,
    component,
    designStats,
    yardMilestone,
    yardName
  } from '#lib/game/shipdesign/index.ts';
  import { Pill, requestRender } from '#lib/ui/index.ts';
  import { designer } from './designer.svelte.ts';

  const design = $derived(designer.design);
  const yards = $derived(
    design
      ? YARDS.filter((y) =>
          designStats(design).lines.every((l) => component(l.component)?.builtAt.includes(y))
        )
      : []
  );

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<div class="row classes" id="classList">
  {#each designer.saved as c (c.id)}
    <button class:on={c.id === design?.id} data-class={c.id} onclick={act(() => designer.pick(c.id))}
      >{c.name}{c.locked ? ' (locked)' : ''}</button
    >
  {/each}
</div>
<div class="row meta">
  {#if design}
    <input
      id="clsName"
      aria-label="Class name"
      maxlength="24"
      value={design.name}
      disabled={design.locked}
      oninput={(e) => designer.rename(e.currentTarget.value)}
    />
    {#if design.locked}<span id="clsLocked"><Pill icon="lock" text="locked" /></span>{/if}
    <label
      >Role
      <select
        id="clsRole"
        value={design.role}
        disabled={design.locked}
        onchange={(e) => designer.role(e.currentTarget.value as (typeof ROLES)[number])}
      >
        {#each ROLES as r (r)}<option value={r}>{ROLE_NAMES[r]}</option>{/each}
      </select>
    </label>
    <label
      >Built at
      <select
        id="clsYard"
        value={design.yard}
        disabled={design.locked}
        onchange={(e) => designer.yard(e.currentTarget.value as (typeof YARDS)[number])}
      >
        {#each yards as y (y)}
          <option value={y}>{yardName(y)}{designer.unlocked(yardMilestone(y)) ? '' : ' (locked)'}</option>
        {/each}
      </select>
    </label>
  {:else}
    <span class="none" id="noClass">No class open. Click a component or press New.</span>
  {/if}
</div>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    margin-bottom: 6px;
  }
  .classes button {
    margin: 0;
  }
  .none {
    color: var(--dim);
  }
  .meta label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--dim);
  }
  .meta select {
    margin: 0;
  }
  #clsName {
    margin: 0;
    width: 18ch;
    font: 600 16px 'Pixelify';
    color: var(--text);
    background: var(--bg);
    border: 0;
    box-shadow: var(--edge);
    padding: 3px 6px;
  }
  #clsLocked {
    display: inline-flex;
  }
  #clsName:disabled {
    opacity: 0.7;
  }
</style>
