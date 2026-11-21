<script lang="ts">
  import { ROBOT_KIND_NAMES, ROBOT_PART_KINDS, robotCatalogue, robotCount } from '#lib/game/robots/index.ts';
  import { Tile, TileGrid, dim, requestRender, tipText, warn } from '#lib/ui/index.ts';
  import { robotDesigner as designer } from './designer.svelte.ts';
  import { factList, keyFigure } from './figures.ts';
  import { partIcon } from './icons.ts';

  const items = robotCatalogue();
  const kinds = ROBOT_PART_KINDS.map((kind) => ({
    kind,
    name: ROBOT_KIND_NAMES[kind],
    items: items.filter((c) => c.kind === kind)
  })).filter((k) => k.items.length);

  const editable = $derived(!designer.design?.locked);

  function pick(id: string) {
    designer.addOrStart(id);
    requestRender();
  }
</script>

{#each kinds as k (k.kind)}
  <div class="kind">{k.name}</div>
  <TileGrid min={86} gap={5}>
    {#each k.items as c (c.id)}
      {@const open = designer.unlocked(c.research)}
      {@const waits = open ? [] : designer.waitsFor(c.research)}
      {@const have = designer.design ? robotCount(designer.design, c.id) : 0}
      <div class="cell" data-part={c.id} data-locked={open ? undefined : c.research}>
        <Tile
          variant="cmp"
          icons={[partIcon(c.id)]}
          name={c.name}
          value={open ? keyFigure(c) : 'locked'}
          cornerRight={have ? `×${have}` : undefined}
          mark={open ? undefined : 'lock'}
          markTone="hot"
          selected={have > 0}
          dimmed={!open}
          disabled={!open || !editable}
          tip={tipText(
            c.name,
            ...factList(c).map(dim),
            dim(c.basis),
            open ? '' : warn(`Needs ${waits.join(' and ')}`)
          )}
          onselect={() => pick(c.id)}
        />
      </div>
    {/each}
  </TileGrid>
{/each}

<style>
  .kind {
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
