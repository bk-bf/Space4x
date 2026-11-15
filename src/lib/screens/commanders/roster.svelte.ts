import { className, DAY, game, isColony, START_TIME, type Game } from '#lib/game/index.ts';
import { hash } from '#lib/gfx/math.ts';
import { shell } from '#lib/ui/index.ts';

export const RANKS = [
  { id: 'lieutenant', label: 'Lieutenant', pips: 1 },
  { id: 'lt-commander', label: 'Lt commander', pips: 2 },
  { id: 'commander', label: 'Commander', pips: 3 },
  { id: 'captain', label: 'Captain', pips: 4 },
  { id: 'vice-admiral', label: 'Vice admiral', pips: 5 },
  { id: 'admiral', label: 'Admiral', pips: 6 }
] as const;

export type RankId = (typeof RANKS)[number]['id'];

export const SKILLS = ['Fleet handling', 'Logistics', 'Survey', 'Leadership', 'Engineering'] as const;

export type PostKind = 'none' | 'fleet' | 'ship' | 'governor' | 'staff';

export interface Post {
  kind: PostKind;
  ref: string;
}

export interface PostOption {
  kind: Exclude<PostKind, 'none'>;
  ref: string;
  label: string;
  where: string;
}

export interface Officer {
  id: string;
  name: string;
  rank: RankId;
  born: number;
  entered: number;
  skills: number[];
  seed: number;
  post: Post;
}

export const POST_KINDS: readonly { id: PostKind; label: string }[] = [
  { id: 'fleet', label: 'Fleet command' },
  { id: 'ship', label: 'Ship' },
  { id: 'governor', label: 'Governor' },
  { id: 'staff', label: 'Staff' },
  { id: 'none', label: 'Unassigned' }
];

const STAFF_POSTS: readonly { id: string; label: string }[] = [
  { id: 'home-fleet', label: 'Home fleet command' },
  { id: 'naval-staff', label: 'Naval staff' },
  { id: 'academy', label: 'Naval academy' },
  { id: 'luna-yards', label: 'Luna yards' },
  { id: 'survey-office', label: 'Survey office' }
];

const YEAR_MS = 365.25 * DAY * 1000;

export const rankIndex = (id: RankId): number => RANKS.findIndex((r) => r.id === id);

export const rankLabel = (id: RankId): string => RANKS[rankIndex(id)]?.label ?? id;

export const ageOf = (o: Officer, now: number): number => Math.floor((now - o.born) / YEAR_MS);

export const serviceOf = (o: Officer, now: number): number => Math.floor((now - o.entered) / YEAR_MS);

export const surname = (o: Officer): string => o.name.split(' ').slice(1).join(' ');

export function postOptions(kind: PostKind, g: Game): PostOption[] {
  if (kind === 'fleet') return g.world.fleets.map((f) => ({ kind, ref: f.id, label: f.name, where: '' }));
  if (kind === 'ship')
    return g.world.fleets.flatMap((f) =>
      f.ships.map((s) => ({ kind, ref: s.name, label: s.name, where: `${className(s.classId)}, ${f.name}` }))
    );
  if (kind === 'governor')
    return g.world.bodies
      .filter(isColony)
      .map((b) => ({ kind, ref: b.id, label: `Governor, ${b.name}`, where: '' }));
  if (kind === 'staff') return STAFF_POSTS.map((p) => ({ kind, ref: p.id, label: p.label, where: '' }));
  return [];
}

export const allPosts = (g: Game): PostOption[] => POST_KINDS.flatMap((k) => postOptions(k.id, g));

export function postLabel(post: Post, g: Game): string {
  return postOptions(post.kind, g).find((p) => p.ref === post.ref)?.label ?? 'Unassigned';
}

const seeded = (i: number, name: string, rank: RankId, age: number, post: Post): Officer => ({
  id: `o${i}`,
  name,
  rank,
  born: START_TIME - age * YEAR_MS - Math.floor(hash(i, 5, 11) * 364) * DAY * 1000,
  entered:
    START_TIME -
    (12 + Math.round(hash(i, 2, 9) * 20)) * YEAR_MS -
    Math.floor(hash(i, 7, 13) * 364) * DAY * 1000,
  skills: SKILLS.map((_, k) => Math.round(20 + hash(i, k, 6) * 75)),
  seed: i * 7 + 3,
  post
});

