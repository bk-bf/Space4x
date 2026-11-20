import { describe, expect, it } from 'vitest';
import { economy, homeSite } from '#lib/game/economy/index.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';
import { designCeiling, launch, payloadCeiling, planDesignStack, planStack, reachesOrbit } from './launch.ts';
import { ships } from './state.svelte.ts';
import { statsOf } from './model.ts';

const stage1 = (id: string, legs: number) =>
  addDesign({
    id,
    parts: [
      ['kerolox_engine', 9],
      ['propellant_tank', 20],
      ['structure_truss', 1],
      ...(legs ? [['landing_legs', legs] as const] : [])
    ],
    load: [['kerolox', 1e9]]
  });

const stage2 = () =>
  addDesign({
    id: 's2',
    parts: [
      ['kerolox_engine', 1],
      ['propellant_tank', 5]
    ],
    load: [['kerolox', 1e9]]
  });

const FALCON_9_EXPENDED_KG = 22_800;
const FALCON_9_REUSED_KG = 17_500;

describe('staging a two-stage stack modelled on Falcon 9', () => {
  it('reaches low Earth orbit with roughly the real payload, expended and reused', () => {
    const g = freshGame();
    const site = homeSite();
    stage1('s1r', 1);
    stage1('s1e', 0);
    stage2();
    const r = spawn('s1r');
    const e = spawn('s1e');
    const u = spawn('s2');
    const reused = payloadCeiling(g, site, { stages: [r.id, u.id], payload: { kind: 'none' } });
    const expended = payloadCeiling(g, site, { stages: [e.id, u.id], payload: { kind: 'none' } });
    expect(expended).toBeGreaterThan(FALCON_9_EXPENDED_KG * 0.75);
    expect(expended).toBeLessThan(FALCON_9_EXPENDED_KG * 1.25);
    expect(reused).toBeGreaterThan(FALCON_9_REUSED_KG * 0.75);
    expect(reused).toBeLessThan(FALCON_9_REUSED_KG * 1.25);
    expect(reused / expended).toBeGreaterThan((FALCON_9_REUSED_KG / FALCON_9_EXPENDED_KG) * 0.9);
    expect(reused / expended).toBeLessThan((FALCON_9_REUSED_KG / FALCON_9_EXPENDED_KG) * 1.1);
  });

  it('checks lift-off thrust to weight on the first stage only and delta-v stage by stage', () => {
    const g = freshGame();
    const site = homeSite();
    stage1('s1r', 1);
    stage2();
    const a = spawn('s1r');
    const b = spawn('s2');
    const upperAlone = planStack(g, site, { stages: [b.id], payload: { kind: 'none' } });
    expect(upperAlone.twr).toBeLessThan(1.2);
    expect(upperAlone.ok).toBe(false);
    const plan = planStack(g, site, { stages: [a.id, b.id], payload: { kind: 'none' } });
    expect(plan.twr).toBeGreaterThanOrEqual(1.2);
    expect(plan.stages).toHaveLength(2);
    expect(plan.stages[0]!.dv + plan.stages[1]!.dv).toBeCloseTo(plan.dv, 6);
    expect(plan.stages[0]!.fate).toBe('returns');
    expect(plan.stages[1]!.fate).toBe('orbit');
    expect(statsOf(a)!.loaded.thrustToWeight.earth).toBeGreaterThan(1.2);
  });

  it('refuses a stack whose delta-v does not reach orbit and names the shortfall', () => {
    const g = freshGame();
    const site = homeSite();
    stage1('s1r', 1);
    const a = spawn('s1r');
    const plan = planStack(g, site, {
      stages: [a.id],
      payload: { kind: 'none' }
    });
    expect(plan.final).toBe(0);
    addDesign({
      id: 'weak',
      parts: [
        ['kerolox_engine', 9],
        ['propellant_tank', 3]
      ],
      load: [['kerolox', 1e9]]
    });
    const w = spawn('weak');
    const short = planStack(g, site, { stages: [w.id], payload: { kind: 'none' } });
    expect(short.ok).toBe(false);
    expect(short.final).toBe(-1);
    expect(short.reasons.join(' ')).toMatch(/km\/s of delta-v/);
  });
});

