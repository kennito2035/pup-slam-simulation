# Changelog

All notable changes to Parameter Uplink Spectagraph (PUP) are documented here.

---

## [1.4.3]: PUP-v1.4.3.html

### Fixed
- **Drone attitude restored on beam vectors**: the 1.4.2 raycaster rewrite dropped `applyEuler(drone.rotation)` from the beam direction and the hull offset vector while keeping it on the scan-plane normal. Beams, occlusion rays, and the minimap sensor markers ignored drone roll and pitch, so at higher wobble settings the attitude-rotated plane test and the fixed beam cone stopped overlapping and hit registration collapsed. Both vectors are rotated by the drone attitude again, matching the 1.4.1 behavior and the README feature description.
- **Scan origin aligned with the rendered drone**: each sub-step ray origin now starts from `drone.position.z - step` (Z wobble included) and interpolates across the frame that just elapsed, instead of starting at the already-advanced `droneZ` and sampling up to two thirds of a step ahead of the drone while ignoring Z wobble.
- **Min/max ranging distance cross-clamp**: the minimum slider can no longer be dragged above the current maximum, and the maximum can no longer be dragged below the current minimum. Previously min > max silently rejected every point with no feedback.

### Changed
- **Per-frame values hoisted out of the sub-step loop**: `offsetVec`, the attitude-rotated normal, and `hitThreshold` are computed once per scanner per frame; the beam direction reuses a module-level scratch vector instead of allocating a new `THREE.Vector3` every sub-step.
- **HiDPI rendering**: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` applied at startup and on resize. The canvas previously rendered at a pixel ratio of 1 and looked blurry on high-density displays.
- **`RANGE_MIN` / `RANGE_MAX` used for defaults**: the hardcoded 0.05 and 12.00 literals in the scanner defaults and card template now reference the module constants; `RANGE_MIN` was previously declared but never used.
- **Dead code removed**: leftover `ctx.font` assignment from the pre-1.4.1 canvas text overlay, and `renderer.localClippingEnabled = true` (no clipping planes exist in the scene).
- **Version string**: `<title>` updated from `"PUP v1.4.2"` to `"PUP v1.4.3"`.

---

## [1.4.2] — PUP-v1.4.2.html

### Added
- **Raycaster-based beam occlusion** — A module-level `THREE.Raycaster` and reusable `rayOrigin` / `boxHit` vectors are allocated once at startup. Each scanner sub-step calls `raycaster.set(rayOrigin, beamDir)` and runs two intersection tests: `raycaster.intersectObjects(environmentObjects, false)` for pillars, and `raycaster.ray.intersectBox(roomBox, boxHit)` for the room bounding box. The shortest result becomes `blockDist`. Any point further than `blockDist + 0.5` is skipped, preventing beams from scanning through solid geometry. The `+0.5` tolerance allows front-surface points of the occluder to register.
- **`roomBox` pre-allocated** — `new THREE.Box3(...)` constructed once at module level using `ROOM_SIZE` half-extents, used as the wall intersection target for every raycaster call.
- **`frameMinDist`-driven wedge scaling** — Each scanner tracks the shortest `blockDist` encountered across all its sub-steps. After the loop, the wedge is scaled to `Math.max(0.01, frameMinDist / RANGE_MAX)` — clamped at 0.01 to prevent zero-scale math errors. The wedge now shrinks to reflect the nearest surface in the beam's path rather than always showing full max range.

### Changed
- **GLSL vertex shader: smooth point size** — The previous hard ternary (`vHeat > 0.01 ? 2.8 : 1.0`) is replaced with `sizeMult = mix(1.0, 2.8, clamp(vHeat * 5.0, 0.0, 1.0))`. Points grow continuously from 1× to 2.8× as they accumulate hits, eliminating the abrupt size jump on first detection.
- **Room wireframe opacity** — `roomMat` changed from `transparent: false, opacity: 1` to `transparent: true, opacity: 0.1`, softening the room boundary to better recede behind the point cloud.
- **`beamDir` normalized** — `.normalize()` appended after `.applyQuaternion()` on the beam direction vector, ensuring the raycaster receives a unit-length direction and distance comparisons remain accurate.
- **Version string** — `<title>` updated from `"PUP v1.4.1"` to `"PUP v1.4.2"`.

---

## [1.4.1] — PUP-v1.4.1.html

### Added
- **DOM-based minimap coordinate overlay** — X/Z readouts moved from `ctx.fillText()` to HTML `<div>` elements (`#coord-x`, `#coord-z`) with four-direction `text-shadow` outlines, eliminating canvas text ghosting.
- **Per-sensor minimap markers** — Each scanner drawn as a colored `ctx.arc` dot at its hull-offset position on the minimap.
- **Proximity fade on pillars** — Pillar opacity driven by `0.08 + (proximity² × 0.42)` based on camera distance over a 35-unit range.
- **`renderOrder` assignments** — `pointCloud.renderOrder = 1`, pillars `renderOrder = 2`. `renderer.sortObjects = true` and `renderer.localClippingEnabled = true` enabled.
- **`environmentObjects` tracking array** — Pillars collected at init for proximity fade and render order iteration.

