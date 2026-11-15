# Space4x

A space 4X game with Aurora-style depth: detailed colonies, industry, research, ship design and fleet operations, drawn as procedural pixel art.

## Status

The interface is being built as a SvelteKit app from the approved mockup. The system map, its window manager, the top bar and the game clock work; the other eight screens are placeholders. Everything shown runs on mock data, and the top bar says so.

`mockup/` is the approved interface as a static page with no build step. It stays as the reference the app is checked against.

## Running

Needs Node 24 or newer and pnpm (the version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

`pnpm build` writes a single-page static site to `build/`; `pnpm preview` serves it.

The URL query selects a state, the same as in the mockup: `?screen=economy`, `?sel=body:mars`, `?sel=contact:C-014`, `?sys=acen` (the system the map shows), `?zoom=3`, `?arr=float`, `?dock=events:left`, `?screen=classes&cls=lighthouse`. Adding `check` runs the layout check and prints its result in the bottom left corner.

`/dev/primitives` shows the shared panel, table, meter, tab and canvas primitives on one page.

## Checking and testing

| Command               | What it runs                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| `pnpm check`          | `check:types`, `lint`, `knip` and `format:check`                                    |
| `pnpm test`           | the vitest unit tests                                                               |
| `pnpm test:layout`    | the Playwright layout test over every query state, plus the interaction tests       |

`pnpm check`, `pnpm test` and `pnpm test:layout` run on the test server through `tools/remote/run.mjs`: on that server, or with `CI=true`, they run in place; anywhere else they send the committed `HEAD` to the server over ssh and run it there, so commit first.

The layout test loads each state at 1440x900. `SIZE=1100,700 pnpm test:layout` uses another window size.

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
