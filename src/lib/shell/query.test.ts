import { describe, expect, it } from 'vitest';
import { parseQuery } from './query';

const q = (s: string) => parseQuery(new URLSearchParams(s));

describe('parseQuery', () => {
  it('defaults to the docked map with the survey group selected', () => {
    expect(q('')).toEqual({
      screen: null,
      selection: { kind: 'fleet', id: 'survey' },
      zoom: null,
      arrangement: 'dock',
      dock: null,
      check: false
    });
  });

  it('reads every state the layout test loads', () => {
    expect(q('check&arr=float').arrangement).toBe('float');
    expect(q('sel=body:mars').selection).toEqual({ kind: 'body', id: 'mars' });
    expect(q('sel=contact:C-014').selection).toEqual({ kind: 'contact', id: 'C-014' });
    expect(q('zoom=3').zoom).toBe(3);
    expect(q('dock=events:left').dock).toEqual({ id: 'events', slot: 'left' });
    expect(q('screen=classes&cls=lighthouse').screen).toBe('classes');
    expect(q('check').check).toBe(true);
  });

  it('ignores malformed values', () => {
    expect(q('sel=planet:mars').selection).toEqual({ kind: 'fleet', id: 'survey' });
    expect(q('zoom=abc').zoom).toBeNull();
    expect(q('dock=events:top').dock).toBeNull();
  });
});
