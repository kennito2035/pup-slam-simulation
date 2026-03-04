const LIDAR_COLS = [0x00ffcc, 0xff3366, 0x3399ff, 0xffff33, 0x33ff33, 0xff8833];
const RANGE_MIN = 0.05,
    RANGE_MAX = 12.0;
const ROOM_SIZE = {
    x: 18,
    y: 12,
    z: 80
};
const PILLAR_DATA = [{
    x: -5,
    z: -20
}, {
    x: 5,
    z: -10
}, {
    x: -4,
    z: 10
}, {
    x: 6,
    z: 25
}, {
    x: -2,
    z: 30
}];
const NUM_POINTS = 90000;

let useOffset = false; // Default to center-scan
let wobble = {
    x: 0.1,
    y: 0.1,
    z: 0.05,
    time: 0
};

const CONFIGS = {
    2: [{
        name: "L1: Equatorial",
        t: 0,
        a: 0
    }, {
        name: "L2: Meridian",
        t: 90,
        a: 0
    }],
    4: [{
        name: "L1: Apex",
        t: 90,
        a: 0
    }, {
        name: "L2: Base A",
        t: -19.5,
        a: 0
    }, {
        name: "L3: Base B",
        t: -19.5,
        a: 120
    }, {
        name: "L4: Base C",
        t: -19.5,
        a: 240
    }],
    6: [{
        name: "L1: Equatorial",
        t: 0,
        a: 0
    }, {
        name: "L2: Upper NE",
        t: 35,
        a: 45
    }, {
        name: "L3: Lower NW",
        t: -35,
        a: 135
    }, {
        name: "L4: Upper NW",
        t: 35,
        a: 135
    }, {
        name: "L5: Lower NE",
        t: -35,
        a: 45
    }, {
        name: "L6: Vertical",
        t: 90,
        a: 0
    }]
};

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas'),
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x010306, 1);

const miniCanvas = document.getElementById('minimap');
const ctx = miniCanvas.getContext('2d');
miniCanvas.width = 200;
miniCanvas.height = 200;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(20, 15, 20);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Create a tracking array
const environmentObjects = [];

// Room wireframe
const roomGeo = new THREE.BoxGeometry(ROOM_SIZE.x, ROOM_SIZE.y, ROOM_SIZE.z);
const roomMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: false,
    opacity: 1,
    depthWrite: true
});
const roomWire = new THREE.LineSegments(new THREE.EdgesGeometry(roomGeo), roomMat);
scene.add(roomWire);

// Pillars
PILLAR_DATA.forEach(p => {
    const pGeo = new THREE.CylinderGeometry(1.5, 1.5, ROOM_SIZE.y, 24);
    const pMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.05,
        depthWrite: false // Smooths out the "shadowing" overlap
    });
    const pillar = new THREE.Mesh(pGeo, pMat);
    pillar.position.set(p.x, 0, p.z);
    scene.add(pillar);
    environmentObjects.push(pillar);
});

const scenePts = new Float32Array(NUM_POINTS * 3);
const scannedIntensity = new Float32Array(NUM_POINTS);

function initWorld() {
    for (let i = 0; i < NUM_POINTS; i++) {
        let px, py, pz;
        const rand = Math.random();
        if (rand < 0.75) {
            pz = (Math.random() - 0.5) * ROOM_SIZE.z;
            const face = Math.floor(Math.random() * 4);
            if (face === 0) {
                px = -ROOM_SIZE.x / 2;
                py = (Math.random() - 0.5) * ROOM_SIZE.y;
            } else if (face === 1) {
                px = ROOM_SIZE.x / 2;
                py = (Math.random() - 0.5) * ROOM_SIZE.y;
            } else if (face === 2) {
                py = -ROOM_SIZE.y / 2;
                px = (Math.random() - 0.5) * ROOM_SIZE.x;
            } else {
                py = ROOM_SIZE.y / 2;
                px = (Math.random() - 0.5) * ROOM_SIZE.x;
            }
        } else {
            const p = PILLAR_DATA[Math.floor(Math.random() * PILLAR_DATA.length)];
            const ang = Math.random() * Math.PI * 2;
            px = p.x + Math.cos(ang) * 1.5;
            pz = p.z + Math.sin(ang) * 1.5;
            py = (Math.random() - 0.5) * ROOM_SIZE.y;
        }
        scenePts[i * 3] = px;
        scenePts[i * 3 + 1] = py;
        scenePts[i * 3 + 2] = pz;
    }
}
initWorld();

