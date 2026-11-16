import { describe, expect, it } from 'vitest';
import { planTrip, shipDeltaV, type FlightSystem, type Place } from '#lib/game/flight/index.ts';
import { solar } from '#lib/game/flight/reference.ts';
import { flightShip } from './flight.ts';
import { designStats } from './stats.ts';
import { build, upperStage } from './fixtures.ts';

describe('flightShip', () => {
  it('hands the flight library the masses and the engine of the main drive', () => {
    const d = build(upperStage);
    const s = designStats(d);
    const ship = flightShip(d)!;
    expect(ship.dryMass).toBeCloseTo(s.dryMass, 6);
    expect(ship.propellant).toBeCloseTo(s.propellantMass, 6);
    expect(ship.payload).toBe(0);
    expect(ship.engine.isp).toBeCloseTo(465.5, 6);
    expect(ship.engine.thrust).toBe(110100);
    expect(shipDeltaV(ship)).toBeCloseTo(s.loaded.deltaV, 3);
  });

  it('takes the propellant and payload a flight loads, within what the ship can hold', () => {
    const d = build([
      ['kerolox_engine', 1],
      ['propellant_tank', 1],
      ['cargo_bay', 1]
    ]);
    expect(flightShip(d, { propellant: 1000, payload: 2500 })).toMatchObject({
      propellant: 1000,
      payload: 2500
    });
    expect(flightShip(d, { propellant: 1e9, payload: 1e9 })).toMatchObject({ payload: 4000 });
    expect(flightShip(d, { propellant: 1e9 })!.propellant).toBeCloseTo(designStats(d).capacity.kerolox!, 6);
    expect(flightShip(d, { propellant: -1, payload: -1 })).toMatchObject({ propellant: 0, payload: 0 });
  });

  it('counts the other propellants a ship carries as dry mass', () => {
    const d = {
      ...build([
        ['hall_thruster', 2],
        ['rcs_thruster', 1],
        ['copv', 1],
        ['propellant_tank', 1],
        ['solar_array', 1]
      ]),
      load: { xenon: 1000, hypergolic: 100 }
    };
    const s = designStats(d);
    const ship = flightShip(d)!;
    expect(s.main?.propellant).toBe('xenon');
    expect(ship.dryMass).toBeCloseTo(s.dryMass + 100, 6);
    expect(ship.propellant).toBeCloseTo(1000, 6);
  });

  it('gives an electric ship the power it has to spend', () => {
    const d = build([
      ['ion_thruster', 2],
      ['copv', 1],
      ['solar_array', 1],
      ['avionics', 1]
    ]);
    const ship = flightShip(d)!;
    expect(ship.powerAvailable).toBeCloseTo(19.5, 6);
    expect(ship.engine.power).toBeCloseTo(13.8, 6);
  });

  it('is undefined with no engine', () => {
    expect(flightShip(build([['propellant_tank', 1]]))).toBeUndefined();
  });

  it('plans a trip with the library from a designed ship', () => {
    const ship = flightShip(build(upperStage))!;
    const from: Place = { kind: 'orbit', body: 'earth' };
    const to: Place = { kind: 'orbit', body: 'moon' };
    const plan = planTrip({ from, to, departAfter: 0, ship, system: solar as FlightSystem });
    expect(plan.options.length).toBeGreaterThan(0);
    const cheapest = plan.options.find((o) => o.profile === 'cheapest')!;
    expect(cheapest.dv).toBeGreaterThan(3000);
    expect(cheapest.dv).toBeLessThan(5500);
    expect(cheapest.canStop).toBe(true);
  });
});
