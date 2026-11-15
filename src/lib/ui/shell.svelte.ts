import { isScreenId, type ScreenId } from '#lib/screens/list.ts';
import { requestRender } from './frame';

class Shell {
  screen = $state<ScreenId>('map');
  params = $state.raw(new URLSearchParams());

  setScreen(id: string): void {
    if (!isScreenId(id)) return;
    this.screen = id;
    requestRender();
  }

  param(name: string): string | null {
    return this.params.get(name);
  }
}

export const shell = new Shell();
