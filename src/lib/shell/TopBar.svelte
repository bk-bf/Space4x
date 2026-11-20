<script lang="ts">
  import { formatClock, game, STEPS, type StatusValue } from '#lib/game/index.ts';
  import { ui } from '#lib/screens/economy/state.svelte.ts';
  import { SCREENS } from '#lib/screens/list.ts';
  import { gallery } from './mode.ts';
  import PauseMenu from './PauseMenu.svelte';
  import { openPauseMenu, session } from './session.svelte.ts';
  import { Icon, requestRender, shell, tooltip, wm } from '#lib/ui/index.ts';
  import { SETTINGS_ID } from '#lib/ui/wm/wm.svelte.ts';

  function pickStep(seconds: number) {
    game.setStep(seconds);
    requestRender();
  }

  function openChip(c: StatusValue) {
    if (!c.open) return;
    const { site, material } = c.open;
    ui.site = site;
    if (material) {
      ui.tab = 'stockpiles';
      ui.category = 'all';
      ui.material = material;
    } else ui.tab = 'summary';
    shell.setScreen('economy');
  }

  function chipKey(e: KeyboardEvent, c: StatusValue) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openChip(c);
  }

  const pauseTitle = $derived(game.pausedBy ? `Paused by: ${game.pausedBy.text}` : 'Pause (space)');

  const TOP_ZOOM_STEP = 0.04;
  const TOP_ZOOM_MIN = 0.5;
  let top = $state<HTMLElement>();
  const chipText = $derived(game.status.map((c) => c.value).join('|'));
  const clockLength = $derived(formatClock(game.time).length);

  function fitTop() {
    if (!top) return;
    let zoom = 1;
    top.style.setProperty('--tz', String(zoom));
    while (top.scrollWidth > top.clientWidth + 1 && zoom > TOP_ZOOM_MIN) {
      zoom = Math.round((zoom - TOP_ZOOM_STEP) * 100) / 100;
      top.style.setProperty('--tz', String(zoom));
    }
  }

  $effect(() => {
    void chipText;
    void clockLength;
    fitTop();
  });

  $effect(() => {
    void document.fonts.ready.then(fitTop);
  });

  function togglePanels() {
    if (shell.screen !== 'map') shell.setScreen('map');
    wm.show(SETTINGS_ID, !!wm.get(SETTINGS_ID)?.hidden);
  }
</script>

<svelte:head
  >{#if gallery}<title>Space4x gallery</title>{/if}</svelte:head
>

<svelte:window onresize={fitTop} />

<header id="top" bind:this={top} data-ready={session.ready} class:gallery>
  <span class="brand" use:tooltip={gallery && 'Gallery build: includes mock screens and scenes'}
    ><Icon name="logo" /><b>Space4x</b></span
  >
  <nav id="nav">
    {#each SCREENS as s (s.id)}<button
        data-nav={s.id}
        aria-label={s.title}
        use:tooltip={`${s.title} (${s.key})`}
        class:on={shell.screen === s.id}
        onclick={() => shell.setScreen(s.id)}><Icon name={s.icon} /></button
      >{/each}
  </nav>
  <div id="time">
    <span class="clock" id="clock">{formatClock(game.time)}</span><button
      id="bPause"
      aria-label={pauseTitle}
      use:tooltip={pauseTitle}
      class:on={!game.running}
      onclick={() => game.pause()}><Icon name="pause" /></button
    ><button
      id="bPlay"
      use:tooltip={'Run continuously (space)'}
      class:on={game.running}
      onclick={() => game.run()}><Icon name="play" /></button
    ><span id="steps"
      >{#each STEPS as s (s.seconds)}<button
          data-step={s.seconds}
          class:on={game.step === s.seconds}
          onclick={() => pickStep(s.seconds)}>{s.label}</button
        >{/each}</span
    >
  </div>
  <div id="chips">
    {#each game.status as c (c.id)}{#if c.open}<span
          class="chip open"
          class:warn={c.warn}
          data-chip={c.id}
          data-site={c.open.site}
          aria-label={c.title}
          use:tooltip={c.title}
          role="button"
          tabindex="0"
          onclick={() => openChip(c)}
          onkeydown={(e) => chipKey(e, c)}><Icon name={c.icon} />{c.value}</span
        >{:else}<span
          class="chip"
          class:warn={c.warn}
          data-chip={c.id}
          aria-label={c.title}
          use:tooltip={c.title}><Icon name={c.icon} />{c.value}</span
        >{/if}{/each}
  </div>
  <button id="bSet" aria-label="Menu" use:tooltip={'Menu (Esc)'} onclick={openPauseMenu}
    ><Icon name="gear" /></button
  >
</header>

{#if session.menu}
  <PauseMenu onPanels={togglePanels} />
{/if}

<style>
  .chip.open {
    cursor: pointer;
  }
</style>
