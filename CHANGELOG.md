# Changelog

All notable changes to Parameter Uplink Spectagraph (PUP) are documented here.

---

## [1.4.0] — PUP-v1.4.html

### Added
- **Monte Carlo blind spot calculator** — `calculateGeometricBlindSpot(n)` casts 1,000 random rays uniformly distributed across a unit sphere and checks each against every scanner plane normal (thickness `0.04`). The percentage of rays not captured by any plane is reported as the geometric blind spot. This replaces the previous hardcoded per-config weight table and is recomputed each time the geometry configuration is switched. Alert threshold changed from 30% to 50%.
- **Per-scanner minimum ranging distance** — New slider per scanner card (0.01–10.00 m, default 0.05 m). Stored as `s.minDist` and used in the hot loop in place of the global `RANGE_MIN` constant.
- **Per-scanner maximum ranging distance** — New slider per scanner card (1.00–100.00 m, default 12.00 m). Stored as `s.maxDist`, used in the hot loop in place of `RANGE_MAX`, and drives a live visual scale on the scanner's wedge mesh (`wedge.scale.set(val / RANGE_MAX, val / RANGE_MAX, 1)`).
- **Per-scanner ranging frequency** — New slider per scanner card (2–800 kHz, default 4 kHz). Stored as `s.rangeHz` in Hz (input × 1000) and feeds the angular resolution formula.
- **Angular resolution readout** — `res-tag` span updated live by `updateResCalc(i)` as `(scanHz / rangeHz) × 360°`, giving a real-time measure of point angular spacing for each scanner.
- **Broad-phase AABB rejection** — Before the squared-distance check in the ray-cast inner loop, each axis component is individually compared against `s.maxDist`. Points outside the axis-aligned bounding box are skipped without computing `dSq`, reducing unnecessary sqrt calls on distant points.
- **Sensor hardware mesh redesign** — The per-scanner visual is now a flat disc (`CylinderGeometry(0.16, 0.18, 0.05, 16)`) with a glowing lens cap (`CylinderGeometry(0.14, 0.14, 0.02, 16)`) placed at `y = 0.04` on the base plate, replacing the previous tall cylinder. Both use `MeshStandardMaterial` with `metalness: 0.5, roughness: 0.5`.
- **`THREE.Clock` with capped delta** — `clock.getDelta()` replaces the fixed `dt = 0.016`. Raw delta is capped at `0.1` seconds (`Math.min(rawDt, 0.1)`) to prevent runaway physics after tab switches or frame spikes. Clock delta is also reset on unpause via `clock.getDelta()` to prevent a one-frame catch-up spike.
- **`idealPos` pre-allocated** — A persistent `new THREE.Vector3()` is allocated once at startup for camera interpolation, avoiding per-frame allocation in the Follow camera path.

### Changed
- **WebGL memory leak fix in `switchConfig`** — Previous versions called only `drone.remove(s.pivot)`. Now `s.pivot.traverse()` walks every child mesh and calls `.geometry.dispose()` and `.material.dispose()` before removal, preventing GPU memory accumulation on config switches.
- **`resetSession` now stops playback** — Sets `isPlaying = false` and updates the play/pause button state, then resets `drone.position` and `drone.rotation` to their initial values in addition to clearing scan data.
- **Per-scanner `minDist`/`maxDist` used in hot loop** — The inner ray-cast loop now reads `s.minDist` and `s.maxDist` per scanner instead of the global `RANGE_MIN`/`RANGE_MAX` constants, enabling independent range control per module.
- **`RANGE_MAX` reduced from 13.0 to 12.0** — Brings the default max range in line with the per-scanner default of 12.00 m.
- **Scanning frequency slider max reduced from 200 to 100 Hz** — Reflects more realistic operating ranges and mitigates performance risk at extreme values.
- **Page `<title>` shortened** — Changed from `"Parameter Uplink Spectagraph v1.3.0"` to `"PUP v1.4.0"`.
- **`<h1>` version string removed** — Heading now reads `"Parameter Uplink Spectagraph"` with no version suffix, keeping the UI cleaner across releases.
- **Distance readout spacing** — Changed from `"0.00m"` to `"0.00 m"` (space before unit) for consistency across all stat readouts.

