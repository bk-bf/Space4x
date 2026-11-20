<script lang="ts">
  import { game } from '#lib/game/index.ts';
  import { bonusOf, economy, leading, type Scientist } from '#lib/game/economy/index.ts';
  import { project } from '#lib/game/data/index.ts';
  import { Portrait, Tile, tipText } from '#lib/ui/index.ts';
  import { doing, pct, scientistFace, subjectName } from './programme.ts';

  let {
    s,
    subject,
    selected = false,
    onselect
  }: { s: Scientist; subject?: string; selected?: boolean; onselect: () => void } = $props();

  const busy = $derived(leading(economy, s.id));
  const inField = $derived(subject !== undefined && s.subject === subject);
  const sub = $derived(
    subject !== undefined
      ? `${inField ? '★ ' : ''}${pct(bonusOf(s, subject))} · ${s.admin} labs`
      : `${subjectName(s.subject).split(' ')[0]} ${s.skill}`
  );
  const tip = $derived(
    tipText(
      s.name,
      `${subjectName(s.subject)} ${s.skill}`,
      `Administration ${s.admin}: up to ${s.admin} labs`,
      subject !== undefined ? `${inField ? 'In field' : 'Out of field'} ${pct(bonusOf(s, subject))}` : '',
      busy ? `Leads ${project(busy.number).name}` : ''
    )
  );
</script>

<Tile variant="off" name={s.name} {sub} {selected} idle={!busy} {tip} {onselect}>
  {#snippet art()}
    <Portrait spec={scientistFace(s, game.time)} view="head" scale={2} />
  {/snippet}
  <span class="doing" data-scientist={s.id}>{doing(economy, s)}</span>
</Tile>

<style>
  .doing {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    color: var(--dim);
  }
</style>
