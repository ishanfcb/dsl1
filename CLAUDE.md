# Emergency Enroute — Digital Prototype

A web prototype that shows a design jury how our ambulance signal system works across two junctions, in real-world traffic scenarios. It is a storytelling piece first and a simulation second: everything must be **accurate, calm, and legible from across a room**.

## 1. The concept (source of truth: the project PDF)

Each traffic signal gets **one extra light: a blue signal head** that switches on only when an ambulance is approaching. Mechanism is **n+1**: the junction the ambulance is approaching AND the next one light up together, so drivers get early warning instead of a last-second siren, and both junctions turn green for the ambulance so their queues clear before it arrives. There is **no middle-lane rule** and no lane changing: all lanes keep flowing.

### Signal state machine (per junction)

| Phase | J1 | J2 |
|---|---|---|
| Idle | NORMAL | NORMAL |
| J1 triggers (see below) | ALERT — blue **blinking**; ambulance's approach GREEN, all other approaches RED + blue blinking | PREWARN — blue **steady**; ambulance's approach GREEN, others RED (queue clears early) |
| Ambulance passes J1 | CLEARED → resumes normal cycle | ALERT — blue blinking; ambulance approach GREEN, others RED |
| Ambulance passes J2 | NORMAL | CLEARED → NORMAL |

States: `NORMAL | PREWARN | ALERT | CLEARED`. Every switch to green goes through amber + all-red first, and so does the return to the normal cycle (IRC timings in data). PREWARN → ALERT keeps the green; only the blue light changes.

**Trigger** (tech-stack PDF): on each GPS packet, J1 computes ETA = distance ÷ speed. It triggers when ETA ≤ `global.system.triggerEta_s` (94.3 s, derived from S14), **or** when the ambulance is within `triggerDistance_m` (760 m, S14) whatever its ETA, so a stuck ambulance (speed ≈ 0) still triggers.

### System layers (for the "How it works" page)
1. **Vehicle positioning** — GPS (NEO-M8N) + IMU (MPU9250) on ambulance, sends `{lat, lon, heading, speed, timestamp}` every 1–2 s over 4G/LoRa.
2. **Central routing** — combines GPS with city maps, computes ETA to upcoming signals (haversine distance + heading check).
3. **Junction triggering** — junction controller (Raspberry Pi / ESP32) verifies arrival (ANPR camera backup), drives a relay for the blue head and overrides the phase. Junction-to-junction messages over MQTT. Optional fallback: siren audio classifier.

## 2. Data rules (non-negotiable)

- `/data/scenarios.json` is the **only** source of numbers. Never hardcode, round creatively, or invent figures.
- Every number has `{value, src, kind}`. `kind` ∈ `sourced | derived | proxy | assumption`. Sources are in `/data/DATA_SOURCES.md`.
- Any number shown on screen shows its source id in small type (e.g. `13.2 km/h · S1`). `proxy` and `assumption` values get a subtle marker (e.g. a hollow dot) plus a tooltip that explains them.
- **Scale time, never relative speed.** A 4.8 km/h scenario must look exactly 6× slower than a 29 km/h one. Time compression comes from `scaling.timeCompression`. Always show a **real-time clock** of how much real time has passed.
- Vehicles are not uniform. Use the **Intelligent Driver Model (IDM)** for car-following. Each vehicle gets its own desired speed, sampled around the scenario speed. Vehicle types (2W, car, auto, bus) follow the scenario mix and are sized by their PCU.
- Arrivals per arm = hourly volume ÷ `vehiclesPerSprite`. Signals run the cycle/green times given. Silk Board's BTM and HSR phases overlap (green totals exceed cycle). Model that.
- Rain/waterlogging slows traffic via the flood-depth function `v(w) = 0.0009w² − 0.5529w + 86.9448` (w mm → km/h, impassable ≥ 300 mm), **not** a generic "rain = slower" factor.
- The system's effect comes from the signals: early greens at J1 and J2 clear the queues ahead of the ambulance. Drivers do not change lanes. `global.driver` (reaction time, siren range) is context for the story, not a simulation input.
- If data is missing, add it to scenarios.json as `kind: "assumption"` with a note. Never bury it in code.

