# Changelog

All notable changes to Parameter Uplink Spectagraph (PUP) are documented here.

---

## [1.4.1] — PUP-v1.4.1.html

### Added
- **DOM-based minimap coordinate overlay** — X/Z readouts moved from `ctx.fillText()` on the canvas to two HTML `<div>` elements (`#coord-x`, `#coord-z`) inside `#minimap-coords`, positioned absolutely over the canvas at `bottom: 6px, left: 8px`. Text uses a four-direction `text-shadow` outline (`-1px/-1px/1px/-1px 0 #000`) for legibility against any background. This eliminates the per-frame canvas clear-and-redraw cycle that caused coordinate text ghosting in v1.4.0.
- **Per-sensor minimap markers** — After drawing the drone circle, the animate loop iterates `scanners` and draws each sensor as a colored `ctx.arc(sX, sZ, 1.5, ...)` dot on the minimap. Sensor positions account for the active `useOffset` state, mirroring the hull-offset vectors used in ray casting.
- **Proximity fade on pillars** — A post-scan loop in `animate()` reads each `environmentObject`'s 3D distance to the camera. Opacity is set as `0.08 + (smoothGlow × 0.42)` where `smoothGlow = proximity²` and `proximity = 1.0 - clamp(distance / 35, 0, 1)`. Pillars are near-invisible at distance and peak at `~0.50` opacity when the camera is directly adjacent.
- **`environmentObjects` tracking array** — Pillars are pushed into a module-level `environmentObjects[]` array at init time, providing a clean iteration target for the proximity fade and render order assignment.
- **`renderOrder` assignments** — `pointCloud.renderOrder = 1` and `environmentObjects.forEach(obj => obj.renderOrder = 2)` ensure pillars always composite above the point cloud, fixing transparency sort artifacts during orbit rotation.
- **`renderer.sortObjects = true`** — Enables Three.js object-level transparency sorting for more accurate depth ordering.
- **`renderer.localClippingEnabled = true`** — Enabled to support correct rendering of transparent overlapping geometry.

### Changed
- **Drone minimap marker changed from rect to circle** — Was `ctx.fillRect(dX-2, dZ-2, 4, 4)`; now `ctx.arc(dX, dZ, 2, 0, Math.PI * 2)` for a cleaner, centered dot.
- **GLSL fragment shader smooth fade** — The previous hard branch (`if(vHeat < 0.01) ... else ...`) is replaced with a continuous blend. A `transition = clamp(vHeat * 3.0, 0.0, 1.0)` factor lerps both color (`mix(bgPoint, scanColor, transition)`) and alpha (`mix(0.1, 1.0, transition)`), producing a smooth visual fade-in as points accumulate hits rather than a hard pop.
- **Shader background point color updated** — Changed from inline `vec4(0.1, 0.12, 0.15, 0.1)` to a named `vec3 bgPoint = vec3(0.1, 0.12, 0.15)` used in the smooth fade, keeping the same hue but integrating it cleanly into the new blend logic.
- **Pillar initial opacity lowered to 0.05** — Down from `0.10` in v1.4.0, as the proximity fade now drives opacity dynamically. `depthWrite: false` added to pillar material to smooth overlap artifacts.
- **Room wireframe material `depthWrite: true` explicitly set** — Ensures the room edges are not occluded by transparent geometry sorted in front of them.
- **DOM analytics throttled to 5 Hz** — Coverage, blind spot, and max hit readouts are now only written when `clock.elapsedTime - lastUIUpdate > 0.2`, preventing layout reflow on every animation frame.
- **Blind spot during flight** — Now reflects actual unscanned map percentage (`100 - coverage`) while the drone is moving, switching to the Monte Carlo geometric estimate only at rest (config switch). Alert threshold remains at 50%.
- **Version string** — `<title>` updated from `"PUP v1.4.0"` to `"PUP v1.4.1"`.

---

## [1.4.0] — PUP-v1.4.html

### Added
- **Monte Carlo geometric blind spot calculator** — `calculateGeometricBlindSpot(n)` casts 1,000 random sphere rays and reports uncaptured percentage. Replaces the previous hardcoded weight table. Recomputed on each config switch. Alert threshold changed from 30% to 50%.
- **Per-scanner minimum ranging distance** — Slider per card (0.01–10.00 m, default 0.05 m), stored as `s.minDist`.
- **Per-scanner maximum ranging distance** — Slider per card (1.00–100.00 m, default 12.00 m), stored as `s.maxDist`. Drives live wedge visual scale.
- **Per-scanner ranging frequency** — Slider per card (2–800 kHz, default 4 kHz), stored as `s.rangeHz`.
- **Angular resolution readout** — `(scanHz / rangeHz) × 360°`, updated live per scanner.
- **Broad-phase AABB rejection** — Per-axis bound check before `dSq` in the hot loop.
- **Sensor hardware mesh redesign** — Flat disc + glowing lens cap replaces tall cylinder.
- **`THREE.Clock` with capped delta** — `Math.min(rawDt, 0.1)` prevents physics runaway; clock reset on unpause.
- **`idealPos` pre-allocated** — Avoids per-frame `new THREE.Vector3()` in Follow camera path.

### Changed
- **WebGL memory leak fix in `switchConfig`** — `s.pivot.traverse()` now disposes geometry and material on every child before removal.
- **`resetSession` stops playback** — Also resets `drone.position` and `drone.rotation`.
- **`RANGE_MAX` reduced** — From 13.0 to 12.0.
- **Scanning frequency slider max reduced** — From 200 to 100 Hz.
- **Page title shortened** — `"Parameter Uplink Spectagraph v1.3.0"` → `"PUP v1.4.0"`.
- **`<h1>` version suffix removed** — Heading reads `"Parameter Uplink Spectagraph"`.

---

## [1.3.0] — PUP-v1.3.html

### Added
- **Sensor offset toggle** — Hull-mounted ray origin displacement with `applyEuler(drone.rotation)` on beam and normal vectors.
- **Rotational wobble** — `drone.rotation.z` and `drone.rotation.x` animated each frame.
- **Drone-attitude-aware beam vectors** — `beamDir` and `currentNormal` receive `applyEuler(drone.rotation)`.

### Changed
- **Rolling shutter sub-steps reduced** — From 8 to 3.
- **Drone speed normalization** — `step = 0.05 × simSpeed × (dt / 0.016)`.
- **Minimap draw calls batched** — Single `beginPath / rect / fill` per frame.
- **Minimap pixel size** — Increased from `1×1` to `1.5×1.5`.
- **Wedge opacity** — Reduced from `0.25` to `0.15`.
- **`resetSession` expanded** — Resets all stat nodes and clears the minimap canvas.

---

## [1.2.0] — PUP-v1.2.html

### Added
- **2D minimap overlay** — 200×200 px canvas, bottom-right anchored, with radar-trace decay and drone position marker.
- **Rolling shutter simulation** — 8 sub-steps per frame.
- **Incidence angle reflectivity** — `reflectivity = 0.3 + (incidence × 0.7)`, increment `1.5 × reflectivity`.
- **Dynamic hit threshold scaling** — Per-scanner `hitThreshold` based on `rangeHz`.

### Changed
- **Wobble applied to drone position** — Sinusoidal per-axis each frame.
- **Dot product refactored** — Component-wise math, no `new THREE.Vector3()` in hot loop.

---

## [1.1.0] — PUP-v1.1.html

### Added
- **Drone Wobble (Inertial) panel** — X/Y/Z drift sliders.
- **Reset Everything button** — Full `factoryReset()`.
- **`.res-tag` CSS class** — Orange monospace annotation label.

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
