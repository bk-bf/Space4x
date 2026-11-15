# Space4x

A space 4X game with Aurora-style depth: detailed colonies, industry, research, ship design and fleet operations, drawn as procedural pixel art.

## Status

The game is not built yet. `mockup/` holds the approved interface mockup: a static page with no build step.

## Viewing the mockup

Serve `mockup/` with any static file server and open `index.html`. The query string selects a state, for example `?screen=economy`, `?sel=body:mars`, `?zoom=3`, `?arr=float` or `?dock=events:left`.

`mockup/check.sh` loads each of those states in headless Chromium and prints the layout check's result. It needs `URL` set to where the mockup is served:

```sh
URL=http://<host>:<port>/ bash mockup/check.sh [screenshot-dir]
```

## Fonts

`mockup/VT323.ttf` and `mockup/PixelifySans.ttf` are under the SIL Open Font License; their licences are `mockup/OFL-VT323.txt` and `mockup/OFL-PixelifySans.txt`.