describe('a stack of designs tried before anything is built', () => {
  it('gives the verdict and figures planStack gives the same designs on full tanks', () => {
    const g = freshGame();
    const site = homeSite();
    const lower = stage1('s1r', 1);
    const upper = stage2();
    const a = spawn('s1r');
    const b = spawn('s2');
    for (const payload of [0, 10_000, 17_000, 30_000]) {
      const stack = { stages: [a.id, b.id], payload: { kind: 'none' as const } };
      const built = planStack(g, site, stack, { extraMass: payload });
      const tried = planDesignStack(g, [lower, upper], payload);
      expect(reachesOrbit(tried)).toBe(reachesOrbit(built));
      expect(tried.dv).toBeCloseTo(built.dv, 6);
      expect(tried.need).toBeCloseTo(built.need, 6);
      expect(tried.twr).toBeCloseTo(built.twr, 9);
      expect(tried.liftoffMass).toBeCloseTo(built.liftoffMass, 6);
      expect(tried.final).toBe(built.final);
      expect(tried.stages.map((s) => s.fate)).toEqual(built.stages.map((s) => s.fate));
      expect(tried.reasons).toEqual(built.reasons.filter((r) => !/short by/.test(r)));
    }
    expect(designCeiling(g, [lower, upper])).toBeCloseTo(
      payloadCeiling(g, site, { stages: [a.id, b.id], payload: { kind: 'none' } }),
      6
    );
  });

  it('refuses a lone upper stage on thrust to weight, as the launch would', () => {
    const g = freshGame();
    const upper = stage2();
    const plan = planDesignStack(g, [upper], 0);
    expect(plan.ok).toBe(false);
    expect(plan.reasons.join(' ')).toMatch(/thrust to weight/);
    expect(designCeiling(g, [upper])).toBe(0);
  });

  it('counts the same design twice when it is stacked on itself', () => {
    const g = freshGame();
    const upper = stage2();
    const plan = planDesignStack(g, [upper, upper], 0);
    expect(plan.stages).toHaveLength(2);
    expect(new Set(plan.stages.map((s) => s.vessel)).size).toBe(2);
  });
});

describe('a launch', () => {
  it('draws propellant from the stock, returns a reusable stage, loses the rest and ends in orbit', () => {
    const g = freshGame();
    const site = homeSite();
    stage1('s1r', 1);
    stage2();
    const a = spawn('s1r');
    const b = spawn('s2');
    const lox = site.stock.lox ?? 0;
    const rp1 = (site.stock.rp1 = 1e9);
    const burnedBefore = economy.ledger.burned;
    const stack = { stages: [a.id, b.id], payload: { kind: 'none' as const } };
    const plan = launch(g, site, stack);
    expect(plan.ok).toBe(true);
    expect(a.at).toEqual({ kind: 'site', site: 'earth' });
    expect(a.propellant.kerolox ?? 0).toBe(0);
    expect(b.at.kind).toBe('orbit');
    expect(b.propellant.kerolox).toBeGreaterThan(0);
    const drawn = lox - (site.stock.lox ?? 0) + (rp1 - (site.stock.rp1 ?? 0));
    const held = (a.propellant.kerolox ?? 0) + (b.propellant.kerolox ?? 0);
    expect(drawn).toBeCloseTo(held + (economy.ledger.burned - burnedBefore), 3);
    expect(ships.launches).toHaveLength(1);
  });

  it('loses an expended stage and refuses to launch without propellant in stock', () => {
    const g = freshGame();
    const site = homeSite();
    stage1('s1e', 0);
    stage2();
    const a = spawn('s1e');
    const b = spawn('s2');
    const stack = { stages: [a.id, b.id], payload: { kind: 'none' as const } };
    site.stock.rp1 = 0;
    const dry = planStack(g, site, stack);
    expect(dry.ok).toBe(false);
    expect(dry.reasons.join(' ')).toMatch(/Kerosene|RP-1|short/i);
    site.stock.rp1 = 1e9;
    expect(launch(g, site, stack).ok).toBe(true);
    expect(ships.vessels.map((v) => v.id)).toEqual([b.id]);
  });

  it('is limited by the launch rate: a pad is busy for its turnaround', () => {
    const g = freshGame();
    const site = homeSite();
    site.stock.rp1 = 1e9;
    for (const grp of site.groups) if (grp.building === 'launch_site') grp.count = 1;
    stage1('s1r', 1);
    stage2();
    const a = spawn('s1r');
    const b = spawn('s2');
    const c = spawn('s2');
    expect(launch(g, site, { stages: [a.id, b.id], payload: { kind: 'none' } }).ok).toBe(true);
    const second = planStack(g, site, { stages: [a.id, c.id], payload: { kind: 'none' } });
    expect(second.ok).toBe(false);
    expect(second.reasons.join(' ')).toMatch(/pad/);
    g.time += 5 * 86400 * 1000;
    expect(planStack(g, site, { stages: [a.id, c.id], payload: { kind: 'none' } }).ok).toBe(true);
  });
});
