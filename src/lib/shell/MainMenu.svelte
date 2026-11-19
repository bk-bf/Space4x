<script lang="ts">
  import { formatDay, game } from '#lib/game/index.ts';
  import { CanvasView, Icon } from '#lib/ui/index.ts';
  import { isDesktop, quitDesktop } from './desktop';
  import { MenuScene } from './menuScene';
  import { hasSave } from './saveManager.ts';
  import SaveListMenu from './SaveListMenu.svelte';
  import { continueGame, session, startGame } from './session.svelte.ts';

  const scene = new MenuScene();
  const desktop = isDesktop();
  let canLoad = $state(false);
  let loading = $state(false);

  function newGame() {
    if (session.resumable) void startGame('new');
    else continueGame();
  }

  $effect(() => {
    void session.revision;
    void hasSave().then((has) => (canLoad = has));
  });
</script>

<div id="title" role="dialog" aria-modal="true" aria-label="Space4x">
  <div class="scene"><CanvasView scale={2} vignette={0.55} bg="stars" draw={(fb) => scene.draw(fb)} /></div>
  <div class="content">
    <h1>SPACE4X</h1>
    <nav>
      {#if session.resumable}
        <button id="titleContinue" onclick={continueGame}
          ><Icon name="play" class="sm" /><span>Continue<small>{formatDay(game.time)}</small></span></button
        >
      {/if}
      <button id="titleNew" onclick={newGame}><Icon name="plus" class="sm" /><span>New game</span></button>
      <button id="titleLoad" disabled={!canLoad} onclick={() => (loading = true)}
        ><Icon name="folder" class="sm" /><span>Load game</span></button
      >
      {#if desktop}
        <button id="titleQuit" onclick={quitDesktop}><Icon name="power" class="sm" /><span>Quit</span></button
        >
      {/if}
    </nav>
  </div>
</div>

{#if loading}
  <SaveListMenu mode="load" onClose={() => (loading = false)} />
{/if}

<style>
  #title {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: var(--bg);
  }
  .scene {
    position: absolute;
    inset: 0;
    display: flex;
  }
  .scene > :global(.view) {
    flex: 1;
  }
  .content {
    position: absolute;
    top: 9vh;
    left: 6vw;
    display: flex;
    flex-direction: column;
    gap: 5vh;
  }
  h1 {
    margin: 0;
    font:
      700 clamp(64px, 9vw, 132px) / 0.9 'Pixelify',
      sans-serif;
    letter-spacing: 0.06em;
    color: var(--accent);
    text-shadow:
      0 4px 0 var(--bg),
      0 0 24px rgba(242, 179, 93, 0.25);
  }
  nav {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  nav button {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 280px;
    margin: 0;
    padding: 10px 18px;
    background: rgba(28, 24, 56, 0.9);
    font-size: 24px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-align: left;
  }
  nav button:hover:not(:disabled) {
    background: var(--panel2);
    color: var(--accent);
  }
  nav button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  nav span {
    display: flex;
    flex-direction: column;
  }
  small {
    color: var(--dim);
    font-size: 16px;
    letter-spacing: 0.04em;
    text-transform: none;
  }
</style>
