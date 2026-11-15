import { describe, expect, it } from 'vitest';
import type { Surface } from '#lib/gfx/framebuffer.ts';
import { drawShip } from '#lib/gfx/ships/draw.ts';
import { SPECS, type ShipSpec } from '#lib/gfx/ships/specs.ts';
import {
  HULLS,
  MAX_CARGO_LAYERS,
  MAX_ENGINES,
  MAX_SECTIONS,
  addSection,
  asClass,
  attachmentAt,
  clearAft,
  clearBow,
  clearStern,
  designStats,
  insertIndex,
  layout,
  moveSection,
  removeSection,
  setAft,
  setAttachment,
  setBow,
  setCargoLayers,
  setEngines,
  setStern,
  weaponSummary,
  type ShipClass
} from './design.ts';
import { GALLERY_PAGE, Designer } from './designer.svelte.ts';

const blank: Surface = { w: 0, h: 0, px() {}, rect() {} };

const probe = (parts: ShipSpec['parts'], extra: Partial<ShipSpec> = {}): ShipClass =>
  asClass({ id: 'probe', name: 'Probe', role: 'Test', parts, ...extra });

describe('layout', () => {
  it('matches the widths, offsets and half heights the drawing code places', () => {
    for (const sp of SPECS) {
      const drawn = drawShip(blank, 0, 0, sp, 0);
      const laid = layout(sp);
      expect(
        laid.map((p) => [p.x, p.w, p.hh]),
        sp.id
      ).toEqual(drawn.map((p) => [p.x, p.w, p.hh]));
      expect(
        laid.map((p) => p.name),
        sp.id
      ).toEqual(drawn.map((p) => p.name));
    }
  });

  it('matches the drawing for every engine count and every section kind', () => {
    for (let n = 1; n <= MAX_ENGINES; n++) {
      const sp = probe([['hull'], ['ring'], ['tank'], ['hangar'], ['truss']], {
        stern: ['engines', n],
        bow: 'gun'
      });
      expect(layout(sp).map((p) => [p.x, p.w, p.hh])).toEqual(
        drawShip(blank, 0, 0, sp, 0).map((p) => [p.x, p.w, p.hh])
      );
    }
  });

  it('finds the section gap a drop at an x position lands in', () => {
    const sp = probe([['hull'], ['hull'], ['hull']], { stern: ['engines', 2], bow: 'bridge' });
    const parts = layout(sp);
    const sections = parts.filter((p) => p.target.kind === 'section');
    expect(insertIndex(parts, 0)).toBe(0);
    expect(insertIndex(parts, sections[0]!.x + sections[0]!.w / 2 + 1)).toBe(1);
    expect(insertIndex(parts, sections[2]!.x + sections[2]!.w)).toBe(3);
    expect(insertIndex(parts, 1000)).toBe(3);
  });
});

