<script lang="ts">
  import { designer } from './designer.svelte.ts';

  const issues = $derived(designer.stats?.issues ?? []);
</script>

{#if !designer.design}
  <p class="none" id="noCheck">Nothing to check.</p>
{:else if issues.length}
  <ul id="issues">
    {#each issues as i (i.code + i.text)}
      <li class={i.level} data-issue={i.code}><b>{i.level === 'error' ? 'Error' : 'Warning'}</b> {i.text}</li>
    {/each}
  </ul>
{:else}
  <p class="ok" id="noIssues">No errors. The class can be locked.</p>
{/if}

<style>
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    padding: 1px 0;
  }
  .error b {
    color: var(--hot);
  }
  .warning b {
    color: var(--accent);
  }
  .none {
    margin: 0;
    color: var(--dim);
  }
  .ok {
    margin: 0;
    color: var(--cool);
  }
</style>
