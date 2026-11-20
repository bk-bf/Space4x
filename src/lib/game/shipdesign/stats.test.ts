import { describe, expect, it } from 'vitest';
import { projectById, tagsOf, type Effect } from '#lib/game/data/index.ts';
import { setComponentBoosts } from './boosts.ts';
import { MIN_LIFTOFF_TWR } from '#lib/game/flight/index.ts';
import { designStats } from './stats.ts';
import { crewedVehicle, build, upperStage } from './fixtures.ts';
import { setLoad } from './edit.ts';
import type { IssueCode, ShipDesign } from './types.ts';

const nothing = () => false;
const start = (tag: number) => tag === 0;
const upTo = (id: string) => {
  const open = tagsOf(projectById(id).number);
  return (tag: number) => open.has(tag);
};

const codes = (
  d: ShipDesign,
  unlocked?: (tag: number) => boolean,
  level?: 'error' | 'warning'
): IssueCode[] =>
  designStats(d, unlocked)
    .issues.filter((i) => !level || i.level === level)
    .map((i) => i.code);

describe('a design modelled on a real second stage', () => {
  const REAL_DRY = 3490;
  const REAL_GROSS = 30710;
  const REAL_ISP = 462;
  const realDv = REAL_ISP * 9.80665 * Math.log(REAL_GROSS / REAL_DRY);
  const stage = designStats(build(upperStage));

  it('weighs what the Delta IV 5 m second stage weighs, within 5 percent', () => {
    expect(stage.dryMass / REAL_DRY).toBeGreaterThan(0.95);
    expect(stage.dryMass / REAL_DRY).toBeLessThan(1.05);
    expect((stage.dryMass + stage.propellantMass) / REAL_GROSS).toBeGreaterThan(0.95);
    expect((stage.dryMass + stage.propellantMass) / REAL_GROSS).toBeLessThan(1.05);
  });

  it('comes out near the real stage delta-v of 9.85 km/s, within 5 percent', () => {
    expect(realDv).toBeCloseTo(9850, -2);
    expect(stage.empty.deltaV / realDv).toBeGreaterThan(0.95);
    expect(stage.empty.deltaV / realDv).toBeLessThan(1.05);
  });

  it('cannot leave Earth on its own, and can from the Moon', () => {
    expect(stage.loaded.thrustToWeight.earth).toBeLessThan(0.5);
    expect(stage.loaded.liftoff.earth).toBe(false);
    expect(stage.loaded.liftoff.moon).toBe(true);
  });
});

describe('the figures a design reports', () => {
  it('splits mass into dry, propellant and payload and sums the bill', () => {
    const s = designStats(
      build([
        ['kerolox_engine', 1],
        ['propellant_tank', 2],
        ['cargo_bay', 1]
      ])
    );
    expect(s.dryMass).toBeCloseTo(470 + 1000 + 700, 6);
    expect(s.payloadCapacity).toBe(4000);
    expect(s.propellant.kerolox).toBeCloseTo(40 * 1017 * 0.98, 3);
    expect(s.loaded.mass).toBeCloseTo(s.dryMass + s.propellantMass + 4000, 6);
    expect(s.empty.mass).toBeCloseTo(s.dryMass + s.propellantMass, 6);
    expect(s.loaded.deltaV).toBeLessThan(s.empty.deltaV);
    expect(s.cost.al_li_alloy).toBeCloseTo(2 * 600 + 800, 6);
    expect(s.lines.map((l) => l.count)).toEqual([1, 2, 1]);
  });

  it('costs the propellant in the materials that make it', () => {
    const s = designStats(
      build([
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 1]
      ])
    );
    const total = Object.values(s.propellantCost).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(s.propellantMass, 6);
    expect(s.propellantCost.lch4! / s.propellantCost.lox!).toBeCloseTo(1 / 3.6, 6);
  });

  it('holds less hydrogen than kerosene in the same tank', () => {
    const base = [['propellant_tank', 2]] as const;
    const k = designStats(build([['kerolox_engine', 1], ...base]));
    const h = designStats(build([['chemical_engine_hydrolox', 1], ...base]));
    expect(h.propellantMass).toBeLessThan(k.propellantMass / 2.5);
  });

  it('shares one tank between propellants rather than counting it twice', () => {
    let d = build([
      ['kerolox_engine', 1],
      ['rcs_thruster', 1],
      ['propellant_tank', 1]
    ]);
    const room = designStats(d).capacity.kerolox!;
    d = setLoad(d, 'kerolox', room);
    d = { ...d, load: { ...d.load, hypergolic: 5000 } };
    const s = designStats(d);
    expect(s.propellant.kerolox).toBeCloseTo(room, 3);
    expect(s.propellant.hypergolic ?? 0).toBeLessThan(5);
  });

  it('reports acceleration in space from the main drive', () => {
    const s = designStats(
      build([
        ['kerolox_engine', 2],
        ['propellant_tank', 1]
      ])
    );
    expect(s.loaded.acceleration).toBeCloseTo((2 * 981000) / s.loaded.mass, 6);
    expect(s.main?.propellant).toBe('kerolox');
  });

  it('picks the drive with the most delta-v as the main one', () => {
    const s = designStats({
      ...build([
        ['hall_thruster', 4],
        ['rcs_thruster', 2],
        ['propellant_tank', 1],
        ['copv', 1],
        ['solar_array', 4]
      ]),
      load: { hypergolic: 50, xenon: 2000 }
    });
    expect(s.drives.map((d) => d.propellant).sort()).toEqual(['hypergolic', 'xenon']);
    expect(s.main?.propellant).toBe('xenon');
  });

  it('names the yards that can build every component', () => {
    expect(designStats(build([['kerolox_engine', 1]])).builtAt).toEqual([
      'rocket_factory',
      'orbital_shipyard'
    ]);
    expect(designStats(build([['fusion_drive', 1]])).builtAt).toEqual(['orbital_shipyard']);
    expect(designStats(build([['fusion_drive', 1]])).builtAt).not.toContain('rocket_factory');
  });
});