---

## [1.3.0] — PUP-v1.3.html

### Added
- **Sensor offset toggle** — `▧ SENSOR OFFSET IS OFF/ON` button calls `toggleOffset()`. When enabled, each scanner's ray origin is displaced by `(0, 0.8, 0)` in local space, transformed into world space via `s.pivot.quaternion` and `drone.rotation`. The wedge mesh shifts `position.y` to match.
- **Rotational wobble** — `drone.rotation.z` and `drone.rotation.x` are animated each frame, propagating roll and pitch into beam and normal vector directions via `applyEuler(drone.rotation)`.
- **Drone-attitude-aware beam vectors** — `beamDir` and `currentNormal` both receive `applyEuler(drone.rotation)` after the pivot quaternion, making scan geometry tilt correctly with the drone body.

### Changed
- **Rolling shutter sub-steps reduced from 8 to 3** — Documented in code as a fix for "loop of death" frame drops at high scanner frequencies.
- **Drone speed normalization** — `step` computed as `0.05 × simSpeed × (dt / 0.016)`, normalizing traversal to a 60 fps baseline.
- **Minimap draw calls batched** — Hits collected into `miniMapPoints` array and flushed in a single `beginPath / rect / fill` call per frame, eliminating per-hit Canvas API overhead.
- **Minimap pixel size** — Increased from `1×1` to `1.5×1.5`.
- **Wedge opacity** — Reduced from `0.25` to `0.15`.
- **`resetSession` expanded** — Now resets all four UI stat nodes and calls `ctx.clearRect(0, 0, 200, 200)` to wipe the minimap.
- **Version string** — Updated from `v1.2.0` to `v1.3.0`.

---

## [1.2.0] — PUP-v1.2.html

### Added
- **2D minimap overlay** — 200×200 px `<canvas id="minimap">` in a fixed `#minimap-container` div, bottom-right anchored. Per-frame fade creates radar-trace decay. Drone position marker with live X/Z coordinate readout.
- **Rolling shutter simulation** — 8 sub-steps per frame, interpolating beam angle and drone Z position.
- **Incidence angle reflectivity** — Hit intensity weighted by `reflectivity = 0.3 + (incidence × 0.7)`, computed from the beam/surface normal dot product. Final increment: `1.5 × reflectivity`.
- **Dynamic hit threshold scaling** — `hitThreshold = 0.999 + (0.0009 × (1 - clamp(rangeHz / 200000, 0, 1)))`.
- **`#minimap-container` CSS block** — Fixed-position, bottom-right, `1px solid #ffffff` border, `rgba(5,7,10,0.85)` background.

### Changed
- **Wobble applied to drone position** — `drone.position` set via sinusoidal functions each frame.
- **Dot product refactored** — Component-wise math without `new THREE.Vector3()` allocation in the hot loop.
- **Version string** — Updated from `v1.1.0` to `v1.2.0`.

---

## [1.1.0] — PUP-v1.1.html

### Added
- **Drone Wobble (Inertial) panel** — Three independent sliders for X (0.10), Y (0.10), and Z (0.05) drift axes.
- **Reset Everything button** — Calls `factoryReset()` to restore all UI and simulation state to defaults.
- **`.res-tag` CSS class** — Small monospace annotation label style (`font-size: 9px`, orange `#ff8833`).

### Changed
- **UI panel shadow** — `box-shadow: 10px 0 30px rgba(0,0,0,0.5)` added to `#ui`.
- **Title glow** — `text-shadow: 0 0 10px rgba(0,255,204,0.3)` added to `h1`.
- **Button glow states** — Hover and active box-shadow added to `.btn`.
- **Alert glow** — `text-shadow: 0 0 8px rgba(255,51,102,0.4)` added to `.alert`.
- **Spacing tweaks** — LiDAR card margin, `.ctrl-row` top margin, and `.readout` min-width all increased.
- **Version string** — Updated from `v1.0.0` to `v1.1.0`.

---

## [1.0.0] — PUP-v1.0.html

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
