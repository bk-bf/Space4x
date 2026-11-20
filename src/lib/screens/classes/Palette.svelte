<script lang="ts">
  import { COMPONENT_KINDS, KIND_NAMES, catalogue, countOf } from '#lib/game/shipdesign/index.ts';
  import { PixIcon, Tile, TileGrid, componentTip, dim, requestRender, warn } from '#lib/ui/index.ts';
  import { designer } from './designer.svelte.ts';
  import { factList, keyFigure } from './facts.ts';

  const items = catalogue();
  const kinds = COMPONENT_KINDS.map((kind) => ({
    kind,
    name: KIND_NAMES[kind] ?? kind,
    items: items.filter((c) => c.kind === kind)
  })).filter((k) => k.items.length);

  const editable = $derived(!designer.design?.locked);

  function pick(id: string) {
    designer.addOrStart(id);
    requestRender();
  }
</script>

{#each kinds as k (k.kind)}
  <div class="kind">
    <PixIcon kind="component" id={k.items[0]!.id} size={16} tip={false} />{k.name}
  </div>
  <TileGrid min={86} gap={5}>
    {#each k.items as c (c.id)}
      {@const open = designer.unlocked(c.research)}
      {@const waits = open ? [] : designer.waitsFor(c.research)}
      {@const have = designer.design ? countOf(designer.design, c.id) : 0}
      <div class="cell" data-part={c.id} data-locked={open ? undefined : c.research}>
        <Tile
          variant="cmp"
          icons={[{ kind: 'component', id: c.id }]}
          name={c.name}
          value={open ? keyFigure(c) : 'locked'}
          cornerRight={have ? `×${have}` : undefined}
          mark={open ? undefined : 'lock'}
          markTone="hot"
          selected={have > 0}
          dimmed={!open}
          disabled={!open || !editable}
          tip={componentTip(c.id, ...factList(c).map(dim), open ? '' : warn(`Needs ${waits.join(' and ')}`))}
          onselect={() => pick(c.id)}
        />
      </div>
    {/each}
  </TileGrid>
{/each}

<style>
  .kind {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 8px 0 4px;
    font: 500 14px 'Pixelify';
    color: var(--dim);
  }
  .kind:first-child {
    margin-top: 0;
  }
  .cell {
    width: 86px;
    height: 104px;
  }
</style>
