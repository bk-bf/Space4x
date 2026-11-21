import { DIG_CLASS_NAMES, DIG_CLASSES, type Figures, type RobotStats } from '#lib/game/robots/index.ts';
import type { IconName } from '#lib/gfx/icons.ts';
import { fmt, tipText } from '#lib/ui/index.ts';

export interface Figure {
  key: string;
  icon: IconName;
  value: string;
  label: string;
  warn: boolean;
  tip: string;
}

export const kw = (n: number): string =>
  Math.abs(n) >= 10 ? `${Math.round(n).toLocaleString('en-US')} kW` : `${n.toFixed(2)} kW`;

export const kgPerDay = (kgPerHour: number): string => fmt.rate(kgPerHour, 'day');

const CHASSIS_NAMES = { wheeled: 'wheeled', anchored: 'anchored' } as const;

export function robotFigures(s: RobotStats): Figure[] {
  const balance = s.power.balance;
  return [
    {
      key: 'mass',
      icon: 'box',
      value: fmt.mass(s.mass),
      label: s.chassis ? CHASSIS_NAMES[s.chassis] : 'no chassis',
      warn: false,
      tip: tipText('Mass', `${fmt.mass(s.mass)} to carry`)
    },
    {
      key: 'power',
      icon: 'bolt',
      value: s.power.dock ? kw(s.power.used) : `${balance < 0 ? '-' : '+'}${kw(Math.abs(balance))}`,
      label: s.power.dock ? 'drawn docked' : `makes ${kw(s.power.made)}`,
      warn: !s.power.dock && balance < -1e-9,
      tip: tipText('Power', `Makes ${kw(s.power.made)}`, `Uses ${kw(s.power.used)}`)
    },
    {
      key: 'compute',
      icon: 'chip',
      value: s.compute > 0 ? fmt.eflops(s.compute) : 'Earth',
      label: s.compute > 0 ? 'on board' : 'run from Earth',
      warn: false,
      tip: tipText('Compute', s.compute > 0 ? `${fmt.eflops(s.compute)} on board` : 'Run from Earth')
    },
    {
      key: 'wear',
      icon: 'wrench',
      value: fmt.rate(s.wear / 8766, 'year'),
      label: 'machinery',
      warn: false,
      tip: tipText('Wear', `${fmt.rate(s.wear / 8766, 'year')} of machinery`)
    }
  ];
}

export function rateFigures(s: RobotStats): Figure[] {
  return DIG_CLASSES.map((k) => ({
    key: `rate-${k}`,
    icon: 'hammer' as IconName,
    value: s.rates[k] > 0 ? kgPerDay(s.rates[k]) : '0',
    label: DIG_CLASS_NAMES[k].toLowerCase(),
    warn: false,
    tip: tipText(DIG_CLASS_NAMES[k], `${kgPerDay(s.rates[k])}`)
  }));
}

export function factList(f: Figures): string[] {
  const lines = [`Mass ${f.mass.toLocaleString('en-US')} kg`];
  if (f.power) lines.push(`Uses ${kw(f.power)}`);
  if (f.generates) lines.push(`Makes ${kw(f.generates)}`);
  if (f.storage) lines.push(`Stores ${f.storage} kWh`);
  if (f.dock) lines.push('Docks at a charging station');
  if (f.compute) lines.push(`Compute ${fmt.eflops(f.compute)}`);
  for (const k of DIG_CLASSES)
    if (f.rates[k])
      lines.push(
        `${DIG_CLASS_NAMES[k]} ${f.rates[k]} kg/h${k === 'ice' && f.bakes < 1 ? `, ${Math.round(f.bakes * 100)}% water` : ''}`
      );
  if (f.gravity === 'surface') lines.push('Needs gravity');
  if (f.chassis)
    lines.push(f.chassis === 'wheeled' ? 'Moon, Mars and Mercury' : 'Asteroids, comets and small moons');
  return lines;
}

export function keyFigure(f: Figures): string {
  if (f.kind === 'tool') return `${Math.max(...Object.values(f.rates).map((v) => v ?? 0))} kg/h`;
  if (f.generates) return kw(f.generates);
  if (f.compute) return fmt.eflops(f.compute);
  return `${f.mass} kg`;
}
