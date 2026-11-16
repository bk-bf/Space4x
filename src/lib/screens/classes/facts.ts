import type { Component } from '#lib/game/data/index.ts';
import { PROPELLANTS, isPropellant, massOf } from '#lib/game/shipdesign/index.ts';
import { fmt } from '#lib/ui/index.ts';

export const formatThrust = (n: number): string => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} MN`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} kN`;
  if (n >= 1) return `${n.toFixed(1)} N`;
  return `${(n * 1e3).toFixed(0)} mN`;
};

export const formatKw = (kw: number): string => {
  const a = Math.abs(kw);
  if (a >= 1000) return `${(kw / 1000).toFixed(1)} MW`;
  return `${(Math.round(kw * 10) / 10).toLocaleString('en-US')} kW`;
};

export const formatDv = (ms: number): string => `${(ms / 1000).toFixed(2)} km/s`;

export const formatAccel = (a: number): string =>
  a >= 0.1
    ? `${a.toFixed(2)} m/s²`
    : a >= 0.001
      ? `${(a * 1000).toFixed(1)} mm/s²`
      : `${(a * 1e6).toFixed(0)} µm/s²`;

export function factList(c: Component): string[] {
  const d = c.design;
  const out: string[] = [`Mass ${fmt.mass(massOf(c))}`];
  if (c.performance) {
    out.push(`Isp ${c.performance.isp} s, thrust ${formatThrust(c.performance.thrust)}`);
    if (c.performance.power) out.push(`Needs ${formatKw(c.performance.power)}`);
  }
  if (d.volume) out.push(`Tank ${d.volume} m³`);
  if (d.cargo) out.push(`Carries ${fmt.mass(d.cargo)}`);
  if (d.housing) out.push(`Berths ${d.housing}`);
  if (d.supports) out.push(`Sustains ${d.supports} crew`);
  if (d.generates) out.push(`Makes ${formatKw(d.generates)} at 1 AU`);
  if (d.radiates) out.push(`Sheds ${formatKw(d.radiates)}`);
  if (d.storage) out.push(`Stores ${d.storage} kWh`);
  if (d.landing) out.push(`Lands ${fmt.mass(d.landing)}`);
  if (d.reentry) out.push(`Returns ${fmt.mass(d.reentry)}`);
  const kind = d.propellants?.find(isPropellant);
  if (kind && !d.volume) out.push(`Burns ${PROPELLANTS[kind].name.toLowerCase()}`);
  return out;
}

export const keyFigure = (c: Component): string =>
  c.performance ? `${c.performance.isp} s` : fmt.mass(massOf(c));