describe('designStats', () => {
  it('adds mass, crew, length, sections and hardpoints from the parts', () => {
    const sp = probe([['reactor', 'turret'], ['crew']], { stern: ['engines', 1], bow: 'blunt' });
    const s = designStats(sp);
    expect(s.mass).toBe(150 + 40 + 180 + 40 + 150);
    expect(s.crew).toBe(2 + 4 + 10 + 6 + 40);
    expect(s.length).toBe((8 + 6 + 8 + 5) * 4);
    expect(s.sections).toBe(4);
    expect(s.hardpoints).toBe(1);
    expect(s.weapons.turrets).toBe(1);
  });

  it('derives speed from the drive and the mass', () => {
    const one = designStats(probe([['reactor'], ['crew']], { stern: ['engines', 1], bow: 'blunt' }));
    const two = designStats(probe([['reactor'], ['crew']], { stern: ['engines', 2], bow: 'blunt' }));
    expect(one.thrust).toBe(830);
    expect(one.speed).toBe(Math.round((830 * 1000) / one.mass));
    expect(two.thrust).toBe(1660);
    expect(two.speed).toBeGreaterThan(one.speed);
    const big = designStats(probe([['reactor']], { stern: ['big'], bow: 'blunt' }));
    expect(big.thrust).toBe(2600);
    expect(big.mass).toBe(420 + 40 + 180);
    expect(big.speed).toBe(Math.round(2600000 / 640));
  });

  it('has no speed without a drive', () => {
    expect(designStats(probe([['reactor']], { bow: 'dock' })).speed).toBe(0);
    expect(designStats(probe([]))).toMatchObject({ mass: 0, speed: 0, sections: 0, length: 0 });
  });

  it('sums fuel, armour and cargo from the parts', () => {
    const s = designStats(
      probe([['fuel'], ['tank'], ['armor'], ['truss', 'cargo3', 'cargo1']], { bow: 'prow', stern: ['big'] })
    );
    expect(s.fuel).toBe(600 + 1400);
    expect(s.armour).toBe(40 + 20);
    expect(s.cargo).toBe(4 * 800);
    expect(s.hardpoints).toBe(2);
    expect(s.mass).toBe(420 + 300 + 140 + 160 + 380 + 50 + 70 * 3 + 70);
  });

  it('counts weapons by kind', () => {
    const s = designStats(
      probe(
        [
          ['armor', 'turret', 'turret'],
          ['hangar', 'launcher', 'pod'],
          ['hull', 'dish']
        ],
        { bow: 'gun' }
      )
    );
    expect(s.weapons).toEqual({ turrets: 2, launchers: 1, pods: 1, spinal: 1, hangars: 1 });
    expect(weaponSummary(s.weapons)).toBe('2 turrets, 1 launcher, 1 pod, 1 spinal gun, 1 hangar');
    expect(weaponSummary(designStats(probe([['hull']])).weapons)).toBe('None');
  });

  it('gives every shipped class a drive-or-not that matches its shape', () => {
    for (const sp of SPECS) {
      const s = designStats(sp);
      expect(s.mass, sp.id).toBeGreaterThan(0);
      expect(s.speed > 0, sp.id).toBe(!!sp.stern);
    }
  });
});

