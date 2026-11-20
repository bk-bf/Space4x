<script lang="ts">
  import { milestone, milestones, shortName, TIER_NAMES } from '#lib/game/data/index.ts';
  import { economy, runningProgramme } from '#lib/game/economy/index.ts';
  import { Icon, Tile, dim, tipText, warn, type Tip } from '#lib/ui/index.ts';
  import type { IconName } from '#lib/gfx/icons.ts';
  import { CHAIN, LABEL_W, SUBJECT_ICONS, TILE_W } from './chain.ts';
  import { milestoneIcon, statusOf } from './programme.ts';
  import { research } from './research.svelte.ts';

  const VIEW_PAD = 16;

  let scroller = $state<HTMLElement>();
  let hovered = $state<number | null>(null);

  const focus = $derived(hovered ?? research.selected);
  const needs = $derived(new Set(milestone(focus).requires));
  const feeds = $derived(new Set(milestones.filter((m) => m.requires.includes(focus)).map((m) => m.number)));

  type Kind = 'into' | 'out' | 'done' | 'open';

  const lines = $derived.by(() => {
    const kindOf = (from: number, to: number): Kind =>
      to === focus ? 'into' : from === focus ? 'out' : economy.done.includes(from) ? 'done' : 'open';
    const all = CHAIN.edges.map((e) => ({ ...e, kind: kindOf(e.from, e.to) }));
    const rank: Record<Kind, number> = { open: 0, done: 1, into: 2, out: 3 };
    return all.sort((a, b) => rank[a.kind] - rank[b.kind]);
  });

  const GLYPH: Record<string, { icon: IconName; tone: 'accent' | 'cool' | 'dim' | 'hot' }> = {
    done: { icon: 'check', tone: 'accent' },
    running: { icon: 'hammer', tone: 'cool' },
    ready: { icon: 'play', tone: 'cool' },
    locked: { icon: 'lock', tone: 'dim' }
  };

  const STATE_LINE = {
    done: 'Done',
    running: 'Programme running',
    ready: 'Ready to start',
    locked: 'Locked'
  } as const;

  function tipFor(n: number): Tip {
    const m = milestone(n);
    const status = statusOf(economy, m);
    const before = m.requires.filter((r) => !economy.done.includes(r)).map(shortName);
    return tipText(
      m.name,
      dim(m.unlocks),
      status === 'locked' ? warn(`Locked until ${before.join(' and ')} done`) : STATE_LINE[status],
      TIER_NAMES[m.tier]
    );
  }

  function reveal(number: number) {
    const el = scroller;
    if (!el) return;
    const n = CHAIN.at(number);
    const left = n.x - LABEL_W - VIEW_PAD;
    const right = n.x + TILE_W + VIEW_PAD - el.clientWidth;
    if (el.scrollLeft <= left && el.scrollLeft >= right) return;
    const middle = n.x - LABEL_W - (el.clientWidth - LABEL_W - TILE_W) / 2;
    el.scrollLeft = Math.max(0, middle);
  }

  $effect(() => {
    const n = research.selected;
    if (scroller) reveal(n);
  });

  function wheel(node: HTMLElement) {
    const onwheel = (e: WheelEvent) => {
      const roomY = node.scrollHeight > node.clientHeight + 1;
      if (roomY || e.deltaX !== 0 || e.ctrlKey) return;
      if (node.scrollWidth <= node.clientWidth) return;
      e.preventDefault();
      node.scrollLeft += e.deltaY;
    };
    node.addEventListener('wheel', onwheel, { passive: false });
    return { destroy: () => node.removeEventListener('wheel', onwheel) };
  }

  function pan(node: HTMLElement) {
    let start: { x: number; y: number; left: number; top: number; id: number } | undefined;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
      start = { x: e.clientX, y: e.clientY, left: node.scrollLeft, top: node.scrollTop, id: e.pointerId };
      node.setPointerCapture(e.pointerId);
      node.classList.add('panning');
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      node.scrollLeft = start.left - (e.clientX - start.x);
      node.scrollTop = start.top - (e.clientY - start.y);
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      start = undefined;
      node.releasePointerCapture(e.pointerId);
      node.classList.remove('panning');
    };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    return {
      destroy() {
        node.removeEventListener('pointerdown', down);
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
      }
    };
  }
</script>

