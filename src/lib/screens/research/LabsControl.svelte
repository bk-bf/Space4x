<script lang="ts">
  import { Icon, tooltip } from '#lib/ui/index.ts';

  let {
    id,
    labs,
    cap,
    free,
    onstep
  }: { id: string; labs: number; cap: number; free: number; onstep: (delta: number) => void } = $props();
</script>

<div class="row sp" {id}>
  <span class="lbl">Labs</span>
  <span class="ctl">
    <button disabled={labs <= 0} onclick={() => onstep(-1)} use:tooltip={'One fewer'}
      ><Icon name="minus" class="xs" /></button
    ><span class="val" data-labs={labs}>{labs} / {cap}</span><button
      disabled={labs >= cap}
      onclick={() => onstep(1)}
      use:tooltip={'One more'}><Icon name="plus" class="xs" /></button
    >
  </span>
  <span class="dim">{free} free</span>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sp {
    justify-content: space-between;
  }
  .lbl,
  .dim {
    color: var(--dim);
    font-size: 15px;
  }
  .ctl {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .ctl button {
    display: inline-flex;
    align-items: center;
    padding: 2px 5px;
    margin: 0;
  }
  .val {
    min-width: 60px;
    text-align: center;
  }
</style>
