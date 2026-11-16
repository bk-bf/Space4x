<script lang="ts">
  import { onMount } from 'svelte';
  import { ICONS, type IconName } from '#lib/gfx/icons.ts';
  import {
    CATEGORY_ORDER,
    BUILDING_KIND_NAMES,
    COMPONENT_KIND_NAMES,
    CATEGORY_EXAMPLES,
    KIND_EXAMPLES,
    buildingKindName,
    categoryName,
    componentKindName,
    hasIconArt,
    type IconRef
  } from '#lib/gfx/icons/index.ts';
  import { buildings, materials, shipComponents } from '#lib/game/data/records.ts';
  import { gallery } from '#lib/shell/mode.ts';
  import {
    Bar,
    Card,
    CardSection,
    FilterChips,
    Icon,
    IconList,
    Panel,
    PixIcon,
    Pill,
    Portrait,
    ScreenGrid,
    Stat,
    Tabs,
    Tile,
    TileGrid,
    buildingName,
    buildingTip,
    componentName,
    componentTip,
    fmt,
    materialName,
    materialTip,
    tipText,
    dim,
    warn
  } from '#lib/ui/index.ts';
  import { layoutCheck } from '#lib/ui/layoutCheck.ts';

  const tabs = [
    { id: 'materials', label: 'Materials' },
    { id: 'buildings', label: 'Buildings' },
    { id: 'components', label: 'Components' }
  ];
  let tab = $state('materials');
  let picked = $state('iron');
  let filter = $state('all');

  const mat = (id: string): IconRef => ({ kind: 'material', id });
  const bld = (id: string): IconRef => ({ kind: 'building', id });
  const comp = (id: string): IconRef => ({ kind: 'component', id });

  const materialGroups = CATEGORY_ORDER.map((c) => ({
    id: c,
    name: categoryName(c),
    items: materials.filter((m) => m.category === c)
  })).filter((g) => g.items.length);
  const buildingGroups = Object.keys(BUILDING_KIND_NAMES).map((k) => ({
    id: k,
    name: buildingKindName(k),
    items: buildings.filter((b) => b.kind === k)
  }));
  const componentGroups = Object.keys(COMPONENT_KIND_NAMES)
    .map((k) => ({ id: k, name: componentKindName(k), items: shipComponents.filter((c) => c.kind === k) }))
    .filter((g) => g.items.length);

  const fallbackNames = $derived(
    tab === 'materials'
      ? materials.filter((m) => !hasIconArt(mat(m.id))).map((m) => materialName(m.id))
      : tab === 'buildings'
        ? buildings.filter((b) => !hasIconArt(bld(b.id))).map((b) => b.name)
        : tab === 'components'
          ? shipComponents.filter((c) => !hasIconArt(comp(c.id))).map((c) => c.name)
          : []
  );

  const stockRows = [
    { id: 'iron', amount: 5_394_000, net: 1_200, cover: 1 },
    { id: 'water', amount: 549_381_000, net: -8_000, cover: 0.6 },
    { id: 'sulfur', amount: 879_000, net: -4_100, cover: 0.2 },
    { id: 'copper', amount: 1_000, net: 0, cover: 0.1 },
    { id: 'lox', amount: 2_282_000, net: 350, cover: 1 },
    { id: 'compute', amount: 0, net: 0, cover: 0 }
  ];

  const filters = [
    { id: 'all', label: 'All', count: 163 },
    { id: 'metal', icon: mat(CATEGORY_EXAMPLES.metal ?? 'iron'), count: 38, tip: categoryName('metal') },
    { id: 'propellant', icon: mat('lox'), count: 14, tip: categoryName('propellant') },
    { id: 'plant', icon: bld(KIND_EXAMPLES.processing ?? 'smelter'), count: 18, tip: 'Processing' },
    { id: 'power', icon: 'bolt' as IconName, label: 'Power' }
  ];

  onMount(() => {
    window.space4xLayoutCheck = () => layoutCheck('tiles');
  });
</script>

