import file from './environments.json';
import type { Environment } from './types.ts';

export const environments = file as Environment[];

const index = new Map(environments.map((e) => [e.world, e]));

export const environmentOf = (world: string): Environment | undefined => index.get(world);
