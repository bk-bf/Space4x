import { isScreenId, type ScreenId } from '#lib/screens/list.ts';
import { requestRender } from './frame';

class Shell {
  screen = $state<ScreenId>('map');

  setScreen(id: string): void {
    if (!isScreenId(id)) return;
    this.screen = id;
    requestRender();
  }
}

export const shell = new Shell();