<div class="treewrap">
  <div class="scroller" id="techTree" data-scrolls-x bind:this={scroller} use:wheel use:pan>
    <div class="canvas" style:width="{CHAIN.width}px" style:height="{CHAIN.height}px">
      {#each CHAIN.lanes as lane (lane.id)}
        <div class="lane" style:top="{lane.top}px" style:height="{lane.height}px"></div>
      {/each}
      <svg width={CHAIN.width} height={CHAIN.height} aria-hidden="true">
        {#each lines as e (`${e.from}-${e.to}`)}
          <path class="e {e.kind}" d={e.d} data-edge="{e.from}-{e.to}" />
        {/each}
      </svg>
      {#each CHAIN.nodes as n (n.number)}
        {@const status = statusOf(economy, milestone(n.number))}
        {@const glyph = GLYPH[status]!}
        {@const running = runningProgramme(economy, n.number)}
        {@const icon = milestoneIcon(n.number)}
        <div
          class="tpos"
          role="presentation"
          data-milestone={n.number}
          data-status={status}
          style:left="{n.x}px"
          style:top="{n.y}px"
          onpointerenter={() => (hovered = n.number)}
          onpointerleave={() => (hovered = null)}
          onfocusin={() => reveal(n.number)}
        >
          <Tile
            variant="wide"
            class="tn {status}{needs.has(n.number) ? ' needs' : ''}{feeds.has(n.number) ? ' feeds' : ''}"
            corner={String(n.number)}
            mark={glyph.icon}
            markTone={glyph.tone}
            icons={icon ? [icon] : []}
            name={shortName(n.number)}
            meter={running ? running.progress : undefined}
            meterTone="cool"
            locked={status === 'locked'}
            selected={n.number === research.selected}
            tip={tipFor(n.number)}
            onselect={() => (research.selected = n.number)}
          />
        </div>
      {/each}
      <div class="lanelabels" style:width="{LABEL_W}px" style:height="{CHAIN.height}px">
        {#each CHAIN.lanes as lane (lane.id)}
          <div class="lanelabel" data-lane={lane.id} style:top="{lane.top}px" style:height="{lane.height}px">
            <Icon name={SUBJECT_ICONS[lane.id] ?? 'star'} class="sm" />
            <span>{lane.name}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
  <div class="tkey">
    <span><i class="d"></i>done</span>
    <span><i class="a"></i>open or running</span>
    <span><i class="l"></i>locked</span>
    <span><u class="done"></u>from a done milestone</span>
    <span
      ><Icon name="arrowR" class="sm" />selected: <b class="amber">prerequisites</b>,
      <b class="teal">opens</b></span
    >
  </div>
</div>

<style>
  .treewrap {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }
  .scroller {
    position: relative;
    flex: 0 1 auto;
    overflow: auto;
    margin: 2px 0 8px;
    cursor: grab;
    user-select: none;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
  }
  .scroller:global(.panning) {
    cursor: grabbing;
  }
  .canvas {
    position: relative;
  }
  .lane {
    position: absolute;
    left: 0;
    right: 0;
    background: var(--bg);
  }
  .lanelabels {
    position: sticky;
    left: 0;
    z-index: 3;
    background: var(--panel);
  }
  .lanelabel {
    position: absolute;
    left: 0;
    right: 2px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    background: var(--bg);
    color: var(--dim);
    line-height: 1;
  }
  svg {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 1;
    pointer-events: none;
    overflow: visible;
  }
  .e {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .e.open {
    stroke: var(--line);
    stroke-dasharray: 4 3;
  }
  .e.done {
    stroke: var(--accent);
    opacity: 0.4;
  }
  .e.into,
  .e.out {
    stroke-width: 3;
  }
  .e.into {
    stroke: var(--accent);
  }
  .e.out {
    stroke: var(--cool);
  }
  .tpos {
    position: absolute;
    z-index: 2;
    width: 144px;
    height: 56px;
  }
  .tpos :global(.ui-tile) {
    width: 100%;
    height: 100%;
    background: var(--panel2);
    opacity: 1;
  }
  .tpos :global(.ui-tile.lock) {
    background: var(--panel);
  }
  .tpos :global(.ui-tile.sel) {
    background: #38306e;
  }
  .tpos :global(.ui-tile.lock > *) {
    opacity: 0.6;
  }
  .tpos :global(.ui-tile.done),
  .tpos :global(.ui-tile.needs) {
    box-shadow:
      0 -2px 0 var(--accent),
      0 2px 0 var(--accent),
      -2px 0 0 var(--accent),
      2px 0 0 var(--accent);
  }
  .tpos :global(.ui-tile.ready),
  .tpos :global(.ui-tile.running),
  .tpos :global(.ui-tile.feeds) {
    box-shadow:
      0 -2px 0 var(--cool),
      0 2px 0 var(--cool),
      -2px 0 0 var(--cool),
      2px 0 0 var(--cool);
  }
  .tkey {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    color: var(--dim);
  }
  .tkey span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .tkey b {
    font-weight: 400;
  }
  .tkey .amber {
    color: var(--accent);
  }
  .tkey .teal {
    color: var(--cool);
  }
  .tkey i {
    width: 18px;
    height: 12px;
    background: var(--panel2);
    display: inline-block;
    box-shadow: var(--edge);
  }
  .tkey i.d {
    box-shadow:
      0 -2px 0 var(--accent),
      0 2px 0 var(--accent),
      -2px 0 0 var(--accent),
      2px 0 0 var(--accent);
  }
  .tkey i.a {
    box-shadow:
      0 -2px 0 var(--cool),
      0 2px 0 var(--cool),
      -2px 0 0 var(--cool),
      2px 0 0 var(--cool);
  }
  .tkey i.l {
    opacity: 0.55;
  }
  .tkey u {
    width: 22px;
    height: 0;
    border-top: 2px dashed var(--line);
    display: inline-block;
  }
  .tkey u.done {
    border-top: 2px solid var(--accent);
  }
</style>
