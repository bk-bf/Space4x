import { describe, expect, it } from 'vitest';
import { DAY, Game } from '#lib/game/index.ts';
import { withFixture } from '#lib/game/mock/fixture/index.ts';
import { portraitBust, portraitHead, traitsOf } from '#lib/gfx/portraits/index.ts';
import {
  ageOf,
  allPosts,
  bestSkill,
  portraitSpec,
  postLabel,
  postOptions,
  Roster,
  serviceOf
} from './roster.svelte.ts';

const names = (r: Roster, g: Game) => r.visible(g).map((o) => o.name);

describe('Roster', () => {
  it('offers only the governor of Earth and the staff posts at the start', () => {
    const g = new Game();
    expect(postOptions('fleet', g)).toEqual([]);
    expect(postOptions('ship', g)).toEqual([]);
    expect(postOptions('governor', g).map((p) => p.label)).toEqual(['Governor, Earth']);
  });

  it('lists posts from the fleets, ships and colonies of the game state', () => {
    const g = withFixture(new Game());
    const fleets = g.world.fleets.map((f) => f.name);
    const ships = g.world.fleets.reduce((n, f) => n + f.ships.length, 0);
    expect(fleets).toEqual(expect.arrayContaining(['Survey group 1', 'Freight convoy', 'Jupiter picket']));
    expect(postOptions('fleet', g).map((p) => p.label)).toEqual(fleets);
    expect(postOptions('ship', g)).toHaveLength(ships);
    const colonies = g.world.bodies.filter((b) => b.colony).map((b) => `Governor, ${b.name}`);
    expect(colonies).toHaveLength(6);
    expect(postOptions('governor', g).map((p) => p.label)).toEqual(colonies);
    const before = allPosts(g).length;
    const dropped = g.world.fleets.pop()!;
    expect(postOptions('fleet', g)).toHaveLength(fleets.length - 1);
    expect(allPosts(g).length).toBe(before - 1 - dropped.ships.length);
  });

  it('ages and counts service with the game clock', () => {
    const r = new Roster();
    const g = new Game();
    const o = r.officer('o0')!;
    expect(ageOf(o, g.time)).toBe(63);
    const service = serviceOf(o, g.time);
    g.advance(366 * DAY);
    expect(ageOf(o, g.time)).toBe(64);
    expect(serviceOf(o, g.time)).toBe(service + 1);
  });

  it('sorts by each column in either direction', () => {
    const r = new Roster();
    const g = new Game();
    expect(names(r, g)[0]).toBe('R. Vasquez');
    r.descending = false;
    expect(names(r, g).slice(0, 2)).toEqual(['C. Brandt', 'H. Yilmaz']);
    r.sort = 'name';
    expect(names(r, g)[0]).toBe('C. Brandt');
    r.descending = true;
    expect(names(r, g)[0]).toBe('H. Yilmaz');
    r.sort = 'age';
    expect(names(r, g)[0]).toBe('R. Vasquez');
    r.descending = false;
    expect(names(r, g)[0]).toBe('C. Brandt');
    r.sort = 'post';
    expect(postLabel(r.visible(g)[0]!.post, g)).toBe('Governor, Earth');
  });

  it('filters by rank and by assigned or unassigned', () => {
    const r = new Roster();
    const g = new Game();
    r.rank = 'captain';
    expect(names(r, g)).toEqual(['M. Chen', 'S. Novak', 'I. Petrov']);
    r.assignment = 'unassigned';
    expect(names(r, g)).toEqual(['M. Chen', 'I. Petrov']);
    r.rank = 'all';
    expect(names(r, g)).toEqual([
      'M. Chen',
      'I. Petrov',
      'L. Haddad',
      'P. Silva',
      'D. Kaur',
      'E. Larsen',
      'C. Brandt',
      'H. Yilmaz'
    ]);
    r.assignment = 'assigned';
    expect(r.visible(g)).toHaveLength(6);
  });

  it('assigns an officer to a post, relieves the previous holder and writes an event', () => {
    const r = new Roster();
    const g = new Game();
    expect(r.assign('o4', 'staff', 'survey-office', g)).toBe(true);
    expect(postLabel(r.officer('o4')!.post, g)).toBe('Survey office');
    expect(r.officer('o3')!.post.kind).toBe('none');
    expect(g.events[0]!.text).toContain('I. Petrov was posted to Survey office. S. Novak was relieved.');
  });

  it('refuses a post that is not in the game state and releases an officer on none', () => {
    const r = new Roster();
    const g = new Game();
    expect(r.assign('o4', 'fleet', 'missing', g)).toBe(false);
    expect(r.assign('o7', 'none', '', g)).toBe(true);
    expect(r.officer('o7')!.post.kind).toBe('none');
    expect(g.events[0]!.text).toContain('released from Launch office');
  });

  it('promotes one rank at a time and stops at the top', () => {
    const r = new Roster();
    const g = new Game();
    expect(r.promote('o3', g)).toBe(true);
    expect(r.officer('o3')!.rank).toBe('vice-admiral');
    expect(r.promote('o3', g)).toBe(true);
    expect(r.promote('o3', g)).toBe(false);
    expect(r.officer('o3')!.rank).toBe('admiral');
    expect(g.events[0]!.text).toBe('S. Novak was promoted to Admiral.');
  });

  it('gives every officer a gender and a seed, and a woman and a man in the roster', () => {
    const r = new Roster();
    expect(new Set(r.officers.map((o) => o.gender))).toEqual(new Set(['m', 'f']));
    expect(new Set(r.officers.map((o) => o.seed)).size).toBe(r.officers.length);
  });

  it('draws the same face for the same officer and ages and greys it with the clock', () => {
    const r = new Roster();
    const g = new Game();
    const o = r.officer('o0')!;
    const first = portraitSpec(o, g.time);
    expect(first).toEqual({
      seed: 3,
      age: 63,
      rank: 5,
      branch: 'staff',
      gender: 'f',
      rolledAt: { age: 63, rank: 2 }
    });
    expect(portraitHead(portraitSpec(o, g.time))).toBe(portraitHead(first));
    g.advance(366 * DAY);
    const later = portraitSpec(o, g.time);
    expect(later.age).toBe(64);
    expect(later.seed).toBe(first.seed);
    expect(portraitBust(later)).not.toBe(portraitBust(first));
  });

  it('keeps every officer face as they age and rise through the ranks', () => {
    const r = new Roster();
    const g = new Game();
    const FACE = [
      'skin',
      'eye',
      'bg',
      'jaw',
      'eyes',
      'brow',
      'nose',
      'mouth',
      'lip',
      'beard',
      'gear'
    ] as const;
    const MORE = ['style', 'gaunt', 'jag', 'earring', 'shadow'] as const;
    for (const o of r.officers) {
      const start = traitsOf(portraitSpec(o, g.time));
      for (const years of [1, 5, 10, 20]) {
        const spec = portraitSpec(o, g.time + years * 365.25 * DAY * 1000);
        for (const rank of [0, 3, 5]) {
          const t = traitsOf({ ...spec, rank });
          for (const k of [...FACE, ...MORE]) expect(t[k], `${o.name} ${k} +${years}y`).toEqual(start[k]);
        }
      }
    }
  });

  it('dresses a governor in the governor uniform and everyone else as staff', () => {
    const r = new Roster();
    const g = new Game();
    expect(portraitSpec(r.officer('o6')!, g.time).branch).toBe('governor');
    expect(portraitSpec(r.officer('o0')!, g.time).branch).toBe('staff');
    expect(portraitSpec(r.officer('o2')!, g.time).branch).toBe('staff');
  });

  it('finds the best skill of an officer', () => {
    const r = new Roster();
    for (const o of r.officers) expect(o.skills[bestSkill(o)]).toBe(Math.max(...o.skills));
  });

  it('groups officers as the filter chips do', () => {
    const r = new Roster();
    const g = new Game();
    r.setGroup('governor');
    expect(names(r, g)).toEqual(['T. Nakamura']);
    expect(r.group).toBe('governor');
    r.setGroup('staff');
    expect(names(r, g)).toHaveLength(5);
    r.setGroup('none');
    expect(names(r, g)).toHaveLength(8);
    expect(r.group).toBe('none');
    r.setGroup('assigned');
    expect(names(r, g)).toHaveLength(6);
    expect(r.group).toBe('assigned');
    r.setGroup('all');
    expect(names(r, g)).toHaveLength(14);
    expect(r.group).toBe('all');
  });
});
