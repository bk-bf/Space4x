<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    head?: Snippet;
    tools?: Snippet;
    grow?: boolean;
    body?: '' | 'col' | 'fill' | 'center';
    class?: string;
    children: Snippet;
  }

  let { title = '', head, tools, grow = false, body = '', class: extra = '', children }: Props = $props();
</script>

<section class="pan {extra}" class:grow>
  <h2>
    {#if head}{@render head()}{:else}{title}{/if}
    {#if tools}{@render tools()}{/if}
  </h2>
  <div class="pb {body}">{@render children()}</div>
</section>
