<script lang="ts">
  import { PixelCanvas, requestRender } from '#lib/ui/index.ts';
  import { PALETTE, paletteId } from './design.ts';
  import { designer } from './designer.svelte.ts';
  import { CELL_H, CELL_W, PARTS_COLUMNS, PARTS_H, PARTS_SCALE, PARTS_W, drawParts } from './drawDesign.ts';

  function pick(i: number) {
    designer.place(PALETTE[i]!);
    requestRender();
  }

  function dragStart(e: DragEvent, i: number) {
    e.dataTransfer?.setData('text/plain', 'palette:' + paletteId(PALETTE[i]!));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
    designer.drag = { kind: 'palette', item: PALETTE[i]! };
  }
</script>

<div class="view parts" style:width="{PARTS_W * PARTS_SCALE}px" style:height="{PARTS_H * PARTS_SCALE}px">
  <PixelCanvas
    id="partCv"
    width={PARTS_W}
    height={PARTS_H}
    scale={PARTS_SCALE}
    vignette={1.41}
    draw={(fb, t) => drawParts(fb, t)}
  />
  <div class="cells">
    {#each PALETTE as item, i (i)}
      <button
        class="cell"
        data-part={paletteId(item)}
        draggable="true"
        style:left="{(i % PARTS_COLUMNS) * CELL_W * PARTS_SCALE}px"
        style:top="{Math.floor(i / PARTS_COLUMNS) * CELL_H * PARTS_SCALE}px"
        style:width="{CELL_W * PARTS_SCALE}px"
        style:height="{CELL_H * PARTS_SCALE}px"
        onclick={() => pick(i)}
        ondragstart={(e) => dragStart(e, i)}
        ondragend={() => (designer.drag = null)}><span>{item.name}</span></button
      >
    {/each}
  </div>
</div>

<style>
  .parts {
    outline: 0;
  }
  .cells {
    position: absolute;
    inset: 0;
  }
  .cell {
    position: absolute;
    margin: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .cell:hover {
    background: rgba(242, 179, 93, 0.14);
  }
  .cell span {
    font-size: 15px;
    line-height: 15px;
    padding-bottom: 2px;
    color: var(--dim);
    white-space: nowrap;
  }
  .cell:hover span {
    color: var(--text);
  }
</style>
