import type { FB } from '#lib/gfx/framebuffer.ts';
import { PAL } from '#lib/gfx/palette.ts';
import type { MonthFlow } from '#lib/game/types.ts';

const INCOME = { fill: [190, 138, 72], top: [242, 179, 93] } as const;
const SPENDING = { fill: [150, 62, 70], top: [239, 111, 94] } as const;
const MONTHS = 12;

export function drawFlowChart(fb: FB, history: readonly MonthFlow[]): void {
  fb.fill(PAL.panel);
  const base = fb.h - 8;
  const top = fb.h - 22;
  const step = Math.floor((fb.w - 16) / MONTHS);
  const bar = Math.max(3, Math.floor(step / 2) - 2);
  const peak = Math.max(1, ...history.flatMap((m) => [m.income, m.spending]));
  for (let x = 4; x < fb.w - 4; x += 2) fb.px(x, base, PAL.orbit);
  history.slice(-MONTHS).forEach((m, i) => {
    const x = 8 + i * step;
    const income = Math.round((m.income / peak) * top);
    const spending = Math.round((m.spending / peak) * top);
    fb.rect(x, base - income, bar, income, INCOME.fill);
    fb.rect(x, base - income, bar, 1, INCOME.top);
    fb.rect(x + bar + 1, base - spending, bar, spending, SPENDING.fill);
    fb.rect(x + bar + 1, base - spending, bar, 1, SPENDING.top);
  });
  fb.present();
}
