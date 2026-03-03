const LIDAR_COLS = [0x00ffcc, 0xff3366, 0x3399ff, 0xffff33, 0x33ff33, 0xff8833];
const RANGE_MIN = 0.05,
    RANGE_MAX = 13.0;
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

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(20, 15, 20);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const roomGeo = new THREE.BoxGeometry(ROOM_SIZE.x, ROOM_SIZE.y, ROOM_SIZE.z);
const roomWire = new THREE.LineSegments(new THREE.EdgesGeometry(roomGeo), new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1
}));
scene.add(roomWire);

PILLAR_DATA.forEach(p => {
    const pGeo = new THREE.CylinderGeometry(1.5, 1.5, ROOM_SIZE.y, 24);
    const pMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.05
    });
    const pillar = new THREE.Mesh(pGeo, pMat);
    pillar.position.set(p.x, 0, p.z);
    scene.add(pillar);
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
    vertexShader: `attribute float heat; varying float vHeat; void main() { vHeat = heat; vec4 mvPos = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (vHeat > 0.01 ? 2.8 : 1.0) * (20.0 / -mvPos.z); gl_Position = projectionMatrix * mvPos; }`,
    fragmentShader: `varying float vHeat; void main() { if(vHeat < 0.01) gl_FragColor = vec4(0.1, 0.12, 0.15, 0.1); else { vec3 cyan = vec3(0.0, 1.0, 0.8); vec3 yellow = vec3(1.0, 1.0, 0.0); vec3 red = vec3(1.0, 0.2, 0.0); vec3 color = mix(cyan, yellow, clamp(vHeat/4.0, 0.0, 1.0)); color = mix(color, red, clamp((vHeat-4.0)/8.0, 0.0, 1.0)); gl_FragColor = vec4(color, 1.0); } if(dot(gl_PointCoord-0.5, gl_PointCoord-0.5) > 0.25) discard; }`,
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
    scanners.forEach(s => drone.remove(s.pivot));
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
        pivot.add(wedge);

        // Logic and UI
        scanners.push({
            pivot,
            wedge,
            hz: 6,
            rangeHz: 4000, // Default ranging frequency
            angle: 0,
            dir: 1,
            normal: new THREE.Vector3(0, 1, 0).applyQuaternion(pivot.quaternion)
        });

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
							<input type="range" min="2" max="200" step="1" value="4" oninput="updateRangeHz(${i}, this.value)">
							<span class="readout" id="rhz-txt-${i}">4 kHz</span>
						</div>
						<span class="res-tag" id="res-${i}">Angular resolution: 0.54°</span>`;
        list.appendChild(card);
    });
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

function togglePlay() {
    const btn = document.getElementById('play-pause');
    if (!isPlaying) {
        if (droneZ >= 35) resetSession();
        isPlaying = true;
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

    // Clear scan data
    scannedIntensity.fill(0);
    heatAttr.needsUpdate = true;
    totalScanned = 0;
    maxIntensity = 0;

    // Clear trace
    pathHistory = [];
    traceGeo.setDrawRange(0, 0);

    // Reset UI stats
    document.getElementById('st-dist').innerText = "0.00m";
    document.getElementById('st-pct').innerText = "0.0%";
    document.getElementById('st-heat').innerText = "0";
    document.getElementById('st-blind').innerText = "100.0%";
    document.getElementById('st-blind').className = "alert";
}

function animate() {
    requestAnimationFrame(animate);
    if (isPlaying) {
        const dt = 0.016;
        wobble.time += dt * 3;

        const step = 0.05 * simSpeed;
        droneZ += step;
        totalDist += step;
        if (droneZ > 35) {
            isPlaying = false;
            const btn = document.getElementById('play-pause');
            btn.innerText = "▶ CLICK TO RESUME";
            btn.classList.remove('active');
        }

        drone.position.z = droneZ + (Math.sin(wobble.time * 0.7) * wobble.z);
        drone.position.x = (Math.cos(wobble.time) * wobble.x);
        drone.position.y = (Math.sin(wobble.time * 1.2) * wobble.y);

        document.getElementById('st-dist').innerText = totalDist.toFixed(2) + "m";
        pathHistory.push(new THREE.Vector3().copy(drone.position));
        if (pathHistory.length > 5000) pathHistory.shift();
        for (let i = 0; i < pathHistory.length; i++) {
            tracePositions[i * 3] = pathHistory[i].x;
            tracePositions[i * 3 + 1] = pathHistory[i].y;
            tracePositions[i * 3 + 2] = pathHistory[i].z;
        }
        traceGeo.attributes.position.needsUpdate = true;
        traceGeo.setDrawRange(0, pathHistory.length);

        scanners.forEach(s => {
            s.angle += (Math.PI * 2 * s.hz * s.dir) * dt;
            s.wedge.rotation.z = s.angle;
            const beamDir = new THREE.Vector3(Math.cos(s.angle), 0, Math.sin(s.angle)).applyQuaternion(s.pivot.quaternion);

            const hitThreshold = 0.999 + (0.0009 * (1 - Math.min(s.rangeHz / 200000, 1)));

            for (let i = 0; i < NUM_POINTS; i++) {
                const dx = scenePts[i * 3] - drone.position.x;
                const dy = scenePts[i * 3 + 1] - drone.position.y;
                const dz = scenePts[i * 3 + 2] - drone.position.z;
                const dSq = dx * dx + dy * dy + dz * dz;
                if (dSq < (RANGE_MIN * RANGE_MIN) || dSq > (RANGE_MAX * RANGE_MAX)) continue;

                const pV = new THREE.Vector3(dx, dy, dz).normalize();
                if (Math.abs(pV.dot(s.normal)) < 0.04 && pV.dot(beamDir) > hitThreshold) {
                    if (scannedIntensity[i] === 0) totalScanned++;
                    scannedIntensity[i] += (s.rangeHz / 100000);
                    if (scannedIntensity[i] > maxIntensity) maxIntensity = scannedIntensity[i];
                }
            }
        });

        heatAttr.needsUpdate = true;

        // Calculate coverage
        const coverage = (totalScanned / NUM_POINTS) * 100;
        document.getElementById('st-pct').innerText = coverage.toFixed(1) + '%';
        document.getElementById('st-heat').innerText = Math.floor(maxIntensity);

        // Update Blind Spots dynamically (Unscanned % of the map)
        const blindSpot = 100 - coverage;
        const bsEl = document.getElementById('st-blind');
        bsEl.innerText = blindSpot.toFixed(1) + '%';

        // Logic: Remove the 'alert' (red color) once device mapped more than 50%
        bsEl.className = blindSpot > 50 ? 'alert' : '';
    }

    // CAMERA LOGIC RE-INTEGRATED
    if (camMode === 'iso') {
        controls.update();
    } else if (camMode === 'drone') {
        const idealPos = new THREE.Vector3(15, 10, drone.position.z - 15);
        camera.position.lerp(idealPos, 0.1);
        camera.lookAt(drone.position);
    } else if (camMode === 'fpv') {
        camera.position.copy(drone.position);
        camera.lookAt(drone.position.x, drone.position.y, drone.position.z + 10);
    }

    renderer.render(scene, camera);
}

function factoryReset() {
    // Reset Global Simulation Variables
    simSpeed = 1.0;
    droneZ = -35;
    totalDist = 0;

    // Reset Wobble/Inertial defaults
    wobble = {
        x: 0.1,
        y: 0.1,
        z: 0.05,
        time: 0
    };

    // Reset UI Sliders & Text
    document.querySelector('input[oninput*="updateSimSpeed"]').value = 1.0;
    document.getElementById('speed-out').innerText = "1.00x";

    document.querySelector('input[oninput*="wobble.x"]').value = 0.1;
    document.getElementById('w-x').innerText = "0.10";

    document.querySelector('input[oninput*="wobble.y"]').value = 0.1;
    document.getElementById('w-y').innerText = "0.10";

    document.querySelector('input[oninput*="wobble.z"]').value = 0.05;
    document.getElementById('w-z').innerText = "0.05";

    // Clear Map Data & Path
    scannedIntensity.fill(0);
    heatAttr.needsUpdate = true;
    totalScanned = 0;
    maxIntensity = 0;
    pathHistory = [];
    traceGeo.setDrawRange(0, 0);

    // Restore Default Camera & Config
    camView('iso');
    switchConfig(4); // Resets LiDAR modules to default values

    // Resume Playback if paused
    if (!isPlaying) togglePlay();
}

scene.add(new THREE.AmbientLight(0x404040), new THREE.PointLight(0xffffff, 1));
switchConfig(4);
animate();
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});