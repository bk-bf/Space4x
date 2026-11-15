<script lang="ts">
  import { Panel, ScreenGrid, Stack, requestRender, shell } from '#lib/ui/index.ts';
  import { HULLS, PALETTE } from './design.ts';
  import { applyClassParams, designer } from './designer.svelte.ts';
  import ClassStats from './ClassStats.svelte';
  import DesignStage from './DesignStage.svelte';
  import Gallery from './Gallery.svelte';
  import Palette from './Palette.svelte';

  applyClassParams(shell.params);

  let hull = $state(HULLS[0]!.id);

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<ScreenGrid id="classes" columns="minmax(0,1fr) 264px">
  <Stack>
    <Panel grow body="fill">
      {#snippet head()}
        <input
          id="clsName"
          aria-label="Class name"
          value={designer.draft.name}
          oninput={(e) => designer.rename(e.currentTarget.value)}
          onkeydown={(e) => e.key === 'Enter' && designer.save()}
        />
        <span>class</span>
        <input
          id="clsRole"
          aria-label="Role"
          value={designer.draft.role}
          oninput={(e) => designer.setRole(e.currentTarget.value)}
          onkeydown={(e) => e.key === 'Enter' && designer.save()}
        />
        {#if designer.dirty}<small id="clsDirty">{designer.base ? 'changed' : 'unsaved'}</small>{/if}
      {/snippet}
      {#snippet tools()}
        <span class="spacer"></span>
        <button data-act="save" disabled={!designer.dirty} onclick={act(() => designer.save())}>Save</button>
        <button data-act="copy" onclick={act(() => designer.copy())}>Copy</button>
        <button
          data-act="delete"
          disabled={!designer.canDelete}
          title={designer.inService ? 'A fleet is using this class' : ''}
          onclick={act(() => designer.remove())}>Delete</button
        >
        <select id="hullSel" aria-label="Hull" bind:value={hull}>
          {#each HULLS as h (h.id)}<option value={h.id}>{h.name}</option>{/each}
        </select>
        <button data-act="new" onclick={act(() => designer.start(hull))}>New class</button>
      {/snippet}
      <DesignStage />
    </Panel>
    <Gallery />
  </Stack>
  <Stack>
    <Panel title="Class"><ClassStats /></Panel>
    <Panel grow>
      {#snippet head()}Parts <small>{PALETTE.length}</small>{/snippet}
      <Palette />
    </Panel>
  </Stack>
</ScreenGrid>

<style>
  input {
    font:
      18px 'VT',
      monospace;
    color: var(--text);
    background: var(--bg);
    border: 0;
    box-shadow: inset 0 0 0 2px var(--line);
    padding: 0 4px;
    height: 22px;
    width: 16ch;
    min-width: 0;
  }
  input:focus-visible {
    outline: 2px solid var(--cool);
    outline-offset: 0;
  }
  .spacer {
    flex: 1;
  }
  button {
    padding: 0 7px;
    margin: 0 2px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
