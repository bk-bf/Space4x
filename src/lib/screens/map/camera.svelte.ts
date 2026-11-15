import { formatDistance, game } from '#lib/game/index.ts';
import { requestRender, wm } from '#lib/ui/index.ts';
import { MapCamera, type Frame, type Target, type Tier } from './mapCamera';
import { locate, nameOf, presetFor, presets, splitTarget, systemExtent, type Preset } from './targets';

export const MAP_SCALE = 2;
export const SCALE_BAR_PX = 40;
const ZOOM_HEADROOM = 0.3;

export const cam = new MapCamera();

export const layers = $state({ Orbits: true, Names: true, Sensors: true, Asteroids: true, Course: true });

export type Layer = keyof typeof layers;

export const readout = $state({
  dist: '',
  px: '',
  bar: SCALE_BAR_PX,
  mpp: 0,
  tier: 'far' as Tier,
  focus: 'free',
  x: '0',
  y: '0'
});

let pending: string | null = 'system';

export function mapFrame(): Frame {
  const f = wm.free,
    w = Math.max(40, f.w / MAP_SCALE),
    h = Math.max(40, f.h / MAP_SCALE);
  return { w, h, ox: (f.x + f.w / 2) / MAP_SCALE, oy: (f.y + f.h / 2) / MAP_SCALE };
}

export function zoomLimit(): void {
  const f = cam.frame;
  cam.max = Math.log10(systemExtent(game, game.world.system) / (Math.min(f.w, f.h) / 2)) + ZOOM_HEADROOM;
}

export function mapPresets(): Preset[] {
  const f = cam.frame;
  return presets(game, f.w, f.h);
}

const metresPerPx = (raw: string | undefined): number | undefined => {
  const m = Number(raw);
  return raw && Number.isFinite(m) && m > 0 ? Math.log10(m) : undefined;
};

function parsePreset(raw: string): Preset | undefined {
  const f = cam.frame,
    [name, scale] = raw.split(':'),
    whole = metresPerPx(name);
  if (whole !== undefined) return { id: raw, label: raw, L: whole, aim: cam.focus ?? cam.free };
  const p = presetFor(game, name ?? '', f.w, f.h),
    L = metresPerPx(scale);
  return p && L !== undefined ? { ...p, L } : p;
}

export function applyPending(frame: Frame): void {
  if (pending == null) return;
  cam.frame = frame;
  zoomLimit();
  const p = parsePreset(pending) ?? parsePreset('system');
  pending = null;
  if (p) cam.place(p.L, p.aim);
  cam.step(0, locate, cam.frame);
}

export function setZoom(raw: string): void {
  pending = raw;
  requestRender();
}

export function resetCamera(): void {
  setZoom('system');
}

export function flyTo(id: string): void {
  const p = parsePreset(id);
  if (!p) return;
  cam.flyTo(p.L, p.aim);
  requestRender();
}

const FREE_FLY_L = 8;

export function presetIdOf(t: Target): string | null {
  const [kind, id] = splitTarget(t);
  if (kind === 'star') return id === '0' ? 'star' : `star${id}`;
  return kind === 'body' || kind === 'fleet' || kind === 'site' ? id : null;
}

export function flyToTarget(t: Target): void {
  const id = presetIdOf(t),
    p = id ? parsePreset(id) : undefined;
  if (p) cam.flyTo(p.L, p.aim);
  else cam.flyTo(Math.min(cam.LT, FREE_FLY_L), t);
  requestRender();
}

export function hopTo(t: Target): void {
  cam.hopTo(t);
  requestRender();
}

export function zoomBy(notches: number): void {
  cam.zoomCentre(-notches);
  requestRender();
}

export function toggleLayer(k: Layer): void {
  layers[k] = !layers[k];
  requestRender();
}

function niceStep(want: number): number {
  const e = Math.pow(10, Math.floor(Math.log10(want)));
  for (const q of [1, 2, 5, 10]) if (q * e >= want) return q * e;
  return 10 * e;
}

export function updateReadout(): void {
  const s = cam.s,
    d = niceStep(s * (SCALE_BAR_PX / MAP_SCALE)),
    [x, y] = cam.centre,
    dist = formatDistance(d),
    px = `1 px = ${formatDistance(s)}`,
    bar = Math.round((d / s) * MAP_SCALE),
    focus = nameOf(cam.aim),
    xs = x.toExponential(3),
    ys = y.toExponential(3);
  if (readout.dist !== dist) readout.dist = dist;
  if (readout.px !== px) readout.px = px;
  if (readout.bar !== bar) readout.bar = bar;
  if (readout.mpp !== s) readout.mpp = s;
  if (readout.tier !== cam.tier) readout.tier = cam.tier;
  if (readout.focus !== focus) readout.focus = focus;
  if (readout.x !== xs) readout.x = xs;
  if (readout.y !== ys) readout.y = ys;
}
