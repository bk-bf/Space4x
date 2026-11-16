<script lang="ts">
  import { ICON_SIZE, iconUrl, type IconKind } from '#lib/gfx/icons/index.ts';
  import { iconTip } from './tips.ts';
  import { tooltip, type Tip } from './tooltip.ts';

  interface Props {
    kind: IconKind;
    id: string;
    size?: 16 | 32 | 48;
    tip?: Tip;
    class?: string;
  }

  let { kind, id, size = 16, tip, class: extra = '' }: Props = $props();

  const scale = $derived(size / 16);
  const box = $derived(ICON_SIZE[kind]);
  const shown = $derived(tip === undefined ? iconTip({ kind, id }) : tip);
</script>

<img
  class="ui-px {kind} {extra}"
  src={iconUrl({ kind, id })}
  width={box.width * scale}
  height={box.height * scale}
  alt=""
  draggable="false"
  use:tooltip={shown}
/>
