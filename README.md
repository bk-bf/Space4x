# Space4x

A space 4X game with Aurora-style depth: detailed colonies, industry, research, ship design and fleet operations, drawn as procedural pixel art.

## Status

The interface is a SvelteKit app built from the approved mockup. The game starts on present-day Earth, the only site, and its economy runs real materials, recipes and buildings from `src/lib/game/data/` on the game clock towards the first milestone. What is not built yet is mock, and the game build does not show it: the six map site scenes, the Ground forces, Commanders, Intelligence, Galaxy and Ship classes screens and the colony surface scene live in the gallery build (see *Game and gallery*).

`mockup/` is the approved interface as a static page with no build step. It stays as the reference the app is checked against. `mockup/scenes/` is the approved map scale and ship art reference: real distances, smooth zoom, top-down generated ships and the site scenes; serve `mockup/` and open `scenes/`.

## Running

Needs Node 24 or newer and pnpm (the version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

`pnpm build` writes a single-page static site to `build/`; `pnpm preview` serves it.

The URL query selects a state, the same as in the mockup: `?screen=economy`, `?screen=research&milestone=12&rtab=unlocks`, `?sel=body:mars`, `?scenario=famine` (Earth short of food), `?zoom=3`, `?arr=float`, `?dock=events:left`, `?screen=classes&new=stage`. Adding `check` runs the layout check and prints its result in the bottom left corner.

`/dev/primitives` shows the shared panel, table, meter, tab and canvas primitives on one page.

## Game and gallery

One codebase, two builds, switched by `VITE_SPACE4X_GALLERY` (read only in `src/lib/shell/mode.ts`).

- **game** (the default, https://space4x.callmedaddy.dedyn.io/): the top bar lists only real screens, the map has no sites, the colony screen has no surface scene, and a URL naming a mock screen opens the map.
- **gallery** (`VITE_SPACE4X_GALLERY=1`): every screen and mock scene, with a hot-coloured underline on the top bar and the page title "Space4x gallery" (a tag beside the name does not fit at 1440 px once the chips grow). Served by the mockups server (see the `mockups` skill) at `/space4x-gallery/`, from `~/mockups/space4x-gallery/`.

`deploy/build` makes both: the game into `build/`, then the gallery with `SPACE4X_BASE=/space4x-gallery` copied to `~/mockups/space4x-gallery/` when `~/mockups` exists (`GALLERY_DIR` overrides the path). `deploy/update` runs it whenever `dev` moves. `SPACE4X_OUT` overrides the output directory of a single `pnpm build`.

`pnpm dev` runs the game; `VITE_SPACE4X_GALLERY=1 pnpm dev` runs the gallery.

## Checking and testing

| Command               | What it runs                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| `pnpm check`          | the legs the change needs (see below), in the order `check:types`, `lint`, `knip`, `format:check`, `test`, `test:layout` |
| `pnpm check:all`      | every one of those six legs                                                         |
| `pnpm test`           | the vitest unit tests                                                               |
| `pnpm test:layout`    | the Playwright tests in two projects: `gallery` runs every layout state and the interaction tests, `game` runs the layout states of real screens and `tests/game.spec.ts`, which checks that nothing mock is reachable       |

`pnpm check` reads the same change scope as CI (`tools/ci/scope.json`): it diffs `HEAD` against the merge-base with `origin/dev` (`node tools/ci/gate.mjs --base <ref>` diffs against another ref), counts uncommitted and untracked files too, and runs only the legs whose paths changed. It prints which legs run and which are skipped, and stops at the first failure with its exit code. A docs-only change runs none of them. `node --test 'tools/ci/*.test.mjs'` tests the leg selection.

`pnpm check`, `pnpm check:all`, `pnpm test` and `pnpm test:layout` run on the test server through `tools/remote/run.mjs`: on that server, or with `CI=true`, they run in place; anywhere else they send the committed `HEAD` to the server over ssh and run it there, so commit first.

The layout test loads each state at 1440x900. `SIZE=1100,700 pnpm test:layout` uses another window size.

## Branches and promotion

Work lands on `dev`, the default branch; `main` is what has been playtested. The dev build runs at https://space4x.callmedaddy.dedyn.io/ and follows `dev` on its own. `main` moves only through `pnpm promote`, which merges `dev` onto `main` as the candidate branch `promote/main`, waits for the `promote` workflow (`pnpm check:all` and `pnpm build`) and leaves a worktree to playtest with `pnpm dev`; `pnpm promote --push` then pushes it to `main`, and `pnpm promote --list` shows what is waiting.

| Command                | What it does                                                                |
| ---------------------- | --------------------------------------------------------------------------- |
| `pnpm promote --list`  | the commits and merged pull requests on `dev` that `main` lacks             |
| `pnpm promote`         | builds and verifies the candidate, then points at the playtest              |
| `pnpm promote --push`  | pushes the verified candidate to `main`                                     |

`./install.sh`, run in a checkout that is on `dev`, installs the user units in `deploy/`: `space4x-serve.service` serves the static build on the machine's Tailscale address, port 8800, and `space4x-update.path` rebuilds it when `dev` or `origin/dev` moves, which `git-autofetch` keeps current.

## Screenshots

`SHOTS=<dir> pnpm test:layout` writes one PNG per layout state into `<dir>`. Run from another machine, the shots land on the test server; fetch them back with a relative directory:

```sh
SHOTS=test-results/shots SPACE4X_FETCH=test-results/shots pnpm test:layout
```

To compare against the mockup, serve `mockup/` with any static file server and open `index.html` with the same query string. `mockup/check.sh` runs the mockup's own layout check:

```sh
URL=http://<host>:<port>/ bash mockup/check.sh [screenshot-dir]
```

## Fonts

`static/VT323.ttf` and `static/PixelifySans.ttf` (copies of the ones in `mockup/`) are under the SIL Open Font License; their licences are `static/OFL-VT323.txt` and `static/OFL-PixelifySans.txt`.
