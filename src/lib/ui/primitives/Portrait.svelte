<script lang="ts">
  import {
    DEFAULT_PORTRAIT_STYLE,
    HEAD_H,
    HEAD_W,
    PORTRAIT_H,
    PORTRAIT_W,
    portraitBust,
    portraitHead,
    type PortraitSpec,
    type PortraitStyle,
    type TraitOverrides
  } from '#lib/gfx/portraits/index.ts';
  import { tooltip, type Tip } from './tooltip.ts';

  interface Props {
    spec: PortraitSpec;
    view?: 'bust' | 'head';
    scale?: number;
    style?: PortraitStyle;
    over?: TraitOverrides;
    tip?: Tip;
    class?: string;
  }

  let {
    spec,
    view = 'bust',
    scale = view === 'bust' ? 3 : 2,
    style = DEFAULT_PORTRAIT_STYLE,
    over,
    tip,
    class: extra = ''
  }: Props = $props();

  const sprite = $derived(
    view === 'bust' ? portraitBust(spec, style, over) : portraitHead(spec, style, over)
  );
  const size = $derived(view === 'bust' ? [PORTRAIT_W, PORTRAIT_H] : [HEAD_W, HEAD_H]);
</script>

<img
  class="ui-px portrait {view} {extra}"
  src={sprite.url}
  width={size[0]! * scale}
  height={size[1]! * scale}
  alt=""
  draggable="false"
  use:tooltip={tip}
/>
