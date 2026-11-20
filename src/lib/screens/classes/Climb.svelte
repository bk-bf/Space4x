<script lang="ts">
  import { climbReasons, climbWith } from '#lib/game/shipdesign/index.ts';
  import { designCeiling } from '#lib/game/ships/index.ts';
  import { Bar, Icon, fmt } from '#lib/ui/index.ts';
  import { designer } from './designer.svelte.ts';
  import { formatDv } from './facts.ts';

  const design = $derived(designer.design);
  const stats = $derived(designer.stats);
  const climb = $derived(
    stats ? climbWith(stats, designer.loaded?.payload ?? stats.payloadCapacity) : undefined
  );
  const ceiling = $derived(design ? designCeiling(design) : 0);
</script>

<div id="climb">
  {#if climb && stats}
    <Bar
      value={climb.need > 0 ? climb.deltaV / climb.need : 0}
      thick
      full
      tone={climb.reaches ? 'cool' : 'hot'}
    />
    <div class="fr">
      <span>Delta-v</span><span class="v" class:hot={climb.deltaV < climb.need}
        >{formatDv(climb.deltaV)} of {formatDv(climb.need)}</span
      >
    </div>
    <div class="fr" data-climb="boosters">
      <span>Boosters</span><span class="v">{climb.boosters}, {formatDv(climb.boosterDv)}</span>
    </div>
    <div class="fr">
      <span>Lift-off thrust to weight</span><span class="v" class:hot={climb.twr < 1.2}
        >{climb.twr.toFixed(2)}</span
      >
    </div>
    <div class="fr">
      <span>Lift-off mass</span><span class="v">{fmt.mass(climb.liftoffMass)}</span>
    </div>
    {#if stats.payloadCapacity > 0}
      <div class="fr">
        <span>Payload to orbit</span><small id="climbCeiling" data-ceiling={Math.round(ceiling)}
          >{fmt.mass(ceiling)} of {fmt.mass(stats.payloadCapacity)}</small
        >
      </div>
    {/if}
    <div class="flag" class:ok={climb.reaches} id="climbVerdict">
      <Icon name={climb.reaches ? 'check' : 'warn'} />
      <span>
        {#if climb.reaches}Reaches orbit from Earth{:else}
          {#each climbReasons(climb) as r, i (i)}<span class="reason">{r}</span>{/each}
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  #climb {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  small {
    color: var(--dim);
    margin-left: auto;
    white-space: nowrap;
  }
  .fr {
    display: flex;
    gap: 6px;
  }
  .fr .v {
    margin-left: auto;
    color: var(--dim);
    white-space: nowrap;
  }
  .fr .v.hot {
    color: var(--hot);
  }
  .flag {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 4px 6px;
    background: var(--panel);
    line-height: 1.05;
    color: var(--hot);
    box-shadow:
      0 -2px 0 var(--hot),
      0 2px 0 var(--hot),
      -2px 0 0 var(--hot),
      2px 0 0 var(--hot);
  }
  .flag.ok {
    color: var(--cool);
    box-shadow:
      0 -2px 0 var(--cool),
      0 2px 0 var(--cool),
      -2px 0 0 var(--cool),
      2px 0 0 var(--cool);
  }
  .flag :global(.ic) {
    width: 16px;
    height: 16px;
    margin-top: 1px;
  }
  .flag > span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
</style>
