<script lang="ts">
  import { activePlants } from '#lib/game/economy/index.ts';
  import { Tile, fmt, materialName } from '#lib/ui/index.ts';
  import { bld, mat } from './refs.ts';
  import type { GroupView } from './model.ts';
  import { groupTip } from './tips.ts';
  import { ui } from './state.svelte.ts';

  let {
    view,
    selected = false,
    onselect
  }: { view: GroupView; selected?: boolean; onselect?: () => void } = $props();

  const a = $derived(view.actor);
  const off = $derived(a.limit?.kind === 'off');
  const running = $derived(a.group.process !== null || view.plant !== undefined);
</script>

<Tile
  variant="prod"
  icons={view.main ? [bld(view.building.id), mat(view.main)] : [bld(view.building.id)]}
  name={view.main ? materialName(view.main) : view.plant ? 'Power' : view.label}
  sub={view.building.name}
  value={view.plant
    ? `${fmt.count(activePlants(a.group))}/${fmt.count(a.group.count)}`
    : fmt.count(a.group.count)}
  meter={running ? a.share : undefined}
  note={running ? undefined : 'idle'}
  meterTone={view.warn ? 'hot' : 'accent'}
  kind={view.building.kind}
  badge={view.warn ? 'warn' : off ? 'power' : undefined}
  badgeTone={view.warn ? 'hot' : 'dim'}
  warn={view.warn}
  idle={view.quiet}
  {selected}
  tip={groupTip(view, ui.period)}
  {onselect}
/>