const cloudGeo = new THREE.BufferGeometry();
cloudGeo.setAttribute('position', new THREE.BufferAttribute(scenePts, 3));
const heatAttr = new THREE.BufferAttribute(scannedIntensity, 1);
cloudGeo.setAttribute('heat', heatAttr);

const cloudMat = new THREE.ShaderMaterial({
    vertexShader: `
				attribute float heat;
				varying float vHeat;
				void main() {
					vHeat = heat;
					vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
					
					// SMOOTH SIZE: Points grow smoothly from 1.0 to 2.8 as they are scanned
					float sizeMult = mix(1.0, 2.8, clamp(vHeat * 5.0, 0.0, 1.0));
					
					gl_PointSize = sizeMult * (20.0 / -mvPos.z);
					gl_Position = projectionMatrix * mvPos;
				}`,
    fragmentShader: `
				varying float vHeat;
				void main() {
					// Define colors
					vec3 bgPoint = vec3(0.1, 0.12, 0.15);
					vec3 cyan = vec3(0.0, 1.0, 0.8);
					vec3 yellow = vec3(1.0, 1.0, 0.0);
					vec3 red = vec3(1.0, 0.2, 0.0);

					// Calculate heatmap color progression
					vec3 scanColor = mix(cyan, yellow, clamp(vHeat/4.0, 0.0, 1.0));
					scanColor = mix(scanColor, red, clamp((vHeat-4.0)/8.0, 0.0, 1.0));

					// SMOOTH FADE: Transition color and opacity from "background" to "scanned"
					float transition = clamp(vHeat * 3.0, 0.0, 1.0);
					vec3 finalColor = mix(bgPoint, scanColor, transition);
					float alpha = mix(0.1, 1.0, transition);

					gl_FragColor = vec4(finalColor, alpha);

					// Circular point clipping
					if(dot(gl_PointCoord-0.5, gl_PointCoord-0.5) > 0.25) discard;
				}`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const pointCloud = new THREE.Points(cloudGeo, cloudMat);
scene.add(pointCloud);

const traceGeo = new THREE.BufferGeometry();
const tracePositions = new Float32Array(5000 * 3);
traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePositions, 3));
const traceLine = new THREE.Line(traceGeo, new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5
}));
scene.add(traceLine);

const drone = new THREE.Group();
const geoIco = new THREE.IcosahedronGeometry(0.8, 2);
const droneRibs = new THREE.LineSegments(new THREE.EdgesGeometry(geoIco), new THREE.LineBasicMaterial({
    color: 0x00cccc,
    transparent: true,
    opacity: 0.5
}));
const droneCore = new THREE.Mesh(geoIco, new THREE.MeshStandardMaterial({
    color: 0x050505,
    metalness: 1,
    roughness: 0.2
}));
drone.add(droneRibs, droneCore);
scene.add(drone);

const idealPos = new THREE.Vector3();

let scanners = [],
    pathHistory = [];
let droneZ = -35,
    totalScanned = 0,
    maxIntensity = 0,
    currentConfig = 4,
    totalDist = 0;
let isPlaying = true,
    simSpeed = 1.0,
    camMode = 'iso',
    showPoints = true,
    showTrace = true;

// Add a clock to decouple physics from framerate
const clock = new THREE.Clock();
let lastUIUpdate = 0;

function camView(v) {
    camMode = v;
    ['iso', 'drone', 'fpv'].forEach(m => document.getElementById(`cam-${m}`).classList.toggle('active', m === v));
    controls.enabled = (v === 'iso');
}

function togglePoints() {
    showPoints = !showPoints;
    pointCloud.visible = showPoints;
    document.getElementById('toggle-points').classList.toggle('active', showPoints);
}

function toggleTrace() {
    showTrace = !showTrace;
    traceLine.visible = showTrace;
    document.getElementById('toggle-trace').classList.toggle('active', showTrace);
}

