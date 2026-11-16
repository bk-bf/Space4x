<script lang="ts">
  import { economy } from '#lib/game/economy/index.ts';
  import type { JumpPoint } from '#lib/game/index.ts';
  import { ships } from '#lib/game/ships/index.ts';
  import { ui } from '#lib/screens/economy/state.svelte.ts';
  import { DefList, shell } from '#lib/ui/index.ts';

  let { jump }: { jump: JumpPoint } = $props();

  const outpost = $derived(economy.sites.find((s) => s.place === 'point' && s.worldBody === jump.id));
  const here = $derived(
    ships.vessels.filter(
      (v) =>
        !v.trip &&
        ((v.at.kind === 'orbit' && v.at.body === jump.id) ||
          (v.at.kind === 'site' && outpost && v.at.site === outpost.id))
    )
  );
  const state = $derived(
    jump.stable ? 'Stable' : jump.surveyed ? 'Surveyed, unstable' : 'Unsurveyed, unstable'
  );
  const facts = $derived<[string, string][]>([
    ['Kind', 'Jump point'],
    ['State', state],
    ['Outpost', outpost?.name ?? 'None'],
    ['Ships', here.length ? here.map((v) => v.name).join(', ') : 'None']
  ]);

  function open() {
    if (!outpost) return;
    ui.site = outpost.id;
    ui.tab = 'summary';
    shell.setScreen('economy');
  }
</script>

<DefList rows={facts} />
{#if outpost}
  <div class="add"><button data-go="economy" onclick={open}>Economy</button></div>
{/if}