describe('crew, power and heat', () => {
  const crewed = designStats(build(crewedVehicle, { role: 'capsule' }));

  it('counts crew, berths and the days the stores last', () => {
    expect(crewed.crew).toBe(2);
    expect(crewed.berths).toBe(4);
    expect(crewed.stores).toBe(200);
    expect(crewed.endurance).toBeCloseTo(200 / 2, 6);
  });

  it('makes the stores last longer with life support and a habitat', () => {
    const long = designStats(build([...crewedVehicle, ['habitat_module', 1]], { role: 'capsule' }));
    expect(long.endurance!).toBeGreaterThan(crewed.endurance!);
    expect(long.endurance).toBeCloseTo((200 + 600) / (2 * 1), 6);
  });

  it('balances power and heat from what the parts make and use', () => {
    expect(crewed.power.made).toBe(20);
    expect(crewed.power.used).toBeCloseTo(3 + 3, 6);
    expect(crewed.power.balance).toBeCloseTo(14, 6);
    expect(crewed.heat.produced).toBeCloseTo(6, 6);
    expect(crewed.heat.radiated).toBeGreaterThan(50);
    expect(crewed.heat.balance).toBeGreaterThan(0);
  });

  it('throttles an electric drive to the power left over', () => {
    const s = designStats(
      build([
        ['ion_thruster', 3],
        ['copv', 1],
        ['solar_array', 1]
      ])
    );
    expect(s.power.engines).toBeCloseTo(3 * 6.9, 6);
    expect(s.main!.throttle).toBeCloseTo(20 / 20.7, 6);
    expect(
      codes(
        build([
          ['ion_thruster', 6],
          ['copv', 1],
          ['solar_array', 1]
        ])
      )
    ).toContain('engine-throttled');
  });
});

