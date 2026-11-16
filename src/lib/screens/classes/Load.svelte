<script lang="ts">
  import { PROPELLANT_KINDS, PROPELLANTS } from '#lib/game/shipdesign/index.ts';
  import { requestRender } from '#lib/ui/index.ts';
  import { formatMass } from '#lib/screens/economy/format.ts';
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
</script>

{#if rows.length}
  {#each rows as r (r.kind)}
    <div class="row" data-load-row={r.kind}>
      <span>{r.name}</span>
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
      <small>of {formatMass(r.room)}</small>
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
{:else}
  <p class="none" id="noTanks">Nothing to load yet: add an engine and a tank that holds its propellant.</p>
{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .row span {
    flex: 1;
  }
  input {
    width: 9ch;
    font: inherit;
    color: inherit;
    background: var(--panel2);
    border: 0;
    text-align: right;
    padding: 0 2px;
  }
  small {
    color: var(--dim);
  }
  .none {
    margin: 0;
    color: var(--dim);
  }
</style>
