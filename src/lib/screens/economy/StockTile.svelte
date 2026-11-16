<script lang="ts">
  import { flowsOf, type Site } from '#lib/game/economy/index.ts';
  import { Tile, fmt, materialName } from '#lib/ui/index.ts';
  import { mat } from './refs.ts';
  import { stockView } from './model.ts';
  import { rateText, stockAmount, stockTip } from './tips.ts';
  import { ui } from './state.svelte.ts';

  let {
    site,
    id,
    selected = false,
    onselect
  }: { site: Site; id: string; selected?: boolean; onselect?: () => void } = $props();

  const v = $derived(stockView(site, flowsOf(site), id));
  const trend = $derived(fmt.trend(v.net, v.stock));
</script>

<Tile
  variant="stk"
  icons={[mat(id)]}
  name={materialName(id)}
  value={v.stockless ? '-' : v.stock > 0 ? stockAmount(id, v.stock) : '0'}
  note={trend === 'flat' ? '0' : rateText(id, v.net, ui.period, true)}
  noteTone={fmt.trendTone(trend)}
  {trend}
  meter={v.coverFraction}
  meterTone={v.bad ? 'hot' : 'cool'}
  warn={v.bad}
  dimmed={v.empty}
  {selected}
  tip={stockTip(v, ui.period)}
  {onselect}
/>
