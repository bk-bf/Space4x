<script lang="ts">
  import { Icon } from '#lib/ui/index.ts';
  import { robotDesigner as designer } from './designer.svelte.ts';

  const design = $derived(designer.design);
  const issues = $derived(designer.stats?.issues ?? []);
  const errors = $derived(issues.filter((i) => i.level === 'error').length);
</script>

<div class="flags" id="robotIssues">
  {#if design}
    {#each issues as i (i.code + i.text)}
      <div class="flag {i.level}" data-issue={i.code}>
        <Icon name="warn" /><span><b>{i.level === 'error' ? 'Error' : 'Warning'}</b> {i.text}</span>
      </div>
    {/each}
    {#if design.locked}
      <div class="flag ok" id="isLocked"><Icon name="lock" /><span>Locked</span></div>
    {:else if !errors && design.parts.length}
      <div class="flag ok" id="noIssues">
        <Icon name="check" /><span>Ready</span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .flags {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .flag {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 4px 6px;
    background: var(--panel);
    line-height: 1.05;
    box-shadow:
      0 -2px 0 var(--hot),
      0 2px 0 var(--hot),
      -2px 0 0 var(--hot),
      2px 0 0 var(--hot);
  }
  .flag :global(.ic) {
    width: 16px;
    height: 16px;
    color: var(--hot);
    margin-top: 1px;
  }
  .flag b {
    font-weight: 400;
    color: var(--hot);
  }
  .flag.warning {
    box-shadow:
      0 -2px 0 var(--accent),
      0 2px 0 var(--accent),
      -2px 0 0 var(--accent),
      2px 0 0 var(--accent);
  }
  .flag.warning :global(.ic),
  .flag.warning b {
    color: var(--accent);
  }
  .flag.ok {
    box-shadow:
      0 -2px 0 var(--cool),
      0 2px 0 var(--cool),
      -2px 0 0 var(--cool),
      2px 0 0 var(--cool);
  }
  .flag.ok :global(.ic) {
    color: var(--cool);
  }
</style>
