import { describe, expect, it } from 'vitest';
import {
  addRobotPart,
  chassisFor,
  copyRobot,
  digRate,
  lockRobot,
  newRobot,
  removeRobotPart,
  robotStats,
  runsOnboard,
  setRobotCount,
  type RobotDesign
} from './index.ts';

const build = (parts: [string, number][], id = 'r1'): RobotDesign =>
  parts.reduce((d, [p, n]) => setRobotCount(d, p, n), newRobot(id));

const ipex = () =>
  build([
    ['drum_excavator', 1],
    ['wheeled_chassis', 1],
    ['battery_dock', 1]
  ]);

describe('robot stats', () => {
  it('make a robot of the IPEx class from drums, wheels and a battery that docks', () => {
    const s = robotStats(ipex());
    expect(s.mass).toBeCloseTo(29.2, 6);
    expect(s.errors).toBe(0);
    expect(s.issues.map((i) => i.code)).toEqual(['no-computer']);
    expect(s.rates.loose).toBe(42);
    expect(s.power.dock).toBe(true);
    expect(s.wear).toBeCloseTo(2.92, 6);
    expect(runsOnboard(s)).toBe(false);
  });

  it('dig ice with the drill at its rate times the water its oven bakes out', () => {
    const s = robotStats(
      build([
        ['drill_oven', 1],
        ['regolith_scoop', 1],
        ['anchored_chassis', 1],
        ['radioisotope_generator', 3],
        ['robot_computer', 1]
      ])
    );
    expect(s.errors).toBe(0);
    expect(digRate(s, 'water')).toBeCloseTo(4, 9);
    expect(digRate(s, 'comet_ice')).toBeCloseTo(19, 9);
    expect(digRate(s, 'carbonaceous_chondrite')).toBe(5);
    expect(digRate(s, 'hydrogen')).toBe(0);
    expect(runsOnboard(s)).toBe(true);
  });

  it('leave the drum excavator idle in microgravity', () => {
    const s = robotStats(
      build([
        ['drum_excavator', 1],
        ['anchored_chassis', 1],
        ['battery_dock', 1]
      ])
    );
    expect(s.rates.loose).toBe(0);
    expect(s.issues.map((i) => i.code)).toContain('idle-tool');
  });

  it('refuse a robot without a chassis, a tool, power or enough of it', () => {
    expect(robotStats(newRobot('x')).issues.map((i) => i.code)).toEqual(['no-parts']);
    const codes = (parts: [string, number][]) => robotStats(build(parts)).issues.map((i) => i.code);
    expect(codes([['drill_oven', 1]])).toEqual(expect.arrayContaining(['no-chassis', 'no-power']));
    expect(
      codes([
        ['wheeled_chassis', 1],
        ['battery_dock', 1]
      ])
    ).toContain('no-tool');
    expect(
      codes([
        ['wheeled_chassis', 1],
        ['anchored_chassis', 1],
        ['drill_oven', 1],
        ['battery_dock', 1]
      ])
    ).toContain('two-chassis');
    expect(
      codes([
        ['drill_oven', 1],
        ['wheeled_chassis', 1],
        ['radioisotope_generator', 1],
        ['robot_computer', 1]
      ])
    ).toContain('power-deficit');
  });

  it('name the project a part waits for', () => {
    const s = robotStats(ipex(), (tag) => tag !== 20);
    expect(s.issues.find((i) => i.code === 'locked-part')?.text).toBe(
      'Battery and docking port needs Space batteries.'
    );
  });
});

describe('robot designs', () => {
  it('edit only while unlocked, and copy unlocked', () => {
    const d = lockRobot(ipex());
    expect(d.locked).toBe(true);
    expect(addRobotPart(d, 'drill_oven')).toBe(d);
    expect(removeRobotPart(d, 'drum_excavator')).toBe(d);
    const c = copyRobot(d, 'r2');
    expect([c.locked, c.name]).toEqual([false, 'New robot copy']);
    expect(lockRobot(newRobot('x')).locked).toBe(false);
  });
});

describe('chassis by gravity', () => {
  it('wheels for the Moon and Mars, anchors for asteroids, comets and Ceres', () => {
    expect(chassisFor('luna')).toBe('wheeled');
    expect(chassisFor('mars')).toBe('wheeled');
    expect(chassisFor('mercury')).toBe('wheeled');
    expect(chassisFor('bennu')).toBe('anchored');
    expect(chassisFor('ceres')).toBe('anchored');
    expect(chassisFor('halley')).toBe('anchored');
  });
});
