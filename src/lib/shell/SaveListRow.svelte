<script lang="ts">
  import { formatDay } from '#lib/game/index.ts';
  import { Icon, Pill, tooltip } from '#lib/ui/index.ts';
  import type { SaveEntry } from './saveManager.ts';

  let {
    save,
    mode = 'load',
    onActivate,
    onDelete
  }: {
    save: SaveEntry;
    mode?: 'load' | 'save';
    onActivate: () => void;
    onDelete: () => void;
  } = $props();

  let confirm = $state<'none' | 'delete' | 'overwrite'>('none');

  function activate() {
    if (mode === 'save') confirm = 'overwrite';
    else onActivate();
  }

  function fmtWhen(ms: number): string {
    return ms
      ? new Date(ms).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'unknown';
  }
</script>

<div class="save-row" data-save={save.id} data-kind={save.meta.kind}>
  <button class="main" onclick={activate}>
    <span class="top">
      <b class="when-game">{formatDay(save.meta.time)} {new Date(save.meta.time).getUTCFullYear()}</b>
      <Pill
        text={save.meta.kind === 'auto' ? 'Autosave' : 'Manual'}
        tone={save.meta.kind === 'auto' ? 'cool' : undefined}
      />
    </span>
    <span class="sub">
      <span use:tooltip={'Projects researched'}><Icon name="flask" class="sm" />{save.meta.researched}</span>
      <span use:tooltip={'Sites'}><Icon name="dome" class="sm" />{save.meta.sites}</span>
      <span use:tooltip={'Ships'}><Icon name="ship" class="sm" />{save.meta.ships}</span>
    </span>
    <span class="when">{fmtWhen(save.meta.savedAt)}</span>
  </button>

  {#if confirm !== 'none'}
    <span class="confirm">
      <span>{confirm === 'overwrite' ? 'Overwrite?' : 'Delete?'}</span>
      <button
        class="yes"
        aria-label="Yes"
        onclick={() => {
          const was = confirm;
          confirm = 'none';
          if (was === 'overwrite') onActivate();
          else onDelete();
        }}><Icon name="check" class="sm" /></button
      >
      <button aria-label="No" onclick={() => (confirm = 'none')}><Icon name="cross" class="sm" /></button>
    </span>
  {:else}
    <button
      class="del"
      aria-label="Delete save"
      use:tooltip={'Delete save'}
      onclick={() => (confirm = 'delete')}><Icon name="trash" class="sm" /></button
    >
  {/if}
</div>

<style>
  .save-row {
    position: relative;
  }
  .main {
    width: calc(100% - 4px);
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 9px;
    text-align: left;
    background: var(--bg);
  }
  .main:hover {
    background: var(--panel2);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 30px;
  }
  .when-game {
    color: var(--accent);
    font:
      600 16px 'Pixelify',
      sans-serif;
  }
  .sub {
    display: flex;
    gap: 12px;
  }
  .sub > span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .sub :global(.ic) {
    color: var(--dim);
  }
  .when {
    color: var(--dim);
    font-size: 16px;
  }
  .del {
    position: absolute;
    top: 6px;
    right: 8px;
    padding: 2px;
    background: transparent;
    box-shadow: none;
    color: var(--dim);
  }
  .del:hover {
    color: var(--hot);
    background: transparent;
  }
  .confirm {
    position: absolute;
    inset: 2px 2px 2px auto;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    background: var(--panel);
  }
  .confirm button {
    padding: 2px 4px;
  }
  .yes:hover {
    color: var(--hot);
  }
</style>
