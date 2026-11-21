<script lang="ts">
  import { project, projects } from '#lib/game/data/index.ts';
  import {
    economy,
    flowsOf,
    queuedProgramme,
    researchDaysLeft,
    researchSite,
    runningProgramme,
    scientistById,
    missingRequires
  } from '#lib/game/economy/index.ts';
  import type { ProgrammeStatus } from '#lib/game/economy/index.ts';
  import { projectIcon } from '#lib/gfx/icons/index.ts';
  import type { IconName } from '#lib/gfx/icons.ts';
  import { Icon, Tile, TileGrid, fmt, tipText } from '#lib/ui/index.ts';
  import { GROUPS, GROUP_NAMES, statusOf, subjectName } from './programme.ts';
  import { research } from './research.svelte.ts';

  const ICON: Record<ProgrammeStatus, IconName> = {
    running: 'hammer',
    queued: 'clock',
    waiting: 'clock',
    ready: 'play',
    locked: 'lock',
    done: 'check'
  };

  const TONE: Record<ProgrammeStatus, 'accent' | 'cool' | 'dim'> = {
    running: 'cool',
    queued: 'cool',
    waiting: 'dim',
    ready: 'cool',
    locked: 'dim',
    done: 'accent'
  };

  const site = $derived(researchSite(economy));
  const flows = $derived(site ? flowsOf(site) : undefined);

  const groups = $derived(
    GROUPS.map((status) => ({
      status,
      items: projects.filter((p) => statusOf(economy, p) === status)
    }))
  );

  function foot(n: number, status: ProgrammeStatus): { note?: string; meter?: number } {
    const p = project(n);
    if (status === 'running') {
      const r = runningProgramme(economy, n);
      if (!r) return {};
      return { note: `${fmt.days(researchDaysLeft(flows, r))} left`, meter: r.rp / p.rp };
    }
    if (status === 'queued') {
      const q = queuedProgramme(economy, n);
      return { note: q ? (scientistById(economy, q.lead)?.name ?? '') : '' };
    }
    const missing = missingRequires(economy, p)
      .map((r) => project(r).name)
      .join(', ');
    if (status === 'waiting') return { note: `waiting on ${missing}` };
    if (status === 'locked') return { note: `needs ${missing}` };
    return { note: `${p.rp} RP` };
  }
</script>

{#snippet blank()}{/snippet}

{#each groups as g (g.status)}
  <h3 data-group={g.status}>
    <Icon name={ICON[g.status]} class="sm" />{GROUP_NAMES[g.status]}
    <small class="dim">{g.items.length}</small>
  </h3>
  {#if g.items.length}
    <TileGrid min={112} gap={6}>
      {#each g.items as p (p.number)}
        {@const f = foot(p.number, g.status)}
        {@const icon = projectIcon(p.number)}
        <div class="slot" data-project={p.number} data-status={g.status}>
          <Tile
            variant="node"
            class="pn"
            corner={String(p.number)}
            mark={ICON[g.status]}
            markTone={TONE[g.status]}
            icons={icon ? [icon] : []}
            art={icon ? undefined : blank}
            name={p.name}
            note={f.note}
            meter={f.meter}
            meterTone="cool"
            locked={g.status === 'locked'}
            selected={p.number === research.selected}
            tip={tipText(`${p.number}. ${p.name}`, `${p.rp} RP, ${subjectName(p.subject)}`, f.note ?? '')}
            onselect={() => (research.selected = p.number)}
          />
        </div>
      {/each}
    </TileGrid>
  {/if}
{/each}

<style>
  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  h3 small {
    font: 18px 'VT';
  }
  .dim {
    color: var(--dim);
  }
  .slot {
    width: 112px;
    height: 112px;
  }
  .slot :global(.ui-tile) {
    width: 100%;
    height: 100%;
    padding-top: 8px;
  }
  .slot :global(.ui-art) {
    height: 42px;
  }
</style>