### Changed
- **Drone minimap marker** — Changed from `fillRect` to `ctx.arc` circle.
- **GLSL fragment shader smooth fade** — Hard `if/else` branch replaced with `clamp(vHeat * 3.0, 0.0, 1.0)` transition blending both color and alpha.
- **Pillar initial opacity** — Lowered to `0.05`; `depthWrite: false` added.
- **DOM analytics throttled to 5 Hz** — `clock.elapsedTime - lastUIUpdate > 0.2` gate added.
- **Room wireframe `depthWrite: true`** — Set explicitly.

---

## [1.4.0] — PUP-v1.4.html

### Added
- **Monte Carlo geometric blind spot calculator** — 1,000 sphere rays, alert threshold 50%.
- **Per-scanner min/max ranging distance** — `s.minDist` and `s.maxDist` sliders per card.
- **Per-scanner ranging frequency** — `s.rangeHz` slider per card.
- **Angular resolution readout** — `(scanHz / rangeHz) × 360°` live per scanner.
- **Broad-phase AABB rejection** — Per-axis bound check before `dSq`.
- **Sensor hardware mesh redesign** — Flat disc + lens cap.
- **`THREE.Clock` with capped delta** — `Math.min(rawDt, 0.1)`.
- **`idealPos` pre-allocated** — Avoids per-frame allocation in Follow camera.

### Changed
- **WebGL memory leak fix** — `switchConfig` now disposes geometry and material on all child meshes before removal.
- **`resetSession` stops playback** — Resets `drone.position` and `drone.rotation`.
- **`RANGE_MAX` reduced** — 13.0 → 12.0.
- **Scanning Hz slider max reduced** — 200 → 100 Hz.
- **Page title shortened** and **`<h1>` version suffix removed**.

---

## [1.3.0] — PUP-v1.3.html

### Added
- Sensor offset toggle with hull-mounted ray origin displacement.
- Rotational wobble (`drone.rotation.z` and `.x` animated).
- Drone-attitude-aware beam and normal vectors via `applyEuler(drone.rotation)`.

### Changed
- Rolling shutter sub-steps reduced from 8 to 3.
- Drone speed normalized to 60 fps baseline.
- Minimap draw calls batched into single `beginPath/fill`.
- Minimap pixel size increased to `1.5×1.5`.
- `resetSession` expanded to wipe minimap and reset all stat nodes.

---

## [1.2.0] — PUP-v1.2.html

### Added
- 2D minimap overlay with radar-trace decay and drone position marker.
- Rolling shutter simulation (8 sub-steps per frame).
- Incidence angle reflectivity (`1.5 × (0.3 + incidence × 0.7)`).
- Dynamic per-scanner hit threshold scaling.

### Changed
- Wobble applied to `drone.position` each frame.
- Dot product math refactored to avoid `new THREE.Vector3()` in hot loop.

---

## [1.1.0] — PUP-v1.1.html

### Added
- Drone Wobble (Inertial) panel with X/Y/Z drift sliders.
- Reset Everything button (`factoryReset()`).
- `.res-tag` CSS utility class.

### Changed
- UI panel shadow, title glow, button glow states, alert glow, spacing tweaks.

---

## [1.0.0] — PUP-v1.0.html

Initial release.

### Features
- Three-way LiDAR geometry selector: Orthogonal, Tetrahedral, Octahedral
- 90,000-point procedural environment with 5 cylindrical obstacles
- Custom GLSL shader point cloud with heat-map coloring
- Per-scanner frequency and direction controls
- ISO, Follow, and FPV camera modes
- Drone path trace, spatial analytics, simulation speed control
