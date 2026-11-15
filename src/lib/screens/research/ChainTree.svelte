<script lang="ts">
  import { milestone } from '#lib/game/data/index.ts';
  import { economy, homeSite, programmeStatus, runningProgramme } from '#lib/game/economy/index.ts';
  import type { FB } from '#lib/gfx/framebuffer.ts';
  import { CanvasView, Panel } from '#lib/ui/index.ts';
  import { CHAIN } from './chain.ts';
  import { drawTree, nodeBox } from './drawTree.ts';
  import { research } from './research.svelte.ts';

  const stateOf = (n: number) => programmeStatus(economy, homeSite(), milestone(n));
  const fraction = (n: number) =>
    runningProgramme(economy, n)?.progress ?? (economy.done.includes(n) ? 1 : 0);
  const view = $derived({ ...CHAIN, stateOf, fraction, selected: research.selected });

  function press(e: KeyboardEvent, n: number) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    research.selected = n;
  }
</script>

<Panel title="Milestone chain" body="col">
  <CanvasView
    scale={2}
    height={130}
    labelsId="techLabels"
    pickableLabels
    draw={(fb, t) => drawTree(fb, view, t)}
  >
    {#snippet labels(fb: FB)}
      {#each CHAIN.nodes as node (node.number)}
        {@const box = nodeBox(fb, CHAIN, node)}
        {@const status = stateOf(node.number)}
        <span
          class="node {status}"
          class:sel={node.number === research.selected}
          role="button"
          tabindex="0"
          data-milestone={node.number}
          title={milestone(node.number).name}
          style:left="{box.x * fb.scale}px"
          style:top="{box.y * fb.scale}px"
          style:width="{box.w * fb.scale}px"
          style:height="{box.h * fb.scale}px"
          onclick={() => (research.selected = node.number)}
          onkeydown={(e) => press(e, node.number)}>{node.number}</span
        >
      {/each}
    {/snippet}
  </CanvasView>
</Panel>

<style>
  .node {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
    text-align: center;
    overflow: hidden;
    color: var(--text);
    text-shadow: none;
    font-size: 20px;
  }
  .node.locked,
  .node.waiting {
    color: var(--dim);
  }
  .node.sel {
    background: none;
    color: var(--accent);
  }
  .node:focus-visible {
    outline: 2px solid var(--cool);
    outline-offset: -2px;
  }
</style>
