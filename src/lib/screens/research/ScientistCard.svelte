<script lang="ts">
  import { project, projects } from '#lib/game/data/index.ts';
  import { game } from '#lib/game/index.ts';
  import {
    bonusOf,
    createProject,
    economy,
    labCap,
    leading,
    programmeStatus,
    queueOf,
    scientistById,
    touch
  } from '#lib/game/economy/index.ts';
  import { Card, CardSection, DefList, Portrait, tipText, tooltip } from '#lib/ui/index.ts';
  import { pct, scientistFace, subjectName } from './programme.ts';
  import { research } from './research.svelte.ts';

  let { id }: { id: number } = $props();

  const s = $derived(scientistById(economy, id));
  const current = $derived(s ? leading(economy, s.id) : undefined);
  const queue = $derived(s ? queueOf(economy, s.id) : []);
  const open = $derived(projects.filter((p) => programmeStatus(economy, p) === 'ready'));
  const rows = $derived<[string, string][]>(
    s
      ? [
          [subjectName(s.subject), `${s.skill} / 10`],
          ['Administration', `${s.admin} labs`],
          ['Leads', current ? project(current.number).name : '—'],
          ...queue.map((q): [string, string] => ['Queued', project(q.number).name])
        ]
      : []
  );

  function assign(n: number) {
    if (!s || !createProject(economy, n, s.id, labCap(economy, s))) return;
    research.selected = n;
    touch();
  }
</script>

{#if s}
  <Card title={s.name} subtitle={subjectName(s.subject)}>
    <div class="pic"><Portrait spec={scientistFace(s, game.time)} view="bust" scale={3} /></div>
    <DefList {rows} />
    {#if open.length}
      <CardSection label={current ? 'Queue' : 'Create'}>
        <div class="btns" id="scientistProjects">
          {#each open as p (p.number)}
            <button
              data-project={p.number}
              onclick={() => assign(p.number)}
              use:tooltip={tipText(
                p.name,
                `${s.subject === p.subject ? 'In field' : 'Out of field'} ${pct(bonusOf(s, p.subject))}`
              )}>{s.subject === p.subject ? '★ ' : ''}{p.number}. {p.name}</button
            >
          {/each}
        </div>
      </CardSection>
    {/if}
  </Card>
{/if}

<style>
  .pic {
    display: flex;
    justify-content: center;
  }
  .btns {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .btns button {
    margin: 0;
  }
</style>
