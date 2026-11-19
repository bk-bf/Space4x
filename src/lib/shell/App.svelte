<script lang="ts">
  import { onMount } from 'svelte';
  import { game, startLoop } from '#lib/game/index.ts';
  import { SCREEN_COMPONENTS, SCREENS } from '#lib/screens/index.ts';
  import { shell } from '#lib/ui/index.ts';
  import { frameTick, startRendering } from '#lib/ui/frame.ts';
  import { layoutCheck, reportLayout } from '#lib/ui/layoutCheck.ts';
  import { applyQuery } from './applyQuery';
  import { startDesktop } from './desktop';
  import { parseQuery } from './query';
  import TopBar from './TopBar.svelte';

  const CHECK_DELAY_MS = 900;

  function onKey(e: KeyboardEvent) {
    if (e.defaultPrevented) return;
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
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
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
    };
  });
</script>

<svelte:window onkeydown={onKey} />

<TopBar />
<div id="stage">
  {#each SCREEN_COMPONENTS as s (s.id)}
    {#if s.id === 'map' || s.id === shell.screen}<s.component />{/if}
  {/each}
</div>