## 3. Scenarios (from scenarios.json)

1. **Baseline**: night, clear, Bengaluru Hosur Rd (control case).
2. **Gurugram Monday 6 pm peak**: Rajiv Chowk → Subhash Chowk → Medanta.
3. **Bengaluru heavy rain, evening**: Silk Board → Hosur Rd (real volumes and signal timings).
4. **Gurugram monsoon waterlogging** (optional): the limit case the system can't fix. Show it honestly.

Every scenario can play **Without system** (siren only; ambulance stuck at traffic speed) or **With system**. Both use the same seed, so the comparison is fair. The time difference is the headline.

## 4. Information architecture

Pages follow the nav in §6: **Scenarios / Map / Junction / Driver / System / Impact**, plus an Intro. Every page is the editorial shell around one main visual. The 3D city is a single scene; Map, Junction and Driver are camera positions in it, not separate drawings.

1. **Intro**: the wordmark, one line on the problem ("Drivers hear the siren with seconds to react"), the dark city as a faint framed image, and a plain text "Start" link.
2. **Scenarios**: a gallery row, one framed still of the city per scenario, like the photographs in `ui-editorial.jpg`. Caption below each: scenario name left, time saved right (from engine results). Beneath that, a small line with city, day/time and weather, a speed sparkline and the data badge.
3. **Map (core)**: the corridor in 3D at the tilted overview camera.
   - The ambulance route is a blue dotted stream. Each junction has a translucent blue trigger ring on the ground while it is in ALERT, its radius the ambulance's distance when it triggered.
   - Junction pins carry their labels (§6). Traffic appears as small amber vehicles.
   - Beside the visual, in the shell: each junction's state and the GPS packet stream as small uppercase lines.
   - Below it: a 4-frame small-multiples row, one framed frame per phase. Caption: phase name left, real time right.
   - One toggle in the shell: **Without / With system**. A city switch (Gurgaon / Bangalore) sits at the bottom right of the visual; a city is selectable once its OSM export is in `/data/osm`.
4. **Junction**: click a pin (or use the nav) and the camera eases down to that junction. It shows the 4 arms with lane lines, a signal head on each approach (R/A/G dots plus the blue light), and the real queues as clusters of amber vehicles building up and clearing.
5. **Driver**: a camera at driver eye height behind one vehicle on the route. The blue light comes on early, the signal ahead turns green and the queue drains, the ambulance passes. The siren-only version plays alongside in a second frame, same seed and time.
6. **System** (how it works): the 3 layers (§1) as a flat diagram in the shell style, with blue data packets moving between them.
7. **Impact** (why it matters): a few charts built only from `global.context` and scenario results (time saved, with vs without), drawn as editorial SVG in the shell.

## 5. Interaction model

- Two explicit modes, switched only by the **Automated / Scroll** toggle at the bottom left of the visual (or `Shift+Space`). Moving the mouse or touching the trackpad never changes mode.
- **Automated** (default) → the current scenario plays and loops. Space pauses and resumes.
- **Scroll** → the scroll wheel scrubs timeline progress (smoothed with a spring). Space switches back to Automated.
- Keyboard (for presenting): ← → move between pages, Space play/pause, Shift+Space Automated/Scroll, 1–4 pick a scenario, `S` toggles the system on/off.
- Must work full-screen on a laptop and a projector (1920×1080 and 1280×720). Respect `prefers-reduced-motion`.

## 6. Visual language

Two surfaces side by side on a near-black page: a **text panel** on the left (~30% of the width) and the dark **3D city visualisation** filling the rest. References are in `/reference/style/`: `city-3d.jpg` (city and route), `route-glow.jpg` (traffic ribbons; the file is really a PNG). `ui-editorial.jpg` is retired. **Not** gamified, cartoon, glossy-dashboard or neon-sci-fi. Calm and precise.

If anything elsewhere in this file conflicts with this section on colour or style, this section wins. (Older wording elsewhere about an "editorial shell", serif text or "framed images" means this panel + visual layout.)