// Calculate the inherent blind spot of the current configuration (Monte Carlo sampling method)
function calculateGeometricBlindSpot(numScanners) {
    const samples = 1000; // Rays to cast
    let hits = 0;
    const thickness = 0.04; // Must match your hit detection logic

    // Get the normals for the current configuration
    const config = CONFIGS[numScanners];
    const normals = config.map(p => {
        const pivot = new THREE.Group();
        pivot.rotation.y = THREE.MathUtils.degToRad(p.a);
        pivot.rotation.z = THREE.MathUtils.degToRad(p.t);
        return new THREE.Vector3(0, 1, 0).applyQuaternion(pivot.quaternion);
    });

    for (let i = 0; i < samples; i++) {
        // Generate a random point on a unit sphere
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(2 * Math.random() - 1);
        const ray = new THREE.Vector3(
            Math.sin(theta) * Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
            Math.cos(theta)
        );

        // Check if this ray is "captured" by any of the sensor planes
        let captured = false;
        for (let n of normals) {
            if (Math.abs(ray.dot(n)) < thickness) {
                captured = true;
                break;
            }
        }
        if (captured) hits++;
    }

    // Returns percentage of the sphere NOT covered by the planes
    return (1 - (hits / samples)) * 100;
}

function switchConfig(n) {
    currentConfig = n;

    // Prevent WebGL Memory Leak by properly disposing geometries and materials
    scanners.forEach(s => {
        drone.remove(s.pivot);
        s.pivot.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.dispose) child.material.dispose();
            }
        });
    });
    scanners = [];

    [2, 4, 6].forEach(c => document.getElementById(`cfg-${c}`).classList.toggle('active', c === n));

    // Update the UI with the strictly geometric blind spot
    const geoBlindSpot = calculateGeometricBlindSpot(n);
    const bsEl = document.getElementById('st-blind');

    // Set the text and keep it there
    bsEl.innerText = geoBlindSpot.toFixed(1) + '%';

    // Logic: If the hardware physically can't see 50% of the world, it's an "Alert"
    bsEl.className = geoBlindSpot > 50 ? 'alert' : '';

    const list = document.getElementById('module-list');
    list.innerHTML = '';

    CONFIGS[n].forEach((p, i) => {
        const color = LIDAR_COLS[i];
        const pivot = new THREE.Group();
        pivot.rotation.y = THREE.MathUtils.degToRad(p.a);
        pivot.rotation.z = THREE.MathUtils.degToRad(p.t);
        drone.add(pivot);

        // Reduced height to 0.05 for a "glued on" disc look
        const moduleGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.05, 16);
        const moduleMat = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.5,
            roughness: 0.5
        });
        const moduleMesh = new THREE.Mesh(moduleGeo, moduleMat);

        // Positioned above the drone's surface (radius 0.8)
        moduleMesh.position.y = 0.8;

        // The "lens" is now just a glowing cap on the disc
        const lensGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16);
        const lensMat = new THREE.MeshBasicMaterial({
            color: color
        });
        const lens = new THREE.Mesh(lensGeo, lensMat);

        lens.position.y = 0.04; // Placed right on top of the base plate
        moduleMesh.add(lens);
        pivot.add(moduleMesh);

        // Scanning wedge
        const wedge = new THREE.Mesh(
            new THREE.CircleGeometry(RANGE_MAX, 32, 0, Math.PI / 18),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide
            })
        );
        wedge.rotation.x = Math.PI / 2;
        wedge.position.y = useOffset ? 0.8 : 0;
        pivot.add(wedge);

        // Logic and UI
        scanners.push({
            pivot,
            wedge,
            hz: 6,
            rangeHz: 4000, // Default ranging frequency
            angle: 0,
            dir: 1,
            normal: new THREE.Vector3(0, 1, 0).applyQuaternion(pivot.quaternion),
            minDist: 0.05, // Default min ranging distance
            maxDist: 12.00, // Default max ranging distance
            color: color
        });

        // Set initial visual scale for the 12.00m default
        const initialScale = 12.00 / RANGE_MAX;
        wedge.scale.set(initialScale, initialScale, 1);

        const card = document.createElement('div');
        card.className = 'lidar-card';
        card.innerHTML = `
                        <div class="lidar-head">
                            <span class="lidar-label" style="color:#${color.toString(16).padStart(6, '0')}">${p.name}</span>
                            <div class="dir-badge" id="dir-${i}" onclick="toggleDir(${i})">CW</div>
                        </div>
                        <div class="ctrl-row">
                            <label>Scanning frequency</label>
                            <input type="range" min="0" max="100" step="1" value="6" oninput="updateScanHz(${i}, this.value)">
                            <span class="readout" id="hz-txt-${i}">6 Hz</span>
                        </div>
                        <div class="ctrl-row">
                            <label>Ranging frequency</label>
                            <input type="range" min="2" max="800" step="1" value="4" oninput="updateRangeHz(${i}, this.value)">
                            <span class="readout" id="rhz-txt-${i}">4 kHz</span>
                        </div>
						<div class="ctrl-row">
							<label>Minimum ranging distance</label>
							<input type="range" min="0.01" max="10.00" step="0.01" value="0.05" oninput="updateMinDist(${i}, this.value)">
							<span class="readout" id="min-txt-${i}">0.05 m</span>
						</div>
						<div class="ctrl-row">
							<label>Maximum ranging distance</label>
							<input type="range" min="1.00" max="100.00" step="1" value="${RANGE_MAX}" oninput="updateMaxDist(${i}, this.value)">
							<span class="readout" id="max-txt-${i}">12.00 m</span>
						</div>
                        <span class="res-tag" id="res-${i}">Angular resolution: 0.54°</span>`;
        list.appendChild(card);
    });
}

