<script lang="ts">
  import type { IconName } from '#lib/gfx/icons.ts';
  import Icon from '../Icon.svelte';
  import { tooltip, type Tip } from './tooltip.ts';

  interface Props {
    icon?: IconName;
    text: string | number;
    tone?: 'hot' | 'cool';
    tip?: Tip;
  }

  let { icon, text, tone, tip }: Props = $props();
</script>

<span class="ui-pill {tone ?? ''}" use:tooltip={tip}
  >{#if icon}<Icon name={icon} class="xs" />{/if}{text}</span
>
