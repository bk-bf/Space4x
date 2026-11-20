<script lang="ts">
  import { PROPELLANT_KINDS, PROPELLANTS } from '#lib/game/shipdesign/index.ts';
  import { fmt, requestRender } from '#lib/ui/index.ts';
  import { designer } from './designer.svelte.ts';

  const stats = $derived(designer.stats);
  const wanted = $derived(new Set(stats?.drives.map((d) => d.propellant)));
  const rows = $derived(
    PROPELLANT_KINDS.filter(
      (k) => (stats?.capacity[k] ?? 0) > 0 && (wanted.has(k) || (designer.design?.load[k] ?? 0) > 0)
    ).map((kind) => ({
      kind,
      name: PROPELLANTS[kind].name,
      room: stats?.capacity[kind] ?? 0,
      kg: stats?.propellant[kind] ?? 0
    }))
  );
  const locked = $derived(designer.design?.locked ?? true);
  const capacity = $derived(designer.stats?.payloadCapacity ?? 0);
</script>

{#each rows as r (r.kind)}
  <div class="row" data-load-row={r.kind}>
    <span class="name">{r.name}</span>
    <input
      type="number"
      min="0"
      max={Math.floor(r.room)}
      step="100"
      value={Math.round(r.kg)}
      disabled={locked}
      aria-label="{r.name} load"
      data-load={r.kind}
      onchange={(e) => {
        designer.load(r.kind, Number(e.currentTarget.value));
        requestRender();
      }}
    />
    <small>of {fmt.mass(r.room)}</small>
    <button
      data-fill={r.kind}
      disabled={locked}
      onclick={() => {
        designer.load(r.kind, r.room);
        requestRender();
      }}>Fill</button
    >
  </div>
{/each}
<div class="row" data-payload-row>
  <span class="name">Payload (t)</span>
  <input
    type="number"
    min="0"
    max={capacity / 1000}
    step="0.5"
    id="payload"
    value={Math.round(designer.payload) / 1000}
    disabled={!designer.design || capacity <= 0}
    aria-label="Payload"
    onchange={(e) => {
      designer.setPayload(Number(e.currentTarget.value) * 1000);
      requestRender();
    }}
  />
  <small>of {fmt.mass(capacity)}</small>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .name {
    flex: 1;
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
  }
  button {
    margin: 0;
  }
</style>
