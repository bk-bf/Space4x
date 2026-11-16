export const LEVELS = 6;

export interface Sphere {
  readonly dirs: Float32Array;
  readonly tris: readonly Uint16Array[];
  readonly counts: readonly number[];
}

export type Surface = (x: number, y: number, z: number) => number;

function build(): Sphere {
  const t = (1 + Math.sqrt(5)) / 2,
    start = [
      [-1, t, 0],
      [1, t, 0],
      [-1, -t, 0],
      [1, -t, 0],
      [0, -1, t],
      [0, 1, t],
      [0, -1, -t],
      [0, 1, -t],
      [t, 0, -1],
      [t, 0, 1],
      [-t, 0, -1],
      [-t, 0, 1]
    ],
    faces = [
      [0, 11, 5],
      [0, 5, 1],
      [0, 1, 7],
      [0, 7, 10],
      [0, 10, 11],
      [1, 5, 9],
      [5, 11, 4],
      [11, 10, 2],
      [10, 7, 6],
      [7, 1, 8],
      [3, 9, 4],
      [3, 4, 2],
      [3, 2, 6],
      [3, 6, 8],
      [3, 8, 9],
      [4, 9, 5],
      [2, 4, 11],
      [6, 2, 10],
      [8, 6, 7],
      [9, 8, 1]
    ],
    total = 10 * 4 ** LEVELS + 2,
    dirs = new Float32Array(total * 3);
  let n = 0;
  const push = (x: number, y: number, z: number): number => {
    const l = Math.hypot(x, y, z);
    dirs[n * 3] = x / l;
    dirs[n * 3 + 1] = y / l;
    dirs[n * 3 + 2] = z / l;
    return n++;
  };
  for (const [x, y, z] of start) push(x!, y!, z!);
  let tris = new Uint16Array(faces.flat());
  const levels: Uint16Array[] = [tris],
    counts = [n];
  for (let level = 1; level <= LEVELS; level++) {
    const mid = new Map<number, number>(),
      next = new Uint16Array(tris.length * 4),
      half = (a: number, b: number): number => {
        const key = a < b ? a * total + b : b * total + a;
        let m = mid.get(key);
        if (m === undefined) {
          m = push(
            dirs[a * 3]! + dirs[b * 3]!,
            dirs[a * 3 + 1]! + dirs[b * 3 + 1]!,
            dirs[a * 3 + 2]! + dirs[b * 3 + 2]!
          );
          mid.set(key, m);
        }
        return m;
      };
    for (let k = 0; k < tris.length; k += 3) {
      const a = tris[k]!,
        b = tris[k + 1]!,
        c = tris[k + 2]!,
        ab = half(a, b),
        bc = half(b, c),
        ca = half(c, a);
      next.set([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca], k * 4);
    }
    tris = next;
    levels.push(tris);
    counts.push(n);
  }
  return { dirs, tris: levels, counts };
}

let sphere: Sphere | null = null;

export const icosphere = (): Sphere => (sphere ??= build());

export interface Mesh {
  readonly pos: Float32Array;
  readonly reach: number;
  readonly normals: (Float32Array | undefined)[];
  readonly flat: (Float32Array | undefined)[];
}

export function* bakeRadii(surface: Surface, out: (mesh: Mesh) => void): Generator<void> {
  const { dirs, counts } = icosphere(),
    n = counts[LEVELS]!,
    pos = new Float32Array(n * 3);
  let reach = 0;
  for (let i = 0; i < n; i++) {
    if ((i & 2047) === 2047) yield;
    const x = dirs[i * 3]!,
      y = dirs[i * 3 + 1]!,
      z = dirs[i * 3 + 2]!,
      r = surface(x, y, z);
    pos[i * 3] = x * r;
    pos[i * 3 + 1] = y * r;
    pos[i * 3 + 2] = z * r;
    if (r > reach) reach = r;
  }
  out({ pos, reach, normals: [], flat: [] });
}

export function normalsAt(mesh: Mesh, level: number): Float32Array {
  const have = mesh.normals[level];
  if (have) return have;
  const { tris, counts } = icosphere(),
    n = counts[level]!,
    list = tris[level]!,
    p = mesh.pos,
    out = new Float32Array(n * 3);
  for (let k = 0; k < list.length; k += 3) {
    const a = list[k]! * 3,
      b = list[k + 1]! * 3,
      c = list[k + 2]! * 3,
      ux = p[b]! - p[a]!,
      uy = p[b + 1]! - p[a + 1]!,
      uz = p[b + 2]! - p[a + 2]!,
      vx = p[c]! - p[a]!,
      vy = p[c + 1]! - p[a + 1]!,
      vz = p[c + 2]! - p[a + 2]!,
      nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      out[v] = out[v]! + nx;
      out[v + 1] = out[v + 1]! + ny;
      out[v + 2] = out[v + 2]! + nz;
    }
  }
  for (let v = 0; v < n * 3; v += 3) {
    const l = Math.hypot(out[v]!, out[v + 1]!, out[v + 2]!) || 1;
    out[v] = out[v]! / l;
    out[v + 1] = out[v + 1]! / l;
    out[v + 2] = out[v + 2]! / l;
  }
  mesh.normals[level] = out;
  return out;
}

const STEEP_FROM = 0.35;
const STEEP_RAMP = 0.45;

export function flatAt(mesh: Mesh, level: number): Float32Array {
  const have = mesh.flat[level];
  if (have) return have;
  const N = normalsAt(mesh, level),
    p = mesh.pos,
    n = icosphere().counts[level]!,
    out = new Float32Array(n);
  for (let v = 0, o = 0; v < n; v++, o += 3) {
    const l = Math.hypot(p[o]!, p[o + 1]!, p[o + 2]!) || 1,
      c = (N[o]! * p[o]! + N[o + 1]! * p[o + 1]! + N[o + 2]! * p[o + 2]!) / l;
    out[v] = Math.min(1, Math.max(0, (c - STEEP_FROM) / STEEP_RAMP));
  }
  mesh.flat[level] = out;
  return out;
}

const meshes = new WeakMap<object, Mesh>();

export const meshOf = (owner: object): Mesh | undefined => meshes.get(owner);

export function setMesh(owner: object, mesh: Mesh): void {
  meshes.set(owner, mesh);
}

export function dropMesh(owner: object): void {
  meshes.delete(owner);
}

export const meshBytes = (mesh: Mesh): number =>
  mesh.pos.byteLength + [...mesh.normals, ...mesh.flat].reduce((s, n) => s + (n?.byteLength ?? 0), 0);
