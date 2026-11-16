<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { IconRef } from '#lib/gfx/icons/index.ts';
  import PixIcon from './PixIcon.svelte';
  import Pill from './Pill.svelte';
  import type { Chip } from './types.ts';

  interface Props {
    title: string;
    subtitle?: string;
    icon?: IconRef;
    iconSize?: 16 | 32 | 48;
    chips?: readonly Chip[];
    aside?: Snippet;
    class?: string;
    children?: Snippet;
  }

  let {
    title,
    subtitle,
    icon,
    iconSize = 32,
    chips = [],
    aside,
    class: extra = '',
    children
  }: Props = $props();
</script>

<section class="ui-card {extra}">
  <header>
    {#if icon}<PixIcon kind={icon.kind} id={icon.id} size={iconSize} tip={false} />{/if}
    <div class="ttl">
      <div class="t">{title}</div>
      {#if subtitle}<div class="s">{subtitle}</div>{/if}
    </div>
    {#if aside}<div class="aside">{@render aside()}</div>{/if}
  </header>
  <div class="cb">
    {#if chips.length}
      <div class="row">
        {#each chips as c, i (i)}<Pill icon={c.icon} text={c.text} tone={c.tone} tip={c.tip} />{/each}
      </div>
    {/if}
    {@render children?.()}
  </div>
</section>
