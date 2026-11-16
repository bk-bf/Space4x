<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    min?: number;
    gap?: number;
    class?: string;
    children: Snippet;
  }

  let { min = 104, gap = 6, class: extra = '', children }: Props = $props();
</script>

<div class="ui-grid {extra}" style:grid-template-columns="repeat(auto-fill, {min}px)" style:gap="{gap}px">
  {@render children()}
</div>
