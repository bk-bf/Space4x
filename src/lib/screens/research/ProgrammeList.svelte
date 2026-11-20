<script lang="ts">
  import { milestone, milestones, shortName } from '#lib/game/data/index.ts';
  import { economy, programmeDays, runningProgramme } from '#lib/game/economy/index.ts';
  import type { ProgrammeStatus } from '#lib/game/economy/index.ts';
  import type { IconName } from '#lib/gfx/icons.ts';
  import { Icon, Tile, TileGrid, dim, fmt, tipText } from '#lib/ui/index.ts';
  import { GROUPS, GROUP_NAMES, milestoneIcon, statusOf } from './programme.ts';
  import { research } from './research.svelte.ts';

  const ICON: Record<ProgrammeStatus, IconName> = {
    running: 'hammer',
    ready: 'play',
    locked: 'lock',
    done: 'check'
  };

  const TONE: Record<ProgrammeStatus, 'accent' | 'cool' | 'dim'> = {
    running: 'cool',
    ready: 'cool',
    locked: 'dim',
    done: 'accent'
  };

  const groups = $derived(
    GROUPS.map((status) => ({
      status,
      items: milestones.filter((m) => statusOf(economy, m) === status)
    }))
  );

  const NONE: Record<ProgrammeStatus, string> = {
    running: 'No programme is running.',
    ready: 'None are ready.',
    locked: 'None.',
    done: 'None yet.'
  };

  function foot(n: number, status: ProgrammeStatus): { note?: string; meter?: number; tone: 'cool' } {
    const m = milestone(n);
    if (status === 'running') {
      const p = runningProgramme(economy, n);
      const left = (1 - (p?.progress ?? 0)) * programmeDays(m);
      return { note: `${fmt.days(left)} left`, meter: p?.progress ?? 0, tone: 'cool' };
    }
    if (status === 'done') return { note: 'done', tone: 'cool' };
    if (status === 'locked')
      return {
        note: `needs ${m.requires
          .filter((r) => !economy.done.includes(r))
          .map(shortName)
          .join(', ')}`,
        tone: 'cool'
      };
    return { tone: 'cool' };
  }
</script>

{#each groups as g (g.status)}
  <h3 data-group={g.status}>
    <Icon name={ICON[g.status]} class="sm" />{GROUP_NAMES[g.status]}
    <small class="dim">{g.items.length}</small>
  </h3>
  {#if g.items.length}
    <TileGrid min={112} gap={6}>
      {#each g.items as m (m.number)}
        {@const f = foot(m.number, g.status)}
        {@const icon = milestoneIcon(m.number)}
        <div class="slot" data-milestone={m.number} data-status={g.status}>
          <Tile
            variant="node"
            class="pn"
            corner={String(m.number)}
            mark={ICON[g.status]}
            markTone={TONE[g.status]}
            icons={icon ? [icon] : []}
            name={shortName(m.number)}
            note={f.note}
            meter={f.meter}
            meterTone={f.tone}
            locked={g.status === 'locked'}
            selected={m.number === research.selected}
            tip={tipText(
              `${m.number}. ${m.name}`,
              dim(m.unlocks),
              `${fmt.days(programmeDays(m))}, tier ${m.tier}`,
              f.note ?? ''
            )}
            onselect={() => (research.selected = m.number)}
          />
        </div>
      {/each}
    </TileGrid>
  {:else}
    <p class="none">{NONE[g.status]}</p>
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
  .none {
    margin: 0 0 6px;
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
