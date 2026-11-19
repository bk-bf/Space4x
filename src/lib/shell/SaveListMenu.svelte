<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from '#lib/ui/index.ts';
  import { deleteSaveById, listSaves, type SaveEntry } from './saveManager.ts';
  import SaveListRow from './SaveListRow.svelte';
  import { overwriteSave, saveGame, session, startGame } from './session.svelte.ts';

  let {
    onClose,
    mode = 'load',
    onSaved
  }: { onClose: () => void; mode?: 'load' | 'save'; onSaved?: () => void } = $props();

  let dialog: HTMLDialogElement;
  let saves = $state<SaveEntry[]>([]);
  let loaded = $state(false);
  let busy = $state(false);

  async function refresh() {
    saves = await listSaves();
    loaded = true;
  }

  onMount(() => {
    dialog.showModal();
    void refresh();
  });

  $effect(() => {
    void session.revision;
    void refresh();
  });

  function load(entry: SaveEntry) {
    void startGame('load', entry);
  }

  async function del(id: string) {
    await deleteSaveById(id);
    await refresh();
  }

  async function newSave() {
    if (busy) return;
    busy = true;
    await saveGame();
    onSaved?.();
    onClose();
  }

  async function overwrite(id: string) {
    if (busy) return;
    busy = true;
    await overwriteSave(id);
    onSaved?.();
    onClose();
  }
</script>

<dialog
  bind:this={dialog}
  id="saves"
  aria-label={mode === 'save' ? 'Save game' : 'Load game'}
  oncancel={(e) => {
    e.preventDefault();
    onClose();
  }}
  onclick={(e) => {
    if (e.target === dialog) onClose();
  }}
>
  <div class="hdr">
    <h2>{mode === 'save' ? 'Save game' : 'Load game'}</h2>
    <button class="close" aria-label="Close" onclick={onClose}><Icon name="cross" class="sm" /></button>
  </div>

  {#if mode === 'save'}
    <button id="newSave" class="new-save" onclick={newSave} disabled={busy}
      ><Icon name="plus" class="sm" />New save</button
    >
  {/if}

  <div class="list">
    {#if !loaded}
      <div class="empty">Loading</div>
    {:else if saves.length === 0}
      <div class="empty">
        {mode === 'save' ? 'No saves yet.' : 'No saves yet. The game saves itself once it has run a day.'}
      </div>
    {:else}
      {#if mode === 'save'}
        <div class="hint">or overwrite a save:</div>
      {/if}
      {#each saves as save (save.id)}
        <SaveListRow
          {save}
          {mode}
          onActivate={() => (mode === 'save' ? overwrite(save.id) : load(save))}
          onDelete={() => del(save.id)}
        />
      {/each}
    {/if}
  </div>
</dialog>

<style>
  dialog {
    width: min(520px, 92vw);
    max-height: 80vh;
    padding: 12px 14px 14px;
    background: var(--panel);
    color: var(--text);
    border: 0;
    box-shadow: var(--edge);
    flex-direction: column;
  }
  dialog[open] {
    display: flex;
  }
  dialog::backdrop {
    background: rgba(20, 17, 42, 0.72);
  }
  .hdr {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }
  h2 {
    margin: 0 auto 0 0;
    color: var(--accent);
    font-size: 18px;
  }
  .new-save {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .close {
    padding: 2px 4px;
  }
  .new-save {
    justify-content: center;
    margin-bottom: 10px;
    padding: 6px 0;
    color: var(--accent);
  }
  .hint {
    color: var(--dim);
    margin-bottom: 2px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    min-height: 0;
  }
  .empty {
    color: var(--dim);
    text-align: center;
    padding: 24px 12px;
  }
</style>
