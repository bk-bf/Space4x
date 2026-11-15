<script lang="ts">
  import type { FB } from '#lib/gfx/framebuffer.ts';
  import { CanvasView, requestRender } from '#lib/ui/index.ts';
  import { insertIndex, targetLabel, type LaidPart } from './design.ts';
  import { designer } from './designer.svelte.ts';
  import { drawDesign } from './drawDesign.ts';
  import { frameOf, pickScale } from './geometry.ts';
  import PartControls from './PartControls.svelte';

  let box = $state({ w: 0, h: 0 });
  let fit = $state.raw<FB>();
  let dropX = $state<number | null>(null);

  const scale = $derived(pickScale(designer.draft, box));
  const label = $derived(targetLabel(designer.draft, designer.selection));

  function local(e: DragEvent) {
    const stage = e.currentTarget as HTMLElement;
    const r = stage.getBoundingClientRect();
    const f = fit;
    if (!f) return undefined;
    const frame = frameOf(designer.draft, f.w, f.h, f.scale);
    return {
      frame,
      x: (e.clientX - r.left) / f.scale - frame.originX,
      y: (e.clientY - r.top) / f.scale
    };
  }

  function boundary(parts: readonly LaidPart[], x: number): number {
    const sections = parts.filter((p) => p.target.kind === 'section');
    const k = insertIndex(parts, x);
    const next = sections[k];
    if (next) return next.x;
    const last = sections[sections.length - 1];
    return last ? last.x + last.w : 0;
  }

  function over(e: DragEvent) {
    const drag = designer.drag;
    if (!drag) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = drag.kind === 'palette' ? 'copy' : 'move';
    const inserts = drag.kind === 'section' || drag.item.kind === 'core';
    const at = inserts ? local(e) : undefined;
    dropX = at ? boundary(at.frame.parts, at.x) : null;
  }

  function leave(e: DragEvent) {
    if (!(e.currentTarget as Element).contains(e.relatedTarget as Node | null)) dropX = null;
  }

  function drop(e: DragEvent) {
    const drag = designer.drag;
    designer.drag = null;
    dropX = null;
    const at = local(e);
    if (!drag || !at) return;
    e.preventDefault();
    const under = at.frame.parts.find((p) => at.x >= p.x && at.x < p.x + p.w);
    if (drag.kind === 'section') {
      const to = insertIndex(at.frame.parts, at.x);
      designer.moveTo(drag.index, to > drag.index ? to - 1 : to);
    } else if (drag.item.kind === 'core')
      designer.addCore(drag.item.key as never, insertIndex(at.frame.parts, at.x));
    else if (drag.item.kind === 'att') {
      if (under?.target.kind === 'section')
        designer.attach(drag.item.key, {
          index: under.target.index,
          slot: at.y < at.frame.cy ? 'top' : 'bottom'
        });
    } else {
      if (drag.item.kind === 'bow' && under?.target.kind === 'aft') designer.select({ kind: 'aft' });
      designer.place(drag.item);
    }
    requestRender();
  }

  const sectionDrag = (e: DragEvent, index: number) => {
    e.dataTransfer?.setData('text/plain', 'section');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    designer.drag = { kind: 'section', index };
  };
</script>

<div class="designer">
  <div
    class="stage"
    role="application"
    aria-label={label}
    bind:clientWidth={box.w}
    bind:clientHeight={box.h}
    ondragover={over}
    ondragleave={leave}
    ondrop={drop}
  >
    {#if box.w > 0}
      {#key scale}
        <CanvasView
          {scale}
          bg="grid"
          id="designCv"
          pickableLabels
          draw={(f, t) => drawDesign(f, designer.draft, t, designer.selection)}
          onfit={(f) => (fit = f)}
        >
          {#snippet labels(f)}
            {@const frame = frameOf(designer.draft, f.w, f.h, f.scale)}
            {@const sel = designer.selection}
            {#each frame.parts as p, i (i)}
              {@const isSection = p.target.kind === 'section'}
              {@const on =
                sel.kind === p.target.kind &&
                (sel.kind !== 'section' || (p.target.kind === 'section' && p.target.index === sel.index))}
              <div
                class="col"
                data-part={p.target.kind === 'section' ? `section:${p.target.index}` : p.target.kind}
                class:on
                style:left="{(frame.originX + p.x) * f.scale}px"
                style:width="{p.w * f.scale}px"
              >
                {#if p.target.kind === 'section'}
                  {@const index = p.target.index}
                  <button
                    class="zone"
                    data-zone="top"
                    aria-label="{p.name} top slot"
                    style:top="0"
                    style:height="{frame.cy * f.scale}px"
                    onclick={() => designer.select({ kind: 'section', index, slot: 'top' })}
                  ></button>
                  <button
                    class="zone"
                    data-zone="bottom"
                    aria-label="{p.name} bottom slot"
                    style:top="{frame.cy * f.scale}px"
                    style:height="{(frame.lineY - frame.cy) * f.scale}px"
                    onclick={() => designer.select({ kind: 'section', index, slot: 'bottom' })}
                  ></button>
                {:else}
                  {@const kind = p.target.kind}
                  <button
                    class="zone"
                    data-zone="part"
                    aria-label={p.name}
                    style:top="0"
                    style:height="{frame.lineY * f.scale}px"
                    onclick={() => designer.select({ kind })}
                  ></button>
                {/if}
                <button
                  class="tag"
                  data-label={p.name}
                  draggable={isSection}
                  style:top="{(frame.lineY + 3) * f.scale}px"
                  onclick={() =>
                    designer.select(
                      p.target.kind === 'section'
                        ? {
                            kind: 'section',
                            index: p.target.index,
                            slot: sel.kind === 'section' ? sel.slot : 'top'
                          }
                        : { kind: p.target.kind }
                    )}
                  ondragstart={(e) => p.target.kind === 'section' && sectionDrag(e, p.target.index)}
                  ondragend={() => {
                    designer.drag = null;
                    dropX = null;
                  }}><span>{p.name}</span></button
                >
              </div>
            {/each}
            {#if dropX !== null}
              <div class="ins" style:left="{(frame.originX + dropX) * f.scale - 1}px"></div>
            {/if}
          {/snippet}
        </CanvasView>
      {/key}
    {/if}
  </div>
  <PartControls />
</div>

<style>
  .designer {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .stage {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
  }
  .stage > :global(.view) {
    flex: 1;
  }
  .ins {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--accent);
    pointer-events: none;
  }
  .col {
    position: absolute;
    top: 0;
    bottom: 0;
  }
  .zone,
  .tag {
    position: absolute;
    left: 0;
    right: 0;
    margin: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
    pointer-events: auto;
  }
  .zone:hover,
  .tag:hover {
    background: rgba(242, 179, 93, 0.14);
  }
  .tag {
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    color: var(--dim);
    overflow: visible;
  }
  .tag span {
    writing-mode: vertical-rl;
    font-size: 16px;
    line-height: 16px;
    white-space: nowrap;
  }
  .col.on .tag {
    color: var(--accent);
  }
</style>
