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

// 1. ROOM WIREFRAME
const roomGeo = new THREE.BoxGeometry(ROOM_SIZE.x, ROOM_SIZE.y, ROOM_SIZE.z);
const roomWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(roomGeo),
    new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
    })
);
scene.add(roomWire);

// 2. GHOST OBSTACLES (WHITE FAINT)
PILLAR_DATA.forEach(p => {
    const pGeo = new THREE.CylinderGeometry(1.5, 1.5, ROOM_SIZE.y, 24);
    const pMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        wireframe: false
    });
    const pillar = new THREE.Mesh(pGeo, pMat);
    pillar.position.set(p.x, 0, p.z);
    scene.add(pillar);
});

// Environment Points Logic
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
                  gl_PointSize = (vHeat > 0.01 ? 2.8 : 1.0) * (20.0 / -mvPos.z);
                  gl_Position = projectionMatrix * mvPos;
                }
              `,
    fragmentShader: `
                varying float vHeat;
                void main() {
                  if(vHeat < 0.01) gl_FragColor = vec4(0.1, 0.12, 0.15, 0.1);
                  else {
                    vec3 cyan = vec3(0.0, 1.0, 0.8);
                    vec3 yellow = vec3(1.0, 1.0, 0.0);
                    vec3 red = vec3(1.0, 0.2, 0.0);
                    vec3 color = mix(cyan, yellow, clamp(vHeat/4.0, 0.0, 1.0));
                    color = mix(color, red, clamp((vHeat-4.0)/8.0, 0.0, 1.0));
                    gl_FragColor = vec4(color, 1.0);
                  }
                  if(dot(gl_PointCoord-0.5, gl_PointCoord-0.5) > 0.25) discard;
                }
              `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const pointCloud = new THREE.Points(cloudGeo, cloudMat);
scene.add(pointCloud);

// TRACE LINE (WHITE)
const MAX_TRACE_PTS = 5000;
const traceGeo = new THREE.BufferGeometry();
const tracePositions = new Float32Array(MAX_TRACE_PTS * 3);
traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePositions, 3));
const traceLine = new THREE.Line(traceGeo, new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5
}));
scene.add(traceLine);

// DRONE (GEODESIC RIBS)
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
    currentConfig = 6,
    totalDist = 0;
let isPlaying = true,
    simSpeed = 1.0,
    camMode = 'iso',
    showPoints = true,
    showTrace = true;

function switchConfig(n) {
    currentConfig = n;
    scanners.forEach(s => drone.remove(s.pivot));
    scanners = [];
    [2, 4, 6].forEach(c => document.getElementById(`cfg-${c}`).classList.toggle('active', c === n));
    const list = document.getElementById('module-list');
    list.innerHTML = '';

    CONFIGS[n].forEach((p, i) => {
        const color = LIDAR_COLS[i];
        const pivot = new THREE.Group();
        pivot.rotation.y = THREE.MathUtils.degToRad(p.a);
        pivot.rotation.z = THREE.MathUtils.degToRad(p.t);
        drone.add(pivot);

        const hardware = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16), new THREE.MeshStandardMaterial({
            color: color
        }));
        hardware.position.y = 0.8;
        pivot.add(hardware);

        const wedge = new THREE.Mesh(new THREE.CircleGeometry(RANGE_MAX, 32, 0, Math.PI / 18), new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        }));
        wedge.rotation.x = Math.PI / 2;
        pivot.add(wedge);

        scanners.push({
            pivot,
            wedge,
            hz: 6,
            angle: 0,
            dir: 1,
            normal: new THREE.Vector3(0, 1, 0).applyQuaternion(pivot.quaternion)
        });

        const card = document.createElement('div');
        card.className = 'lidar-card';
        card.innerHTML = `
                  <div class="lidar-head"><span class="lidar-label" style="color:#${color.toString(16).padStart(6,'0')}">${p.name}</span>
                  <div class="dir-badge" id="dir-${i}" onclick="toggleDir(${i})">CW</div></div>
                  <div class="ctrl-row"><label>Scanning frequency</label>
                  <input type="range" min="0" max="200" step="1" value="6" oninput="updateHz(${i}, this.value)">
                  <span class="readout" id="hz-txt-${i}">6 Hz</span></div>`;
        list.appendChild(card);
    });
}

function updateHz(i, v) {
    if (scanners[i]) {
        scanners[i].hz = parseFloat(v);
        document.getElementById(`hz-txt-${i}`).innerText = v + ' Hz';
    }
}

function toggleDir(i) {
    scanners[i].dir *= -1;
    const el = document.getElementById(`dir-${i}`);
    el.innerText = scanners[i].dir === 1 ? 'CW' : 'CCW';
    el.classList.toggle('ccw', scanners[i].dir === -1);
}

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

function togglePlay() {
    const btn = document.getElementById('play-pause');
    if (!isPlaying) {
        // If drone already past the end, reset first
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
    droneZ = -35;
    totalDist = 0;
    scannedIntensity.fill(0);
    heatAttr.needsUpdate = true;
    totalScanned = 0;
    maxIntensity = 0;
    pathHistory = [];
    traceGeo.attributes.position.needsUpdate = true;
    traceGeo.setDrawRange(0, 0);
    document.getElementById('st-dist').innerText = "0.00m";
}

function animate() {
    requestAnimationFrame(animate);
    if (isPlaying) {
        const dt = 0.016;
        const step = 0.05 * simSpeed;
        droneZ += step;
        totalDist += step;
        if (droneZ > 35) {
            isPlaying = false;
            const btn = document.getElementById('play-pause');
            btn.innerText = "▶ CLICK TO RESUME";
            btn.classList.remove('active');
        }
        drone.position.z = droneZ;
        document.getElementById('st-dist').innerText = totalDist.toFixed(2) + "m";

        pathHistory.push(new THREE.Vector3(drone.position.x, drone.position.y, drone.position.z));
        if (pathHistory.length > MAX_TRACE_PTS) pathHistory.shift();
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

            for (let i = 0; i < NUM_POINTS; i++) {
                const dx = scenePts[i * 3] - drone.position.x;
                const dy = scenePts[i * 3 + 1] - drone.position.y;
                const dz = scenePts[i * 3 + 2] - drone.position.z;
                const dSq = dx * dx + dy * dy + dz * dz;
                if (dSq < (RANGE_MIN * RANGE_MIN) || dSq > (RANGE_MAX * RANGE_MAX)) continue;

                const pV = new THREE.Vector3(dx, dy, dz).normalize();
                if (Math.abs(pV.dot(s.normal)) < 0.04 && pV.dot(beamDir) > 0.999) {
                    if (scannedIntensity[i] === 0) totalScanned++;
                    scannedIntensity[i] += 0.8;
                    if (scannedIntensity[i] > maxIntensity) maxIntensity = scannedIntensity[i];
                }
            }
        });

        heatAttr.needsUpdate = true;
        const coverage = (totalScanned / NUM_POINTS) * 100;
        const configWeight = {
            2: 0.4,
            4: 0.7,
            6: 0.9
        } [currentConfig];
        const blindSpot = Math.max(0, 100 - (coverage / configWeight));

        document.getElementById('st-pct').innerText = coverage.toFixed(1) + '%';
        document.getElementById('st-heat').innerText = Math.floor(maxIntensity);
        const bsEl = document.getElementById('st-blind');
        bsEl.innerText = blindSpot.toFixed(1) + '%';
        bsEl.className = blindSpot > 30 ? 'alert' : '';
    }

    if (camMode === 'iso') controls.update();
    else if (camMode === 'drone') {
        camera.position.lerp(new THREE.Vector3(15, 10, droneZ + 15), 0.1);
        camera.lookAt(drone.position);
    } else if (camMode === 'fpv') {
        camera.position.set(0, 0, droneZ);
        camera.lookAt(0, 0, droneZ + 15);
    }

    renderer.render(scene, camera);
}

scene.add(new THREE.AmbientLight(0x404040), new THREE.PointLight(0xffffff, 1));
switchConfig(4);
animate();
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});