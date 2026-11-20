<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { designCeiling, planDesignStack, reachesOrbit, type Fate } from '#lib/game/ships/index.ts';
  import { Bar, Icon, fmt, tipText, tooltip } from '#lib/ui/index.ts';
  import { designer } from './designer.svelte.ts';
  import { formatDv } from './facts.ts';
  import { addBelow, belowDesigns, removeBelow, setStackPayload, stackTry } from './stackTry.svelte.ts';

  const design = $derived(designer.design);
  const below = $derived(belowDesigns());
  const stack = $derived(design ? [...below, design] : []);
  const drives = $derived(!!design && !!designer.stats?.main);
  const plan = $derived(drives ? planDesignStack(game, stack, stackTry.payload) : undefined);
  const ceiling = $derived(drives ? designCeiling(game, stack) : 0);
  const reaches = $derived(!!plan && reachesOrbit(plan));

  const FATE: Record<Fate, string> = {
    returns: 'returns to the pad',
    expended: 'lost',
    orbit: 'reaches orbit',
    carried: 'carried to orbit'
  };
</script>

<div id="stackTry">
  {#if drives && plan}
    <div class="stages" id="stackStages">
      {#each plan.stages as s, i (s.vessel)}
        {@const top = i === plan.stages.length - 1}
        <div
          class="stage"
          class:top
          data-stage={i + 1}
          use:tooltip={tipText(
            `Stage ${i + 1}: ${s.name}`,
            FATE[s.fate],
            `Ignition mass ${fmt.mass(s.mass0)}`,
            `Propellant ${fmt.mass(s.propellant)}`,
            `Delta-v ${formatDv(s.dv)}`
          )}
        >
          <span class="n">{i + 1}</span>
          <span class="name">{s.name}</span>
          <span class="fate {s.fate}">{FATE[s.fate]}</span>
          {#if !top}
            <button aria-label="Remove {s.name}" data-remove={i} onclick={() => removeBelow(i)}
              ><Icon name="cross" class="xs" /></button
            >
          {/if}
        </div>
      {/each}
    </div>
    <div class="row">
      <label class="pick"
        >Add below
        <select
          id="stackAdd"
          value=""
          onchange={(e) => {
            addBelow(e.currentTarget.value);
            e.currentTarget.value = '';
          }}
        >
          <option value="" disabled>a class</option>
          {#each designer.saved as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select></label
      >
    </div>
    <div class="row">
      <span class="name">Payload on top (t)</span>
      <input
        type="number"
        min="0"
        step="0.5"
        id="stackPayload"
        aria-label="Stack payload"
        value={Math.round(stackTry.payload) / 1000}
        onchange={(e) => setStackPayload(Number(e.currentTarget.value) * 1000)}
      />
      <small id="stackCeiling" data-ceiling={Math.round(ceiling)}>lifts {fmt.mass(ceiling)}</small>
    </div>
    <Bar value={plan.need > 0 ? plan.dv / plan.need : 0} thick full tone={reaches ? 'cool' : 'hot'} />
    <div class="fr">
      <span>Delta-v</span><span class="v" class:hot={plan.dv < plan.need}
        >{formatDv(plan.dv)} of {formatDv(plan.need)}</span
      >
    </div>
    <div class="fr">
      <span>Lift-off thrust to weight</span><span class="v" class:hot={!reaches && plan.final >= 0}
        >{plan.twr.toFixed(2)}</span
      >
    </div>
    <div class="fr">
      <span>Lift-off mass</span><span class="v">{fmt.mass(plan.liftoffMass)}</span>
    </div>
    <div class="flag" class:ok={reaches} id="stackVerdict">
      <Icon name={reaches ? 'check' : 'warn'} />
      <span>
        {#if reaches}Reaches orbit from Earth{:else}
          {#each plan.reasons as r, i (i)}<span class="reason">{r}</span>{/each}
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  #stackTry {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dim {
    margin: 0;
    color: var(--dim);
  }
  .stages {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .stage {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 1px 4px;
    background: var(--panel);
    box-shadow: var(--edge);
  }
  .stage.top {
    background: var(--bg);
  }
  .n {
    color: var(--dim);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fate {
    color: var(--dim);
    white-space: nowrap;
  }
  .fate.orbit {
    color: var(--cool);
  }
  .fate.expended {
    color: var(--hot);
  }
  .stage button {
    display: flex;
    margin: 0;
    padding: 0 3px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pick {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .pick select {
    flex: 1;
    min-width: 0;
    color: var(--text);
  }
  input {
    width: 9ch;
    margin: 0;
    padding: 1px 4px;
    font: inherit;
    color: var(--text);
    background: var(--bg);
    border: 0;
    box-shadow: var(--edge);
    text-align: right;
  }
  small {
    color: var(--dim);
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
