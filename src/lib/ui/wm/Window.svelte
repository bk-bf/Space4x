<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import Icon from '../Icon.svelte';
  import { tooltip } from '../primitives/tooltip.ts';
  import { wm, type WindowSpec } from './wm.svelte';

  interface Props extends WindowSpec {
    heading?: string;
    tools?: Snippet;
    children: Snippet;
  }

  let { heading, tools, children, ...spec }: Props = $props();

  const win = untrack(() => wm.register(spec));
  let el: HTMLElement;
  let body: HTMLElement;

  $effect(() => {
    wm.attach(win, el);
    const raise = () => wm.front(win);
    el.addEventListener('pointerdown', raise);
    const watch = new MutationObserver(() => wm.scheduleTile());
    watch.observe(body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ['hidden', 'open']
    });
    return () => {
      watch.disconnect();
      el.removeEventListener('pointerdown', raise);
      wm.detach(win);
    };
  });
</script>

<section
  class="win"
  class:min={win.min}
  id="w-{win.id}"
  data-dock={win.dock}
  data-grow={win.grow ? '1' : undefined}
  hidden={win.hidden}
  style:z-index={win.z || undefined}
  bind:this={el}
>
  <h2 class="tb" onpointerdown={(e) => wm.startDrag(win, e)}>
    <Icon name={win.icon} /><span>{heading ?? win.title}</span>
    {#if tools}{@render tools()}{/if}
    <button data-wm="min" aria-label="Minimise" use:tooltip={'Minimise'} onclick={() => wm.toggleMin(win)}
      >_</button
    >
    {#if win.home}<button
        data-wm="dock"
        aria-label="Dock or float"
        use:tooltip={'Dock or float'}
        onclick={() => wm.toggleDock(win)}>^</button
      >{/if}
    <button data-wm="close" aria-label="Close" use:tooltip={'Close'} onclick={() => wm.close(win)}>x</button>
  </h2>
  <div class="wb" bind:this={body}>{@render children()}</div>
</section>
