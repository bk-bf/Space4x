import type { Game } from './state.svelte';

export const TICK_MS = 100;

export interface LoopOptions {
  intervalMs?: number;
  isHidden?: () => boolean;
}

const documentHidden = () => typeof document !== 'undefined' && document.hidden;

export function startLoop(game: Game, onTick: () => void, options: LoopOptions = {}): () => void {
  const intervalMs = options.intervalMs ?? TICK_MS,
    isHidden = options.isHidden ?? documentHidden;
  const id = setInterval(() => {
    if (isHidden()) return;
    if (game.running) game.tick((game.step * intervalMs) / 1000);
    onTick();
  }, intervalMs);
  return () => clearInterval(id);
}