const mockOfficers = (): Officer[] =>
  (
    [
      ['R. Vasquez', 'admiral', 63, 'staff', 'home-fleet'],
      ['A. Mwangi', 'vice-admiral', 61, 'staff', 'naval-staff'],
      ['M. Chen', 'captain', 57, 'fleet', 'picket'],
      ['S. Novak', 'captain', 55, 'fleet', 'survey'],
      ['I. Petrov', 'captain', 53, 'none', ''],
      ['L. Haddad', 'commander', 49, 'fleet', 'convoy'],
      ['T. Nakamura', 'commander', 47, 'governor', 'mars'],
      ['J. Okonkwo', 'commander', 45, 'staff', 'luna-yards'],
      ['P. Silva', 'commander', 43, 'staff', 'survey-office'],
      ['E. Larsen', 'lt-commander', 41, 'ship', 'Watchful'],
      ['D. Kaur', 'lt-commander', 39, 'none', ''],
      ['F. Moreau', 'lt-commander', 37, 'staff', 'academy'],
      ['H. Yilmaz', 'lieutenant', 35, 'ship', 'Vigilant'],
      ['C. Brandt', 'lieutenant', 33, 'none', '']
    ] as const
  ).map(([name, rank, age, kind, ref], i) => seeded(i, name, rank, age, { kind, ref }));

export type SortKey = 'rank' | 'name' | 'post' | 'age';

export const SORTS: readonly { id: SortKey; label: string }[] = [
  { id: 'rank', label: 'Rank' },
  { id: 'name', label: 'Name' },
  { id: 'post', label: 'Post' },
  { id: 'age', label: 'Age' }
];

export type AssignmentFilter = 'all' | 'assigned' | 'unassigned';

export class Roster {
  officers = $state<Officer[]>(mockOfficers());
  selected = $state('o0');
  sort = $state<SortKey>('rank');
  descending = $state(true);
  rank = $state<'all' | RankId>('all');
  assignment = $state<AssignmentFilter>('all');
  targetKind = $state<PostKind>('fleet');
  targetRef = $state('');

  officer(id: string): Officer | undefined {
    return this.officers.find((o) => o.id === id);
  }

  select(id: string): void {
    const o = this.officer(id);
    if (!o) return;
    this.selected = id;
    if (o.post.kind !== 'none') {
      this.targetKind = o.post.kind;
      this.targetRef = o.post.ref;
    }
  }

  holder(kind: PostKind, ref: string): Officer | undefined {
    return kind === 'none'
      ? undefined
      : this.officers.find((o) => o.post.kind === kind && o.post.ref === ref);
  }

  private key(o: Officer, g: Game): number | string {
    if (this.sort === 'rank') return rankIndex(o.rank);
    if (this.sort === 'name') return surname(o);
    if (this.sort === 'post') return postLabel(o.post, g);
    return ageOf(o, g.time);
  }

  visible(g: Game): Officer[] {
    const dir = this.descending ? -1 : 1;
    return this.officers
      .filter((o) => this.rank === 'all' || o.rank === this.rank)
      .filter(
        (o) => this.assignment === 'all' || (o.post.kind !== 'none') === (this.assignment === 'assigned')
      )
      .sort((a, b) => {
        const ka = this.key(a, g),
          kb = this.key(b, g);
        const order =
          typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
        return order * dir || surname(a).localeCompare(surname(b));
      });
  }

  assign(id: string, kind: PostKind, ref: string, g: Game = game): boolean {
    const o = this.officer(id);
    if (!o) return false;
    const label = kind === 'none' ? '' : postOptions(kind, g).find((p) => p.ref === ref)?.label;
    if (kind !== 'none' && !label) return false;
    const before = postLabel(o.post, g);
    const other = this.holder(kind, ref);
    if (other && other.id !== o.id) other.post = { kind: 'none', ref: '' };
    o.post = kind === 'none' ? { kind: 'none', ref: '' } : { kind, ref };
    const who = `${rankLabel(o.rank)} ${o.name}`;
    const relieved = other && other.id !== o.id ? ` ${other.name} was relieved.` : '';
    g.log(
      'ship',
      kind === 'none' ? `${who} was released from ${before}.` : `${who} was posted to ${label}.${relieved}`
    );
    return true;
  }

  promote(id: string, g: Game = game): boolean {
    const o = this.officer(id);
    const next = o ? RANKS[rankIndex(o.rank) + 1] : undefined;
    if (!o || !next) return false;
    o.rank = next.id;
    g.log('ship', `${o.name} was promoted to ${next.label}.`);
    return true;
  }
}

export const roster = new Roster();

let queryApplied = false;

export function applyCommandersQuery(): void {
  if (queryApplied) return;
  queryApplied = true;
  const index = Number(shell.param('cmd'));
  const found = roster.officers[index];
  if (shell.param('cmd') !== null && found) roster.select(found.id);
}
