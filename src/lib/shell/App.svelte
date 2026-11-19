<script lang="ts">
  import { onMount } from 'svelte';
  import { game, startLoop } from '#lib/game/index.ts';
  import { SCREEN_COMPONENTS, SCREENS } from '#lib/screens/index.ts';
  import { shell } from '#lib/ui/index.ts';
  import { frameTick, startRendering } from '#lib/ui/frame.ts';
  import { layoutCheck, reportLayout } from '#lib/ui/layoutCheck.ts';
  import { applyQuery } from './applyQuery';
  import MainMenu from './MainMenu.svelte';
  import { startDesktop } from './desktop';
  import { parseQuery } from './query';
  import { openPauseMenu, session, startSession } from './session.svelte.ts';
  import TopBar from './TopBar.svelte';

  const CHECK_DELAY_MS = 900;

  function onKey(e: KeyboardEvent) {
    if (e.defaultPrevented || session.title) return;
    if (e.key === 'Escape' && !session.menu && !(e.target as Element).closest?.('input,select,textarea')) {
      e.preventDefault();
      openPauseMenu();
      return;
    }
    const plain = !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;
    const screen = plain ? SCREENS.find((s) => s.key === e.key) : undefined;
    if (screen) {
      e.preventDefault();
      shell.setScreen(screen.id);
    }
    if (
      e.key === ' ' &&
      !(e.target as Element).closest?.('select,button,input,textarea,summary,a,[tabindex]')
    ) {
      e.preventDefault();
      game.toggleRunning();
    }
  }

  onMount(() => {
    startDesktop();
    const params = new URLSearchParams(location.search);
    const query = parseQuery(params);
    const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stop = () => {};
    let stopSaving = () => {};
    let cancelled = false;
    document.fonts.ready.then(async () => {
      if (cancelled) return;
      stopSaving = await startSession(params);
      if (cancelled) return stopSaving();
      applyQuery(query, params);
      startRendering();
      stop = startLoop(game, frameTick, { intervalMs: slow ? 1000 : 100 });
      if (!query.check) return;
      window.space4xLayoutCheck = () => layoutCheck(shell.screen);
      setTimeout(() => reportLayout(shell.screen), CHECK_DELAY_MS);
    });
    return () => {
      cancelled = true;
      stop();
      stopSaving();
    };
  });
</script>

<svelte:window onkeydown={onKey} />

{#if session.title}<MainMenu />{/if}

<TopBar />
<div id="stage">
  {#each SCREEN_COMPONENTS as s (s.id)}
    {#if s.id === 'map' || s.id === shell.screen}<s.component />{/if}
  {/each}
</div>
