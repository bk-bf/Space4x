import { AU } from '../units.ts';
import { DAY } from '../clock.ts';
import type { FlightBody, FlightSystem } from './types.ts';

export const GM_SUN = 1.32712440018e20;
export const SOLAR_RADIUS = 6.957e8;

const rate = (days: number): number => (Math.PI * 2) / (days * DAY);

export const earth: FlightBody = {
  id: 'earth',
  gm: 3.986004418e14,
  radius: 6.371e6,
  orbit: AU,
  angle: 0,
  angularSpeed: rate(365.256),
  lowOrbitAltitude: 200e3,
  atmosphere: { ascentLoss: 0.7e3, landingDv: 0.1e3, aerobrake: { maxVInf: 12e3, residualDv: 0.1e3 } }
};

export const moon: FlightBody = {
  id: 'moon',
  parent: 'earth',
  gm: 4.9048695e12,
  radius: 1.7374e6,
  orbit: 3.844e8,
  angle: 0,
  angularSpeed: rate(27.3217),
  lowOrbitAltitude: 100e3
};

export const mars: FlightBody = {
  id: 'mars',
  gm: 4.282837e13,
  radius: 3.3895e6,
  orbit: 1.523679 * AU,
  angle: Math.PI,
  angularSpeed: rate(686.98),
  lowOrbitAltitude: 100e3,
  atmosphere: { ascentLoss: 0.2e3, landingDv: 0.5e3, aerobrake: { maxVInf: 5e3, residualDv: 0.15e3 } }
};

export const jupiter: FlightBody = {
  id: 'jupiter',
  gm: 1.26686534e17,
  radius: 6.9911e7,
  orbit: 5.2044 * AU,
  angle: Math.PI,
  angularSpeed: rate(4332.59),
  lowOrbitAltitude: 1e6
};

const planet = (
  id: string,
  gm: number,
  radius: number,
  orbitAu: number,
  days: number,
  extra: Partial<FlightBody> = {}
): FlightBody => ({
  id,
  gm,
  radius,
  orbit: orbitAu * AU,
  angle: 0,
  angularSpeed: rate(days),
  ...extra
});

const satellite = (
  id: string,
  parent: string,
  gm: number,
  radius: number,
  orbit: number,
  days: number,
  extra: Partial<FlightBody> = {}
): FlightBody => ({ id, parent, gm, radius, orbit, angle: 0, angularSpeed: rate(days), ...extra });

export const mercury = planet('mercury', 2.2031868e13, 2.4397e6, 0.387098, 87.969, {
  lowOrbitAltitude: 100e3
});

export const venus = planet('venus', 3.24858592e14, 6.0518e6, 0.723332, 224.701, {
  lowOrbitAltitude: 300e3,
  atmosphere: { ascentLoss: 2e3, landingDv: 2e3 }
});

export const saturn = planet('saturn', 3.7931187e16, 5.8232e7, 9.5826, 10759.22, { lowOrbitAltitude: 1e6 });

export const uranus = planet('uranus', 5.793939e15, 2.5362e7, 19.2184, 30688.5, { lowOrbitAltitude: 5e5 });

export const neptune = planet('neptune', 6.836529e15, 2.4622e7, 30.07, 60182, { lowOrbitAltitude: 5e5 });

export const io = satellite('io', 'jupiter', 5.959916e12, 1.8216e6, 4.217e8, 1.769);

export const europa = satellite('europa', 'jupiter', 3.202739e12, 1.5608e6, 6.709e8, 3.551);

export const ganymede = satellite('ganymede', 'jupiter', 9.887834e12, 2.6341e6, 1.0704e9, 7.155);

export const callisto = satellite('callisto', 'jupiter', 7.179289e12, 2.4103e6, 1.8827e9, 16.689);

export const titan = satellite('titan', 'saturn', 8.978138e12, 2.5747e6, 1.22187e9, 15.945, {
  lowOrbitAltitude: 200e3,
  atmosphere: { ascentLoss: 0.3e3, landingDv: 0.2e3 }
});

export const enceladus = satellite('enceladus', 'saturn', 7.2108e9, 2.52e5, 2.3802e8, 1.37, {
  lowOrbitAltitude: 50e3
});

export const solar: FlightSystem = {
  star: { gm: GM_SUN, radius: SOLAR_RADIUS },
  bodies: [earth, moon, mars, jupiter]
};
