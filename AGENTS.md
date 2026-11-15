# AGENTS.md: Space4x

How to work on this code as it is now. Plans, decisions and findings go in issues, pull requests and commit messages, not here.

## The code is the ground truth

If something is unclear, find out from the code: grep for it, read it, run it. Do not infer it from a document, a name, or from what a game like this usually does. State what you checked.

## Stack

SvelteKit 3 with Svelte 5 runes and strict TypeScript, built by `@sveltejs/adapter-static` as a single-page app (`ssr = false`, fallback `index.html`) so a desktop shell can wrap it later. pnpm only; never npm, npx or yarn (`pnpm dlx` for one-offs). Commit `pnpm-lock.yaml`.

Imports inside `src/` go through the `#lib/*` subpath import in `package.json` and name the file with its extension: `import { game } from '#lib/game/index.ts'`. SvelteKit 3 has no `$lib`.

Use runes (`$state`, `$derived`, `$effect`, `$props`); not the legacy `$:` syntax or stores.

## Layout of `src/lib/`

| Path                    | What it holds                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `game/`                 | game state, clock, systems and the tick loop; `game/index.ts` is its public face               |
| `game/mock/<domain>.ts` | mock world data, one file per domain                                                           |
| `game/systems/`         | simulation systems every screen relies on (orbits, fleet movement)                             |
| `game/shipdesign/`      | ship design as components with counts: stats, design errors, flight handoff, top-down art      |
| `gfx/`                  | pixel framebuffer, noise and dither, planets, sun, ship class specs, scenes, icons             |
| `gfx/topdown/`          | top-down ships, turrets, craft, stations and props generated from a design, and their renderer |
| `ui/`                   | shared primitives, the window manager, the frame bus, the shell state, the layout check        |
| `shell/`                | the app shell: top bar, screen stage, keyboard, URL query states                               |
| `screens/list.ts`       | the nine screens, their icons and F keys                                                       |
| `screens/<id>/`         | one folder per screen; `Screen.svelte` is its root                                             |

`gfx/index.ts`, `ui/index.ts` and `game/index.ts` re-export everything another folder should use. Import from those, or from the one module you need.

## Game state

`game` (from `#lib/game/index.ts`) is the one `Game`. Its fields are runes, so components read them directly and update when they change.

- `game.time` (ms, UTC), `game.elapsed` (game seconds since the start), `game.running`, `game.step` (seconds)
- `game.world`: `bodies`, `fleets`, `contacts` (each names its `system`), `systems` (stars, belt, jump points), `system` (the one the map shows); `game.events`; `game.status` (the top bar chips, read-only: see below)
- a body with `colony: true` is a colony, and the economy holds one site for it whose `worldBody` is that body's id (`siteById(bodyId)` finds it), so add a colony as a colonised body and an economy site together. A body with `parent` is a moon and `bodyPosition(body, bodies)` places it around that body
- `game.body(id)`, `game.fleet(id)`, `game.contact(id)`, `game.starSystem(id)`, `game.jump(id)`, `game.systemOf(selection)`
- a fleet's `orders` are `{ id, type, target, done }`; `addOrder`, `moveOrder`, `removeOrder`, `clearOrders`, `orderLabel`, `orderTargets` and `orderEtas` from `#lib/game/index.ts` edit and describe them, and the `fleets` system carries them out
- `game.selection`: `{ kind: 'fleet' | 'body' | 'contact', id }`; set it with `select(kind, id)` from `#lib/ui/index.ts`, which also shows the Selection window
- `game.advance(seconds)`, `game.setStep(seconds)` (single-steps when paused), `game.run()`, `game.pause()`, `game.toggleRunning()`, `game.log(category, text, warn, { at, subject })` (an event files by its time; a `subject` makes it select that object when clicked)

While running, the loop advances `game.step` of game time per real second, ten ticks a second.

### Ship classes

