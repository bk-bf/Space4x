<script lang="ts">
  import { berthsOf, flowsOf, type Site } from '#lib/game/economy/index.ts';
  import { biospherePeople, suitability } from '#lib/game/suitability.ts';
  import { BUILDING_KIND_DESCRIPTIONS, BUILDING_KIND_NAMES } from '#lib/gfx/icons/index.ts';
  import type { IconName } from '#lib/gfx/icons.ts';
  import { Bar, Card, CardSection, Icon, Tile, TileGrid, dim, fmt, tipText } from '#lib/ui/index.ts';
  import Facts from './Facts.svelte';
  import TabBody from './TabBody.svelte';
  import { groupViews, kindIcon, kindTotals } from './model.ts';

  let { site }: { site: Site } = $props();

  const flows = $derived(flowsOf(site));
  const views = $derived(groupViews(site, flows));
  const people = (n: number) => fmt.population(n);

  const workforce = $derived(site.population * site.workforceShare);
  const cohorts = $derived<{ name: string; icon: IconName; share: number }[]>([
    {
      name: 'Workforce',
      icon: 'gear',
      share: site.workforceShare
    },
    {
      name: 'Not in the workforce',
      icon: 'clock',
      share: 1 - site.workforceShare
    }
  ]);
  const jobs = $derived(kindTotals(site, views).filter((k) => k.workers > 0));
  const totalJobs = $derived(jobs.reduce((a, j) => a + j.workers, 0));
  const spare = $derived(Math.max(0, flows.workers.available - flows.workers.needed));
  const growth = $derived(flows.growthPerHour * 8766);
  const berths = $derived(berthsOf(site));
  const housed = $derived(berths === null ? undefined : Math.min(1, berths / Math.max(1, site.population)));
  const fit = $derived(site.place === 'surface' ? suitability(site.worldBody) : undefined);
  const perBiosphere = $derived(site.berths === null ? 0 : biospherePeople(site.worldBody));
  const fed = $derived(Math.min(1, flows.food.cover));
  const jobsFilled = $derived(Math.min(1, flows.workers.share));
</script>

<TabBody>
  {#snippet main()}
    <h3>
      <Icon name="people" class="sm" />Who lives here <small class="dim">{people(site.population)}</small>
    </h3>
    <TileGrid min={120} gap={5}>
      <Tile variant="q" name="People" value={people(site.population)} tip="People">
        {#snippet art()}<span class="art"><Icon name="people" class="lg" /></span>{/snippet}
      </Tile>
      {#each cohorts as c (c.name)}
        <Tile
          variant="q"
          name={c.name}
          value={people(site.population * c.share)}
          meter={c.share}
          tip={tipText(c.name, fmt.pct(c.share))}
        >
          {#snippet art()}<span class="art"><Icon name={c.icon} class="lg" /></span>{/snippet}
        </Tile>
      {/each}
    </TileGrid>
    <h3>
      <Icon name="gear" class="sm" />Jobs by industry
      <small class="dim">{people(totalJobs)} workers needed, {people(spare)} not needed</small>
    </h3>
    {#if jobs.length}
      <TileGrid min={120} gap={5}>
        {#each jobs as j (j.kind)}
          <Tile
            variant="q"
            icons={[kindIcon(j.kind)]}
            name={BUILDING_KIND_NAMES[j.kind] ?? j.kind}
            value={people(j.workers)}
            meter={j.workers / Math.max(1, totalJobs)}
            kind={j.kind}
            tip={tipText(
              BUILDING_KIND_NAMES[j.kind] ?? j.kind,
              dim(BUILDING_KIND_DESCRIPTIONS[j.kind] ?? ''),
              `${people(j.workers)} workers`
            )}
          />
        {/each}
      </TileGrid>
    {/if}
  {/snippet}
  {#snippet side()}
    <Card title="Population" subtitle="{site.name}, {people(site.population)}" icon={undefined}>
      <CardSection label="Share of need met">
        <div class="bars" id="peopleBars">
          <div class="br">
            <span>Jobs filled</span><Bar value={jobsFilled} tone={jobsFilled < 1 ? 'hot' : 'cool'} /><span
              class="pc">{fmt.pct(jobsFilled)}</span
            >
          </div>
          <div class="br">
            <span>Fed</span><Bar value={fed} tone={fed < 1 ? 'hot' : 'cool'} /><span class="pc"
              >{fmt.pct(fed)}</span
            >
          </div>
          {#if housed !== undefined}
            <div class="br">
              <span>Housed</span><Bar value={housed} tone={housed < 1 ? 'hot' : 'cool'} /><span class="pc"
                >{fmt.pct(housed)}</span
              >
            </div>
          {/if}
        </div>
      </CardSection>
      <Facts
        rows={[
          { icon: 'gear', label: 'Workforce', value: people(workforce) },
          { icon: 'grain', label: 'Food a person', value: `${fmt.group(site.kcalPerPersonDay)} kcal a day` },
          {
            icon: growth >= 0 ? 'up' : 'down',
            label: 'Growth',
            value: `${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(2)}% a year`
          },
          { icon: 'gear', label: 'Workers not needed', value: people(spare) },
          ...(fit ? [{ icon: 'leaf' as const, label: 'Suitability', value: fit.s.toFixed(2) }] : []),
          ...(fit && perBiosphere > 0
            ? [{ icon: 'dome' as const, label: 'A biosphere holds', value: people(perBiosphere) }]
            : []),
          ...(berths === null
            ? []
            : [
                {
                  icon: 'dome' as const,
                  label: 'Berths',
                  value: `${fmt.group(site.population)} of ${fmt.group(berths)}`
                }
              ])
        ]}
      />
    </Card>
  {/snippet}
</TabBody>

<style>
  .art {
    display: flex;
    align-items: center;
    height: 40px;
    color: var(--accent);
  }
  .bars {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .br {
    display: grid;
    grid-template-columns: 1fr 130px 40px;
    align-items: center;
    gap: 6px;
    font-size: 17px;
  }
  .pc {
    text-align: right;
  }
</style>
