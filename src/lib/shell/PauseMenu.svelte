<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from '#lib/ui/index.ts';
  import { hasSave } from './saveManager.ts';
  import SaveListMenu from './SaveListMenu.svelte';
  import { closePauseMenu, openTitle, session, startGame } from './session.svelte.ts';
  import { prefs, setAutosave } from './uiPrefs.svelte.ts';

  let { onPanels }: { onPanels: () => void } = $props();

  let dialog: HTMLDialogElement;
  let canLoad = $state(false);
  let saved = $state(false);

  const clockOf = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const status = $derived(
    !session.autoload
      ? 'Off for test and scenario links'
      : session.savedAt
        ? `Last autosave at ${clockOf(session.savedAt)}`
        : 'Every game day and when the tab closes'
  );

  onMount(() => dialog.showModal());

  $effect(() => {
    void session.revision;
    void hasSave().then((has) => (canLoad = has));
  });

  function onSaved() {
    saved = true;
    setTimeout(() => (saved = false), 1600);
  }

  function newGame() {
    if (confirm('Start a new game? This game stays in the save list.')) void startGame('new');
  }

  function panels() {
    closePauseMenu();
    onPanels();
  }
</script>

<dialog
  bind:this={dialog}
  id="menu"
  aria-label="Paused"
  oncancel={(e) => {
    e.preventDefault();
    closePauseMenu();
  }}
  onclick={(e) => {
    if (e.target === dialog) closePauseMenu();
  }}
>
  <h2>Paused</h2>
  <nav>
    <button id="menuResume" onclick={closePauseMenu}><Icon name="play" class="sm" />Resume</button>
    <button id="menuSave" class:on={saved} onclick={() => (session.dialog = 'save')}
      ><Icon name={saved ? 'check' : 'disk'} class="sm" />{saved ? 'Saved' : 'Save game'}</button
    >
    <button id="menuLoad" disabled={!canLoad} onclick={() => (session.dialog = 'load')}
      ><Icon name="folder" class="sm" />Load game</button
    >
    <button id="menuNew" onclick={newGame}><Icon name="plus" class="sm" />New game</button>
    <button
      id="menuAutosave"
      aria-pressed={prefs.autosave}
      aria-describedby="autosaveStatus"
      onclick={() => setAutosave(!prefs.autosave)}
      ><Icon name={prefs.autosave ? 'check' : 'cross'} class="sm" />Autosave</button
    >
    <span id="autosaveStatus">{prefs.autosave ? status : 'Saves only when asked'}</span>
    <button id="menuPanels" onclick={panels}><Icon name="gear" class="sm" />Panels</button>
    <button id="menuTitle" onclick={() => void openTitle()}><Icon name="arrowR" class="sm" />Main menu</button
    >
  </nav>
</dialog>

{#if session.dialog}
  <SaveListMenu mode={session.dialog} {onSaved} onClose={() => (session.dialog = null)} />
{/if}

<style>
  dialog {
    width: 260px;
    padding: 14px 16px 16px;
    background: var(--panel);
    color: var(--text);
    border: 0;
    box-shadow: var(--edge);
  }
  dialog::backdrop {
    background: rgba(20, 17, 42, 0.72);
  }
  h2 {
    margin: 0 0 12px;
    text-align: center;
    color: var(--accent);
    font-size: 18px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  nav button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
  }
  #autosaveStatus {
    margin: -4px 2px 2px;
    color: var(--dim);
    font-size: 16px;
  }
  nav button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  #menuAutosave[aria-pressed='true'] :global(.ic) {
    color: var(--cool);
  }
  #menuAutosave[aria-pressed='false'] :global(.ic) {
    color: var(--hot);
  }
</style>