### App shell (soft panel + visual)
- Page `#050506`; panel `#131417`; text `#EDEDED`, muted `#8B9097`; faint dividers `rgba(255,255,255,0.1)`.
- **Helvetica for everything** (self-hosted from `public/fonts`, gitignored because the font is licensed: Light 300, Regular 400, Bold 700, plus obliques; no medium cut, so 500 renders as 400). Hierarchy comes only from size, weight, case and letter-spacing: large light uppercase page title, small medium uppercase tracked section labels, regular body, tabular figures for data. Smooth antialiased text.
- Soft rounded corners (20 px) on the panel and the visual. Values, chips, nav items and toggles are small pills; the active one is a light pill with dark text.
- Left panel, top to bottom: the nav as one segmented row of the built pages (Map / Junction for now; no wordmark); page title; scenario facts as a small spec line (muted label above each value, not pills); a short story paragraph; then a few labelled sections. Keep it sparse: one chart for time saved (journey-time bars, Without vs With, on one scale), then signal states in words. Every value keeps its source id (`13.2 KM/H · S1`) and assumption marker (§2). The panel scrolls inside itself if it runs long.
- All other text and data live in the panel. The visual carries only: junction pins, the distance from the ambulance to the next junction (a red dimension line beside the route with the number on the ground), a small frosted-glass narration card top right (what is happening now, two plain lines, from engine state), the city switch and the OSM credit.
- Hover notes: resting the pointer on any value or control for 2 s shows a small frosted box with one plain sentence on what it is; numbers also name their source (read from DATA_SOURCES.md) and their kind. Wording lives in `src/components/explanations.ts`.
- No shadows, no gradients, no emoji.

### Visualisation (dark 3D city, like `city-3d.jpg` and `route-glow.jpg`)
- Near-black ground `#0B0C0E`.
- **Buildings** come from `/data/osm/*.geojson`, drawn as dark translucent boxes with thin white edges (white at about 25% opacity).
  - Height = `height` tag; else 3 m × `building:levels`; else a seeded random height of 9–30 m.
  - These rules live in `scenarios.json` (`global.buildings`) as assumptions.
- **Roads**: thin grey lines on the ground.
- **Colour carries meaning, and nothing else gets colour:**
  - **Blue `#2F7BFF`, glowing**: the ambulance, its route as a dotted stream of light (like `city-3d.jpg`), the blue signal light and its trigger radius.
  - **Amber `#F2B705`**: general traffic, one small glowing capsule per vehicle (each engine sprite drawn as its vehiclesPerSprite vehicles, a few abreast). Spacing and brightness show density (from engine queues and flow).
  - **Small red / amber / green dots** for signal heads.
  - **Red line** beside the route: the distance from the ambulance to the next junction, with the number lying flat on the ground in the middle of it.
  - Everything else is greys, white and black.
- **Junction labels** use a pin with a thin vertical leader line, then two lines of text, as in `city-3d.jpg`:
  - a small cyan uppercase line, e.g. `J1 · RAJIV CHOWK`;
  - white text below it, e.g. `ALERT — BLUE BLINKING`.
- Bottom-left credit in small uppercase: `© OPENSTREETMAP CONTRIBUTORS`.
- **Camera**: slightly tilted, about 50–60° from vertical. Slow, eased moves only. No spinning, no orbit autoplay. The viewer may drag to turn and tilt (tilt kept 35–70° from vertical); double-click resets. With `prefers-reduced-motion`, cut between views instead of moving.
- Colour is never the only signal (see dataviz skill). Blink vs steady, labels and icons also carry state. Text stays legible from across a room on a projector.

## 7. Tech stack

- **Vite + React + TypeScript.**
- **3D: three.js through `@react-three/fiber` and `@react-three/drei`.**
  - **`@react-three/postprocessing`** adds bloom. Only the blue and amber elements bloom: emissive colour above the luminance threshold, while buildings and roads stay below it.
  - Building outlines use **`EdgesGeometry`**.
  - Merge building geometry (`BufferGeometryUtils.mergeGeometries`) into a few meshes so the city draws in a handful of calls. Draw traffic ribbons and route dots with instanced or merged meshes too, never one mesh per vehicle.