describe('editing a design', () => {
  const base = probe([['reactor'], ['crew'], ['hull']], { stern: ['engines', 2], bow: 'bridge' });

  it('inserts sections at an index and caps their number', () => {
    expect(addSection(base, 'armor', 1).parts.map((s) => s[0])).toEqual(['reactor', 'armor', 'crew', 'hull']);
    expect(addSection(base, 'armor').parts.map((s) => s[0])).toEqual(['reactor', 'crew', 'hull', 'armor']);
    expect(addSection(base, 'armor', -4).parts[0]![0]).toBe('armor');
    let full = base;
    for (let i = 0; i < MAX_SECTIONS + 4; i++) full = addSection(full, 'hull');
    expect(full.parts).toHaveLength(MAX_SECTIONS);
  });

  it('removes a section and ignores an index that is not there', () => {
    expect(removeSection(base, 1).parts.map((s) => s[0])).toEqual(['reactor', 'hull']);
    expect(removeSection(base, 7)).toBe(base);
  });

  it('moves a section to its new index', () => {
    expect(moveSection(base, 0, 2).parts.map((s) => s[0])).toEqual(['crew', 'hull', 'reactor']);
    expect(moveSection(base, 2, 0).parts.map((s) => s[0])).toEqual(['hull', 'reactor', 'crew']);
    expect(moveSection(base, 1, 1)).toBe(base);
    expect(moveSection(base, 0, 3)).toBe(base);
  });

  it('keeps a section moving with its hardpoints', () => {
    const sp = setAttachment(setAttachment(base, 0, 'top', 'dish'), 0, 'bottom', 'fin');
    const moved = moveSection(sp, 0, 2);
    expect(moved.parts[2]).toEqual(['reactor', 'dish', 'fin']);
  });

  it('sets and clears a hardpoint in either slot', () => {
    const top = setAttachment(base, 1, 'top', 'turret');
    expect(attachmentAt(top, 1, 'top')).toBe('turret');
    expect(attachmentAt(top, 1, 'bottom')).toBeUndefined();
    const both = setAttachment(top, 1, 'bottom', 'launcher');
    expect(both.parts[1]).toEqual(['crew', 'turret', 'launcher']);
    const cleared = setAttachment(both, 1, 'top', undefined);
    expect(attachmentAt(cleared, 1, 'top')).toBeUndefined();
    expect(attachmentAt(cleared, 1, 'bottom')).toBe('launcher');
    expect(designStats(cleared).hardpoints).toBe(1);
    expect(setAttachment(base, 9, 'top', 'turret')).toBe(base);
  });

  it('clamps cargo layers and ignores other hardpoints', () => {
    const cargo = setAttachment(base, 0, 'top', 'cargo2');
    expect(attachmentAt(setCargoLayers(cargo, 0, 'top', 9), 0, 'top')).toBe(`cargo${MAX_CARGO_LAYERS}`);
    expect(attachmentAt(setCargoLayers(cargo, 0, 'top', 0), 0, 'top')).toBe('cargo1');
    const dish = setAttachment(base, 0, 'top', 'dish');
    expect(setCargoLayers(dish, 0, 'top', 3)).toBe(dish);
  });

  it('changes the stern keeping the engine count and clamps it', () => {
    expect(setStern(setEngines(base, 3), 'engines').stern).toEqual(['engines', 3]);
    expect(setStern(base, 'big').stern).toEqual(['big']);
    expect(setStern(setStern(base, 'big'), 'engines').stern).toEqual(['engines', 2]);
    expect(setEngines(base, 9).stern).toEqual(['engines', MAX_ENGINES]);
    expect(setEngines(base, 0).stern).toEqual(['engines', 1]);
    expect(setEngines(setStern(base, 'big'), 2).stern).toEqual(['big']);
  });

  it('changes and removes the bow, aft cap and stern', () => {
    expect(setBow(base, 'prow').bow).toBe('prow');
    expect(clearBow(base).bow).toBeUndefined();
    expect(setAft(base, 'dock').aft).toBe('dock');
    expect(clearAft(setAft(base, 'dock')).aft).toBeUndefined();
    expect(clearStern(base).stern).toBeUndefined();
    expect(designStats(clearStern(base)).speed).toBe(0);
  });

  it('never changes the design it was given', () => {
    const before = JSON.stringify(base);
    addSection(base, 'ring');
    removeSection(base, 0);
    moveSection(base, 0, 1);
    setAttachment(base, 0, 'top', 'dish');
    setStern(base, 'big');
    expect(JSON.stringify(base)).toBe(before);
  });

  it('starts every hull as a different looking ship', () => {
    const shapes = HULLS.map((h) => JSON.stringify([h.build().stern, h.build().aft, h.build().bow]));
    expect(new Set(shapes).size).toBe(HULLS.length);
    for (const h of HULLS) expect(h.build().parts.length).toBeGreaterThan(0);
  });
});

