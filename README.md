# Space4x

A space 4X game with Aurora-style depth: detailed colonies, industry, research, ship design and fleet operations, drawn as procedural pixel art.

## Status

The interface is a SvelteKit app built from the approved mockup. The game starts on present-day Earth, the only site, and its economy runs real materials, recipes and buildings from `src/lib/game/data/` on the game clock towards the first milestone. The map's site scenes, ground forces, commanders and ship designs are still mock, and the top bar says so.

`mockup/` is the approved interface as a static page with no build step. It stays as the reference the app is checked against. `mockup/scenes/` is the approved map scale and ship art reference: real distances, smooth zoom, top-down generated ships and the site scenes; serve `mockup/` and open `scenes/`.

## Running

Needs Node 24 or newer and pnpm (the version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

`pnpm build` writes a single-page static site to `build/`; `pnpm preview` serves it.

The URL query selects a state, the same as in the mockup: `?screen=economy`, `?screen=economy&tab=milestones&milestone=5`, `?screen=research&milestone=12`, `?sel=body:mars`, `?scenario=famine` (Earth short of food), `?zoom=3`, `?arr=float`, `?dock=events:left`, `?screen=classes&cls=lighthouse`. Adding `check` runs the layout check and prints its result in the bottom left corner.

`/dev/primitives` shows the shared panel, table, meter, tab and canvas primitives on one page.

## Checking and testing

| Command               | What it runs                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| `pnpm check`          | the legs the change needs (see below), in the order `check:types`, `lint`, `knip`, `format:check`, `test`, `test:layout` |
| `pnpm check:all`      | every one of those six legs                                                         |
| `pnpm test`           | the vitest unit tests                                                               |
| `pnpm test:layout`    | the Playwright layout test over every query state, plus the interaction tests       |

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
