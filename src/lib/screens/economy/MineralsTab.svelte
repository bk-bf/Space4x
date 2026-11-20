<script lang="ts">
  import { material } from '#lib/game/data/index.ts';
  import { economy, flowsOf, type Site } from '#lib/game/economy/index.ts';
  import { Card, Tile, TileGrid, fmt, materialName, materialTip } from '#lib/ui/index.ts';
  import Facts from './Facts.svelte';
  import TabBody from './TabBody.svelte';
  import { LOW_YEARS, bodyDeposits, hasReserves, reserveRows, yearsText } from './minerals.ts';
  import { mat } from './refs.ts';
  import { ui } from './state.svelte.ts';

  let { site }: { site: Site } = $props();
  const flows = $derived(flowsOf(site));
  const earth = $derived(hasReserves(site));
  const rows = $derived(earth ? reserveRows(economy, site, flows) : []);
  const picked = $derived(rows.find((r) => r.id === ui.mineral) ?? rows[0]);
  const body = $derived(earth ? { groups: [], unknown: false } : bodyDeposits(site));
  const deposits = $derived(body.groups.flatMap((g) => g.rows));
  const deposit = $derived(deposits.find((d) => d.key === ui.deposit) ?? deposits[0]);
  const why = (id: string) => material(id).why;
</script>

<TabBody>
  {#snippet main()}
    <div id="minerals">
      {#if earth}
        <div class="grid">
          <TileGrid min={116} gap={5}>
            {#each rows as r (r.id)}
              <Tile
                variant="stk"
                icons={[mat(r.id)]}
                name={materialName(r.id)}
                value={fmt.mass(r.left)}
                note={yearsText(r.years)}
                noteTone={r.low ? 'hot' : 'dim'}
                warn={r.low}
                selected={r.id === picked?.id}
                tip={materialTip(
                  r.id,
                  `${fmt.mass(r.left)} in reserves`,
                  `~${r.record.basis}`,
                  r.minedPerYear > 0 ? `${fmt.mass(r.minedPerYear)} mined a year` : 'Not mined'
                )}
                onselect={() => (ui.mineral = r.id)}
              />
            {/each}
          </TileGrid>
        </div>
      {:else}
        {#each body.groups as g (g.id)}
          <h3 data-region={g.id}>
            {g.name}{#if g.here}<small class="dim">site</small>{/if}
          </h3>
          <div class="grid">
            <TileGrid min={116} gap={5}>
              {#each g.rows as d (d.key)}
                <Tile
                  variant="stk"
                  icons={[mat(d.material)]}
                  name={materialName(d.material)}
                  value={d.grade}
                  selected={d.key === deposit?.key}
                  tip={materialTip(d.material, `${d.place}, grade ${d.grade}`)}
                  onselect={() => (ui.deposit = d.key)}
                />
              {/each}
            </TileGrid>
          </div>
        {/each}
        {#if body.unknown}<h3 id="regionsUnknown">Regions <small class="dim">unknown</small></h3>{/if}
      {/if}
    </div>
  {/snippet}
  {#snippet side()}
    {#if earth && picked}
      <Card title={materialName(picked.id)} subtitle={picked.record.basis} icon={mat(picked.id)}>
        <Facts
          rows={[
            { icon: 'box', label: 'Reserves', value: fmt.mass(picked.left) },
            {
              icon: 'down',
              label: 'Mined a year',
              value: fmt.mass(picked.minedPerYear)
            },
            {
              icon: 'clock',
              label: 'Lasts',
              value: yearsText(picked.years),
              tone: picked.years !== null && picked.years < LOW_YEARS ? 'hot' : undefined
            },
            { icon: 'flat', label: 'Accessibility', value: picked.record.accessibility.toFixed(1) },
            {
              icon: 'up',
              label: 'World output, 2024',
              value: picked.record.output === null ? '-' : fmt.mass(picked.record.output)
            }
          ]}
        />
        {#if why(picked.id)}<p class="dim why">{why(picked.id)}</p>{/if}
      </Card>
    {:else if deposit}
      <Card title={materialName(deposit.material)} subtitle={deposit.place} icon={mat(deposit.material)}>
        <Facts rows={[{ icon: 'drop', label: 'Grade', value: deposit.grade }]} />
        {#if why(deposit.material)}<p class="dim why">{why(deposit.material)}</p>{/if}
      </Card>
    {/if}
  {/snippet}
</TabBody>

<style>
  .grid {
    margin-bottom: 6px;
  }
  .dim {
    color: var(--dim);
  }
  .why {
    margin: 6px 0 0;
    font-size: 16px;
  }
  h3 small {
    margin-left: 5px;
  }
</style>
