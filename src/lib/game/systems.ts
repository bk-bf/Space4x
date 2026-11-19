import type { Game } from './state.svelte';

export type System = (game: Game, dtSeconds: number) => void;

const systems = new Map<string, System>();

export function registerSystem(name: string, fn: System): () => void {
  systems.set(name, fn);
  return () => {
    if (systems.get(name) === fn) systems.delete(name);
  };
}

export const systemNames = (): string[] => [...systems.keys()];

export function runSystems(game: Game, dtSeconds: number): void {
  for (const fn of systems.values()) fn(game, dtSeconds);
}

export type Horizon = (game: Game) => number;

const horizons = new Map<string, Horizon>();

export function registerHorizon(name: string, fn: Horizon): () => void {
  horizons.set(name, fn);
  return () => {
    if (horizons.get(name) === fn) horizons.delete(name);
  };
}

export function nextHorizon(game: Game): number {
  let t = Infinity;
  for (const fn of horizons.values()) t = Math.min(t, fn(game));
  return t;
}
