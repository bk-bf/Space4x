<script lang="ts">
  import type { FB } from '#lib/gfx/framebuffer.ts';
  import { CanvasView, Panel, Tabs } from '#lib/ui/index.ts';
  import { drawTree, nodeBox } from './drawTree.ts';
  import { percent } from './format.ts';
  import { research } from './research.svelte.ts';
  import { FIELDS, techsOf } from './tech.ts';

  const TABS = FIELDS.map((f) => ({ id: f.id, label: f.label }));
  const techs = $derived(techsOf(research.field));
  const view = $derived({
    techs,
    stateOf: (id: string) => research.stateOf(id),
    fraction: (id: string) => research.fraction(id),
    selected: research.selected
  });

  function press(e: KeyboardEvent, id: string) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    research.select(id);
  }
</script>

<Panel title="Technology" body="col">
  <Tabs tabs={TABS} bind:active={research.field} />
  <CanvasView
    scale={2}
    height={260}
    labelsId="techLabels"
    pickableLabels
    draw={(fb, t) => drawTree(fb, view, t)}
  >
    {#snippet labels(fb: FB)}
      {#each techs as tech (tech.id)}
        {@const box = nodeBox(fb, tech)}
        {@const status = research.stateOf(tech.id)}
        <span
          class="node {status}"
          class:sel={tech.id === research.selected}
          role="button"
          tabindex="0"
          data-tech={tech.id}
          title={status === 'running' || status === 'open'
            ? `${tech.name}, ${percent(research.fraction(tech.id))}%`
            : tech.name}
          style:left="{box.x * fb.scale}px"
          style:top="{box.y * fb.scale}px"
          style:width="{box.w * fb.scale}px"
          style:height="{box.h * fb.scale}px"
          onclick={() => research.select(tech.id)}
          onkeydown={(e) => press(e, tech.id)}>{tech.name}</span
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
    font-size: 17px;
  }
  .node.locked {
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
