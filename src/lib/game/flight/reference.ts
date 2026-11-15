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

export const solar: FlightSystem = {
  star: { gm: GM_SUN, radius: SOLAR_RADIUS },
  bodies: [earth, moon, mars, jupiter]
};