- **d3-geo** projects OSM lon/lat into local metres around the corridor. **d3-scale / d3-shape** handle shell charts (Impact page, small multiples), drawn as hand-built SVG in the editorial style.
- **Motion** (`motion`, imported from `"motion/react"`) animates the 2D shell: page transitions, nav, captions, and `useScroll` / `useSpring` / `useMotionValue` for scroll-scrubbing. Animate transforms and opacity, not layout. 3D motion runs in fiber's `useFrame`, driven by engine time.
- **Fully offline.** No map tiles, no API keys, no CDN fonts at runtime. OSM geometry is exported ahead of time into `/data/osm/`. Fonts are self-hosted.
- **The engine stays the single source of truth.** The 3D scene and the shell only read engine state for the current time; they never simulate.
- `/reference/style/` holds the style references. Never import from `/reference`.

## 8. Architecture

```
/data            scenarios.json, DATA_SOURCES.md, osm/<corridor>.geojson (buildings, roads, junction nodes)
/src/engine      simulation: clock, IDM vehicles, signal controllers, ambulance, state machine (pure TS, no React)
/src/geo         OSM loading, d3-geo projection to local metres, building heights, merged building geometry,
                 and the mapping from the engine's 1D route coordinate onto the real road polylines (pure TS, no React)
/src/scene       react-three-fiber: City, Roads, RouteStream, Ambulance, TrafficRibbons, SignalHeads,
                 TriggerRing, JunctionPin, CameraRig (Map / Junction / Driver positions), Effects (bloom)
/src/input       scroll / idle-autoplay / keyboard controller → engine time
/src/shell       editorial layout: Wordmark, Nav, SectionLabel, Caption, StoryText, Frame (holds a visual)
/src/views       Intro, Scenarios, MapView, JunctionView, DriverView, SystemView, Impact
/src/components  shared 2D pieces: SmallMultiples, DataBadge, RealTimeClock, JunctionStatePanel, GpsStream, charts
/src/styles      tokens (colours, type, rule widths) for the shell and the scene
```

- The **engine is the single source of truth.** Views and the scene only read from it and never hold their own simulation state.
- The engine is **deterministic** (seeded random), so scrubbing backwards gives the same result.
- **Engine vs map geometry.** The engine runs on a straight 1D route; `/src/geo` places it on the OSM roads. Distances must agree. If the OSM J1→J2 length differs from `geometry.j1ToJ2_m` in scenarios.json, update the JSON (and its `kind`/note). Never stretch the drawing to hide a mismatch.
- **One 3D scene.** Map, Junction and Driver move the same camera through the same city; switching pages never rebuilds the geometry.
- Keep components small. One file does one job.

## 9. Skills

- `.claude/skills/dataviz/SKILL.md`: read it before building any chart, legend, annotation or colour decision.
- `.claude/skills/motion-framer/SKILL.md`: read it before writing animation code. Animate transforms (x, y, scale, opacity), not layout properties.

## 10. Working rules

- Start each feature in plan mode. Build one feature per session. Commit after each one that works.
- After a visual change, take a screenshot and check it against section 6 before saying it's done.
- Never invent statistics, place names or junction details. If unsure, ask.
- Copy on screen: short, plain English, no hype.

## 11. Build order

1. ~~Engine + debug panel (no styling).~~ Done.
2. OSM data + geo pipeline: export each corridor to `/data/osm/`, project it, apply building heights, map the engine route onto the roads, and reconcile J1→J2 distances with scenarios.json.
3. Editorial shell + Map view: 3D city, roads, blue route stream, ambulance, trigger rings, junction pins, bloom, camera. Side panel and small multiples in the shell.
4. Traffic ribbons (amber density) + signal heads.
5. Input controller (scroll / idle autoplay / keyboard) + real-time clock.
6. Junction close-up (camera move + lanes + queues).
7. Scenarios page + Without/With comparison.
8. Driver's view + System page.
9. Impact charts + Intro + polish for the projector.
