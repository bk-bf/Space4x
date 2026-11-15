# AGENTS.md: Space4x

How to work on this code as it is now. Plans, decisions and findings go in issues, pull requests and commit messages, not here.

## The code is the ground truth

If something is unclear, find out from the code: grep for it, read it, run it. Do not infer it from a document, a name, or from what a game like this usually does. State what you checked.

## Stack

SvelteKit 3 with Svelte 5 runes and strict TypeScript, built by `@sveltejs/adapter-static` as a single-page app (`ssr = false`, fallback `index.html`) so a desktop shell can wrap it later. pnpm only; never npm, npx or yarn (`pnpm dlx` for one-offs). Commit `pnpm-lock.yaml`.

Imports inside `src/` go through the `#lib/*` subpath import in `package.json` and name the file with its extension: `import { game } from '#lib/game/index.ts'`. SvelteKit 3 has no `$lib`.

Use runes (`$state`, `$derived`, `$effect`, `$props`); not the legacy `$:` syntax or stores.

## Layout of `src/lib/`

| Path                      | What it holds                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `game/`                   | game state, clock, systems and the tick loop; `game/index.ts` is its public face                    |
| `game/mock/<domain>.ts`   | mock world data, one file per domain                                                                |
| `game/systems/`           | simulation systems every screen relies on (orbits, fleet movement)                                  |
| `gfx/`                    | pixel framebuffer, noise and dither, planets, sun, ship class specs, scenes, icons                  |
| `gfx/topdown/`            | top-down ships, turrets, craft, stations and props generated from a design, and their renderer      |
| `ui/`                     | shared primitives, the window manager, the frame bus, the shell state, the layout check             |
| `shell/`                  | the app shell: top bar, screen stage, keyboard, URL query states                                    |
| `screens/list.ts`         | the nine screens, their icons and F keys                                                            |
| `screens/<id>/`           | one folder per screen; `Screen.svelte` is its root                                                  |

`gfx/index.ts`, `ui/index.ts` and `game/index.ts` re-export everything another folder should use. Import from those, or from the one module you need.

## Game state

`game` (from `#lib/game/index.ts`) is the one `Game`. Its fields are runes, so components read them directly and update when they change.

- `game.time` (ms, UTC), `game.elapsed` (game seconds since the start), `game.running`, `game.step` (seconds)
- `game.world`: `bodies`, `fleets`, `contacts` (each names its `system`), `systems` (stars, belt, jump points), `system` (the one the map shows); `game.events`; `game.status` (the top bar chips, read-only: see below)
- a body with `colony: true` is a colony, and the Economy holds one `Colony` with the same id for it: name, system and picture come from the body (`colonyName`, `colonySystem`, `colonyPlanet`, `colonyEnvironment` in `screens/economy/lookup.ts`), so add a colony as a colonised body and an Economy colony together. A body with `parent` is a moon and `bodyPosition(body, bodies)` places it around that body
- `game.body(id)`, `game.fleet(id)`, `game.contact(id)`, `game.starSystem(id)`, `game.jump(id)`, `game.systemOf(selection)`
- a fleet's `orders` are `{ id, type, target, done }`; `addOrder`, `moveOrder`, `removeOrder`, `clearOrders`, `orderLabel`, `orderTargets` and `orderEtas` from `#lib/game/index.ts` edit and describe them, and the `fleets` system carries them out
- `game.selection`: `{ kind: 'fleet' | 'body' | 'contact', id }`; set it with `select(kind, id)` from `#lib/ui/index.ts`, which also shows the Selection window
- `game.advance(seconds)`, `game.setStep(seconds)` (single-steps when paused), `game.run()`, `game.pause()`, `game.toggleRunning()`, `game.log(category, text, warn, { at, subject })` (an event files by its time; a `subject` makes it select that object when clicked)

While running, the loop advances `game.step` of game time per real second, ten ticks a second.

### Ship classes

`game/classes.svelte.ts` holds the one registry of ship classes (`shipClasses()`, `shipClass(id)`, `classStats(id)`, `classBuild(id)`). The designer edits it; shipyards, fleets, the map and Intelligence read it. `game/design.ts` holds the per-part stat tables that every class stat comes from: tons, build points and yard kind (`buildOf`) and speed (`designStats`). A ship keeps only its `classId`, `className(id)` gives the name, and `fleetSpeed(fleet)` is the speed of its slowest class. A screen that keeps a class in use (a yard tooled for it) registers `registerClassUse` so the designer will not delete it.

### Drawing ships

Every ship outside the System map is drawn top-down from its class design by `gfx/topdown/`, the port of `mockup/scenes/ships.js`. `gfx/ships/specs.ts` holds the shared vocabulary: the part keys (`CORE_KEYS`, `STERN_KEYS`, `BOW_KEYS`, `ATTACHMENT_KEYS`), their names (`PNAME`) and the shipped `SPECS`. A design is laid stern to bow in units of `METRES_PER_UNIT` (5 m); `design.ts` `layout()` and `lengthOf()` read the same geometry, so a stat length is the drawn length.

