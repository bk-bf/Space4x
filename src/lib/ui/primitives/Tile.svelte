<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { IconName } from '#lib/gfx/icons.ts';
  import { FALLBACK_KIND_COLOUR, KIND_COLOURS, type IconRef } from '#lib/gfx/icons/index.ts';
  import type { Tone, Trend } from '../format.ts';
  import { trendTone } from '../format.ts';
  import Icon from '../Icon.svelte';
  import Bar from './Bar.svelte';
  import PixIcon from './PixIcon.svelte';
  import { tooltip, type Tip } from './tooltip.ts';

  type Variant = 'auto' | 'prod' | 'stk' | 'bld' | 'q' | 'cmp' | 'node' | 'off' | 'slot';

  interface Props {
    variant?: Variant;
    icons?: readonly IconRef[];
    iconSize?: 16 | 32 | 48;
    name?: string;
    sub?: string;
    value?: string;
    note?: string;
    noteTone?: Tone;
    meter?: number;
    meterTone?: 'accent' | 'hot' | 'cool';
    trend?: Trend;
    kind?: string;
    corner?: string;
    cornerRight?: string;
    badge?: IconName;
    badgeTone?: Tone | 'accent';
    mark?: IconName;
    markTone?: Tone | 'accent';
    selected?: boolean;
    dimmed?: boolean;
    locked?: boolean;
    idle?: boolean;
    minis?: readonly IconRef[];
    minisMore?: number;
    art?: Snippet;
    warn?: boolean;
    tip?: Tip;
    onselect?: () => void;
    disabled?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'auto',
    icons = [],
    iconSize = 32,
    name,
    sub,
    value,
    note,
    noteTone = 'dim',
    meter,
    meterTone = 'accent',
    trend,
    kind,
    corner,
    cornerRight,
    badge,
    badgeTone = 'hot',
    mark,
    markTone = 'dim',
    selected = false,
    dimmed = false,
    locked = false,
    idle = false,
    minis = [],
    minisMore = 0,
    art,
    warn = false,
    tip,
    onselect,
    disabled = false,
    class: extra = '',
    children
  }: Props = $props();

  const interactive = $derived(onselect !== undefined);
  const stripe = $derived(
    kind ? `rgb(${(KIND_COLOURS[kind] ?? FALLBACK_KIND_COLOUR).join(',')})` : undefined
  );
  const inlineFoot = $derived(variant === 'prod');
</script>

{#snippet body()}
  {#if stripe}<i class="ui-kstripe" style:background={stripe}></i>{/if}
  {#if corner}<span class="ui-corner">{corner}</span>{/if}
  {#if badge}<span class="ui-corner badge {badgeTone}"><Icon name={badge} class="sm" /></span>{/if}
  {#if cornerRight || mark}
    <span class="ui-corner r {markTone}"
      >{#if mark}<Icon name={mark} />{/if}{cornerRight ?? ''}</span
    >
  {/if}
  {#if trend}<span class="ui-trend {trendTone(trend)}"><Icon name={trend} /></span>{/if}
  {#if art}
    <span class="ui-art">{@render art()}</span>
  {:else if icons.length}
    <span class="ui-art">
      {#each icons as icon, i (i)}<PixIcon kind={icon.kind} id={icon.id} size={iconSize} tip={false} />{/each}
    </span>
  {/if}
  {#if name}
    <span class="ui-nm" class:two={sub !== undefined}
      ><b>{name}</b>{#if sub !== undefined}<em>{sub}</em>{/if}</span
    >
  {/if}
  {#if inlineFoot}
    {#if value !== undefined || meter !== undefined}
      <span class="ui-foot">
        {#if value !== undefined}<span class="n">{value}</span>{/if}
        {#if meter !== undefined}<Bar value={meter} tone={meterTone} />{:else if note}<span class="dim"
            >{note}</span
          >{/if}
      </span>
    {/if}
  {:else}
    {#if value !== undefined}<span class="ui-amt">{value}</span>{/if}
    {#if note}<span class="ui-net {noteTone}">{note}</span>{/if}
    {#if meter !== undefined}<Bar value={meter} tone={meterTone} full />{/if}
  {/if}
  {#if minis.length}
    <span class="ui-costs">
      {#each minis as icon, i (i)}<PixIcon kind={icon.kind} id={icon.id} size={16} tip={false} />{/each}
      {#if minisMore > 0}<span class="more">+{minisMore}</span>{/if}
    </span>
  {/if}
  {@render children?.()}
{/snippet}

{#if interactive}
  <button
    class="ui-tile {variant} {extra}"
    class:sel={selected}
    class:dimmed
    class:lock={locked}
    class:idle
    class:warn
    type="button"
    aria-pressed={selected}
    {disabled}
    onclick={onselect}
    use:tooltip={tip}
  >
    {@render body()}
  </button>
{:else}
  <div
    class="ui-tile {variant} {extra}"
    class:sel={selected}
    class:dimmed
    class:lock={locked}
    class:idle
    class:warn
    use:tooltip={tip}
  >
    {@render body()}
  </div>
{/if}
