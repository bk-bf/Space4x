<script lang="ts">
  import type { IconName } from '#lib/gfx/icons.ts';
  import Icon from '../Icon.svelte';
  import { tooltip, type Tip } from './tooltip.ts';

  interface Props {
    icon: IconName;
    value: string;
    label: string;
    warn?: boolean;
    compact?: boolean;
    dense?: boolean;
    tip?: Tip;
  }

  let { icon, value, label, warn = false, compact = false, dense = false, tip }: Props = $props();
</script>

<div class="ui-kpi" class:warn class:s={compact} class:d={dense} use:tooltip={tip}>
  <span class="gico"><Icon name={icon} class="lg" /></span>
  <div class="txt">
    <div class="big">{value}</div>
    <small>{label}</small>
  </div>
</div>
