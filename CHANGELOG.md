# Changelog

All notable changes to Parameter Uplink Spectagraph (PUP) are documented here.

---

## [1.3.0] — PUP-v1_3.html

### Added
- **Sensor offset toggle** — New `▧ SENSOR OFFSET IS OFF/ON` button in the Global Control panel calls `toggleOffset()`, flipping the `useOffset` boolean. When enabled, each scanner's ray origin is displaced by a `(0, 0.8, 0)` local vector transformed into world space via `s.pivot.quaternion` and `drone.rotation`, placing the scan source at the sensor's true hull-mounted position rather than the drone's centroid. The scanning wedge mesh shifts its `position.y` to match (`0.8` when on, `0` when off).
- **Rotational wobble** — `drone.rotation.z` and `drone.rotation.x` are now animated each frame (`sin(t × 1.5) × wobble.x × 0.4` and `cos(t × 0.8) × wobble.y × 0.4` respectively), propagating roll and pitch into beam and normal vector directions via `applyEuler(drone.rotation)` in the scanner loop.
- **Drone-attitude-aware beam vectors** — `beamDir` and `currentNormal` now both have `applyEuler(drone.rotation)` applied after the pivot quaternion, making scan geometry correctly tilt with the drone body in all wobble states.

### Changed
- **Rolling shutter sub-steps reduced from 8 to 3** — Documented in code as a fix for "loop of death" frame drops at high scanner frequencies. Reduces per-frame ray-cast iterations by ~62% while retaining the rolling shutter effect.
- **Drone speed normalization** — `step` is now computed as `0.05 × simSpeed × (dt / 0.016)`, normalizing traversal speed to a 60 fps baseline and preventing speed variation on lower-framerate machines.
- **Minimap draw calls batched** — Hit points are no longer drawn individually with `ctx.fillRect()` inside the scanner hot loop. Instead, hits are collected into a `miniMapPoints` array and flushed in a single `ctx.beginPath()` / `ctx.rect()` / `ctx.fill()` call per frame, eliminating Canvas API overhead proportional to hit count.
- **Minimap pixel size** — Hit pixels increased from `1×1` to `1.5×1.5` to compensate for reduced visual density from the batched, uniform fill color (previously per-hit alpha varied by reflectivity).
- **Wedge opacity reduced** — Scanner wedge `MeshBasicMaterial` opacity lowered from `0.25` to `0.15` for less visual clutter when offset is active.
- **`resetSession` expanded** — Now also resets all four UI stat text nodes to their initial values and calls `ctx.clearRect(0, 0, 200, 200)` to fully wipe the minimap canvas, rather than relying on the per-frame fade to clear stale data.
- **Version string** — Title and `<h1>` updated from `v1.2.0` to `v1.3.0`.

---

## [1.2.0] — PUP-v1_2.html

### Added
- **2D minimap overlay** — A 200×200 px `<canvas id="minimap">` element rendered in a fixed `#minimap-container` div pinned to the bottom-right corner. Each frame, newly scanned points are painted as 1×1 px pixels. A partial fade (`rgba(0,0,0,0.05)` fill each frame) creates a radar-trace decay effect. The drone's current X/Z position is drawn as a marker with a live coordinate readout.
- **Rolling shutter simulation** — The per-scanner hit detection loop runs 8 sub-steps per animation frame, interpolating beam rotation angle and drone Z position independently to model scan distortion during motion.
- **Incidence angle reflectivity** — Hit intensity is weighted by a `reflectivity` value (0.3–1.0) computed from the dot product of the beam direction against the struck surface's normal. Final intensity increment is `1.5 × reflectivity`.
- **Dynamic hit threshold scaling** — `hitThreshold` is computed per-scanner as `0.999 + (0.0009 × (1 - clamp(rangeHz / 200000, 0, 1)))`, tightening angular precision at higher scan frequencies.
- **`#minimap-container` CSS block** — New fixed-position style: bottom-right anchored, `1px solid #ffffff` border, `rgba(5,7,10,0.85)` background, `border-radius: 4px`, `overflow: hidden`.

### Changed
- **Wobble applied to drone position** — `drone.position` is set every tick via sinusoidal functions: `x = cos(t) × wobble.x`, `y = sin(t × 1.2) × wobble.y`, `z = droneZ + sin(t × 0.7) × wobble.z`.
- **Dot product calculation refactored** — Per-point normal and beam dot products computed component-wise without allocating `new THREE.Vector3()` objects, reducing per-frame GC pressure at 90,000 points.
- **Version string** — Title and `<h1>` updated from `v1.1.0` to `v1.2.0`.

---

## [1.1.0] — PUP-v1_1.html

### Added
- **Drone Wobble (Inertial) panel** — Three independent sliders for X (default 0.10), Y (default 0.10), and Z (default 0.05) drift axes. Exposed as a `wobble` object updated inline via `oninput` handlers.
- **Reset Everything button** — Calls `factoryReset()` to restore all UI controls and simulation state to factory defaults.
- **`.res-tag` CSS class** — Utility style for small monospace annotation labels (`font-size: 9px`, orange `#ff8833`), separated by a subtle top border.

### Changed
- **UI panel shadow** — Added `box-shadow: 10px 0 30px rgba(0,0,0,0.5)` to `#ui`.
- **Title glow** — `h1` gains `text-shadow: 0 0 10px rgba(0,255,204,0.3)`.
- **Button glow states** — `.btn:hover` gains `box-shadow: 0 0 12px rgba(0,255,204,0.1)`; `.btn.active` gains `box-shadow: 0 0 15px rgba(0,255,204,0.4)`.
- **Alert glow** — `.alert` gains `text-shadow: 0 0 8px rgba(255,51,102,0.4)`.
- **LiDAR card spacing** — Bottom margin increased from `10px` to `12px`.
- **`.ctrl-row` top margin** — Increased from `8px` to `10px`.
- **Readout min-width** — Widened from `45px` to `55px`.
- **Version string** — Title and `<h1>` updated from `v1.0.0` to `v1.1.0`.

---

## [1.0.0] — PUP-v1_0.html

Initial release.

### Features
- Three-way LiDAR geometry selector: Orthogonal (2-sensor), Tetrahedral (4-sensor), Octahedral (6-sensor)
- 90,000-point environment with 5 cylindrical obstacles inside an 18×12×80 room
- Custom GLSL shader point cloud with heat-map coloring (cyan → yellow → red)
- Per-scanner frequency (0–200 Hz) and rotation direction (CW/CCW) controls
- ISO, Follow, and FPV camera modes with OrbitControls for ISO
- Drone path trace (up to 5,000 points)
- Spatial analytics: distance traveled, map coverage %, blind spot %, max hits
- Purge Map reset for point cloud and session data
- Simulation speed control (0×–2×)
- Point cloud and trace path visibility toggles
