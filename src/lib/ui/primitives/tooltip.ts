export interface TipLine {
  text: string;
  tone?: 'dim' | 'warn';
}

export interface TipContent {
  title: string;
  lines: TipLine[];
}

export type Tip = string | TipContent | null | undefined | false;

export interface Size {
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const POINTER_OFFSET = { x: 14, y: 16 } as const;
export const VIEW_MARGIN = 4;
const FLIP_GAP = 10;

export const dim = (text: string): string => (text ? `~${text}` : '');
export const warn = (text: string): string => (text ? `!${text}` : '');

type LineInput = string | false | null | undefined;

export function tipText(title: string, ...lines: (LineInput | LineInput[])[]): string {
  return [title, ...lines.flat().filter(Boolean)].join('\n');
}

export function parseTip(tip: string | TipContent): TipContent {
  if (typeof tip !== 'string') return tip;
  const [title = '', ...rest] = tip.split('\n');
  return {
    title,
    lines: rest.map((l) =>
      l.startsWith('!')
        ? { text: l.slice(1), tone: 'warn' }
        : l.startsWith('~')
          ? { text: l.slice(1), tone: 'dim' }
          : { text: l }
    )
  };
}

const clampInto = (v: number, size: number, room: number): number =>
  Math.max(VIEW_MARGIN / 2, Math.min(v, room - size - VIEW_MARGIN / 2));

export function placeAtPointer(pointer: Point, size: Size, view: Size): Point {
  let x = pointer.x + POINTER_OFFSET.x,
    y = pointer.y + POINTER_OFFSET.y;
  if (x + size.w > view.w - VIEW_MARGIN) x = pointer.x - size.w - FLIP_GAP;
  if (y + size.h > view.h - VIEW_MARGIN) y = pointer.y - size.h - FLIP_GAP;
  return { x: clampInto(x, size.w, view.w), y: clampInto(y, size.h, view.h) };
}

export function placeBeside(anchor: Box, size: Size, view: Size): Point {
  let y = anchor.bottom + VIEW_MARGIN;
  if (y + size.h > view.h - VIEW_MARGIN) y = anchor.top - size.h - VIEW_MARGIN;
  return { x: clampInto(anchor.left, size.w, view.w), y: clampInto(y, size.h, view.h) };
}

const MARK = 'data-ui-tip';
const HOST_ID = 'ui-tip';

let host: HTMLElement | undefined;
let owner: HTMLElement | undefined;

function hostElement(): HTMLElement {
  if (host?.isConnected) return host;
  host = document.createElement('div');
  host.id = HOST_ID;
  host.className = 'ui-tip';
  host.setAttribute('role', 'tooltip');
  host.hidden = true;
  document.body.append(host);
  return host;
}

function fill(el: HTMLElement, content: TipContent) {
  const title = document.createElement('b');
  title.textContent = content.title;
  const lines = content.lines.map((l) => {
    const d = document.createElement('div');
    d.className = l.tone === 'warn' ? 'l w' : l.tone === 'dim' ? 'l d' : 'l';
    d.textContent = l.text;
    return d;
  });
  el.replaceChildren(title, ...lines);
}

const viewport = (): Size => ({
  w: document.documentElement.clientWidth,
  h: document.documentElement.clientHeight
});

function position(el: HTMLElement, place: (size: Size, view: Size) => Point) {
  const at = place({ w: el.offsetWidth, h: el.offsetHeight }, viewport());
  el.style.left = `${at.x}px`;
  el.style.top = `${at.y}px`;
}

function show(node: HTMLElement, content: TipContent, place: (size: Size, view: Size) => Point) {
  const el = hostElement();
  fill(el, content);
  el.hidden = false;
  position(el, place);
  owner = node;
  node.setAttribute('aria-describedby', HOST_ID);
}

function hide(node: HTMLElement) {
  if (owner !== node) return;
  owner = undefined;
  node.removeAttribute('aria-describedby');
  if (host) host.hidden = true;
}

export function tooltip(node: HTMLElement, initial: Tip) {
  let content: TipContent | undefined;

  const set = (tip: Tip) => {
    content = tip ? parseTip(tip) : undefined;
    if (content) node.setAttribute(MARK, '');
    else {
      node.removeAttribute(MARK);
      hide(node);
    }
    if (content && owner === node && host && !host.hidden) fill(host, content);
  };

  const innermost = (e: Event) => (e.target as Element | null)?.closest?.(`[${MARK}]`) === node;
  const pointer = (e: MouseEvent) => (size: Size, view: Size) =>
    placeAtPointer({ x: e.clientX, y: e.clientY }, size, view);

  const enter = (e: MouseEvent) => {
    if (content) show(node, content, pointer(e));
  };
  const move = (e: MouseEvent) => {
    if (!content || !innermost(e)) return;
    if (owner === node && host) position(host, pointer(e));
    else show(node, content, pointer(e));
  };
  const leave = () => hide(node);
  const focus = () => {
    if (!content || !node.matches(':focus-visible')) return;
    const r = node.getBoundingClientRect();
    show(node, content, (size, view) => placeBeside(r, size, view));
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') hide(node);
  };

  node.addEventListener('mouseenter', enter);
  node.addEventListener('mousemove', move);
  node.addEventListener('mouseleave', leave);
  node.addEventListener('focusin', focus);
  node.addEventListener('focusout', leave);
  node.addEventListener('keydown', key);
  set(initial);

  return {
    update: set,
    destroy() {
      hide(node);
      node.removeEventListener('mouseenter', enter);
      node.removeEventListener('mousemove', move);
      node.removeEventListener('mouseleave', leave);
      node.removeEventListener('focusin', focus);
      node.removeEventListener('focusout', leave);
      node.removeEventListener('keydown', key);
    }
  };
}
