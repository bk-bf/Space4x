<script lang="ts">
  import { atmosphereOf, material, regionsOf } from '#lib/game/data/index.ts';
  import { economy } from '#lib/game/economy/index.ts';
  import { gradeText, gradeView, isSurveyed, surveyDays } from '#lib/game/survey.svelte.ts';
  import { DefList } from '#lib/ui/index.ts';
  import { shortName } from '#lib/screens/economy/format.ts';

  let { world }: { world: string } = $props();

  const air = $derived(atmosphereOf(world));
  const ground = $derived(regionsOf(world));
  const surveyed = $derived(isSurveyed(world));
  const settled = $derived(
    new Set(economy.sites.filter((s) => s.worldBody === world && s.region).map((s) => s.region))
  );
</script>

{#if air}
  <h3>Atmosphere</h3>
  <div id="atmosphere">
    <DefList
      rows={air.deposits.map((d): [string, string] => [material(d.material).name, d.grade.toFixed(2)])}
    />
  </div>
{/if}
{#if ground.length}
  <h3>Regions <small>{surveyed ? ground.length : 'unknown'}</small></h3>
  {#if surveyed}
    <div id="regions">
      {#each ground as r (r.id)}
        <div class="region" data-region={r.id}>
          <p class="name">{r.name}{settled.has(r.id) ? ' · site' : ''}</p>
          <DefList
            rows={r.deposits.map((d): [string, string] => [
              shortName(d.material),
              gradeText(gradeView(r, d.material)!)
            ])}
          />
        </div>
      {/each}
    </div>
  {:else}
    <p class="unknown" id="regionsUnknown">
      Not surveyed. A ship with survey instruments in orbit finds the regions and their grades in {surveyDays(
        world
      )} days.
    </p>
  {/if}
{/if}

<style>
  .unknown {
    margin: 0;
    color: var(--dim);
  }
  .name {
    margin: 4px 0 0;
    color: var(--accent);
  }
</style>
