# Parameter Uplink Spectagraph (PUP) v1.4.0

A real-time 3D LiDAR SLAM simulation built with Three.js. PUP visualizes how different multi-sensor configurations scan and map an indoor environment as a drone traverses a corridor, rendering live point cloud heat maps, path traces, spatial analytics, and a 2D minimap overlay (prototype is inspired by Prometheus 2012).

---

## Features

- **Three LiDAR array geometries** — Orthogonal (2-sensor), Tetrahedral (4-sensor), and Octahedral (6-sensor) configurations, each modelling real-world multi-scanner arrangements
- **Monte Carlo blind spot estimation** — Geometric blind spot is computed at config-switch time by casting 1,000 random rays across a unit sphere and checking coverage against each scanner's plane normal, replacing the previous hardcoded weight table
- **Per-scanner ranging controls** — Each scanner independently exposes scanning frequency (0–100 Hz), ranging frequency (2–800 kHz), minimum ranging distance (0.01–10.00 m), and maximum ranging distance (1.00–100.00 m)
- **Angular resolution readout** — Displayed live per scanner, computed as `(scanHz / rangeHz) × 360°`
- **Broad-phase AABB rejection** — Per-axis distance check against `maxDist` before the full squared-distance test, significantly reducing unnecessary computation in the ray-cast hot loop
- **Live point cloud rendering** — 90,000 environment points rendered via custom GLSL shaders with heat-map coloring (cyan → yellow → red) reflecting scan hit density
- **Sensor offset mode** — Toggleable physical offset displacing each scanner's ray origin to its true hull-mounted position, with beam and normal vectors rotated to match drone attitude
- **Rotational wobble** — Drone roll and pitch animate alongside positional drift, causing beam directions to shift realistically during flight
- **2D minimap overlay** — Live top-down canvas with radar-trace decay, drone position marker, and X/Z coordinate readout; pinned to the bottom-right corner
- **Rolling shutter simulation** — 3 sub-steps per frame, interpolating beam angle and drone position during each sweep
- **Incidence angle reflectivity** — Hit intensity weighted by beam angle of incidence against wall surfaces
- **Camera modes** — Isometric (free orbit), Follow (third-person drone), and FPV (first-person)
- **Path trace** — White trail showing the drone's flight history through the scene
- **Ghost obstacles** — Semi-transparent pillars representing physical obstructions in the mapped room

---

## File Structure

```
PUP-v1.4.html   # Main entry point and UI markup
script.js       # Simulation logic, Three.js scene, scanner math, minimap renderer
styles.css      # Dark-mode UI styling
```

---

## Usage

Open `PUP-v1.4.html` in any modern browser. No build step or server required — all dependencies are loaded from CDN.

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
Simulates real-world flight instability. Wobble drives both positional drift and rotational attitude (roll + pitch).

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

The scanning wedge mesh scales visually to match each scanner's maximum ranging distance.

### Visibility
- **⦿ Point Cloud** — Show/hide the scanned point cloud
- **⌇ Trace Path** — Show/hide the drone's flight trail

---

## Minimap

A 200×200 px 2D canvas pinned to the bottom-right corner. Hit points are batch-drawn each frame via a single `beginPath/fill` call. A partial fade each frame creates a radar-trace decay effect. The drone's current X/Z position is shown as a marker with a live coordinate readout.

---

## Spatial Analytics

| Metric | Description |
|---|---|
| **Distance** | Cumulative drone flight distance in meters |
| **Map coverage** | Percentage of environment points hit by at least one scan |
| **Blind spots** | Monte Carlo geometric blind spot for the active configuration |
| **Max hits** | Highest scan hit density recorded on a single point |

Blind spot turns red when the geometric gap exceeds 50% of the sphere.

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