describe('the designer store', () => {
  it('starts on the first shipped class and lists the shipped classes', () => {
    const d = new Designer();
    expect(d.saved.map((c) => c.id)).toEqual(SPECS.map((s) => s.id));
    expect(d.baseId).toBe('bastion');
    expect(d.dirty).toBe(false);
  });

  it('marks a draft dirty after an edit and clean again after saving', () => {
    const d = new Designer();
    d.addCore('ring');
    expect(d.dirty).toBe(true);
    d.save();
    expect(d.dirty).toBe(false);
    expect(d.saved.find((c) => c.id === 'bastion')!.parts).toHaveLength(6);
  });

  it('adds a new class to the saved list with its name and role', () => {
    const d = new Designer();
    d.start('hauler');
    expect(d.baseId).toBeNull();
    expect(d.dirty).toBe(true);
    d.rename('Dray');
    d.setRole('Bulk hauler');
    d.addCore('tank');
    d.save();
    const saved = d.saved[d.saved.length - 1]!;
    expect(saved).toMatchObject({ name: 'Dray', role: 'Bulk hauler' });
    expect(saved.parts.map((s) => s[0])).toEqual(['reactor', 'tank', 'truss', 'crew']);
    expect(d.baseId).toBe(saved.id);
    expect(d.saved).toHaveLength(SPECS.length + 1);
  });

  it('renames a saved class in place', () => {
    const d = new Designer();
    d.pick('pike');
    d.rename('Spear');
    d.save();
    expect(d.saved.find((c) => c.id === 'pike')!.name).toBe('Spear');
    expect(d.saved).toHaveLength(SPECS.length);
  });

  it('copies a class under its own id and selects the copy', () => {
    const d = new Designer();
    d.pick('mule');
    d.copy();
    expect(d.saved).toHaveLength(SPECS.length + 1);
    expect(d.draft.name).toBe('Mule copy');
    expect(d.baseId).not.toBe('mule');
    expect(d.saved.find((c) => c.id === 'mule')!.name).toBe('Mule');
  });

  it('deletes a class nothing uses and keeps one a fleet is using', () => {
    const d = new Designer();
    d.pick('bastion');
    expect(d.inService).toBe(true);
    d.remove();
    expect(d.saved.some((c) => c.id === 'bastion')).toBe(true);
    d.pick('lighthouse');
    expect(d.canDelete).toBe(true);
    d.remove();
    expect(d.saved.some((c) => c.id === 'lighthouse')).toBe(false);
  });

  it('adds a section after the selected one and selects it', () => {
    const d = new Designer();
    d.pick('pathfinder');
    d.select({ kind: 'section', index: 1, slot: 'top' });
    d.addCore('armor');
    expect(d.draft.parts.map((s) => s[0])).toEqual(['reactor', 'fuel', 'armor', 'crew', 'hull', 'hull']);
    expect(d.selection).toEqual({ kind: 'section', index: 2, slot: 'top' });
  });

  it('places a hardpoint in the selected slot and removes the selected section', () => {
    const d = new Designer();
    d.pick('lancer');
    d.select({ kind: 'section', index: 3, slot: 'bottom' });
    d.place({ kind: 'att', key: 'cargo', name: 'Cargo' });
    expect(attachmentAt(d.draft, 3, 'bottom')).toBe('cargo2');
    d.layers(1);
    expect(attachmentAt(d.draft, 3, 'bottom')).toBe('cargo3');
    d.clearAttachment('bottom');
    expect(attachmentAt(d.draft, 3, 'bottom')).toBeUndefined();
    d.removeSelected();
    expect(d.draft.parts).toHaveLength(3);
    expect(d.selection).toMatchObject({ kind: 'section', index: 2 });
  });

  it('reorders by moving the selected section one place at a time', () => {
    const d = new Designer();
    d.pick('pathfinder');
    d.select({ kind: 'section', index: 0, slot: 'top' });
    d.shift(1);
    expect(d.draft.parts.map((s) => s[0]).slice(0, 2)).toEqual(['fuel', 'reactor']);
    expect(d.selection).toMatchObject({ kind: 'section', index: 1 });
    d.shift(-1);
    expect(d.draft.parts[0]![0]).toBe('reactor');
  });

  it('pages the gallery so a ninth class opens on the second page and deleting it goes back', () => {
    const d = new Designer();
    expect(d.pageCount).toBe(1);
    expect(d.visible).toHaveLength(GALLERY_PAGE);
    d.start('frame');
    d.save();
    expect(d.pageCount).toBe(2);
    expect(d.page).toBe(1);
    expect(d.visible.map((c) => c.id)).toEqual([d.baseId]);
    d.setPage(5);
    expect(d.page).toBe(1);
    d.setPage(-3);
    expect(d.page).toBe(0);
    d.pick('pike');
    expect(d.page).toBe(0);
    d.setPage(1);
    d.pick(d.saved[GALLERY_PAGE]!.id);
    d.remove();
    expect(d.pageCount).toBe(1);
    expect(d.page).toBe(0);
  });
});
