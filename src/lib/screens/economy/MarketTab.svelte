<script lang="ts">
  import {
    acceptOffer,
    canAccept,
    contractName,
    economy,
    marketLedger,
    touch,
    type Contract,
    type Offer
  } from '#lib/game/economy/index.ts';
  import type { IconRef } from '#lib/gfx/icons/index.ts';
  import { Card, Icon, fmt } from '#lib/ui/index.ts';
  import TabBody from './TabBody.svelte';
  import { game } from '#lib/game/index.ts';
  import { economyLog } from './system.ts';

  const market = $derived(economy.market);
  const ledger = $derived(marketLedger(economy));

  const iconOf = (o: Offer): IconRef =>
    o.kind === 'lease' ? { kind: 'building', id: o.building } : { kind: 'material', id: o.material };

  const terms = (o: Offer, signed: boolean): string =>
    o.kind === 'lease'
      ? `${signed ? 'Leased' : 'Lease'} ${fmt.count(o.count)}`
      : `${signed ? 'Supplying' : 'Supply'} ${fmt.mass(o.amount)} a month`;

  const lines = $derived([
    { name: 'Leases', value: ledger.leases },
    { name: 'Supply contracts', value: ledger.supply },
    { name: 'Upkeep', value: -ledger.upkeep }
  ]);

  const tone = (v: number) => (v > 5e5 ? 'cool' : v < -5e5 ? 'hot' : '');

  function accept(o: Offer) {
    if (acceptOffer(economy, o.id, economyLog(game))) touch();
  }
</script>

{#snippet row(name: string, value: string, hot = false)}
  <div class="fr"><span class="nm">{name}</span><span class="v" class:hot>{value}</span></div>
{/snippet}

{#snippet offerCard(o: Offer)}
  <Card title={contractName(o)} subtitle={terms(o, false)} icon={iconOf(o)}>
    <div class="flow">
      {@render row('Length', `${o.months} months`)}
      {@render row('Pays a month', fmt.money(o.pays))}
      {@render row('Pays in all', fmt.money(o.pays * o.months))}
    </div>
    <div class="btns">
      <button data-offer={o.id} disabled={!canAccept(economy, o)} onclick={() => accept(o)}
        ><Icon name="check" />Accept</button
      >
    </div>
  </Card>
{/snippet}

{#snippet contractCard(c: Contract)}
  <Card title={contractName(c)} subtitle={terms(c, true)} icon={iconOf(c)}>
    <div class="flow">
      {@render row('Months left', String(c.left))}
      {@render row('Pays a month', fmt.money(c.pays))}
      {#if c.missed}{@render row('Last month', 'not delivered', true)}{/if}
    </div>
  </Card>
{/snippet}

{#snippet main()}
  <h3><Icon name="list" class="sm" />Offers</h3>
  <div class="mk" id="offers">
    {#each market.offers as o (o.id)}{@render offerCard(o)}{/each}
  </div>
  {#if market.contracts.length}
    <h3><Icon name="check" class="sm" />Contracts</h3>
    <div class="mk" id="contracts">
      {#each market.contracts as c (c.id)}{@render contractCard(c)}{/each}
    </div>
  {/if}
{/snippet}

{#snippet side()}
  <Card title="Next month" subtitle="Treasury {fmt.money(market.treasury)}" class="ledger">
    {#snippet art()}<Icon name="coin" class="lg" />{/snippet}
    <div class="flow" id="ledger">
      {#each lines as l (l.name)}
        <div class="fr">
          <span class="nm">{l.name}</span><span class="v {tone(l.value)}">{fmt.signedMoney(l.value)}</span>
        </div>
      {/each}
      <div class="fr tot">
        <span class="nm">Net</span><span class="v {ledger.net >= 0 ? 'cool' : 'hot'}"
          >{fmt.signedMoney(ledger.net)}</span
        >
      </div>
    </div>
    {#if market.paid < 1 - 1e-9}<div class="hot" id="upkeepPaid">
        Upkeep paid {fmt.pct(market.paid)}
      </div>{/if}
  </Card>
{/snippet}

<TabBody {main} {side} />

<style>
  .mk {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 8px;
    margin-bottom: 8px;
  }
  .mk :global(.ui-card) {
    margin: 0;
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
  .nm {
    font-size: 17px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .v {
    margin-left: auto;
    color: var(--dim);
    font-size: 17px;
    white-space: nowrap;
  }
  .v.hot,
  .hot {
    color: var(--hot);
  }
  .v.cool {
    color: var(--cool);
  }
  .tot {
    border-top: 1px solid var(--line);
    padding-top: 3px;
  }
  .btns {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .btns button {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
