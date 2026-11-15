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
  import { CanvasView, Panel, ScreenGrid, Stack, requestRender } from '#lib/ui/index.ts';
  import Catalogue from './Catalogue.svelte';
  import { designer } from './designer.svelte.ts';
  import { drawDesign } from './drawDesign.ts';
  import Issues from './Issues.svelte';
  import Load from './Load.svelte';
  import Parts from './Parts.svelte';
  import Stats from './Stats.svelte';

  const design = $derived(designer.design);
  const spec = $derived(design ? designer.specOf(design) : undefined);
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

<ScreenGrid id="classes" columns="300px minmax(0,1fr) 340px">
  <Stack>
    <Panel grow>
      {#snippet head()}Components <small>{designer.design?.locked ? 'locked' : ''}</small>{/snippet}
      <Catalogue />
    </Panel>
  </Stack>
  <Stack>
    <Panel>
      {#snippet head()}
        {#if design}
          <input
            id="clsName"
            aria-label="Class name"
            value={design.name}
            disabled={design.locked}
            oninput={(e) => designer.rename(e.currentTarget.value)}
          />
          <select
            id="clsRole"
            style="flex: none"
            aria-label="Role"
            value={design.role}
            disabled={design.locked}
            onchange={(e) => designer.role(e.currentTarget.value as (typeof ROLES)[number])}
          >
            {#each ROLES as r (r)}<option value={r}>{ROLE_NAMES[r]}</option>{/each}
          </select>
          <select
            id="clsYard"
            style="flex: none"
            aria-label="Built at"
            value={design.yard}
            disabled={design.locked}
            onchange={(e) => designer.yard(e.currentTarget.value as (typeof YARDS)[number])}
          >
            {#each yards as y (y)}
              <option value={y}>{yardName(y)}{yardMilestone(y) > designer.unlocked ? ' (locked)' : ''}</option
              >
            {/each}
          </select>
          {#if design.locked}<small id="clsLocked">locked</small>{/if}
        {:else}
          Class
        {/if}
      {/snippet}
      {#snippet tools()}
        <button data-act="new" onclick={act(() => designer.start())}>New</button>
        <button data-act="copy" disabled={!design} onclick={act(() => designer.copy())}>Copy</button>
        <button
          data-act="lock"
          disabled={!designer.canLock}
          title={design && !designer.canLock && !design.locked ? 'Resolve the errors first' : ''}
          onclick={act(() => designer.lockIt())}>Lock</button
        >
        <button
          data-act="delete"
          disabled={!designer.canDelete}
          title={designer.inService ? 'A fleet is using this class' : ''}
          onclick={act(() => designer.remove())}>Delete</button
        >
      {/snippet}
      {#if design}
        <Parts />
      {:else}
        <p class="none" id="noClass">No class yet. Press New to start one.</p>
      {/if}
    </Panel>
    <Panel title="Propellant"><Load /></Panel>
    <Panel title="Design errors"><Issues /></Panel>
    <Panel title="Drawing" grow body="fill">
      <CanvasView scale={2} bg="stars" draw={(fb, t) => drawDesign(fb, spec, t)} />
    </Panel>
  </Stack>
  <Stack>
    <Panel title="Statistics" grow><Stats /></Panel>
    <Panel>
      {#snippet head()}Classes <small>{designer.saved.length}</small>{/snippet}
      {#if designer.saved.length}
        <ul id="classList">
          {#each designer.saved as c (c.id)}
            <li>
              <button
                class:on={c.id === design?.id}
                data-class={c.id}
                onclick={act(() => designer.pick(c.id))}>{c.name}{c.locked ? ' (locked)' : ''}</button
              >
            </li>
          {/each}
        </ul>
      {:else}
        <p class="none">None designed.</p>
      {/if}
    </Panel>
  </Stack>
</ScreenGrid>

<style>
  .none {
    margin: 0;
    color: var(--dim);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
  }
  select {
    flex: none;
  }
  #clsName {
    flex: none;
    width: 14ch;
    font: inherit;
    color: inherit;
    background: var(--panel);
    border: 0;
    padding: 0 4px;
  }
</style>
