import { placeName } from './places.ts';
import { KIND_ORDER, mockFormations, mockUnits, type Formation, type Stance, type Unit } from './model.ts';

class Ground {
  formations = $state<Formation[]>(mockFormations());
  units = $state<Unit[]>(mockUnits());
  formationId = $state('home-guard');
  unitId = $state<string | null>(null);
  open = $state<Record<string, boolean>>({ earth: true, 'home-guard': true });
  private counter = 0;

  constructor() {
    this.unitId = this.unitsOf(this.formationId)[0]?.id ?? null;
  }

  get formation(): Formation | undefined {
    return this.formations.find((f) => f.id === this.formationId);
  }

  get unit(): Unit | undefined {
    return this.units.find((u) => u.id === this.unitId);
  }

  unitsOf(formationId: string): Unit[] {
    return this.units
      .filter((u) => u.formation === formationId)
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }

  formationsAt(place: string): Formation[] {
    return this.formations.filter((f) => f.place === place);
  }

  selectFormation(id: string): void {
    if (!this.formations.some((f) => f.id === id)) return;
    this.formationId = id;
    if (this.unit?.formation !== id) this.unitId = this.unitsOf(id)[0]?.id ?? null;
  }

  selectUnit(id: string): void {
    if (this.units.some((u) => u.id === id)) this.unitId = id;
  }

  setStance(unitId: string, stance: Stance): void {
    const u = this.units.find((x) => x.id === unitId);
    if (u) u.stance = stance;
  }

  moveUnit(unitId: string, formationId: string): void {
    const u = this.units.find((x) => x.id === unitId);
    if (!u || u.formation === formationId || !this.formations.some((f) => f.id === formationId)) return;
    const siblings = this.unitsOf(u.formation);
    const at = siblings.indexOf(u);
    u.formation = formationId;
    if (this.unitId === unitId && u.formation !== this.formationId) {
      const rest = this.unitsOf(this.formationId);
      this.unitId = rest[Math.min(at, rest.length - 1)]?.id ?? null;
    }
    this.open[formationId] = true;
  }

  create(place: string): string {
    const id = `f-${++this.counter}`;
    const same = this.formationsAt(place).length + 1;
    this.formations.push({ id, name: `${placeName(place)} formation ${same}`, place });
    this.open[place] = true;
    this.formationId = id;
    this.unitId = null;
    return id;
  }

  disbandable(id: string): boolean {
    const f = this.formations.find((x) => x.id === id);
    if (!f) return false;
    return this.unitsOf(id).length === 0 || this.formationsAt(f.place).length > 1;
  }

  disband(id: string): void {
    if (!this.disbandable(id)) return;
    const f = this.formations.find((x) => x.id === id)!;
    const heir = this.formationsAt(f.place).find((x) => x.id !== id);
    for (const u of this.units) if (u.formation === id && heir) u.formation = heir.id;
    this.formations = this.formations.filter((x) => x.id !== id);
    if (this.formationId === id) {
      const next = heir ?? this.formations[0];
      this.formationId = next?.id ?? '';
      this.unitId = next ? (this.unitsOf(next.id)[0]?.id ?? null) : null;
    }
  }
}

export const ground = new Ground();
