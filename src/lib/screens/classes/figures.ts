import { shipDeltaV } from '#lib/game/flight/index.ts';
import {
  PROPELLANTS,
  flightShip,
  yardName,
  type DesignStats,
  type ShipDesign
} from '#lib/game/shipdesign/index.ts';
import type { IconName } from '#lib/gfx/icons.ts';
import { dim, fmt, tipText, warn } from '#lib/ui/index.ts';
import { formatAccel, formatDv, formatKw } from './facts.ts';

export interface Figure {
  key: string;
  icon: IconName;
  value: string;
  label: string;
  warn: boolean;
  tip: string;
}

export interface Loaded {
  payload: number;
  mass: number;
  deltaV: number;
  acceleration: number;
  twr: { earth: number; moon: number; mars: number };
}

export const payloadFor = (stats: DesignStats, asked: number | undefined): number =>
  Math.max(0, Math.min(stats.payloadCapacity, asked ?? stats.payloadCapacity));

export function loadedWith(design: ShipDesign, stats: DesignStats, payload: number): Loaded {
  const base = stats.loaded;
  const mass = stats.dryMass + stats.propellantMass + payload;
  const ship = flightShip(design, { payload });
  const scale = mass > 0 ? base.mass / mass : 0;
  return {
    payload,
    mass,
    deltaV: ship && stats.main ? shipDeltaV(ship) : 0,
    acceleration: base.acceleration * scale,
    twr: {
      earth: base.thrustToWeight.earth * scale,
      moon: base.thrustToWeight.moon * scale,
      mars: base.thrustToWeight.mars * scale
    }
  };
}

const signedKw = (kw: number): string => `${kw < 0 ? '-' : '+'}${formatKw(Math.abs(kw))}`;

const twrText = (n: number): string => (n >= 0.1 ? n.toFixed(2) : n.toExponential(1));

const propellantNames = (stats: DesignStats): string =>
  Object.entries(stats.propellant)
    .filter(([, kg]) => kg > 0)
    .map(([kind]) => PROPELLANTS[kind as keyof typeof PROPELLANTS].name.toLowerCase())
    .join(' and ');

export function primaryFigures(stats: DesignStats, l: Loaded): Figure[] {
  const main = stats.main;
  const thrust = main ? main.thrust * main.throttle : 0;
  const engines = main?.count ?? 0;
  const crewShort = stats.crew > stats.berths;
  const balance = stats.power.balance;
  const heatHot = stats.heat.balance < 0;
  const heat =
    stats.heat.produced <= 0
      ? { value: 'cold', label: 'no heat made' }
      : {
          value: heatHot ? 'hot' : 'ok',
          label: `sheds ${formatKw(stats.heat.radiated)} of ${formatKw(stats.heat.produced)}`
        };
  return [
    {
      key: 'mass',
      icon: 'box',
      value: fmt.mass(l.mass),
      label: `dry ${fmt.mass(stats.dryMass)}`,
      warn: false,
      tip: tipText(
        'Mass',
        `Hardware ${fmt.mass(stats.dryMass)}`,
        `Propellant ${fmt.mass(stats.propellantMass)}`,
        `Payload ${fmt.mass(l.payload)}`
      )
    },
    {
      key: 'delta-v',
      icon: 'rocket',
      value: main ? formatDv(l.deltaV) : '-',
      label: main ? `Isp ${Math.round(main.isp)} s` : 'delta-v',
      warn: false,
      tip: tipText(
        'Delta-v',
        dim('The rocket equation on full tanks with the payload shown.'),
        !main && warn('No drive')
      )
    },
    {
      key: 'twr',
      icon: 'up',
      value: main ? twrText(l.twr.earth) : '-',
      label: main ? formatAccel(l.acceleration) : 'thrust to weight',
      warn: false,
      tip: tipText('Thrust to weight', dim('Sea-level thrust against weight on Earth, full tanks.'))
    },
    {
      key: 'thrust',
      icon: 'flame',
      value: main ? fmt.thrust(thrust) : '-',
      label: `${engines} engine${engines === 1 ? '' : 's'}`,
      warn: false,
      tip: tipText('Thrust', dim('Vacuum thrust of the main drive, throttled to the power left.'))
    },
    {
      key: 'crew',
      icon: 'people',
      value: String(stats.crew),
      label: `berths ${stats.berths}`,
      warn: crewShort,
      tip: tipText(
        'Crew',
        `Needed aboard ${stats.crew}`,
        `Berths ${stats.berths}`,
        crewShort && warn('Not enough berths')
      )
    },
    {
      key: 'power',
      icon: 'bolt',
      value: signedKw(balance),
      label: `makes ${formatKw(stats.power.made)}`,
      warn: balance < 0,
      tip: tipText(
        'Power',
        `Makes ${formatKw(stats.power.made)}`,
        `Systems ${formatKw(stats.power.used)}`,
        `Engines want ${formatKw(stats.power.engines)}`
      )
    },
    {
      key: 'propellant',
      icon: 'drop',
      value: fmt.mass(stats.propellantMass),
      label: propellantNames(stats) || 'propellant',
      warn: false,
      tip: tipText('Propellant', dim('Loaded in the tanks.'))
    },
    {
      key: 'heat',
      icon: 'warn',
      value: heat.value,
      label: heat.label,
      warn: heatHot,
      tip: tipText('Heat', dim('Waste heat against what the radiators and the hull shed.'))
    }
  ];
}

const lifts = (ok: boolean): string => (ok ? 'lifts off' : 'too low');

export function secondaryFigures(stats: DesignStats, l: Loaded): Figure[] {
  const main = stats.main;
  const endurance = stats.endurance;
  return [
    {
      key: 'dv-empty',
      icon: 'rocket',
      value: main ? formatDv(stats.empty.deltaV) : '-',
      label: 'delta-v empty',
      warn: false,
      tip: tipText('Delta-v empty', dim('Full tanks, nothing in the bay.'))
    },
    {
      key: 'payload',
      icon: 'box',
      value: stats.payloadCapacity ? fmt.mass(stats.payloadCapacity) : 'none',
      label: 'bay capacity',
      warn: false,
      tip: tipText('Payload', dim('What the cargo bays carry.'))
    },
    ...(['earth', 'moon', 'mars'] as const).map((body): Figure => ({
      key: `twr-${body}`,
      icon: 'up',
      value: main ? twrText(l.twr[body]) : '-',
      label: `${body[0]!.toUpperCase()}${body.slice(1)}, ${main ? lifts(stats.loaded.liftoff[body]) : 'no drive'}`,
      warn: false,
      tip: tipText(
        `Thrust to weight on ${body[0]!.toUpperCase()}${body.slice(1)}`,
        dim('Lift-off needs 1.2.')
      )
    })),
    {
      key: 'acceleration',
      icon: 'flat',
      value: main ? formatAccel(l.acceleration) : '-',
      label: 'acceleration',
      warn: false,
      tip: tipText('Acceleration', dim('Thrust over mass at full tanks.'))
    },
    {
      key: 'endurance',
      icon: 'leaf',
      value: endurance === undefined ? 'no crew' : `${Math.floor(endurance)} days`,
      label: 'life support',
      warn: false,
      tip: tipText('Life support', dim('How long the stores and recycling keep the crew alive.'))
    },
    {
      key: 'built-at',
      icon: 'yard',
      value: stats.builtAt.length ? stats.builtAt.map(yardName).join(', ') : 'nowhere',
      label: 'can be built at',
      warn: stats.builtAt.length === 0,
      tip: tipText('Built at', dim('Yards that can build every part.'))
    }
  ];
}
