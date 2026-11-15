<script lang="ts">
  import Window from './Window.svelte';
  import { SETTINGS_ID, wm } from './wm.svelte';

  const panels = $derived(wm.wins.filter((w) => w.home));
</script>

<Window id={SETTINGS_ID} title="Panels" icon="gear" width={250} hidden>
  <h3>Arrangement</h3>
  <div>
    <button data-set="dock" class:on={wm.arrangement === 'dock'} onclick={() => wm.arrange('dock')}
      >Docked</button
    ><button data-set="float" class:on={wm.arrangement === 'float'} onclick={() => wm.arrange('float')}
      >Floating</button
    >
  </div>
  <h3>Show</h3>
  <div>
    {#each panels as p (p.id)}<button
        data-panel={p.id}
        class:on={!p.hidden}
        onclick={() => wm.show(p.id, p.hidden)}>{p.title}</button
      >{/each}
  </div>
  <h3>Layout</h3>
  <div><button data-set="reset" onclick={() => wm.arrange('reset')}>Reset</button></div>
</Window>
