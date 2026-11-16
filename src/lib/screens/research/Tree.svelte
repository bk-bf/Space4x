<script lang="ts">
  import { milestone } from '#lib/game/data/index.ts';
  import { economy, homeSite, runningProgramme } from '#lib/game/economy/index.ts';
  import { Icon, Tile, dim, tipText, warn, type Tip } from '#lib/ui/index.ts';
  import type { IconName } from '#lib/gfx/icons.ts';
  import { CHAIN } from './chain.ts';
  import { shortName, TIER_NAMES } from './names.ts';
  import { milestoneIcon, statusOf } from './programme.ts';
  import { research } from './research.svelte.ts';

  const GAP = 4;
  const TILE_H = { min: 54, max: 88, tiny: 84 };
  const TILE_W = { min: 64, max: 100, narrow: 92 };

  let width = $state(0);
  let height = $state(0);

  const site = $derived(homeSite());
  const rows = CHAIN.rows;
  const cols = CHAIN.cols;
  const th = $derived(
    Math.max(TILE_H.min, Math.min(TILE_H.max, Math.floor((height - GAP * (rows - 1)) / rows)))
  );
  const tw = $derived(
    Math.max(TILE_W.min, Math.min(TILE_W.max, Math.floor((width - GAP * (cols - 1)) / cols)))
  );
  const tiny = $derived(th < TILE_H.tiny);
  const narrow = $derived(tw < TILE_W.narrow);

  const selected = $derived(milestone(research.selected));

  const place = (n: { col: number; row: number }) => ({
    x: Math.round(((width - tw) * n.col) / Math.max(1, cols - 1)),
    y: Math.round(((height - th) * n.row) / Math.max(1, rows - 1))
  });

  const edges = $derived.by(() => {
    const at = new Map(CHAIN.nodes.map((n) => [n.number, place(n)]));
    const done: string[] = [];
    const open: string[] = [];
    for (const n of CHAIN.nodes)
      for (const r of n.requires) {
        const a = at.get(r),
          b = at.get(n.number);
        if (!a || !b) continue;
        const x1 = a.x + tw,
          y1 = a.y + th / 2,
          x2 = b.x,
          y2 = b.y + th / 2;
        (economy.done.includes(r) ? done : open).push(`M${x1} ${y1}H${x2 - GAP}V${y2}H${x2}`);
      }
    return { done: done.join(''), open: open.join('') };
  });

  const GLYPH: Record<string, { icon: IconName; tone: 'accent' | 'cool' | 'dim' | 'hot' }> = {
    done: { icon: 'check', tone: 'accent' },
    running: { icon: 'hammer', tone: 'cool' },
    ready: { icon: 'play', tone: 'cool' },
    waiting: { icon: 'clock', tone: 'dim' },
    locked: { icon: 'lock', tone: 'dim' }
  };

  const STATE_LINE = {
    done: 'Done',
    running: 'Programme running',
    ready: 'Ready to start',
    waiting: 'Open: something is missing',
    locked: 'Locked'
  } as const;

  function tipFor(n: number): Tip {
    const m = milestone(n);
    const status = statusOf(economy, site, m);
    const before = m.requires.filter((r) => !economy.done.includes(r));
    return tipText(
      `${m.number}. ${m.name}`,
      dim(m.unlocks),
      status === 'locked' ? warn(`Needs ${before.join(', ')}`) : STATE_LINE[status],
      TIER_NAMES[m.tier]
    );
  }
</script>

<div class="treewrap">
  <div
    class="tree"
    class:tiny
    class:narrow
    id="techTree"
    bind:clientWidth={width}
    bind:clientHeight={height}
    style:--tw="{tw}px"
    style:--th="{th}px"
  >
    <svg {width} {height} aria-hidden="true">
      <path d={edges.open} fill="none" stroke="#443d80" stroke-width="2" stroke-dasharray="4 3" />
      <path d={edges.done} fill="none" stroke="#f2b35d" stroke-width="2" />
    </svg>
    {#each CHAIN.nodes as n (n.number)}
      {@const status = statusOf(economy, site, milestone(n.number))}
      {@const glyph = GLYPH[status]!}
      {@const p = place(n)}
      {@const running = runningProgramme(economy, n.number)}
      <div
        class="tpos"
        data-milestone={n.number}
        data-status={status}
        style:left="{p.x}px"
        style:top="{p.y}px"
      >
        <Tile
          variant="node"
          class="tn {status}{selected.requires.includes(n.number) ? ' needs' : ''}{milestone(
            n.number
          ).requires.includes(selected.number)
            ? ' feeds'
            : ''}"
          corner={String(n.number)}
          mark={glyph.icon}
          markTone={glyph.tone}
          icons={milestoneIcon(n.number) ? [milestoneIcon(n.number)!] : []}
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
  </div>
  <div class="tkey">
    <span><i class="d"></i>done</span>
    <span><i class="a"></i>open or running</span>
    <span><i class="l"></i>locked</span>
    <span><u class="done"></u>line from a done milestone</span>
    <span><u></u>line from one not yet done</span>
    <span><Icon name="arrowR" class="sm" />selected: prerequisites amber, what it opens teal</span>
  </div>
</div>

<style>
  .treewrap {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }
  .tree {
    position: relative;
    flex: 0 1 auto;
    height: 440px;
    min-height: 236px;
    margin: 2px 0 8px;
  }
  .tree svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .tpos {
    position: absolute;
    width: var(--tw);
    height: var(--th);
  }
  .tpos :global(.ui-tile) {
    width: 100%;
    height: 100%;
    padding-top: 6px;
    background: var(--panel2);
    opacity: 1;
  }
  .tpos :global(.ui-tile.lock) {
    background: #221d46;
  }
  .tpos :global(.ui-tile.sel) {
    background: #38306e;
  }
  .tpos :global(.ui-tile.lock > *) {
    opacity: 0.55;
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
  .tpos :global(.ui-tile.waiting),
  .tpos :global(.ui-tile.feeds) {
    box-shadow:
      0 -2px 0 var(--cool),
      0 2px 0 var(--cool),
      -2px 0 0 var(--cool),
      2px 0 0 var(--cool);
  }
  .tpos :global(.ui-tile.waiting:not(.feeds)) {
    box-shadow: var(--edge);
  }
  .tpos :global(.ui-art) {
    height: 38px;
    margin-top: 6px;
  }
  .tpos :global(.ui-nm b) {
    font-size: 15px;
  }
  .narrow .tpos :global(.ui-nm b) {
    font-size: 13px;
    word-break: normal;
    overflow-wrap: normal;
  }
  .narrow .tpos :global(.ui-corner) {
    font-size: 12px;
  }
  .tiny .tpos :global(.ui-art),
  .tiny .tpos :global(.ui-bar) {
    display: none;
  }
  .tiny .tpos :global(.ui-nm) {
    height: auto;
    flex: 1;
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
