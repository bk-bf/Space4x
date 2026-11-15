import type { Component } from '#lib/game/data/index.ts';
import { PROPELLANTS, isPropellant, massOf } from '#lib/game/shipdesign/index.ts';
import { formatMass } from '#lib/screens/economy/format.ts';

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

export function factsOf(c: Component): string {
  const d = c.design;
  const out: string[] = [formatMass(massOf(c))];
  if (c.performance) {
    out.push(`${c.performance.isp} s`, formatThrust(c.performance.thrust));
    if (c.performance.power) out.push(formatKw(c.performance.power));
  }
  if (d.volume) out.push(`${d.volume} m³`);
  if (d.cargo) out.push(`carries ${formatMass(d.cargo)}`);
  if (d.housing) out.push(`berths ${d.housing}`);
  if (d.supports) out.push(`sustains ${d.supports}`);
  if (d.generates) out.push(`makes ${formatKw(d.generates)}`);
  if (d.radiates) out.push(`sheds ${formatKw(d.radiates)}`);
  if (d.storage) out.push(`${d.storage} kWh`);
  if (d.landing) out.push(`lands ${formatMass(d.landing)}`);
  if (d.reentry) out.push(`returns ${formatMass(d.reentry)}`);
  const kind = d.propellants?.find(isPropellant);
  if (kind && !d.volume) out.push(PROPELLANTS[kind].name.toLowerCase());
  return out.join(' · ');
}