<header id="top"><span class="tag">tiles</span></header>
<div id="stage">
  <ScreenGrid id="tiles" columns="minmax(0,1fr) 460px">
    {#if gallery}
      <Panel title="Icon set" grow>
        <Tabs {tabs} bind:active={tab} />
        <p class="dim" id="fallbacks" style="margin:0 0 8px">
          {fallbackNames.length
            ? `Drawn by fallback: ${fallbackNames.join(', ')}`
            : 'Every icon here has its own drawing'}
        </p>
        {#if tab === 'materials'}
          {#each materialGroups as g (g.id)}
            <h3>{g.name} <small class="dim">{g.items.length}</small></h3>
            <TileGrid min={84} gap={4}>
              {#each g.items as m (m.id)}
                <Tile icons={[mat(m.id)]} name={materialName(m.id)} tip={materialTip(m.id)} />
              {/each}
            </TileGrid>
          {/each}
        {:else if tab === 'buildings'}
          {#each buildingGroups as g (g.id)}
            <h3>{g.name} <small class="dim">{g.items.length}</small></h3>
            <TileGrid min={112} gap={6}>
              {#each g.items as b (b.id)}
                <Tile icons={[bld(b.id)]} iconSize={48} name={buildingName(b.id)} tip={buildingTip(b.id)} />
              {/each}
            </TileGrid>
          {/each}
        {:else if tab === 'components'}
          {#each componentGroups as g (g.id)}
            <h3>{g.name} <small class="dim">{g.items.length}</small></h3>
            <TileGrid min={112} gap={6}>
              {#each g.items as c (c.id)}
                <Tile
                  icons={[comp(c.id)]}
                  iconSize={48}
                  name={componentName(c.id)}
                  tip={componentTip(c.id)}
                />
              {/each}
            </TileGrid>
          {/each}
        {/if}
      </Panel>
      <Panel title="Tiles, cards and tooltips" grow>
        <h3>Tile variants</h3>
        <TileGrid min={120} gap={6}>
          <Tile
            variant="prod"
            icons={[bld('smelter'), mat('iron')]}
            name="Iron"
            sub="Smelter"
            value="5,394"
            meter={0.8}
            kind="processing"
            tip={tipText('Smelter', 'Processing', dim('Turns ore into metal.'), warn('Short of power'))}
          />
          <Tile
            variant="prod"
            icons={[bld('chemical_plant'), mat('sulfur')]}
            name="Sulfur"
            sub="Chemical plant"
            value="879"
            meter={0.4}
            meterTone="hot"
            badge="warn"
            kind="processing"
          />
          <Tile
            variant="stk"
            icons={[mat('water')]}
            name="Water"
            value={fmt.mass(549_381_000)}
            note={fmt.rate(-8_000 / 24, 'day', undefined, true)}
            noteTone="hot"
            trend="down"
            meter={0.6}
            meterTone="cool"
          />
          <Tile
            variant="bld"
            icons={[bld('rocket_factory')]}
            name="Rocket factory"
            kind="infrastructure"
            corner="×3"
            mark="lock"
            cornerRight="4"
            minis={[mat('stainless_steel'), mat('aluminium'), mat('cfrp')]}
            minisMore={2}
          />
          <Tile
            variant="q"
            icons={[bld('sabatier_plant')]}
            name="Sabatier plant"
            corner="1"
            mark="hammer"
            markTone="accent"
            meter={0.41}
            note="18 d left"
          />
          <Tile
            variant="cmp"
            icons={[comp('kerolox_engine')]}
            name="Kerolox"
            cornerRight="×2"
            value="311 s"
            selected
          />
          <Tile
            variant="node"
            icons={[mat('compute')]}
            name="Data centres"
            corner="5"
            mark="check"
            markTone="accent"
            note="E"
          />
          <Tile
            variant="node"
            locked
            icons={[mat('exotic_matter')]}
            name="Exotic matter"
            corner="28"
            mark="lock"
            note="S"
          />
          <Tile
            variant="wide"
            icons={[mat('compute')]}
            name="Data centres"
            corner="5"
            mark="check"
            markTone="accent"
          />
          <Tile
            variant="wide"
            icons={[mat('exotic_matter')]}
            name="Megastructures and more"
            corner="26"
            mark="hammer"
            markTone="cool"
            meter={0.4}
            meterTone="cool"
          />
          <Tile
            variant="wide"
            locked
            icons={[mat('exotic_matter')]}
            name="Exotic matter"
            corner="28"
            mark="lock"
          />
          <Tile variant="off" name="A. Mwangi" sub="Vice admiral" selected>
            {#snippet art()}
              <Portrait
                spec={{ seed: 10, age: 61, rank: 4, branch: 'staff', gender: 'm' }}
                view="head"
                scale={2}
              />
            {/snippet}
          </Tile>
          <Tile variant="off" warn name="Naval staff" sub="vacant">
            {#snippet art()}<Icon name="plus" />{/snippet}
          </Tile>
          <Tile variant="slot" name="Naval academy" />
          <Tile variant="stk" dimmed icons={[mat('helium3')]} name="Helium-3" value="0" note="0" meter={0} />
          <Tile
            variant="prod"
            idle
            icons={[bld('smelter')]}
            name="Idle"
            sub="Smelter"
            value="100"
            note="idle"
          />
        </TileGrid>

        <h3>Selecting, by click or Enter and Space</h3>
        <TileGrid min={116} gap={5}>
          {#each stockRows as r (r.id)}
            <Tile
              variant="stk"
              icons={[mat(r.id)]}
              name={materialName(r.id)}
              value={r.amount > 0 ? fmt.amount(r.amount) : '0'}
              note={r.net === 0 ? '0' : fmt.rate(r.net / 24, 'day', undefined, true)}
              noteTone={r.net === 0 ? 'dim' : r.net > 0 ? 'cool' : 'hot'}
              trend={fmt.trend(r.net, r.amount)}
              meter={r.cover}
              meterTone={r.cover < 0.5 ? 'hot' : 'cool'}
              selected={picked === r.id}
              tip={materialTip(r.id)}
              onselect={() => (picked = r.id)}
            />
          {/each}
        </TileGrid>
        <p id="picked" style="margin:6px 0 0">Picked: {materialName(picked)}</p>

        <h3>Card</h3>
        <Card
          title="Sabatier plant"
          subtitle="Chemical plant"
          icon={bld('sabatier_plant')}
          chips={[
            { icon: 'factory', text: '603', tip: 'Buildings in this group' },
            { icon: 'people', text: fmt.people(2_400_000) },
            { icon: 'bolt', text: fmt.power(241_000), tone: 'hot' },
            { icon: 'check', text: 'start', tone: 'cool' }
          ]}
        >
          <CardSection label="Recipe, a day">
            <IconList
              items={[
                { icon: mat('carbon_dioxide'), amount: '4,645 t' },
                { icon: mat('hydrogen'), amount: '210 t' }
              ]}
              to={[{ icon: mat('methane'), amount: '1,200 t' }]}
            />
          </CardSection>
          <CardSection label="Cost for one, have / need">
            <IconList
              variant="have"
              items={[
                { icon: mat('stainless_steel'), amount: '6,617 t', need: '800 t', ok: true },
                { icon: mat('titanium'), amount: '12 t', need: '100 t', ok: false }
              ]}
            />
          </CardSection>
          <CardSection label="Must stand">
            <IconList
              variant="stand"
              items={[
                { icon: bld('rocket_factory'), amount: 'yes', ok: true },
                { icon: bld('data_centre'), amount: 'no', ok: false }
              ]}
            />
          </CardSection>
          <CardSection label="Unlocks">
            <IconList
              variant="icons"
              items={[{ icon: bld('smelter') }, { icon: comp('avionics') }, { icon: mat('ysz') }]}
            />
          </CardSection>
          <CardSection label="Running">
            <Bar value={0.82} thick full />
          </CardSection>
        </Card>

        <h3>Filter chips</h3>
        <FilterChips items={filters} bind:value={filter} />
        <p id="filtered" style="margin:0 0 6px">Filter: {filter}</p>

        <h3>Stats and pills</h3>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
          <Stat
            icon="people"
            value={fmt.people(8_200_000_000)}
            label="+12% a year"
            tip={tipText('People', dim('Everyone on Earth.'))}
          />
          <Stat icon="bolt" value="-3 MW" label="demand 43,000 MW" warn />
        </div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <Pill icon="clock" text={fmt.days(12.2)} tip="Build time" />
          <Pill icon="warn" text="short" tone="hot" />
          <Pill icon="check" text="done" tone="cool" />
        </div>

        <h3>Glyphs <small class="dim">{Object.keys(ICONS).length}</small></h3>
        <TileGrid min={74} gap={4}>
          {#each Object.keys(ICONS) as name (name)}
            <div class="ui-tile">
              <Icon name={name as IconName} class="lg" /><span class="ui-nm"><b>{name}</b></span>
            </div>
          {/each}
        </TileGrid>

        <h3>Tooltips</h3>
        <div style="display:flex;gap:8px;align-items:flex-end;justify-content:flex-end">
          <PixIcon kind="material" id="iron" size={48} />
          <PixIcon kind="building" id="smelter" size={48} />
          <PixIcon kind="component" id="kerolox_engine" size={48} />
          <span id="edgeTip" data-edge style="margin-left:auto">
            <Tile
              variant="cmp"
              icons={[comp('avionics')]}
              name="Avionics"
              tip={tipText(
                'Avionics',
                'Electronics',
                dim('Computing and control. A tooltip near the window edge flips and stays inside it.'),
                'Needs 0.5 kW',
                warn('Short of power')
              )}
            />
          </span>
        </div>
      </Panel>
    {:else}
      <Panel title="Tiles" grow><p class="dim">The tile gallery is part of the gallery build.</p></Panel>
    {/if}
  </ScreenGrid>
</div>
