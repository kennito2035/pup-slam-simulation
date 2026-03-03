# Changelog

All notable changes to Parameter Uplink Spectagraph (PUP) are documented here.

---

## [1.1.0] — PUP-v1.1.html

### Added
- **Drone Wobble (Inertial) panel** — New UI section with three independent sliders to simulate real-world flight instability across X (lateral sway, default 0.10), Y (vertical bounce, default 0.10), and Z (forward/aft oscillation, default 0.05) axes. Wobble is exposed as a `wobble` object in script scope, updated inline via `oninput` handlers.
- **Reset Everything button** — Calls `factoryReset()` to perform a full restore of all UI controls and simulation state to factory defaults, complementing the existing Purge Map (data-only reset).
- **`.res-tag` CSS class** — Utility style for small monospace annotation labels (`font-size: 9px`, orange `#ff8833`), separated from stat content by a subtle top border.

### Changed
- **UI panel depth** — Added `box-shadow: 10px 0 30px rgba(0,0,0,0.5)` to `#ui` for stronger visual separation from the 3D canvas.
- **Title glow** — `h1` now includes `text-shadow: 0 0 10px rgba(0,255,204,0.3)` for a subtle cyan halo effect.
- **Button glow states** — `.btn:hover` gains `box-shadow: 0 0 12px rgba(0,255,204,0.1)`; `.btn.active` gains `box-shadow: 0 0 15px rgba(0,255,204,0.4)` for improved affordance.
- **Alert text glow** — `.alert` now includes `text-shadow: 0 0 8px rgba(255,51,102,0.4)` to make critical blind-spot readings more visually prominent.
- **LiDAR card spacing** — `.lidar-card` bottom margin increased from `10px` to `12px`.
- **`.ctrl-row` top margin** — Increased from `8px` to `10px` for improved vertical rhythm.
- **Readout min-width** — `.readout` widened from `45px` to `55px` to accommodate longer wobble decimal values without layout shift.
- **Version string** — Title and `<h1>` updated from `v1.0.0` to `v1.1.0`.

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