function updateMinDist(i, v) {
    const val = parseFloat(v);
    scanners[i].minDist = val;
    document.getElementById(`min-txt-${i}`).innerText = val.toFixed(2) + ' m';
}

function updateMaxDist(i, v) {
    const val = parseFloat(v);
    scanners[i].maxDist = val;
    document.getElementById(`max-txt-${i}`).innerText = val.toFixed(2) + ' m';

    // Scale the visual wedge to match the new range
    // We divide by RANGE_MAX because that was the original geometry size
    const scale = val / RANGE_MAX;
    scanners[i].wedge.scale.set(scale, scale, 1);
}

function updateScanHz(i, v) {
    scanners[i].hz = parseFloat(v);
    document.getElementById(`hz-txt-${i}`).innerText = v + ' Hz';
    updateResCalc(i);
}

function updateRangeHz(i, v) {
    // Store the actual raw frequency in Hz
    scanners[i].rangeHz = parseFloat(v) * 1000;
    document.getElementById(`rhz-txt-${i}`).innerText = v + ' kHz';
    updateResCalc(i);
}

function updateResCalc(i) {
    // Formula: (Scan Rate / Sample Rate) * 360 degrees
    const res = (scanners[i].hz / scanners[i].rangeHz) * 360;
    document.getElementById(`res-${i}`).innerText = `Angular resolution: ${res.toFixed(2)}°`;
}

function toggleDir(i) {
    scanners[i].dir *= -1;
    const el = document.getElementById(`dir-${i}`);
    el.innerText = scanners[i].dir === 1 ? 'CW' : 'CCW';
    el.classList.toggle('ccw', scanners[i].dir === -1);
}

function toggleOffset() {
    useOffset = !useOffset;
    const btn = document.getElementById('toggle-offset');
    btn.classList.toggle('active', useOffset);
    btn.innerText = useOffset ? "▧ SENSOR OFFSET IS ON" : "▧ SENSOR OFFSET IS OFF";

    // Update visual wedges immediately
    scanners.forEach(s => {
        s.wedge.position.y = useOffset ? 0.8 : 0;
    });
}

function togglePlay() {
    const btn = document.getElementById('play-pause');
    if (!isPlaying) {
        if (droneZ >= 35) resetSession();
        isPlaying = true;
        clock.getDelta(); // Reset clock delta when unpausing
        btn.innerText = "⏸ CLICK TO PAUSE";
        btn.classList.add('active');
    } else {
        isPlaying = false;
        btn.innerText = "▶ CLICK TO RESUME";
        btn.classList.remove('active');
    }
}

