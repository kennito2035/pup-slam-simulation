# Parameter Uplink Spectagraph (PUP) v1.4.2

A real-time 3D LiDAR SLAM simulation built with Three.js. PUP visualizes how different multi-sensor configurations scan and map an indoor environment as a drone traverses a corridor, rendering live point cloud heat maps, path traces, spatial analytics, and a 2D minimap overlay (prototype is inspired by Prometheus 2012).

---

## Features

- **Three LiDAR array geometries** — Orthogonal (2-sensor), Tetrahedral (4-sensor), and Octahedral (6-sensor) configurations, each modelling real-world multi-scanner arrangements
- **Raycaster occlusion** — Each beam sub-step fires a `THREE.Raycaster` along the beam direction and tests against both the room bounding box and pillar meshes, also, the points behind the nearest hit are skipped, preventing scans from passing through solid geometry
- **Live point cloud rendering** — 90,000 environment points rendered via custom GLSL shaders; points grow smoothly from 1.0× to 2.8× size as they accumulate hits via a `mix()` blend in the vertex shader
- **Dynamic wedge scaling** — Each scanner's visual wedge scales to reflect the shortest ray intersection detected that frame, giving a live visual readout of nearest-surface distance
- **Monte Carlo blind spot estimation** — Geometric blind spot computed at config-switch time by casting 1,000 random rays across a unit sphere
- **Per-scanner ranging controls** — Each scanner independently exposes scanning frequency, ranging frequency, min/max ranging distance, and angular resolution
- **Broad-phase AABB rejection** — Per-axis distance check before full squared-distance test in the ray-cast hot loop
- **Sensor offset mode** — Toggleable hull-mounted sensor offset with beam and normal vectors rotated to match drone attitude
- **Rotational wobble** — Drone roll and pitch animate alongside positional drift
- **DOM-based minimap coordinate overlay** — X/Z coordinates rendered as HTML elements with text-shadow outlines over the minimap canvas
- **Per-sensor minimap markers** — Each active scanner drawn as a colored dot at its hull-offset position
- **Proximity fade on obstacles** — Ghost pillars brighten quadratically as the camera approaches
- **Throttled DOM updates** — Spatial analytics panel updates at 5 Hz
- **Camera modes** — Isometric (free orbit), Follow (third-person drone), and FPV (first-person)
- **Path trace** — White trail showing the drone's flight history through the scene

---

## File Structure

```
PUP-v1.4.2.html   # Main entry point and UI markup
script.js         # Simulation logic, Three.js scene, scanner math, minimap renderer
styles.css        # Dark-mode UI styling
```

---

## Usage

Open `PUP-v1.4.2.html` in any modern browser. No build step or server required — all dependencies are loaded from CDN.

> Requires an internet connection on first load to fetch Three.js (`r128`) and the Inter font.

---

## Controls

### Playback
| Control | Description |
|---|---|
| **⏸ / ▶ button** | Pause or resume the drone's flight |
| **▧ Sensor Offset** | Toggle hull-mounted sensor offset on/off |
| **Drone speed slider** | Adjusts traversal speed from 0× to 2× |
| **Purge Map** | Stops playback, resets drone to start, clears point cloud, path, minimap, and all stats |
| **Reset Everything** | Full factory reset — restores all sliders and settings to defaults |

### Camera
| Mode | Behavior |
|---|---|
| **ISO** | Free orbit camera — click and drag to rotate, scroll to zoom |
| **Follow** | Third-person view that tracks the drone from behind |
| **FPV** | First-person view from the drone's nose |

### Drone Wobble (Inertial)

| Axis | Default | Effect |
|---|---|---|
| **X** | 0.10 | Lateral sway + roll |
| **Y** | 0.10 | Vertical bounce + pitch |
| **Z** | 0.05 | Forward/aft oscillation |

### LiDAR Configuration
| Setting | Description |
|---|---|
| **Orthogonal** | 2 scanners: equatorial + meridian planes |
| **Tetrahedral** | 4 scanners: apex + three base angles (default) |
| **Octahedral** | 6 scanners: full spatial coverage across multiple axes |

Each active scanner card exposes:

| Control | Range | Default |
|---|---|---|
| Scanning frequency | 0–100 Hz | 6 Hz |
| Ranging frequency | 2–800 kHz | 4 kHz |
| Minimum ranging distance | 0.01–10.00 m | 0.05 m |
| Maximum ranging distance | 1.00–100.00 m | 12.00 m |
| CW / CCW badge | — | CW |
| Angular resolution | computed readout | 0.54° |

### Visibility
- **⦿ Point Cloud** — Show/hide the scanned point cloud
- **⌇ Trace Path** — Show/hide the drone's flight trail

---

## Occlusion Model

Each scanner sub-step fires a `THREE.Raycaster` along the beam direction from the sensor origin. It tests two targets in priority order: first `raycaster.intersectObjects(environmentObjects)` for pillars, then `raycaster.ray.intersectBox(roomBox, boxHit)` for the room bounding box. The shortest result becomes `blockDist`. Any point cloud point further than `blockDist + 0.5` is skipped for that sub-step, preventing beams from scanning through solid geometry. The `+0.5` tolerance allows front-surface points of the occluder itself to register.

---

## Spatial Analytics

| Metric | Description |
|---|---|
| **Distance** | Cumulative drone flight distance in meters |
| **Map coverage** | Percentage of environment points hit by at least one scan |
| **Blind spots** | Remaining unscanned percentage during flight; Monte Carlo geometric estimate at rest |
| **Max hits** | Highest scan hit density recorded on a single point |

All analytics readouts update at 5 Hz.

---

## Scene Parameters

| Parameter | Value |
|---|---|
| Room dimensions | 18 × 12 × 80 units |
| Cylindrical obstacles | 5 pillars, radius 1.5 |
| Default LiDAR range | 0.05 – 12.0 m (per-scanner overridable) |
| Point cloud density | 90,000 points |
| Drone travel path | Z: −35 → +35 |
| Rolling shutter sub-steps | 3 per frame |
| Monte Carlo blind spot samples | 1,000 rays |

---

## Dependencies

- [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js)
- [Three.js OrbitControls](https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js)
- [Inter (Google Fonts)](https://fonts.google.com/specimen/Inter)

---

## Browser Compatibility

Any browser supporting **WebGL 1.0+** and **ES6**. Tested in Chrome, Firefox, and Edge.