describe('design errors', () => {
  const stage = [
    ['kerolox_engine', 1],
    ['propellant_tank', 2]
  ] as const;
  const errors = (d: ShipDesign, unlocked?: (tag: number) => boolean) => codes(d, unlocked, 'error');
  const warnings = (d: ShipDesign) => codes(d, undefined, 'warning');

  it('asks for components when there are none', () => {
    expect(errors(build([]))).toEqual(['no-parts']);
  });

  it('rejects a class that uses a locked component', () => {
    expect(errors(build(stage), nothing)).toContain('locked-part');
    expect(errors(build(stage), start)).not.toContain('locked-part');
  });

  it('rejects a ship with no engine', () => {
    expect(errors(build([['propellant_tank', 1]]))).toContain('no-engine');
  });

  it('rejects an engine whose propellant no tank holds', () => {
    expect(
      errors(
        build([
          ['hall_thruster', 1],
          ['propellant_tank', 1]
        ])
      )
    ).toContain('no-tank');
    expect(errors(build([['kerolox_engine', 1]]))).toContain('no-tank');
  });

  it('rejects empty tanks', () => {
    const d = build(stage);
    expect(errors(d)).not.toContain('no-load');
    expect(errors({ ...d, load: { kerolox: 0 } })).toContain('no-load');
  });

  it('warns when the load asked for does not fit', () => {
    expect(warnings({ ...build(stage), load: { kerolox: 1e9 } })).toContain('overfull');
  });

  it('rejects crew with no berth or no stores, and lets avionics run machinery without crew', () => {
    const base = [
      ['kerolox_engine', 1],
      ['propellant_tank', 1],
      ['fission_reactor_ship', 1],
      ['radiator', 1]
    ] as const;
    const crewed = build(base);
    expect(designStats(crewed).crew).toBe(1);
    expect(errors(crewed)).toEqual(expect.arrayContaining(['crew-berths', 'crew-supplies']));
    const automated = build([...base, ['avionics', 1]]);
    expect(designStats(automated).crew).toBe(0);
    expect(errors(automated)).not.toContain('crew-berths');
    const housed = build([...base, ['crew_capsule', 1]]);
    expect(errors(housed)).not.toContain('crew-berths');
    expect(errors(housed)).not.toContain('crew-supplies');
  });

  it('rejects a power deficit unless a battery carries it', () => {
    const base = [
      ['kerolox_engine', 1],
      ['propellant_tank', 1],
      ['avionics', 1]
    ] as const;
    expect(errors(build(base))).toContain('power-deficit');
    const d = build([...base, ['battery_pack', 1]]);
    expect(errors(d)).not.toContain('power-deficit');
    expect(warnings(d)).toContain('power-deficit');
  });

  it('lets a capsule fly on fuel cells before any solar array or battery exists, for a limited time', () => {
    const d = build([
      ['crew_capsule', 1],
      ['fuel_cell', 1],
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 1],
      ['structure_truss', 1]
    ]);
    const habitat = upTo('orbital_habitat_module');
    expect(codes(d, habitat, 'error')).toEqual([]);
    expect(codes(d, habitat, 'warning')).toContain('power-deficit');
    expect(codes(d, habitat)).not.toContain('locked-part');
    const without = build([
      ['crew_capsule', 1],
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 1],
      ['structure_truss', 1]
    ]);
    expect(codes(without, upTo('orbital_habitat_module'), 'error')).toContain('power-deficit');
  });

  it('warns when a solar ship has no battery for the eclipse', () => {
    const d = build([
      ['hall_thruster', 1],
      ['copv', 1],
      ['solar_array', 1],
      ['life_support_unit', 1]
    ]);
    expect(warnings(d)).toContain('eclipse');
    expect(
      warnings(
        build([
          ...([
            ['hall_thruster', 1],
            ['copv', 1],
            ['solar_array', 1],
            ['life_support_unit', 1]
          ] as const),
          ['battery_pack', 1]
        ])
      )
    ).not.toContain('eclipse');
  });

  it('rejects more waste heat than the ship can shed', () => {
    const hot = build([
      ['fusion_drive', 1],
      ['propellant_tank', 1]
    ]);
    expect(errors(hot)).toContain('heat-deficit');
    const cooled = build([
      ['fusion_drive', 1],
      ['propellant_tank', 1],
      ['radiator', 40]
    ]);
    expect(errors(cooled)).not.toContain('heat-deficit');
  });

  it('rejects a yard that cannot build the components', () => {
    expect(
      errors(
        build(
          [
            ['fusion_drive', 1],
            ['propellant_tank', 1],
            ['radiator', 40]
          ],
          { yard: 'rocket_factory' }
        )
      )
    ).toContain('no-yard');
  });

  it('warns, without blocking the design, when thrust cannot leave the body the yard stands on alone', () => {
    const slow = build(upperStage, { yard: 'rocket_factory' });
    expect(warnings(slow)).toContain('no-liftoff');
    expect(errors(slow)).not.toContain('no-liftoff');
    expect(warnings(build(upperStage, { yard: 'orbital_shipyard' }))).not.toContain('no-liftoff');
    const strong = build(
      [
        ['chemical_engine_methalox', 3],
        ['propellant_tank', 3]
      ],
      { role: 'launcher', yard: 'rocket_factory' }
    );
    const s = designStats(strong);
    expect(s.loaded.thrustToWeight.earth).toBeGreaterThan(MIN_LIFTOFF_TWR);
    expect(warnings(strong)).not.toContain('no-liftoff');
  });

  it('warns when a launch vehicle cannot reach orbit', () => {
    const d = build(
      [
        ['chemical_engine_methalox', 3],
        ['propellant_tank', 1]
      ],
      { role: 'launcher', yard: 'rocket_factory' }
    );
    expect(warnings(d)).toContain('short-of-orbit');
  });

  it('asks a lander for legs rated for its weight', () => {
    const base = [
      ['chemical_engine_hydrolox', 1],
      ['propellant_tank', 2]
    ] as const;
    expect(errors(build(base, { role: 'lander' }))).toContain('no-landing');
    expect(errors(build([...base, ['landing_legs', 1]], { role: 'lander' }))).not.toContain('no-landing');
    const heavy = build([...base, ['landing_legs', 1], ['cargo_bay', 6], ['habitat_module', 6]], {
      role: 'lander'
    });
    expect(errors(heavy)).toContain('landing-overload');
  });

  it('warns when a lander cannot hover on the Moon', () => {
    const d = build(
      [
        ['rcs_thruster', 1],
        ['propellant_tank', 1],
        ['landing_legs', 1]
      ],
      { role: 'lander' }
    );
    expect(warnings(d)).toContain('lander-thrust');
    const strong = build(
      [
        ['chemical_engine_hydrolox', 1],
        ['propellant_tank', 1],
        ['landing_legs', 1]
      ],
      { role: 'lander' }
    );
    expect(warnings(strong)).not.toContain('lander-thrust');
  });

  it('asks a returning capsule for a heat shield that can bring its mass home', () => {
    const base = [
      ['crew_capsule', 1],
      ['chemical_engine_hydrolox', 1],
      ['propellant_tank', 1]
    ] as const;
    expect(errors(build(base, { role: 'capsule' }))).toContain('no-reentry');
    expect(errors(build([...base, ['heat_shield', 1]], { role: 'capsule' }))).not.toContain('no-reentry');
    expect(
      errors(build([...base, ['heat_shield', 1], ['habitat_module', 3]], { role: 'capsule' }))
    ).toContain('reentry-overload');
  });

  it('asks a freighter for a cargo bay', () => {
    expect(errors(build(stage, { role: 'freighter' }))).toContain('no-cargo');
    expect(errors(build([...stage, ['cargo_bay', 1]], { role: 'freighter' }))).not.toContain('no-cargo');
  });

  it('warns of boil-off for cryogenic propellant that is not insulated, except on a launcher', () => {
    const d = build(stage);
    expect(warnings(d)).toContain('boil-off');
    expect(warnings(build([...stage, ['mli_blanket', 1]]))).not.toContain('boil-off');
    expect(warnings(build(stage, { role: 'launcher' }))).not.toContain('boil-off');
  });

  it('warns of a reactor beside the crew with no shield', () => {
    const d = build([
      ['kerolox_engine', 1],
      ['propellant_tank', 1],
      ['fission_reactor_ship', 1],
      ['crew_capsule', 1],
      ['radiator', 1]
    ]);
    expect(warnings(d)).toContain('reactor-radiation');
    expect(
      warnings(
        build([
          ...([
            ['kerolox_engine', 1],
            ['propellant_tank', 1],
            ['fission_reactor_ship', 1],
            ['crew_capsule', 1],
            ['radiator', 1]
          ] as const),
          ['radiation_shield', 1]
        ])
      )
    ).not.toContain('reactor-radiation');
  });

  it('puts errors before warnings', () => {
    const levels = designStats(build([['kerolox_engine', 1]])).issues.map((i) => i.level);
    expect(levels).toEqual([...levels].sort((a) => (a === 'error' ? -1 : 1)));
  });

  it('is clean when nothing is wrong', () => {
    const d = build(crewedVehicle, { role: 'capsule' });
    expect(errors(d)).toEqual([]);
  });
});

describe('ship boost lines', () => {
  it('raise booster thrust and load, solar output and battery storage by the source given', () => {
    const d = build([
      ['booster', 33],
      ['solar_array', 2],
      ['battery_pack', 1],
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 1]
    ]);
    const base = designStats(d);
    const factors: Partial<Record<Effect, number>> = {
      booster_thrust: 1.3,
      booster_load: 1.07,
      solar_array_output: 1.5,
      battery_storage: 1.67
    };
    setComponentBoosts((e) => factors[e] ?? 1);
    try {
      const up = designStats(d);
      expect(up.boosters!.thrust / base.boosters!.thrust).toBeCloseTo(1.3, 9);
      expect(up.boosters!.load / base.boosters!.load).toBeCloseTo(1.07, 9);
      expect(up.boosters!.mass).toBe(base.boosters!.mass);
      expect(up.power.made / base.power.made).toBeCloseTo(1.5, 9);
      expect(up.power.storage / base.power.storage).toBeCloseTo(1.67, 9);
      expect(up.dryMass).toBe(base.dryMass);
    } finally {
      setComponentBoosts(() => 1);
    }
  });
});
