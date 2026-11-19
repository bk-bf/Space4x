<script lang="ts">
  import { formatDay, game } from '#lib/game/index.ts';
  import { Icon } from '#lib/ui/index.ts';
  import { paintBackdrop } from './backdrop';
  import { isDesktop, quitDesktop } from './desktop';
  import solStation from './sol-station.png';
  import { hasSave } from './saveManager.ts';
  import SaveListMenu from './SaveListMenu.svelte';
  import { continueGame, session, startGame } from './session.svelte.ts';

  let backdrop: HTMLCanvasElement;
  const desktop = isDesktop();
  let canLoad = $state(false);
  let loading = $state(false);

  function newGame() {
    if (session.resumable) void startGame('new');
    else continueGame();
  }

  $effect(() => {
    const img = new Image();
    const paint = () => paintBackdrop(backdrop, img, devicePixelRatio || 1);
    const resize = new ResizeObserver(paint);
    img.onload = () => {
      paint();
      resize.observe(backdrop);
    };
    img.src = solStation;
    return () => resize.disconnect();
  });

  $effect(() => {
    void session.revision;
    void hasSave().then((has) => (canLoad = has));
  });
</script>

<div id="title" role="dialog" aria-modal="true" aria-label="Space4x">
  <canvas class="scene" bind:this={backdrop}></canvas>
  <div class="content">
    <h1 aria-label="Space4x">
      <span aria-hidden="true"
        >SPA<svg class="c" viewBox="0 0 193 259"
          >{#each [[0, 15], [12, 12], [-12, 12], [12, -6], [-12, -6], [0, 0]] as [dx, dy], i (i)}<path
              transform="translate({dx} {dy})"
              fill={i === 5 ? 'currentColor' : '#000'}
              d="M36 0h121v35H36zM0 35h193v20H0zM0 55h51v150H0zM142 55h51v35h-51zM142 170h51v35h-51zM0 205h193v20H0zM36 225h121v34H36z"
            />{/each}</svg
        >E<em>4X</em></span
      >
    </h1>
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
    width: 100%;
    height: 100%;
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
      700 clamp(64px, 9vw, 132px) / 0.95 'Pixelify',
      sans-serif;
    letter-spacing: 0.01em;
    color: #fff;
    text-shadow:
      0 0.038em 0 #000,
      0.031em 0.031em 0 #000,
      -0.031em 0.031em 0 #000,
      0.031em -0.015em 0 #000,
      -0.031em -0.015em 0 #000;
  }
  h1 em {
    font-style: normal;
    color: #ffb43b;
  }
  .c {
    width: 0.4825em;
    height: 0.6475em;
    margin: 0 0.07em 0 0.06em;
    overflow: visible;
    vertical-align: -0.01em;
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
