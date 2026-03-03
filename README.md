# Parameter Uplink Spectagraph (PUP) v1.1.0

A real-time 3D LiDAR SLAM simulation built with Three.js. PUP visualizes how different multi-sensor configurations scan and map an indoor environment as a drone traverses a corridor, rendering live point cloud heat maps, path traces, and spatial analytics (prototype is inspired by Prometheus 2012).

---

## Features

- **Three LiDAR array geometries** — Orthogonal (2-sensor), Tetrahedral (4-sensor), and Octahedral (6-sensor) configurations, each modelling real-world multi-scanner arrangements
- **Live point cloud rendering** — 90,000 environment points rendered via custom GLSL shaders with heat-map coloring (cyan → yellow → red) reflecting scan hit density
- **Drone wobble simulation** — Independently tunable inertial drift on X, Y, and Z axes to model real-world flight instability
- **Per-scanner controls** — Independently adjust scanning frequency (0–200 Hz) and rotation direction (CW/CCW) for each LiDAR module
- **Spatial analytics** — Real-time readouts for distance traveled, map coverage %, blind spot %, and maximum hit intensity
- **Camera modes** — Isometric (free orbit), Follow (third-person drone), and FPV (first-person)
- **Path trace** — White trail showing the drone's flight history through the scene
- **Ghost obstacles** — Semi-transparent pillars representing physical obstructions in the mapped room

---

## File Structure

```
PUP-v1.1.html   # Main entry point and UI markup
script.js       # Simulation logic, Three.js scene, scanner math
styles.css      # Dark-mode UI styling
```

---

## Usage

Open `PUP-v1.1.html` in any modern browser. No build step or server required — all dependencies are loaded from CDN.

> Requires an internet connection on first load to fetch Three.js (`r128`) and the Inter font.

---

## Controls

### Playback
| Control | Description |
|---|---|
| **⏸ / ▶ button** | Pause or resume the drone's flight |
| **Drone speed slider** | Adjusts traversal speed from 0× to 2× |
| **Purge Map** | Resets the point cloud, path history, and all stats |
| **Reset Everything** | Full factory reset — restores all sliders and settings to defaults |

### Camera
| Mode | Behavior |
|---|---|
| **ISO** | Free orbit camera — click and drag to rotate, scroll to zoom |
| **Follow** | Third-person view that tracks the drone from behind |
| **FPV** | First-person view from the drone's nose |

### Drone Wobble (Inertial)
Simulates real-world flight instability. Each axis is independently tunable from `0.00` (rigid) to `1.00` (maximum drift).

| Axis | Default | Effect |
|---|---|---|
| **X** | 0.10 | Lateral sway |
| **Y** | 0.10 | Vertical bounce |
| **Z** | 0.05 | Forward/aft oscillation |

Higher wobble values increase positional noise in the scan, producing less coherent point clouds and higher blind spot estimates.

### LiDAR Configuration
| Setting | Description |
|---|---|
| **Orthogonal** | 2 scanners: equatorial + meridian planes |
| **Tetrahedral** | 4 scanners: apex + three base angles (default) |
| **Octahedral** | 6 scanners: full spatial coverage across multiple axes |

Each active scanner card exposes:
- **Frequency slider** — Controls how fast the scanner rotates (0–200 Hz)
- **CW / CCW badge** — Toggles rotation direction

### Visibility
- **⦿ Point Cloud** — Show/hide the scanned point cloud
- **⌇ Trace Path** — Show/hide the drone's flight trail

---

## Spatial Analytics

| Metric | Description |
|---|---|
| **Distance traveled** | Cumulative drone flight distance in meters |
| **Map coverage** | Percentage of environment points hit by at least one scan |
| **Blind spots** | Estimated unscanned volume, weighted by scanner config |
| **Max hits** | Highest scan hit count recorded on a single point |

Blind spot % is weighted by configuration — Octahedral (6-sensor) achieves the lowest blind spot ratio (~10% weight penalty vs. ~60% for Orthogonal).

---

## Scene Parameters

| Parameter | Value |
|---|---|
| Room dimensions | 18 × 12 × 80 units |
| Cylindrical obstacles | 5 pillars, radius 1.5 |
| LiDAR range | 0.05 – 13.0 units |
| Point cloud density | 90,000 points |
| Drone travel path | Z: −35 → +35 |

---

## Dependencies

- [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js)
- [Three.js OrbitControls](https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js)
- [Inter (Google Fonts)](https://fonts.google.com/specimen/Inter)

---

## Browser Compatibility

Any browser supporting **WebGL 1.0+** and **ES6**. Tested in Chrome, Firefox, and Edge.
