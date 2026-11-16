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
    tip?: Tip;
  }

  let { icon, value, label, warn = false, compact = false, tip }: Props = $props();
</script>

<div class="ui-kpi" class:warn class:s={compact} use:tooltip={tip}>
  <span class="gico"><Icon name={icon} class="lg" /></span>
  <div>
    <div class="big">{value}</div>
    <small>{label}</small>
  </div>
</div>
