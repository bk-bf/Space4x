import { describe, expect, it } from 'vitest';
import { DAY, Game } from '#lib/game/index.ts';
import { ageOf, allPosts, postLabel, postOptions, Roster, serviceOf } from './roster.svelte.ts';

const names = (r: Roster, g: Game) => r.visible(g).map((o) => o.name);

describe('Roster', () => {
  it('lists posts from the fleets, ships and colonies of the game state', () => {
    const g = new Game();
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
    expect(postLabel(r.visible(g)[0]!.post, g)).toBe('Freight convoy');
  });

  it('filters by rank and by assigned or unassigned', () => {
    const r = new Roster();
    const g = new Game();
    r.rank = 'captain';
    expect(names(r, g)).toEqual(['M. Chen', 'S. Novak', 'I. Petrov']);
    r.assignment = 'unassigned';
    expect(names(r, g)).toEqual(['I. Petrov']);
    r.rank = 'all';
    expect(names(r, g)).toEqual(['I. Petrov', 'D. Kaur', 'C. Brandt']);
    r.assignment = 'assigned';
    expect(r.visible(g)).toHaveLength(11);
  });

  it('assigns an officer to a post, relieves the previous holder and writes an event', () => {
    const r = new Roster();
    const g = new Game();
    expect(r.assign('o4', 'fleet', 'picket', g)).toBe(true);
    expect(postLabel(r.officer('o4')!.post, g)).toBe('Jupiter picket');
    expect(r.officer('o2')!.post.kind).toBe('none');
    expect(g.events[0]!.text).toContain('I. Petrov was posted to Jupiter picket. M. Chen was relieved.');
  });

  it('refuses a post that is not in the game state and releases an officer on none', () => {
    const r = new Roster();
    const g = new Game();
    expect(r.assign('o4', 'fleet', 'missing', g)).toBe(false);
    expect(r.assign('o9', 'none', '', g)).toBe(true);
    expect(r.officer('o9')!.post.kind).toBe('none');
    expect(g.events[0]!.text).toContain('released from Watchful');
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
});
