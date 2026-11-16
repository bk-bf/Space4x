<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { Bar, Card, CardSection, Icon, Portrait, Tile, TileGrid, dim, tipText } from '#lib/ui/index.ts';
  import {
    ageOf,
    allPosts,
    bestSkill,
    portraitSpec,
    postLabel,
    RANKS,
    rankIndex,
    rankLabel,
    roster,
    serviceOf,
    SKILLS
  } from './roster.svelte.ts';

  const officer = $derived(roster.officer(roster.selected));
  const next = $derived(officer ? RANKS[rankIndex(officer.rank) + 1] : undefined);
  const best = $derived(officer ? bestSkill(officer) : 0);
  const posts = $derived(allPosts(game));
  const post = $derived(officer ? postLabel(officer.post, game) : '');
  const posted = $derived(officer !== undefined && officer.post.kind !== 'none');

  const holds = (kind: string, ref: string) => officer?.post.kind === kind && officer.post.ref === ref;

  function holderNote(kind: Parameters<typeof roster.holder>[0], ref: string): string {
    const held = roster.holder(kind, ref);
    return held && held.id !== officer?.id ? `Now held by ${held.name}` : '';
  }
</script>

{#if officer}
  <Card title={officer.name} subtitle={`${rankLabel(officer.rank)}, age ${ageOf(officer, game.time)}`}>
    <div class="bigpic">
      <Portrait spec={portraitSpec(officer, game.time)} view="bust" scale={3} />
    </div>
    <div class="flow">
      <div class="fr">
        <Icon name="people" class="sm" /><span class="nm">Gender</span><span class="v"
          >{officer.gender === 'f' ? 'Female' : 'Male'}</span
        >
      </div>
      <div class="fr">
        <Icon name="star" class="sm" /><span class="nm">Post</span><span class="v"
          >{posted ? post : 'unassigned'}</span
        >
      </div>
      <div class="fr">
        <Icon name="clock" class="sm" /><span class="nm">Served</span><span class="v"
          >{serviceOf(officer, game.time)} years</span
        >
      </div>
      <div class="fr">
        <Icon name="up" class="sm" /><span class="nm">Best at</span><span class="v">{SKILLS[best]}</span>
      </div>
    </div>
    <CardSection label="Skills">
      <div class="flow">
        {#each SKILLS as skill, k (skill)}
          <div class="fr">
            <span class="nm">{skill}</span>
            <span class="v skill"
              ><Bar value={officer.skills[k]! / 100} tone={k === best ? 'accent' : 'cool'} /><span class="n"
                >{officer.skills[k]}</span
              ></span
            >
          </div>
        {/each}
      </div>
    </CardSection>
    <CardSection label="Assign to">
      <TileGrid min={96} gap={4}>
        {#each posts as p (`${p.kind}:${p.ref}`)}
          <Tile
            variant="slot"
            name={p.label}
            selected={holds(p.kind, p.ref)}
            tip={tipText(p.label, dim(p.where), holderNote(p.kind, p.ref))}
            onselect={() => roster.assign(officer.id, p.kind, p.ref, game)}
          />
        {/each}
        <Tile
          variant="slot"
          name="Unassign"
          disabled={!posted}
          onselect={() => roster.assign(officer.id, 'none', '', game)}
        />
      </TileGrid>
    </CardSection>
    <div class="btns">
      <button id="promote" disabled={!next} onclick={() => roster.promote(officer.id, game)}
        ><Icon name="up" class="sm" />{next ? `Promote to ${next.label}` : 'Highest rank'}</button
      >
    </div>
  </Card>
{/if}

<style>
  .bigpic {
    display: flex;
    justify-content: center;
    background: var(--bg);
    padding: 6px;
    box-shadow: var(--edge);
  }
  .flow {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .fr {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .fr .nm {
    font-size: 17px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fr .v {
    margin-left: auto;
    color: var(--dim);
    font-size: 17px;
    white-space: nowrap;
  }
  .fr .v.skill {
    min-width: 130px;
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .fr .v.skill .n {
    min-width: 14px;
    text-align: right;
  }
  .btns {
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
  }
  .btns button {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .btns button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
