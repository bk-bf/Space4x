<script lang="ts">
  import { onMount } from 'svelte';
  import {
    BEARDS,
    BROWS,
    EYE,
    EYES,
    GEARS,
    HAIR,
    HAIRS,
    MOUTHS,
    PORTRAIT_STYLES,
    SKIN,
    hairFor,
    type BeardId,
    type BrowId,
    type EyeId,
    type GearId,
    type Gender,
    type HairId,
    type MouthId,
    type PortraitSpec,
    type PortraitStyle,
    type TraitOverrides
  } from '#lib/gfx/portraits/index.ts';
  import { gallery } from '#lib/shell/mode.ts';
  import { FilterChips, Icon, Panel, Portrait, ScreenGrid } from '#lib/ui/index.ts';
  import { layoutCheck } from '#lib/ui/layoutCheck.ts';

  const MAN: PortraitSpec = { seed: 31, age: 38, rank: 2, branch: 'staff', gender: 'm' };
  const WOMAN: PortraitSpec = { seed: 44, age: 34, rank: 2, branch: 'staff', gender: 'f' };
  const BASE: TraitOverrides = {
    gear: 'none',
    cap: false,
    beard: 'none',
    skin: SKIN[1]!,
    hair: HAIR[2]!,
    eye: EYE[2]!,
    earring: false,
    shadow: false,
    lip: null,
    gaunt: false,
    eyes: 'narrow',
    brow: 'stern',
    mouth: 'firm'
  };

  interface Cell {
    name: string;
    spec: PortraitSpec;
    over: TraitOverrides;
  }

  interface Section {
    id: string;
    title: string;
    cells: Cell[];
  }

  const cell = (name: string, spec: PortraitSpec, over: TraitOverrides): Cell => ({
    name,
    spec,
    over: { ...BASE, ...over }
  });
  const keys = <T extends string>(o: Record<T, unknown>) => Object.keys(o) as T[];
  const hairCells = (gender: Gender, spec: PortraitSpec) =>
    hairFor(gender).map((k: HairId) => cell(HAIRS[k].name, spec, { style: k }));

  const sections: Section[] = [
    { id: 'hair-m', title: 'Hair, men', cells: hairCells('m', MAN) },
    { id: 'hair-f', title: 'Hair, women', cells: hairCells('f', WOMAN) },
    {
      id: 'beards',
      title: 'Beards',
      cells: keys(BEARDS).map((k: BeardId) => cell(BEARDS[k].name, MAN, { beard: k, style: 'crop' }))
    },
    {
      id: 'eyes',
      title: 'Eyes',
      cells: keys(EYES).flatMap((k: EyeId) => [
        cell(EYES[k], MAN, { eyes: k, style: 'crop' }),
        cell(EYES[k], WOMAN, { eyes: k, style: 'bun' })
      ])
    },
    {
      id: 'brows',
      title: 'Brows',
      cells: keys(BROWS).flatMap((k: BrowId) => [
        cell(BROWS[k], MAN, { brow: k, style: 'buzz' }),
        cell(BROWS[k], WOMAN, { brow: k, style: 'bun' })
      ])
    },
    {
      id: 'mouths',
      title: 'Mouths',
      cells: keys(MOUTHS).flatMap((k: MouthId) => [
        cell(MOUTHS[k], MAN, { mouth: k, style: 'crop' }),
        cell(MOUTHS[k], WOMAN, { mouth: k, style: 'bun' })
      ])
    },
    {
      id: 'gear',
      title: 'Gear',
      cells: [
        ...keys(GEARS)
          .filter((k: GearId) => k !== 'none')
          .map((k: GearId) => cell(GEARS[k], MAN, { gear: k, style: 'crop' })),
        cell('Cap', WOMAN, { cap: true, style: 'bob' })
      ]
    }
  ];

  const chips = PORTRAIT_STYLES.map((s) => ({ id: s.id, label: s.name, tip: s.note }));
  let style = $state<PortraitStyle>('gritty');

  onMount(() => {
    window.space4xLayoutCheck = () => layoutCheck('portraits');
  });
</script>

<header id="top"><span class="tag">portraits</span></header>
<div id="stage">
  <ScreenGrid id="portraits" columns="minmax(0,1fr)">
    {#if gallery}
      <Panel grow>
        {#snippet head()}<Icon name="eye" />Portrait options <small>{sections.length} groups</small>{/snippet}
        <FilterChips items={chips} value={style} onchange={(id) => (style = id as PortraitStyle)} />
        <p class="dim note">
          Every option below is rolled at random for each officer. Beards are for men only.
        </p>
        {#each sections as s (s.id)}
          <h3 data-section={s.id}>{s.title} <small class="dim">{s.cells.length}</small></h3>
          <div class="faces">
            {#each s.cells as c, i (i)}
              <span class="pcell">
                <Portrait spec={c.spec} over={c.over} {style} scale={2} />
                <em>{c.name}</em>
              </span>
            {/each}
          </div>
        {/each}
      </Panel>
    {:else}
      <Panel title="Portraits" grow
        ><p class="dim">The portrait catalogue is part of the gallery build.</p></Panel
      >
    {/if}
  </ScreenGrid>
</div>

<style>
  .note {
    margin: 0 0 8px;
  }
  .faces {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pcell {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }
  .pcell :global(img) {
    box-shadow: 0 0 0 2px var(--line);
  }
  .pcell em {
    font-style: normal;
    font-size: 15px;
    color: var(--dim);
    margin-top: 3px;
    max-width: 128px;
    text-align: center;
    line-height: 1;
  }
</style>