There are no premade classes. `game/classes.svelte.ts` holds the one registry (`classes`, starts empty) of the `ShipDesign`s the player makes: `shipClasses()`, `shipClass(id)` (the drawable top-down spec, built once per design object), `classStats(id)`, `className(id)`. A ship keeps only its `classId`. The Ship classes screen edits the registry; Economy, the map and Intelligence read it and must cope with it being empty. The mock fleets still name classes that no longer exist, so `className` gives them `Unknown class`, the map draws them as markers, and `fleetSpeed(fleet)` is the fixed `MOCK_FLEET_SPEED` until flight replaces it. A screen that keeps a class in use (a yard tooled for it) registers `registerClassUse` so the designer will not delete it. `game/design.ts` is only the drawing geometry (`layout()`, `lengthOf()`); `gfx/ships/specs.ts` `SPECS` are art for the mock scenes, not classes.

### Ship design

`src/lib/game/shipdesign/` (import from `#lib/game/shipdesign/index.ts`) is pure TypeScript with no Svelte. A `ShipDesign` is `{ id, name, role, yard, parts: [{ component, count }], load, locked }`: `role` is one of `ROLES` (launcher, transfer, lander, capsule, freighter, probe), `yard` is `rocket_factory` (on Earth, so the ship must lift off from it) or `orbital_shipyard`, `load` is kilograms of each `PropellantKind`. Edit it only with the functions in `edit.ts` (`setCount`, `addPart`, `removePart`, `setLoad`, `rename`, `setRole`, `setYard`, `copyOf`, `lock`, `canLock`): each returns a new object, a locked design comes back unchanged, and tanks that were full stay full as parts change. A class that is locked can only be copied.

