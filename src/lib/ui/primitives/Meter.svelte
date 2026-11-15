<script lang="ts">
  let { value, wide = false }: { value: number; wide?: boolean } = $props();
</script>

<i class="m" class:wide style:--v="{value}%"></i>