Each part is built into a heightmap, material, component and emissive map once per class object and detail level (`LODS`, 0.375 to 12 px per 5 m) and cached on the class object, so an edited class (a new object) gets new sprites and an unchanged one is never rebuilt. A scale between two levels draws the next level up, scaled down. Each part and each hardpoint is its own component with a `kind` (system), a `name`, its `part` index in `layout()` order and its `slot`.

The API, from `#lib/gfx/index.ts` or `#lib/gfx/topdown/index.ts`, takes any `Pixels` (`w`, `h`, `d`, `px`; an `FB` is one) and screen positions, so a caller draws many ships from its own list of positions:

- `drawShip(fb, cls, { x, y, angle, pxPerMetre, sun?, frame?, livery?, thrust?, damage?, aim?, swap?, systems?, highlight?, dead?, cut?, build?, ghost?, clipX?, charging? })` draws true scale at the detail level for `pxPerMetre`, with drive plumes, turrets turned by `aim` (radians relative to the hull, one per `shipMounts` entry) and lighting from `sun` (screen angle towards the light; the mockup's default when left out). Returns `{ lod, scale, culled }`.
- `drawShipIcon(fb, cls, x, y, angle, sizePx, view?)` draws a fixed-size sprite, whatever the class length.
- `fitShip(cls, w, h, pad?, plumeRoom?)` gives the centre and `pxPerMetre` that fit a class into a box.
- `shipLengthMetres(cls)`, `shipBeamMetres(cls)`, `shipMounts(cls)` (metres from the ship centre, x towards the bow), `shipComponents(cls)`, `pickShip(cls, view, sx, sy)`, `nearestHull(cls, x, y)`, `detailLevel(pxPerMetre)`, `liveryOf(cls)`.
- `new ShipDamage()` holds hits in metres from the centre (`hit(x, y, radius, severity)`); pass it as `damage` and it is mapped onto each detail level once.
- `silhouette(fb, cls, view)` is the red treatment for an unidentified class.
- `drawStation(fb, 'core' | 'ring', view)`, `drawProp(fb, kind, view)` and `drawCraft(fb, 'fighter' | 'shuttle', view)` draw the mockup's stations, props and small craft.

`frame` is the animation counter for blinking lights, plumes and charging guns; screens pass three per frame-bus tick, as the mockup ran at 30 frames a second. Drawing cost grows with the pixels a ship covers, about 90 ns each: draw small ships with `drawShipIcon` rather than at a true scale that covers the screen many times over.

### Top bar chips

`game.status` is evaluated from sources a screen registers with `registerStatus(id, () => ({ icon, value, title, warn? }))` from its `system.ts`; the ids and their order are `STATUS_IDS`. Economy owns wealth, people, fuel, the warning and shipyards, research owns labs. Read the state the chip describes; never store a chip's value.

### Adding a system

A system is a function `(game, dtSeconds) => void` that `game.advance` calls on every tick. Put a screen's simulation in `src/lib/screens/<id>/system.ts`:

```ts
import { registerSystem } from '#lib/game/index.ts';
import { projects } from './projects.svelte.ts';

registerSystem('research', (_game, dt) => {
  for (const p of projects) p.done = Math.min(1, p.done + p.rate * dt);
});
```

`screens/index.ts` loads every `screens/*/system.ts`, so nothing shared needs editing. Registering a name again replaces the earlier function. Systems run in the order they are registered; `orbits`, `fleets` and `contacts` run first. Test a system with vitest by building a `new Game()` and calling `advance`.

## Adding a screen

Each screen owns exactly one folder, `src/lib/screens/<id>/`. Replace its placeholder `Screen.svelte`; put its components, drawing code, mock data and system in the same folder (or its mock data in `game/mock/<domain>.ts`). Do not edit another screen's folder or the shared files to make room for yours; if a shared primitive is missing something, extend the primitive.

A grid screen's root is `ScreenGrid`, which renders `<main class="screen" data-screen="<id>">` straight under `#stage`, where the layout check looks for it:

```svelte
<ScreenGrid id="economy" columns="320px minmax(0,1fr)">
  <Stack>
    <Panel title="Colonies"><Table head={['Colony', '>People']} rows={rows} /></Panel>
    <Panel title="Mars" grow body="col"><CanvasView scale={2} bg="stars" draw={drawPlanet} /></Panel>
  </Stack>
  <Stack>...</Stack>
</ScreenGrid>
```

Only the map stays mounted when another screen is shown; any other screen is mounted when it opens and dropped when it closes, so state that must survive a switch lives in a module-level `$state` in the screen's folder. A screen's URL parameters are applied once at load, not when the screen mounts: export an `applyXParams(params: URLSearchParams)` from the screen's state module and call it from `screens/params.ts`. After that the module state wins, so a button that sets that state and then opens the screen (`showColony(id)`, then `shell.setScreen('economy')`) is not overridden.

## Shared primitives (`#lib/ui/index.ts`)

Reuse these; never copy one into a screen. Each matches a helper in `mockup/screens.js`.

| Primitive                | Mockup         | Use                                                                                                                       |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Panel`                  | `pan()`        | `title` or `head` snippet, `tools` snippet for selects in the title bar, `grow`, `body` = `''`, `col`, `fill`, `center`   |
| `Table`                  | `tbl()`        | `head` (a leading `>` right-aligns a column), `rows` of cells, `selected`, `onpick(row)`, `numeric` when there is no head |
| `Meter`, `Pct`           | `bar()`, `pct()` | a meter bar; a meter followed by its percentage                                                                         |
| `DefList`                | `dl()`         | `rows` of `[term, value]`, `two` for four columns                                                                         |
| `Tabs`                   | `.tabs2`       | `tabs`, `bind:active`; render the active pane yourself                                                                    |
| `CanvasView`             | `fitv()`+`fit()` | a pixel framebuffer that fits its frame: `scale`, `vignette`, `bg`, `height`, `draw(fb, t)`, `onfit`, `labels` snippet  |
| `PixelCanvas`            |                | a framebuffer of fixed size (`width`, `height`, `scale`)                                                                  |
| `ScreenGrid`, `Stack`, `Split` | `.screen`, `.stack`, `.split` | the screen grid and its columns                                                                   |
| `Window`, `Desk`         | `wm.js`        | dockable windows on a desk: `home` (`left`, `right`, `bottom`), `width`, `grow`, `heading`, `tools` snippet               |
| `Icon`                   | `icons.js`     | a pixel icon by name                                                                                                      |

Table cells are a string, a number, a snippet, `{ text, warn }`, `{ meter, label }` or `{ pct }`.

Canvases draw from the frame bus: `CanvasView` and `PixelCanvas` call `draw(fb, t)` on every tick while they are on screen, where `t` is the animation frame counter. Call `requestRender()` after a change that should show before the next tick. Draw into the framebuffer with the `gfx` functions and finish with `fb.present()`, which applies the dithered vignette. Never smooth or scale a canvas any other way; they stay pixel framebuffers scaled with `image-rendering: pixelated`.

The global stylesheet is `src/app.css`, ported from the mockup. Its tokens (`--bg`, `--panel`, `--accent`, `--hot`, `--cool`, ...) and class names are the look; use them rather than new colours or fonts.

## The window manager

`wm` (from `#lib/ui/index.ts`) owns the map desk's windows: docked left (290px), right (310px) or along the bottom (238px), stacked in columns with 8px gutters, or floating. Windows drag by their title bar, re-dock when dropped within 40px of an edge, minimise, close and toggle dock in either mode. `wm.tile()` places them and runs on its own when a window's content or the desk size changes. The Panels popup (the gear) switches the arrangement, shows and hides windows and resets the layout.

## Scripts and the remote runner

`pnpm check` runs only the legs the change needs and `pnpm check:all` runs all six. `tools/ci/gate.mjs` reads the same change scope as CI (`tools/ci/scope.json`): it diffs against the merge-base with `origin/main` (`--base <ref>` overrides; uncommitted and untracked files count), runs `check:types`, `lint`, `knip`, `format:check`, `test`, `test:layout` in that order for the legs that are true, prints which run and which are skipped, and stops at the first failure with its exit code. A docs-only change runs none. `node --test 'tools/ci/*.test.mjs'` tests the leg selection. `pnpm check`, `pnpm check:all`, `pnpm test` and `pnpm test:layout` go through `tools/remote/run.mjs`: on that server, or with `CI=true`, they run in place; anywhere else they send the committed `HEAD` to the server over ssh and run it there and never fall back to the local machine; commit first. They forward `SPACE4X_*`, `VITEST_*`, `SHOTS`, `SIZE` and `PORT`; `SPACE4X_FETCH=<dir>` copies a directory back afterwards.

The Playwright web server picks a free port, or uses `PORT` when it is set, so several checkouts can run at once.

## The layout test is the gate for UI work

`tests/layout.spec.ts` loads every query state at 1440x900 (`SIZE=w,h` overrides it) with `?check` and fails with the messages of `src/lib/ui/layoutCheck.ts`: gaps, overlaps, panels off an edge, clipped or cut-off content, cells past an edge, squashed frames, canvases not filling their frames, scroll and empty-space imbalance, overlapping map labels, labels under windows, a wrapped top bar and a scrolling page. A screen whose `Screen.svelte` still renders `<Placeholder` is `fixme`; replacing the placeholder turns its states on, and they must pass before the work is done. `tests/interaction.spec.ts` covers the clock, steps, screen switching and every window operation; `tests/primitives.spec.ts` covers the shared primitives on `/dev/primitives`.

For a change to layout or behaviour, also look at the result: `SHOTS=<dir> pnpm test:layout`, then open the PNGs next to the mockup in the same state.

## Conventions

- No comments anywhere: not in code, config or tests. Use clearer names, smaller functions, or a test.
- Never render an internal identifier to the player; show a human label.
- Mock data stays visibly mock: the red "mock data" tag in the top bar stays while any is shown.
- Follow the mockup: Aurora 4X's screen organisation and density; icons, not text, for screen buttons and status values; compact tables; no gaps; nothing laid over the map except the windows; one Selection window for whatever is selected; screen buttons switch whole screens, never popups.
- Commit messages say why and how the change was verified.
