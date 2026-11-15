<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { Panel, ScreenGrid, Stack, Table, type Cell } from '#lib/ui/index.ts';
  import OfficerPanel from './OfficerPanel.svelte';
  import {
    ageOf,
    allPosts,
    applyCommandersQuery,
    POST_KINDS,
    postLabel,
    RANKS,
    rankLabel,
    roster,
    SORTS,
    type AssignmentFilter,
    type RankId,
    type SortKey
  } from './roster.svelte.ts';

  applyCommandersQuery();

  const shown = $derived(roster.visible(game));
  const rows = $derived<Cell[][]>(
    shown.map((o) => [
      rankLabel(o.rank),
      o.name,
      o.post.kind === 'none' ? { text: 'Unassigned', warn: true } : postLabel(o.post, game),
      ageOf(o, game.time)
    ])
  );
  const posts = $derived(allPosts(game));
  const kindLabel = (kind: string) => POST_KINDS.find((k) => k.id === kind)?.label ?? kind;
  const postRows = $derived<Cell[][]>(
    posts.map((p) => {
      const holder = roster.holder(p.kind, p.ref);
      return [
        p.where ? `${p.label}, ${p.where}` : p.label,
        kindLabel(p.kind),
        holder ? holder.name : { text: 'Vacant', warn: true }
      ];
    })
  );
</script>

<ScreenGrid id="commanders" columns="minmax(0,1fr) 320px">
  <Stack>
    <Panel>
      {#snippet head()}Officers <small id="officerCount">{shown.length} of {roster.officers.length}</small
        >{/snippet}
      {#snippet tools()}
        <select id="sortBy" title="Sort by" bind:value={roster.sort} aria-label="Sort by">
          {#each SORTS as s (s.id)}<option value={s.id satisfies SortKey}>Sort: {s.label}</option>{/each}
        </select>
        <select
          id="sortDir"
          title="Direction"
          aria-label="Direction"
          value={roster.descending ? 'desc' : 'asc'}
          onchange={(e) => (roster.descending = e.currentTarget.value === 'desc')}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <select id="rankFilter" title="Rank" aria-label="Rank" bind:value={roster.rank}>
          <option value="all">All ranks</option>
          {#each RANKS as r (r.id)}<option value={r.id satisfies RankId}>{r.label}</option>{/each}
        </select>
        <select id="assignFilter" title="Posting" aria-label="Posting" bind:value={roster.assignment}>
          <option value={'all' satisfies AssignmentFilter}>All officers</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      {/snippet}
      <Table
        head={['Rank', 'Name', 'Post', '>Age']}
        {rows}
        keys={shown.map((o) => o.id)}
        selected={shown.findIndex((o) => o.id === roster.selected)}
        onpick={(row) => roster.select(shown[row]!.id)}
      />
    </Panel>
    <Panel title="Posts" grow>
      <Table
        head={['Post', 'Kind', 'Held by']}
        rows={postRows}
        keys={posts.map((p) => `${p.kind}:${p.ref}`)}
        selected={posts.findIndex((p) => p.kind === roster.targetKind && p.ref === roster.targetRef)}
        onpick={(row) => {
          roster.targetKind = posts[row]!.kind;
          roster.targetRef = posts[row]!.ref;
        }}
      />
    </Panel>
  </Stack>
  <OfficerPanel />
</ScreenGrid>
