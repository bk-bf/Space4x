<script lang="ts">
  import { requestRender } from '#lib/ui/index.ts';
  import {
    MAX_CARGO_LAYERS,
    MAX_ENGINES,
    attachmentAt,
    attachmentKey,
    attachmentName,
    cargoLayers,
    layout,
    partFigures,
    targetLabel,
    weaponSummary,
    type Figures
  } from '#lib/game/design.ts';
  import { animTime } from '#lib/ui/index.ts';
  import { SYSTEMS, shipComponents, type Component } from '#lib/gfx/topdown/index.ts';
  import { designer } from './designer.svelte.ts';
  import { inspector } from './inspector.svelte.ts';

  const sel = $derived(designer.selection);
  const draft = $derived(designer.draft);
  const section = $derived(sel.kind === 'section' ? draft.parts[sel.index] : undefined);
  const count = $derived(draft.parts.length);
  const engines = $derived(draft.stern?.[0] === 'engines' ? (draft.stern[1] ?? 2) : 0);

  const slotName = (slot: 'top' | 'bottom') =>
    sel.kind === 'section' ? attachmentAt(draft, sel.index, slot) : undefined;
  const layersOf = $derived.by(() => {
    if (sel.kind !== 'section') return 0;
    const name = attachmentAt(draft, sel.index, sel.slot);
    return name && attachmentKey(name) === 'cargo' ? cargoLayers(name) : 0;
  });

  const SYSTEM_NAMES: Record<keyof typeof SYSTEMS, string> = {
    hull: 'Structure',
    armor: 'Armour',
    prop: 'Propulsion',
    power: 'Power',
    weapon: 'Weapons',
    sensor: 'Sensors',
    crew: 'Crew',
    bridge: 'Command',
    store: 'Storage',
    hangar: 'Hangar',
    dock: 'Docking'
  };

  const shown = $derived.by((): { component: Component; figures: Figures | undefined } | null => {
    const hit = inspector.hover;
    if (hit) {
      const target =
        hit.selection.kind === 'section'
          ? { kind: 'section' as const, index: hit.selection.index }
          : hit.selection;
      return { component: hit.component, figures: partFigures(draft, target, hit.component.slot) };
    }
    const comps = shipComponents(draft);
    const part = designer.selection;
    const index = layout(draft).findIndex((p) =>
      part.kind === 'section'
        ? p.target.kind === 'section' && p.target.index === part.index
        : p.target.kind === part.kind
    );
    const component = comps.find((c) => c?.part === index && !c.slot);
    if (!component) return null;
    const target = part.kind === 'section' ? { kind: 'section' as const, index: part.index } : part;
    return { component, figures: partFigures(draft, target) };
  });

  const number = (n: number) => n.toLocaleString('en');

  function describe(f: Figures | undefined): string {
    if (!f) return '';
    const weapons = weaponSummary(f.weapons);
    return [
      `${number(f.mass)} t`,
      f.crew && `crew ${number(f.crew)}`,
      f.thrust && `thrust ${number(f.thrust)}`,
      f.fuel && `fuel ${number(f.fuel)} kL`,
      f.armour && `armour ${f.armour}`,
      f.cargo && `cargo ${number(f.cargo)} t`,
      weapons !== 'None' && weapons
    ]
      .filter(Boolean)
      .join(' · ');
  }

  const act = (fn: () => void) => () => {
    fn();
    requestRender();
  };
</script>

<div class="controls">
  <div class="line">
    <b id="partLabel">{targetLabel(draft, sel)}</b>
    {#if sel.kind === 'section'}
      <button data-act="left" disabled={sel.index === 0} onclick={act(() => designer.shift(-1))}
        >Move left</button
      >
      <button data-act="right" disabled={sel.index >= count - 1} onclick={act(() => designer.shift(1))}
        >Move right</button
      >
    {/if}
    {#if sel.kind === 'stern' && engines}
      <button data-act="engines-less" disabled={engines <= 1} onclick={act(() => designer.engines(-1))}
        >Fewer engines</button
      >
      <button
        data-act="engines-more"
        disabled={engines >= MAX_ENGINES}
        onclick={act(() => designer.engines(1))}>More engines</button
      >
    {/if}
    <button data-act="remove" onclick={act(() => designer.removeSelected())}>Remove</button>
    {#if !draft.aft}
      <button data-act="aft" onclick={act(() => designer.addAft())}>Add aft cap</button>
    {/if}
  </div>
  <div class="line">
    {#if section}
      {#each ['top', 'bottom'] as const as slot (slot)}
        {@const name = slotName(slot)}
        <button
          data-slot={slot}
          class:on={sel.kind === 'section' && sel.slot === slot}
          onclick={act(() => designer.selectSlot(slot))}
          >{slot === 'top' ? 'Top' : 'Bottom'} hardpoint: {name ? attachmentName(name) : 'empty'}</button
        >
        <button data-clear={slot} disabled={!name} onclick={act(() => designer.clearAttachment(slot))}
          >Clear</button
        >
      {/each}
      {#if layersOf}
        <button data-act="layers-less" disabled={layersOf <= 1} onclick={act(() => designer.layers(-1))}
          >Fewer layers</button
        >
        <button
          data-act="layers-more"
          disabled={layersOf >= MAX_CARGO_LAYERS}
          onclick={act(() => designer.layers(1))}>More layers</button
        >
      {/if}
    {:else}
      <span class="hint">Pick a section to give it hardpoints.</span>
    {/if}
  </div>
  <div class="line" id="inspect">
    <button data-act="turn" class:on={inspector.turning} onclick={act(() => inspector.toggleTurn(animTime()))}
      >Turn</button
    >
    <button data-act="systems" class:on={inspector.systems} onclick={act(() => inspector.toggleSystems())}
      >Systems</button
    >
    <button data-act="hit" onclick={act(() => inspector.takeHit(draft))}>Take hit</button>
    <button data-act="repair" disabled={!inspector.hits} onclick={act(() => inspector.repair())}
      >Repair</button
    >
    {#if shown}
      <b
        id="partName"
        style:color={inspector.systems ? `rgb(${SYSTEMS[shown.component.kind].join(',')})` : undefined}
        >{shown.component.name}</b
      >
      <span id="partFigures">{describe(shown.figures)}</span>
      {#if inspector.systems}<span class="sys">{SYSTEM_NAMES[shown.component.kind]}</span>{/if}
    {/if}
  </div>
</div>

<style>
  .controls {
    flex: none;
    padding: 4px 8px;
    border-top: 2px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    min-height: 28px;
  }
  .line b {
    font:
      600 14px 'Pixelify',
      sans-serif;
    margin: 0 10px 0 2px;
    min-width: 25ch;
    color: var(--accent);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  #inspect b {
    min-width: 0;
    margin-left: 8px;
  }
  #inspect span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sys {
    color: var(--dim);
    margin-left: 8px;
  }
  .hint {
    color: var(--dim);
    padding-left: 2px;
  }
</style>
