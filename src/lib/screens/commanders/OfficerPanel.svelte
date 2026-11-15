<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { DefList, Meter, Panel, PixelCanvas } from '#lib/ui/index.ts';
  import { drawPortrait, PORTRAIT_H, PORTRAIT_W } from './portrait.ts';
  import {
    ageOf,
    POST_KINDS,
    postLabel,
    postOptions,
    RANKS,
    rankIndex,
    rankLabel,
    roster,
    serviceOf,
    SKILLS,
    type PostKind
  } from './roster.svelte.ts';

  const officer = $derived(roster.officer(roster.selected));
  const next = $derived(officer ? RANKS[rankIndex(officer.rank) + 1] : undefined);
  const options = $derived(postOptions(roster.targetKind, game));
  const target = $derived(
    options.some((p) => p.ref === roster.targetRef) ? roster.targetRef : (options[0]?.ref ?? '')
  );
  const pips = $derived(RANKS[officer ? rankIndex(officer.rank) : 0]!.pips);
  const rows = $derived<[string, string | number][]>(
    officer
      ? [
          ['Post', postLabel(officer.post, game)],
          ['Age', ageOf(officer, game.time)],
          ['Service', `${serviceOf(officer, game.time)} years`]
        ]
      : []
  );

  function assign() {
    if (officer) roster.assign(officer.id, roster.targetKind, target, game);
  }

  function holderNote(ref: string): string {
    const held = roster.holder(roster.targetKind, ref);
    if (!held) return 'vacant';
    return held.id === officer?.id ? 'current' : held.name;
  }
</script>

<Panel title={officer ? `${rankLabel(officer.rank)} ${officer.name}` : 'No officer'} body="col">
  {#if officer}
    <div class="view portrait">
      <PixelCanvas
        width={PORTRAIT_W}
        height={PORTRAIT_H}
        scale={4}
        vignette={0.75}
        draw={(fb) => drawPortrait(fb, officer.seed, pips)}
      />
    </div>
    <DefList {rows} />
    <h3>Skills</h3>
    {#each SKILLS as skill, k (skill)}
      <div class="skill"><small>{skill}</small><Meter value={officer.skills[k]!} wide /></div>
    {/each}
    <h3>Post</h3>
    <label class="field"
      >Kind
      <select id="postKind" bind:value={roster.targetKind}>
        {#each POST_KINDS as k (k.id)}<option value={k.id satisfies PostKind}>{k.label}</option>{/each}
      </select></label
    >
    {#if roster.targetKind !== 'none'}
      <label class="field"
        >Post
        <select id="postRef" value={target} onchange={(e) => (roster.targetRef = e.currentTarget.value)}>
          {#each options as p (p.ref)}<option value={p.ref}
              >{p.label}{p.where ? `, ${p.where}` : ''} ({holderNote(p.ref)})</option
            >{/each}
        </select></label
      >
    {/if}
    <div class="buttons">
      <button id="assign" onclick={assign}>{roster.targetKind === 'none' ? 'Release' : 'Assign'}</button
      ><button id="promote" disabled={!next} onclick={() => roster.promote(officer.id, game)}
        >{next ? `Promote to ${next.label}` : 'Highest rank'}</button
      >
    </div>
  {/if}
</Panel>

<style>
  .portrait {
    width: 240px;
    height: 256px;
    margin: 0 auto 2px;
    flex: none;
  }
  .field {
    display: grid;
    grid-template-columns: 5ch minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    color: var(--dim);
  }
  .field select {
    min-width: 0;
    width: 100%;
    margin: 0;
    color: var(--text);
  }
  .buttons {
    display: flex;
    margin: 0 -2px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
