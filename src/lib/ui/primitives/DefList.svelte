<script lang="ts">
  let { rows, two = false }: { rows: readonly (readonly [string, string | number])[]; two?: boolean } =
    $props();
</script>

<dl class:two>
  {#each rows as [k, v], i (i)}<dt>{k}</dt>
    <dd>{v}</dd>{/each}
</dl>
