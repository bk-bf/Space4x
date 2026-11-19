<script lang="ts">
  import { milestone, shortName } from '#lib/game/data/index.ts';
  import { economy, flowsOf, homeSite } from '#lib/game/economy/index.ts';
  import { go } from '#lib/screens/research/go.ts';
  import { goalOf, liveWorld } from '#lib/screens/research/next.ts';
  import { Icon, PixIcon, dim, tipText, tooltip, warn } from '#lib/ui/index.ts';

  const goal = $derived(goalOf(liveWorld(economy, homeSite(), flowsOf)));
  const m = $derived(goal.milestone === undefined ? undefined : milestone(goal.milestone));
  const tone = $derived(goal.status === 'waiting' ? 'hot' : 'cool');
</script>

<footer id="goal" data-status={goal.status} data-milestone={goal.milestone ?? ''}>
  <button
    id="goalMilestone"
    onclick={() => go({ kind: 'research', milestone: goal.milestone ?? 1 })}
    use:tooltip={m
      ? tipText(`Goal: ${m.number}. ${m.name}`, dim(m.unlocks), 'Opens its programme card on Research')
      : tipText('Every milestone reached')}
  >
    <Icon name="flask" class="sm" /><span class="dim">Next</span>
    {#if m}<b>{m.number}. {shortName(m.number)}</b>{/if}
  </button>
  <span
    id="goalWhy"
    class={tone}
    use:tooltip={goal.missing > 1
      ? tipText(
          goal.blocker,
          warn(`${goal.missing} things missing in all`),
          dim('The programme card lists them')
        )
      : undefined}
  >
    <Icon
      name={goal.status === 'waiting' ? 'cross' : goal.status === 'running' ? 'clock' : 'check'}
      class="sm"
    />
    {#if goal.icon}<PixIcon kind={goal.icon.kind} id={goal.icon.id} tip={false} />{/if}
    <span class="text">{goal.blocker}</span>
    {#if goal.missing > 1}<span class="dim">+{goal.missing - 1}</span>{/if}
  </span>
  {#if goal.status !== 'finished'}
    <button
      id="goalStep"
      data-place={goal.step.place.kind}
      onclick={() => go(goal.step.place)}
      use:tooltip={tipText(goal.step.text, dim('Opens the place where it is done'))}
    >
      <Icon name="arrowR" class="sm" /><span class="text">{goal.step.text}</span>
    </button>
  {/if}
</footer>

<style>
  #goal {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    background: var(--panel);
    box-shadow: var(--edge);
    margin: 2px;
    padding: 2px 4px;
    white-space: nowrap;
    overflow: hidden;
  }
  button {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    margin: 0;
    padding: 1px 6px;
  }
  #goalMilestone {
    flex: none;
  }
  #goalMilestone b {
    color: var(--accent);
    font-weight: normal;
  }
  #goalWhy {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    flex: 0 1 auto;
  }
  #goalStep {
    flex: 0 1 auto;
    color: var(--cool);
  }
  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .hot {
    color: var(--hot);
  }
  .cool {
    color: var(--cool);
  }
  .dim {
    color: var(--dim);
  }
</style>