**Component figures** are the `design` record of each entry in `components.json`: `mass` kg (an engine takes it from `performance.mass`), `crew` needed aboard (a reactor or drive needs an operator unless some component `automates`, as avionics does; a capsule's own crew stays), `housing` berths, `stores` kg of consumables, `supports` crew a life support unit sustains, `power` kW drawn, `generates` kW made at 1 AU, `storage` kWh, `heat` kW of waste heat (defaults to `power`), `radiates` kW, `volume` m3 of tank, `propellants` (a tank holds them, an engine burns its one), `cargo` kg, `landing` and `reentry` kg a set of legs or a heat shield handles, `insulates`, plus `basis` (how the figure comes about), `source` (a URL where it is real) and `estimated`. Propellant kinds in `propellants.ts` give the bulk density in a tank, the materials of the mix and whether it is cryogenic; tank room is the volume shared between the kinds that tank accepts.

**`designStats(design, unlockedUpTo?)`** returns `lines` (count, mass, material cost per component), `dryMass`, `propellant` and `capacity` by kind, `payloadCapacity`, `loaded` (full tanks and bay) and `empty` (no payload) conditions each with `mass`, `deltaV` (through `shipDeltaV`), `acceleration` and `thrustToWeight` and `liftoff` on `earth`, `moon` and `mars` (sea-level thrust on Earth, `MIN_LIFTOFF_TWR`), `drives` and `main` (the drive with the most delta-v; engines of one propellant add up with a thrust-weighted Isp), `crew`, `berths`, `stores`, `endurance` days (5 kg a person a day without a life support unit, 1 with), `power` (made, used, engines, balance, storage), `heat` (produced, radiated with 0.5 kW a tonne passive, balance), `builtAt` (yards that can build every part), `cost` and `propellantCost` in materials, and `issues` with `errors` and `warnings`. A class can be locked only with no errors. Errors: no parts, a locked component, no engine, no tank for the engine's propellant, no propellant loaded, crew without berths or stores, power deficit (a battery turns it into a warning), heat deficit, a yard that cannot build the parts, thrust too low to leave Earth from the rocket factory, a lander without legs or overloading them, a return capsule without a heat shield or overloading it, a freighter without a cargo bay. Warnings: load that does not fit, a throttled electric drive, no battery for an eclipse, a launcher short of the delta-v to reach low Earth orbit, a reactor beside the crew without a shield, cryogenic propellant without insulation on anything but a launcher, a lander too weak to hover on the Moon.

**For flight:** `flightShip(design, { propellant?, payload? })` returns what `planTrip` takes (`{ dryMass, payload, propellant, engine, powerAvailable }`) or `undefined` with no engine: `dryMass` includes the other propellants carried, `engine` is the main drive added up (`thrust`, `thrustSeaLevel` and `power` are totals, `count` is left out), `propellant` and `payload` default to the full propellant load and an empty bay and are clamped to what the design holds. `designSpec(design)` (`art.ts`) maps the components to the top-down generator's parts: engines to the stern (`big` for four or more or a nuclear or fusion drive), tanks, reactors, habitats, trusses and cargo bays to sections (a count of n gives `1 + floor(log2 n)` sections up to a cap), solar arrays, radiators, thrusters, legs and antennas to attachment slots, and a capsule, adapter or heat shield to the bow.

**The screen** (`screens/classes/`) edits the registry live with no save step: the catalogue by kind with locked parts shown with the milestone they wait for, the component list with counts, mass and cost, the propellant load, the design errors, the drawing and the statistics. `?screen=classes&new=stage` and `&new=crewed` open a ready design, and `&reached=<n>` marks milestones 1 to n reached, for tests.

### Drawing ships

Every ship outside the System map is drawn top-down from its class design by `gfx/topdown/`, the port of `mockup/scenes/ships.js`. `gfx/ships/specs.ts` holds the shared vocabulary: the part keys (`CORE_KEYS`, `STERN_KEYS`, `BOW_KEYS`, `ATTACHMENT_KEYS`), their names (`PNAME`) the shipped `SPECS` (art for the mock scenes) and `designSpec()` in `game/shipdesign/art.ts`, which draws a class from its components. A design is laid stern to bow in units of `METRES_PER_UNIT` (5 m); `design.ts` `layout()` and `lengthOf()` read the same geometry, so a stat length is the drawn length.

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

`game.status` is evaluated from sources a screen registers with `registerStatus(id, () => ({ icon, value, title, warn? }))` from its `system.ts`; the ids and their order are `STATUS_IDS`. Economy owns all six: people, food against need, power balance, compute, the scarcest material and milestones reached. Read the state the chip describes; never store a chip's value.

### Game data

The economy runs on JSON in `src/lib/game/data/`, so that a Rust simulation can read the same files later. `#lib/game/data/index.ts` loads them and exports the records (`materials`, `recipes`, `buildings`, `shipComponents`, `milestones`), lookups by id (`material(id)`, `building(id)`, ...), and the derived graphs: `recipesProducing`, `recipesConsuming`, `recipesAt`, `materialSites` (where a material is extracted and where it can be made), `unlockedAt`, and `reach`, which computes what exists from extraction alone up to a milestone, on the thin path or the whole set, or on one site.

| Folder or file                       | Holds                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `materials/<category>.json`          | one small record per material; a category that outgrows about 400 lines gets `<category>-<part>.json`   |
| `recipes/<group>.json`               | a building turns `inputs` into `outputs`, each a map of material id to amount                           |
| `buildings/<kind>.json`              | where it stands, what it costs, who works it; extractors name the materials they work through `sources` |
| `components.json`, `milestones.json` | ship components; the 29 gates from present-day Earth to a stabilised jump point                         |

Ids are `snake_case` and unique across materials, buildings, components and recipes. Amounts are kg unless the material has a `unit` (`cu` compute, `model` trained model). A recipe's `power` is kW while it runs, `hours` is the batch time, and `generates` is kW produced by a generator.

- **A material** is one record in the file of its category. `sources` lists where it is mined or collected: `{ body, how, building }`, with a `body` from `types.ts`, and a `building` of kind `extraction` that stands on that body. A material with no `sources` must be the output of a recipe. `tier` is `P` proven, `E` engineering-plausible, `S` speculative. `source` is a working URL.
- **A recipe** is one record in the file for its building. `milestone` is when it unlocks and may not precede its building's. `estimated: false` means the ratio follows a balanced reaction or a standard composition that `reaction` states and `source` cites; the tests then check the mass balance to one percent. Everything else is `estimated: true`, and no recipe may create mass. `power` and `hours` are placeholders everywhere until the economy is tuned.
- **A milestone** lists in `needs` the materials, buildings and components that must be producible when it is reached, using what milestones up to and including it unlock. `requires` names earlier milestones only.
- **The thin path** is `thin: true` on a record. Thin recipes, buildings and components may use only thin materials, every milestone's `needs` must be thin, and `reach({ thinOnly: true })` must reach all of them in order. Buildings with `start: true` exist on Earth at the start and are not paid for.
- Politics never restricts supply; scarcity comes from physics, geology and industry only.

`src/lib/game/data/data.test.ts` is the gate: unique ids, known references, every material extractable or produced, mass balance, the thin path closing on itself, every milestone 1 to 29 reachable in order, and no material, building, component or recipe stranded by a cycle. Add data, then run `pnpm exec vitest run src/lib/game/data` until it is green.

### Flight planning

`src/lib/game/flight/` is the movement rule of #8 as pure functions: SI units (metres, seconds, kilograms, m/s), float64, no Svelte, no globals, nothing wired into the game loop yet. Import from `#lib/game/flight/index.ts`. Time is game seconds (`game.elapsed`). It takes bodies as arguments (`FlightBody`: `gm`, `radius`, `orbit`, `angle`, `angularSpeed`, optional `parent`, `lowOrbitAltitude`, `atmosphere`), so it does not import the mock world; `reference.ts` holds real Sun, Earth, Moon, Mars and Jupiter constants for tests.

- **Engines**: `components.json` gives each propulsion component a `performance` record (`isp` s, `thrust` N vacuum, `thrustSeaLevel`, `mass` kg, `power` kW, `basis` flown, ground-tested or design-study, `source` URL). A `Ship` is `{ dryMass, payload, propellant, engine, count?, powerAvailable? }`; an electric engine's thrust is scaled by `powerAvailable / power` when that is given.
- **Rocket equation** (`rocket.ts`): `propellantForDv`, `dvFromMasses`, `shipDeltaV`, `massAfterBurn`, `burnTime`, `meanAcceleration`, `legBudget(ship, [dv1, dv2])` for out-and-back, `roundTripFeasible`.
- **Wells** (`wells.ts`): `surfaceToOrbit`, `orbitToSurface({ aero })`, `escapeFromOrbit(gm, r, vInf)` and `captureIntoOrbit(...)` with the Oberth effect, `lowOrbitRadius`, `circularSpeed`, `orbitalPeriod`.
- **Transfers** (`kepler.ts`, `line.ts`, `spiral.ts`): `hohmann`, `synodicPeriod`, `crossingTransfer` (departure burn tangential, arrival crossing the target orbit; reduces to Hohmann), `brachistochroneTime`, `burnFlipBurn`, `burnCoastBurn`, `solveLine` (moving target), `lineThresholdAcceleration`.
- **Planner**: `planTrip({ from, to, departAfter, ship, system, aerobrake? })` returns `{ options, reasons }`. A `Place` is `{ kind: 'surface', body }`, `{ kind: 'orbit', body, altitude? }` or `{ kind: 'point', id, primary?, orbit, angle, angularSpeed? }` (a jump point or station at fixed elements). Each `TripOption` has `profile` (`cheapest`, `balanced`, `fastest`), `model`, `departure`, `window`, `arrival`, `duration`, `dv`, `propellant`, `propellantLeft`, `canStop`, `canReturn`, `returnDv`, `aerobraked`, `maneuvers` (kind, mode, dv, duration, start) and `stamps`. `reasons` carries a code (`delta-v`, `thrust-surface`, `thrust-landing`, `no-path`, `same-place`, `unknown-body`) with `need` and `have`; when a ship can leave but not stop, one option with `canStop: false` comes with the `delta-v` reason.
- **Ship state**: `positionAt(option, t)` gives `pos`, `vel` (system frame), `phase` (`parked`, `departing`, `accelerating`, `coasting`, `decelerating`, `transfer`, `arriving`, `arrived`), `thrusting`. It is a function of absolute `t` only, so a 30-day step and thirty 1-day steps give the same position. `eventsOf(option)` lists burn starts and ends, the flip and the arrival.

Approximations, all deliberate:

- **Common primary.** A trip is planned around the deepest body both places orbit (Sun for planets, a planet for its moons). Moon-to-planet legs climb out stage by stage: escape the moon to zero excess speed, then escape the planet from the moon's orbit radius. Circular coplanar orbits only, prograde, no gravity assists, patched conics.
- **Ascent and landing.** Ideal energy cost `sqrt(2 gm (1/R - 1/(2 r)))` times `1 + 0.085` (gravity loss calibrated on the Moon's 1.87 km/s) plus the body's `atmosphere.ascentLoss` (calibrated net of rotation so Earth gives 9.4 km/s). Lift-off needs thrust-to-weight 1.2 on sea-level thrust; landing needs 1.0 at the final mass unless the body's air does it (`landingDv`). Aerobraking is `captureIntoOrbit` with `residualDv` instead of the burn, only below `aerobrake.maxVInf`, and only when `aerobrake: true`.
- **Orbit model (impulsive).** Burns happen at the periapsis of the parking orbit as up to 24 passes of at most 30 degrees of arc each, with a finite-burn loss of `arc^2 / 8` per pass (velocity-aligned thrust). More passes than that makes the leg a continuous spiral costing `vc + vInf`. If the thrusting at a planet spans more than 30 degrees of that planet's orbit, the whole trip becomes a spiral.
- **Spiral model.** Edelbaum tangential thrust between circular orbits, `|vc1 - vc2|`; position is `r = gm / v^2` with the swept angle integrated numerically. Valid while the acceleration is well below local gravity; the arrival velocity then has a radial part of about `2 a / g` of the circular speed (measured 9 percent for two NEXT thrusters on a 5.5-tonne ship going to Mars, 37 percent for eight). `TripOption.approximate` is true when `a / g` at the outer orbit exceeds 0.1.
- **Windows.** The target must lead the origin by the angle that makes the ship meet it: `sweep - omega_target * T`. Windows repeat at the synodic period. A ship parked at a planet departs from any phase of its parking orbit; the wait of up to one parking period is not added.
- **Fast transfers.** `crossingTransfer` raises the departure burn above Hohmann: faster, costlier, arriving across the target's orbit instead of tangent. It is only used while burns take at most 25 percent of the flight (impulsive assumption).
- **Straight-line model.** The primary's gravity is ignored. Thrust is constant at the mass-averaged acceleration of the burn, found by fixed point with the rocket equation; with a delta-v budget below the full burn it is burn-coast-burn. The target moves, so the flight time is solved by iterating the arrival point; arrival matches the target's velocity. Used only when `g(r_closest) * T / (a * t1) <= 0.05` (equivalently `a >= 2 g / 0.05` for a full burn, `lineThresholdAcceleration`: 0.24 m/s2 at 1 AU for the Sun), and the straight path stays outside the primary. Integrated under the Sun's gravity at the threshold the miss is 3.8 percent of the distance; at ten times the threshold it is 0.4 percent, at a tenth it is 30 percent (`line.test.ts`). The planner delays a straight-line departure up to one synodic period to clear the Sun.
- **Why the models are not compared at a boundary.** Hohmann minimises delta-v and the straight line minimises time, so for one ship they differ by orders of magnitude in both (259 days at 5.6 km/s against days at hundreds of km/s). What the tests check is each model against numerical integration of its own physics, and that a very fast crossing orbit reduces to a straight coast.
- **Profiles.** `cheapest` is Hohmann (or the spiral); `fastest` spends the ship's whole delta-v on whichever of the crossing family and the straight line arrives first; `balanced` is the same at the geometric mean of the two delta-v. `canReturn` plans the return from the arrival time with the propellant left and without aerobraking.
- **Positions.** The ship follows the primary-centred path from the origin level's centre to the target level's centre; during local burns it is on the place's own parking ring. Jumps between the two are at most a parking radius.

### The economy

`src/lib/game/economy/` simulates the data above. It is pure TypeScript plus one `.svelte.ts` for the live state, and it imports no screen; `screens/economy/system.ts` registers it as the `economy` system and owns the chips. `economy` (from `#lib/game/economy/index.ts`) is the one `Economy`: `sites`, `done` (milestone numbers reached), `running` programmes, `elapsed` and a mass `ledger`. Change it only through the actions in `actions.ts` and `programmes.ts`, then call `touch()`, which drops the cached `flowsOf(site)` that every screen reads.

- **A site** is a place with a stockpile (`stock`, kg or the material's unit), building `groups`, a construction `queue`, `population`, a workforce share and a `gridKw`. Its `body` is a data `Body`, which decides what can stand and be extracted there, and `worldBody` is the map body. Earth is the only site; a station, the Moon or an asteroid is another `Site` in `economy.sites`, and nothing else changes.
- **A group** is `count` buildings of one type running one `process`: a recipe, or `extract:<material>` for a material whose `sources` name that building on that body (`EXTRACT_KG_PER_HOUR` each, a placeholder). A recipe input its own building extracts where it stands (air at an air separation plant) is drawn from the environment. A group with no process is idle; one switched off runs at nothing. `assign(eco, site, group, process, count)` moves some or all of a group to another unlocked process.
- **Rates.** `siteFlows(eco, site)` gives every group a share of full rate: capped by workers (population times workforce share, shared out in proportion), then scaled down in proportion wherever an input has no stock and its consumers want more than its producers make. Power (`POWER`) and compute are never stockpiled, so they always balance this way: the grid plus generators against demand, data centres against recipes, builds and programmes. People eat about 1 kg of food a person a day (any food material, from surplus first and stores second); population grows `growthPerYear` while everyone is fed and shrinks while anyone is not.
- **Time.** `advanceEconomy(eco, seconds, log)` integrates in segments that end at each game day, when a stock runs out, when a build finishes and when a programme finishes, so a 30-day step gives the same totals as thirty one-day steps. The ledger counts kilograms extracted, eaten, built, spent on programmes and lost in recipes; the stock change always equals extracted less the rest.
- **Construction** builds the first `BUILD_SLOTS` unpaused orders in queue order, spending each building's cost evenly over `buildHours` (placeholder: ten days plus two days a tonne); a short material slows it and is named on the order. A finished building joins the group with the same building and recipe.
- **Programmes.** Records tagged with milestone `m` unlock once every non-optional milestone below `m` is done (`unlockedUpTo`), which is the order `reach({ upTo })` checks. A milestone can start when its `requires` are done, its buildings stand, a builder for its parts stands and its bill is in stock; starting spends the bill. The bill (50 t times the milestone number of each needed material, plus one of each needed part), the length (60 days plus 30 a step, longer for engineering and speculative tiers) and the compute (from milestone 6) are placeholders in `programmes.ts`.
- **Earth at the start** is `src/lib/game/data/earth.json`: population, workforce share, food a person, growth, grid, stock days and the groups. Its `sizing` block states the rule the counts follow: farmland feeds the population with a 5% surplus, end products run at present-day world output, every other group feeds its consumers plus 10%, the grid covers start demand with about 15% to spare, and stocks start at 90 days of production. Change a count and keep that rule, or change the rule there.
- `?scenario=famine` halves Earth's farmland and empties its food stores at load, for tests.

## Adding a system

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
    <Panel title="Colonies"><Table head={['Colony', '>People']} {rows} /></Panel>
    <Panel title="Mars" grow body="col"><CanvasView scale={2} bg="stars" draw={drawPlanet} /></Panel>
  </Stack>
  <Stack>...</Stack>
</ScreenGrid>
```

Only the map stays mounted when another screen is shown; any other screen is mounted when it opens and dropped when it closes, so state that must survive a switch lives in a module-level `$state` in the screen's folder. A screen's URL parameters are applied once at load, not when the screen mounts: export an `applyXParams(params: URLSearchParams)` from the screen's state module and call it from `screens/params.ts`. After that the module state wins, so a button that sets that state and then opens the screen (`showColony(id)`, then `shell.setScreen('economy')`) is not overridden.

## Shared primitives (`#lib/ui/index.ts`)

Reuse these; never copy one into a screen. Each matches a helper in `mockup/screens.js`.

| Primitive                      | Mockup                        | Use                                                                                                                       |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Panel`                        | `pan()`                       | `title` or `head` snippet, `tools` snippet for selects in the title bar, `grow`, `body` = `''`, `col`, `fill`, `center`   |
| `Table`                        | `tbl()`                       | `head` (a leading `>` right-aligns a column), `rows` of cells, `selected`, `onpick(row)`, `numeric` when there is no head |
| `Meter`, `Pct`                 | `bar()`, `pct()`              | a meter bar; a meter followed by its percentage                                                                           |
| `DefList`                      | `dl()`                        | `rows` of `[term, value]`, `two` for four columns                                                                         |
| `Tabs`                         | `.tabs2`                      | `tabs`, `bind:active`; render the active pane yourself                                                                    |
| `CanvasView`                   | `fitv()`+`fit()`              | a pixel framebuffer that fits its frame: `scale`, `vignette`, `bg`, `height`, `draw(fb, t)`, `onfit`, `labels` snippet    |
| `PixelCanvas`                  |                               | a framebuffer of fixed size (`width`, `height`, `scale`)                                                                  |
| `ScreenGrid`, `Stack`, `Split` | `.screen`, `.stack`, `.split` | the screen grid and its columns                                                                                           |
| `Window`, `Desk`               | `wm.js`                       | dockable windows on a desk: `home` (`left`, `right`, `bottom`), `width`, `grow`, `heading`, `tools` snippet               |
| `Icon`                         | `icons.js`                    | a pixel icon by name                                                                                                      |

Table cells are a string, a number, a snippet, `{ text, warn }`, `{ meter, label }` or `{ pct }`.

Canvases draw from the frame bus: `CanvasView` and `PixelCanvas` call `draw(fb, t)` on every tick while they are on screen, where `t` is the animation frame counter. Call `requestRender()` after a change that should show before the next tick. Draw into the framebuffer with the `gfx` functions and finish with `fb.present()`, which applies the dithered vignette. Never smooth or scale a canvas any other way; they stay pixel framebuffers scaled with `image-rendering: pixelated`.

The global stylesheet is `src/app.css`, ported from the mockup. Its tokens (`--bg`, `--panel`, `--accent`, `--hot`, `--cool`, ...) and class names are the look; use them rather than new colours or fonts.

## The window manager

`wm` (from `#lib/ui/index.ts`) owns the map desk's windows: docked left (290px), right (310px) or along the bottom (238px), stacked in columns with 8px gutters, or floating. Windows drag by their title bar, re-dock when dropped within 40px of an edge, minimise, close and toggle dock in either mode. `wm.tile()` places them and runs on its own when a window's content or the desk size changes. The Panels popup (the gear) switches the arrangement, shows and hides windows and resets the layout.

## Scripts and the remote runner

`pnpm check` runs only the legs the change needs and `pnpm check:all` runs all six. `tools/ci/gate.mjs` reads the same change scope as CI (`tools/ci/scope.json`): it diffs against the merge-base with `origin/dev` (`--base <ref>` overrides; uncommitted and untracked files count), runs `check:types`, `lint`, `knip`, `format:check`, `test`, `test:layout` in that order for the legs that are true, prints which run and which are skipped, and stops at the first failure with its exit code. A docs-only change runs none. `node --test 'tools/ci/*.test.mjs'` tests the leg selection. `pnpm check`, `pnpm check:all`, `pnpm test` and `pnpm test:layout` go through `tools/remote/run.mjs`: on that server, or with `CI=true`, they run in place; anywhere else they send the committed `HEAD` to the server over ssh and run it there and never fall back to the local machine; commit first. They forward `SPACE4X_*`, `VITEST_*`, `SHOTS`, `SIZE` and `PORT`; `SPACE4X_FETCH=<dir>` copies a directory back afterwards.

The Playwright web server picks a free port, or uses `PORT` when it is set, so several checkouts can run at once.

## The layout test is the gate for UI work

`tests/layout.spec.ts` loads every query state at 1440x900 (`SIZE=w,h` overrides it) with `?check` and fails with the messages of `src/lib/ui/layoutCheck.ts`: gaps, overlaps, panels off an edge, clipped or cut-off content, cells past an edge, squashed frames, canvases not filling their frames, scroll and empty-space imbalance, overlapping map labels, labels under windows, a wrapped top bar and a scrolling page. A screen whose `Screen.svelte` still renders `<Placeholder` is `fixme`; replacing the placeholder turns its states on, and they must pass before the work is done. `tests/interaction.spec.ts` covers the clock, steps, screen switching and every window operation; `tests/primitives.spec.ts` covers the shared primitives on `/dev/primitives`.

For a change to layout or behaviour, also look at the result: `SHOTS=<dir> pnpm test:layout`, then open the PNGs next to the mockup in the same state.

## Conventions

- No comments anywhere: not in code, config or tests. Use clearer names, smaller functions, or a test.
- Never render an internal identifier to the player; show a human label.
- Mock content stays visibly mock: a mock scene or screen carries a "mock scene" tag (`.tag`) on itself. The top bar starts with the game's icon and name, and has no room for a tag beside them at 1440 px.
- Follow the mockup: Aurora 4X's screen organisation and density; icons, not text, for screen buttons and status values; compact tables; no gaps; nothing laid over the map except the windows; one Selection window for whatever is selected; screen buttons switch whole screens, never popups.
- Commit messages say why and how the change was verified.

## Branches, promotion and the dev build

`dev` is the default branch: features and fixes land on it through pull requests (a feature of ten commits or more) or direct commits (everything smaller), as the global rules say, and CI (`.github/workflows/ci.yml`) runs on pushes to `dev` and `main` and on every pull request. `main` moves only by `pnpm promote`, after a playtest of the dev build at https://space4x.callmedaddy.dedyn.io/. Branch from `dev`, open pull requests against `dev`, and never push `main`.

- `pnpm promote --list` shows the commits and merged pull requests on `origin/dev` that `origin/main` lacks.
- `pnpm promote` merges `origin/dev` onto `origin/main` in the worktree `.claude/worktrees/promote` as branch `promote/main`, pushes that branch, and waits for `.github/workflows/promote.yml` on that commit. It reuses an unchanged candidate (same `main` and `dev` parents). Green, it installs dependencies in the worktree and prints the playtest steps: the dev build, and `cd .claude/worktrees/promote && pnpm dev` for the candidate itself. Red, `main` is untouched and the worktree stays for a look.
- `pnpm promote --push` pushes the green candidate to `main` and removes the worktree.
- `promote.yml` runs on `promote/**` pushes and by `workflow_dispatch`: `pnpm check:all` and `pnpm build`. It is listed under `"full"` in `tools/ci/scope.json` because it runs every leg on purpose.

### The dev build

`install.sh` installs the user units of `deploy/` for the checkout it is run from, which must be on `dev` (`HOST` overrides the machine's Tailscale address, `PORT` overrides `8800`). It does not touch `deploy/runner/`, which `deploy/runner/setup.sh` owns.

- `space4x-serve.service` serves `build/` with `tools/serve.mjs` (a static server with a single-page fallback) on the machine's Tailscale address, port 8800; Caddy publishes it as https://space4x.callmedaddy.dedyn.io/. Before it starts, `deploy/build --if-stale` runs `pnpm install --frozen-lockfile` and `pnpm build` unless `build/.built-head` already names `HEAD`.
- `space4x-update.path` fires `space4x-update.service` when `.git/refs/heads/dev` or `.git/refs/remotes/origin/dev` changes. `deploy/update` does nothing unless the checkout is on `dev`; with a clean tree it fast-forwards `dev` from `origin/dev`, and when `HEAD` is not what `build/` was built from it rebuilds and restarts the server (or re-runs `install.sh` first when `deploy/` or `install.sh` changed).
- Nothing in the repo fetches. `git-autofetch.timer` fetches every repo under `~/Documents/Projects` every two minutes, which moves `origin/dev` and so triggers the path unit.
- Keep the main checkout `~/Documents/Projects/Space4x` on `dev` with a clean tree: it is what the build serves. Check it with `systemctl --user status space4x-serve.service space4x-update.path` and `journalctl --user -u space4x-update.service -n 50`.
