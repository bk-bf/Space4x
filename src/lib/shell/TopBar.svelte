<script lang="ts">
  import { formatClock, game, STEPS } from '#lib/game/index.ts';
  import { SCREENS } from '#lib/screens/list.ts';
  import { gallery } from './mode.ts';
  import PauseMenu from './PauseMenu.svelte';
  import { openPauseMenu, session } from './session.svelte.ts';
  import { Icon, requestRender, shell, wm } from '#lib/ui/index.ts';
  import { SETTINGS_ID } from '#lib/ui/wm/wm.svelte.ts';

  function pickStep(seconds: number) {
    game.setStep(seconds);
    requestRender();
  }

  function togglePanels() {
    if (shell.screen !== 'map') shell.setScreen('map');
    wm.show(SETTINGS_ID, !!wm.get(SETTINGS_ID)?.hidden);
  }
</script>

<svelte:head
  >{#if gallery}<title>Space4x gallery</title>{/if}</svelte:head
>

<header
  id="top"
  data-ready={session.ready}
  class:gallery
  title={gallery ? 'Gallery build: includes mock screens and scenes' : undefined}
>
  <span class="brand"><Icon name="logo" /><b>Space4x</b></span>
  <nav id="nav">
    {#each SCREENS as s (s.id)}<button
        data-nav={s.id}
        title="{s.title} ({s.key})"
        class:on={shell.screen === s.id}
        onclick={() => shell.setScreen(s.id)}><Icon name={s.icon} /></button
      >{/each}
  </nav>
  <div id="time">
    <span class="clock" id="clock">{formatClock(game.time)}</span><button
      id="bPause"
      title="Pause (space)"
      class:on={!game.running}
      onclick={() => game.pause()}><Icon name="pause" /></button
    ><button id="bPlay" title="Run continuously (space)" class:on={game.running} onclick={() => game.run()}
      ><Icon name="play" /></button
    ><span id="steps"
      >{#each STEPS as s (s.seconds)}<button
          data-step={s.seconds}
          class:on={game.step === s.seconds}
          onclick={() => pickStep(s.seconds)}>{s.label}</button
        >{/each}</span
    >
  </div>
  <div id="chips">
    {#each game.status as c (c.id)}<span class="chip" class:warn={c.warn} title={c.title}
        ><Icon name={c.icon} />{c.value}</span
      >{/each}
  </div>
  <button id="bSet" title="Menu: save, load, new game, panels (Esc)" onclick={openPauseMenu}
    ><Icon name="gear" /></button
  >
</header>

{#if session.menu}
  <PauseMenu onPanels={togglePanels} />
{/if}
