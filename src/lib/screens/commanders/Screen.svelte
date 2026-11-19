<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import {
    FilterChips,
    Icon,
    Panel,
    Portrait,
    ScreenGrid,
    Stat,
    Tabs,
    Tile,
    TileGrid,
    dim,
    tipText,
    warn,
    type FilterItem,
    type Tab,
    tooltip
  } from '#lib/ui/index.ts';
  import OfficerCard from './OfficerCard.svelte';
  import {
    ageOf,
    allPosts,
    portraitSpec,
    POST_KINDS,
    postLabel,
    rankIndex,
    rankLabel,
    RANKS,
    roster,
    SKILLS,
    SORTS,
    type Group,
    type Officer,
    type PostOption,
    type RankId,
    type SortKey
  } from './roster.svelte.ts';

  const tabs: readonly Tab[] = [
    { id: 'officers', label: 'Officers', icon: 'star' },
    { id: 'posts', label: 'Posts', icon: 'list' }
  ];

  const posts = $derived(allPosts(game));
  const shown = $derived(roster.visible(game));
  const vacant = $derived(posts.filter((p) => !roster.holder(p.kind, p.ref)));
  const unassigned = $derived(roster.officers.filter((o) => o.post.kind === 'none'));
  const averageAge = $derived(
    Math.round(roster.officers.reduce((n, o) => n + ageOf(o, game.time), 0) / roster.officers.length)
  );
  const flagOfficers = $derived(roster.officers.filter((o) => rankIndex(o.rank) >= 4).length);
  const kindsPresent = $derived(
    POST_KINDS.filter((k) => k.id !== 'none' && (k.id === roster.kind || posts.some((p) => p.kind === k.id)))
  );
  const chips = $derived<FilterItem[]>([
    { id: 'all', label: 'All', count: roster.officers.length },
    { id: 'assigned', label: 'Assigned', count: roster.officers.length - unassigned.length },
    { id: 'none', label: 'Unassigned', count: unassigned.length },
    ...kindsPresent.map((k) => ({
      id: k.id,
      label: k.plural,
      count: roster.officers.filter((o) => o.post.kind === k.id).length
    }))
  ]);
  const groups = $derived(kindsPresent.map((k) => ({ ...k, posts: posts.filter((p) => p.kind === k.id) })));

  const officerTip = (o: Officer) =>
    tipText(
      o.name,
      dim(`${rankLabel(o.rank)}, age ${ageOf(o, game.time)}.`),
      o.post.kind === 'none' ? dim('Unassigned') : `Post: ${postLabel(o.post, game)}`,
      SKILLS.map((s, i) => `${s} ${o.skills[i]}`)
    );

  function pickPost(p: PostOption) {
    const holder = roster.holder(p.kind, p.ref);
    if (holder) roster.select(holder.id);
    else roster.assign(roster.selected, p.kind, p.ref, game);
  }
</script>

<ScreenGrid id="commanders" columns="minmax(0,1fr)">
  <Panel grow>
    {#snippet head()}
      <Icon name="star" />Commanders <small>officers and posts</small>
    {/snippet}
    {#snippet tools()}
      {#if roster.tab === 'officers'}
        <span class="sorts">
          <select id="sortBy" use:tooltip={'Sort by'} bind:value={roster.sort} aria-label="Sort by">
            {#each SORTS as s (s.id)}<option value={s.id satisfies SortKey}>Sort: {s.label}</option>{/each}
          </select>
          <select
            id="sortDir"
            use:tooltip={'Direction'}
            aria-label="Direction"
            value={roster.descending ? 'desc' : 'asc'}
            onchange={(e) => (roster.descending = e.currentTarget.value === 'desc')}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <select id="rankFilter" use:tooltip={'Rank'} aria-label="Rank" bind:value={roster.rank}>
            <option value="all">All ranks</option>
            {#each RANKS as r (r.id)}<option value={r.id satisfies RankId}>{r.label}</option>{/each}
          </select>
        </span>
      {/if}
    {/snippet}
    <div class="page">
      <div class="stats">
        <Stat
          compact
          icon="star"
          value={String(roster.officers.length)}
          label="officers"
          tip={tipText('Officers', dim('Everyone who can hold a post.'))}
        />
        <Stat
          compact
          icon="check"
          value={String(roster.officers.length - unassigned.length)}
          label="in a post"
          tip="In a post"
        />
        <Stat
          compact
          icon="warn"
          value={String(vacant.length)}
          label="posts vacant"
          warn={vacant.length > 0}
          tip={tipText('Vacant posts', dim('A vacant post gets none of its benefit.'))}
        />
        <Stat compact icon="clock" value={String(averageAge)} label="average age" tip="Average age" />
        <Stat
          compact
          icon="up"
          value={String(flagOfficers)}
          label="flag officers"
          tip={tipText('Flag officers', dim('Vice admirals and admirals.'))}
        />
      </div>
      <Tabs {tabs} bind:active={roster.tab} />
      <div class="split">
        <div class="main">
          {#if roster.tab === 'officers'}
            <FilterChips items={chips} value={roster.group} onchange={(id) => roster.setGroup(id as Group)} />
            <TileGrid min={112} gap={6}>
              {#each shown as o (o.id)}
                <Tile
                  variant="off"
                  name={o.name}
                  sub={rankLabel(o.rank)}
                  selected={roster.selected === o.id}
                  idle={o.post.kind === 'none'}
                  tip={officerTip(o)}
                  onselect={() => roster.select(o.id)}
                >
                  {#snippet art()}
                    <Portrait spec={portraitSpec(o, game.time)} view="head" scale={2} />
                  {/snippet}
                  <span class="post">{o.post.kind === 'none' ? 'unassigned' : postLabel(o.post, game)}</span>
                </Tile>
              {/each}
            </TileGrid>
          {:else}
            {#each groups as g (g.id)}
              <h3><Icon name="star" class="sm" />{g.plural} <small class="dim">{g.posts.length}</small></h3>
              <TileGrid min={112} gap={6}>
                {#each g.posts as p (p.ref)}
                  {@const holder = roster.holder(p.kind, p.ref)}
                  <Tile
                    variant="off"
                    name={p.label}
                    sub={holder ? holder.name : 'vacant'}
                    warn={!holder}
                    selected={holder?.id === roster.selected}
                    tip={tipText(p.label, dim(p.where), holder ? `Held by ${holder.name}` : warn('Vacant'))}
                    onselect={() => pickPost(p)}
                  >
                    {#snippet art()}
                      {#if holder}
                        <Portrait spec={portraitSpec(holder, game.time)} view="head" scale={2} />
                      {:else}
                        <span class="empty"><Icon name="plus" /></span>
                      {/if}
                    {/snippet}
                  </Tile>
                {/each}
              </TileGrid>
            {/each}
          {/if}
        </div>
        <div class="side"><OfficerCard /></div>
      </div>
    </div>
  </Panel>
</ScreenGrid>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding-bottom: 4px;
  }
  .sorts {
    display: contents;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 4px;
  }
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    gap: 12px;
    min-height: 0;
    flex: 1;
  }
  .main,
  .side {
    overflow: auto;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
  }
  .main {
    padding: 4px 6px 8px 4px;
  }
  .side {
    padding: 4px 4px 8px;
  }
  .post {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    color: var(--dim);
  }
  .empty {
    width: 64px;
    height: 72px;
    border: 2px dashed var(--line);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--dim);
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  h3 small {
    font: 18px 'VT';
  }
</style>