function updateSimSpeed(v) {
    simSpeed = parseFloat(v);
    document.getElementById('speed-out').innerText = simSpeed.toFixed(2) + 'x';
}

function resetSession() {
    // Stop simulation
    isPlaying = false;
    const btn = document.getElementById('play-pause');
    btn.innerText = "▶ CLICK TO RESUME";
    btn.classList.remove('active');

    // Reset motion
    droneZ = -35;
    totalDist = 0;
    wobble.time = 0;

    drone.position.set(0, 0, droneZ);
    drone.rotation.set(0, 0, 0);

    // Clear scan data
    scannedIntensity.fill(0);
    heatAttr.needsUpdate = true;
    totalScanned = 0;
    maxIntensity = 0;

    // Clear trace
    pathHistory = [];
    traceGeo.setDrawRange(0, 0);

    // Reset UI stats
    document.getElementById('st-dist').innerText = "0.00 m";
    document.getElementById('st-pct').innerText = "0.0%";
    document.getElementById('st-heat').innerText = "0";
    document.getElementById('st-blind').innerText = "100.0%";
    document.getElementById('st-blind').className = "alert";

    ctx.clearRect(0, 0, 200, 200);
}

function animate() {
    requestAnimationFrame(animate);

    // Safe Delta Time
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.1);

    if (isPlaying) {
        // Clear the minimap slightly every frame for a "radar trace" effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, 200, 200);

        wobble.time += dt * 3;
        const step = 0.05 * simSpeed * (dt / 0.016); // Normalize speed to 60fps baseline

        droneZ += step;
        totalDist += step;
        if (droneZ > 35) {
            isPlaying = false;
            const btn = document.getElementById('play-pause');
            btn.innerText = "▶ CLICK TO RESUME";
            btn.classList.remove('active');
        }

        // Rotational wobble added for realism
        drone.position.z = droneZ + (Math.sin(wobble.time * 0.7) * wobble.z);
        drone.position.x = (Math.cos(wobble.time) * wobble.x);
        drone.position.y = (Math.sin(wobble.time * 1.2) * wobble.y);
        drone.rotation.z = Math.sin(wobble.time * 1.5) * wobble.x * 0.4;
        drone.rotation.x = Math.cos(wobble.time * 0.8) * wobble.y * 0.4;

        document.getElementById('st-dist').innerText = totalDist.toFixed(2) + " m";
        pathHistory.push(new THREE.Vector3().copy(drone.position));
        if (pathHistory.length > 5000) pathHistory.shift();
        for (let i = 0; i < pathHistory.length; i++) {
            tracePositions[i * 3] = pathHistory[i].x;
            tracePositions[i * 3 + 1] = pathHistory[i].y;
            tracePositions[i * 3 + 2] = pathHistory[i].z;
        }
        traceGeo.attributes.position.needsUpdate = true;
        traceGeo.setDrawRange(0, pathHistory.length);

        // Array to batch canvas drawing outside the intensive loop
        const miniMapPoints = [];

        scanners.forEach(s => {
            const subSteps = 3; // Reduced from 8 to 3 to prevent "loop of death" frame drops
            const stepDt = dt / subSteps;
            const stepMove = step / subSteps;

            const offsetVec = useOffset ?
                new THREE.Vector3(0, 0.8, 0).applyQuaternion(s.pivot.quaternion).applyEuler(drone.rotation) :
                new THREE.Vector3(0, 0, 0);

            for (let j = 0; j < subSteps; j++) {
                // Rolling shutter: Interpolate angle and position
                const subAngle = s.angle + (Math.PI * 2 * s.hz * s.dir) * (stepDt * j);

                // Origin now accounts for the sensor's physical location on the hull
                const subX = drone.position.x + offsetVec.x;
                const subY = drone.position.y + offsetVec.y;
                const subZ = (droneZ + (stepMove * j)) + offsetVec.z;

                // Apply drone's rotation to the beam vector
                const beamDir = new THREE.Vector3(Math.cos(subAngle), 0, Math.sin(subAngle))
                    .applyQuaternion(s.pivot.quaternion)
                    .applyEuler(drone.rotation);

                // Apply drone's rotation to the normal vector
                const currentNormal = s.normal.clone().applyEuler(drone.rotation);

                const hitThreshold = 0.999 + (0.0009 * (1 - Math.min(s.rangeHz / 200000, 1)));

                // Calculate vector from the MODULE to the POINT (instead of drone center)
                for (let i = 0; i < NUM_POINTS; i++) {
                    const dx = scenePts[i * 3] - subX;
                    const dy = scenePts[i * 3 + 1] - subY;
                    const dz = scenePts[i * 3 + 2] - subZ;

                    // Broad-phase rejection (check if point is within the bounding box of Max Dist)
                    if (Math.abs(dx) > s.maxDist || Math.abs(dy) > s.maxDist || Math.abs(dz) > s.maxDist) continue;

                    const dSq = dx * dx + dy * dy + dz * dz;

                    // Precise distance check using individual scanner Min/Max
                    // This ensures the sensor doesn't "see" things too close or too far
                    if (dSq < (s.minDist * s.minDist) || dSq > (s.maxDist * s.maxDist)) continue;

                    const mag = Math.sqrt(dSq);
                    const pVx = dx / mag;
                    const pVy = dy / mag;
                    const pVz = dz / mag;

                    // Dot products done mathematically without new Objects
                    const dotNormal = (pVx * currentNormal.x) + (pVy * currentNormal.y) + (pVz * currentNormal.z);
                    const dotBeam = (pVx * beamDir.x) + (pVy * beamDir.y) + (pVz * beamDir.z);

                    if (Math.abs(dotNormal) < 0.04 && dotBeam > hitThreshold) {
                        if (scannedIntensity[i] === 0) totalScanned++;

                        const isSideWall = Math.abs(scenePts[i * 3]) > (ROOM_SIZE.x / 2 - 0.2);

                        // Direct calculation of incidence based on wall orientation
                        const incidence = Math.abs(isSideWall ? beamDir.x : beamDir.z);
                        const reflectivity = 0.3 + (incidence * 0.7);

                        // Increment by a fixed small value per hit to represent density
                        scannedIntensity[i] += 1.5 * reflectivity;

                        // Track the global peak density for the UI readout
                        if (scannedIntensity[i] > maxIntensity) maxIntensity = scannedIntensity[i];

                        // Store point to render later (Fixes Canvas API bottleneck)
                        miniMapPoints.push({
                            x: (scenePts[i * 3] / ROOM_SIZE.x + 0.5) * 200,
                            z: (scenePts[i * 3 + 2] / ROOM_SIZE.z + 0.5) * 200
                        });
                    }
                }
            }

            // Update the final angle for the next frame
            s.angle += (Math.PI * 2 * s.hz * s.dir) * dt;
            s.wedge.rotation.z = s.angle;
        });

        // Batch draw the minimap hits outside the nested loop
        if (miniMapPoints.length > 0) {
            ctx.fillStyle = `rgba(0, 255, 204, 0.4)`;
            ctx.beginPath();
            for (let i = 0; i < miniMapPoints.length; i++) {
                ctx.rect(miniMapPoints[i].x, miniMapPoints[i].z, 1.5, 1.5);
            }
            ctx.fill();
        }

        // Minimap UI Text Overlay
        ctx.font = "12px monospace";

        // Coordinates
        document.getElementById('coord-x').textContent = `X: ${drone.position.x.toFixed(2)}`;
        document.getElementById('coord-z').textContent = `Z: ${drone.position.z.toFixed(2)}`;

        // Draw the drone (center)
        const dX = (drone.position.x / ROOM_SIZE.x + 0.5) * 200;
        const dZ = (drone.position.z / ROOM_SIZE.z + 0.5) * 200;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(dX, dZ, 2, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw the LiDAR sensors (reflect SENSOR OFFSET)
        scanners.forEach(s => {
            // Calculate the physical offset vector of the sensor
            const offsetVec = useOffset ?
                new THREE.Vector3(0, 0.8, 0).applyQuaternion(s.pivot.quaternion).applyEuler(drone.rotation) :
                new THREE.Vector3(0, 0, 0);

            // Translate to Minimap 2D coordinates
            const sX = ((drone.position.x + offsetVec.x) / ROOM_SIZE.x + 0.5) * 200;
            const sZ = ((drone.position.z + offsetVec.z) / ROOM_SIZE.z + 0.5) * 200;

            // Draw a colored dot for the sensor
            ctx.fillStyle = `#${s.color.toString(16).padStart(6, '0')}`;
            ctx.beginPath();
            ctx.arc(sX, sZ, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });

        heatAttr.needsUpdate = true;

        // Throttle DOM Updates to avoid thrashing (update UI 5 times a second)
        if (clock.elapsedTime - lastUIUpdate > 0.2) {
            lastUIUpdate = clock.elapsedTime;

            // Calculate coverage
            const coverage = (totalScanned / NUM_POINTS) * 100;
            document.getElementById('st-pct').innerText = coverage.toFixed(1) + '%';

            // Using tracked maxIntensity instead of looping over 90,000 array items
            document.getElementById('st-heat').innerText = Math.floor(maxIntensity);

            // Update Blind Spots dynamically (Unscanned % of the map)
            const blindSpot = 100 - coverage;
            const bsEl = document.getElementById('st-blind');
            bsEl.innerText = blindSpot.toFixed(1) + '%';

            // Logic: Remove the 'alert' (red color) once device mapped more than 50%
            bsEl.className = blindSpot > 50 ? 'alert' : '';
        }
    }

    // Proximity fade
    environmentObjects.forEach(obj => {
        // Calculate the actual 3D distance from your CAMERA to the pillar
        const distanceToCamera = camera.position.distanceTo(obj.position);

        // Adjust these numbers to control the "light throw"
        // Pillars start appearing at 40m away, reach full brightness at 5m
        const range = 35;
        const proximity = 1.0 - Math.min(distanceToCamera / range, 1.0);

        // Quadratic easing makes the "light source" feel more natural
        const smoothGlow = proximity * proximity;

        // Update opacity (only pillars are in this array now)
        // Fades from 0.08 to 0.5
        obj.material.opacity = 0.08 + (smoothGlow * 0.42);
    });

    // Camera logic
    if (camMode === 'iso') {
        controls.update();
    } else if (camMode === 'drone') {
        idealPos.set(15, 10, drone.position.z - 15);
        camera.position.lerp(idealPos, 0.1);
        camera.lookAt(drone.position);
    } else if (camMode === 'fpv') {
        camera.position.copy(drone.position);
        camera.lookAt(drone.position.x, drone.position.y, drone.position.z + 10);
    }

    renderer.render(scene, camera);
}

function factoryReset() {
    // Reset global simulation variables
    simSpeed = 1.0;

    // Reset sensor offset
    useOffset = false;

    // Reset wobble
    wobble = {
        x: 0.1,
        y: 0.1,
        z: 0.05,
        time: 0
    };

    // Reset UI sliders & text
    document.querySelector('input[oninput*="updateSimSpeed"]').value = 1.0;
    document.getElementById('speed-out').innerText = "1.00x";

    document.querySelector('input[oninput*="wobble.x"]').value = 0.1;
    document.getElementById('w-x').innerText = "0.10";

    document.querySelector('input[oninput*="wobble.y"]').value = 0.1;
    document.getElementById('w-y').innerText = "0.10";

    document.querySelector('input[oninput*="wobble.z"]').value = 0.05;
    document.getElementById('w-z').innerText = "0.05";

    const offsetBtn = document.getElementById('toggle-offset');
    offsetBtn.classList.remove('active');
    offsetBtn.innerText = "▧ SENSOR OFFSET IS OFF";

    resetSession();

    // Restore default camera & config
    camView('iso');

    // Triggers switchConfig which builds new geometry correctly referencing useOffset
    switchConfig(4);

    // Resume Playback if paused
    if (!isPlaying) togglePlay();
}

scene.add(new THREE.AmbientLight(0x404040), new THREE.PointLight(0xffffff, 1));
switchConfig(4);

// Forces the engine to calculate transparency more accurately during rotation
renderer.sortObjects = true;
renderer.localClippingEnabled = true;

// Ensure the Point Cloud is always drawn "behind" the UI and lines
pointCloud.renderOrder = 1;
environmentObjects.forEach(obj => obj.renderOrder = 2);

animate();
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});