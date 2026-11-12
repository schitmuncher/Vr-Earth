// Open Flight - WebXR flying game over real-world terrain.
import * as THREE from 'three';

// ====================================================================
// Basics
// ====================================================================
const DEG = Math.PI / 180;
const R_E = 6378137, E2 = 6.69437999014e-3, CIRC = 2 * Math.PI * R_E;
const UP = new THREE.Vector3(0, 1, 0);
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const rand = (a, b) => a + Math.random() * (b - a);
const V = () => new THREE.Vector3();

const PLACES = [
  ['snowdon', 'Yr Wyddfa (Snowdon), Wales', 53.0685, -4.0763],
  ['nantwich', 'Nantwich, Cheshire', 53.0670, -2.5210],
  ['lakes', 'Scafell Pike, Lake District', 54.4542, -3.2116],
  ['nevis', 'Ben Nevis, Scotland', 56.7969, -5.0036],
  ['matterhorn', 'Matterhorn, Alps', 45.9766, 7.6585],
  ['canyon', 'Grand Canyon, USA', 36.1000, -112.1000],
  ['yosemite', 'Yosemite Valley, USA', 37.7400, -119.5900],
  ['fuji', 'Mount Fuji, Japan', 35.3606, 138.7274],
  ['everest', 'Mount Everest, Himalaya', 27.9881, 86.9250],
  ['rio', 'Rio de Janeiro, Brazil', -22.9519, -43.2105],
  ['custom', 'Custom latitude / longitude', 0, 0]
];

// ====================================================================
// Settings
// ====================================================================
const SETTINGS_KEY = 'openFlight2';
const DEFAULTS = {
  source: 'free', place: 'snowdon', customLat: 53.067, customLon: -2.521,
  // game
  flightStyle: 'plane', arcade: true, steer: 'stick', aim: 'hand', leftTrigger: 'fire', view: 'chase',
  // plane
  planeMaxSpeed: 110, planeIdleSpeed: 25, planeTurn: 55, planePitch: 40, boost: 2, invertPitch: false,
  // hover
  hoverSpeed: 60, strafeSpeed: 15, altSpeed: 15, turnSpeed: 90,
  // shared feel
  smoothing: 2, triggerCurve: 2, deadzone: 0.15, startAlt: 250,
  // targets
  balloons: 40, drones: 5, ringRadius: 35, fireRate: 12, aimAssist: 4,
  // route
  clearance: 60, showRoute: true,
  // graphics
  renderScale: 1, viewTiles: 2, terrainZoom: 12, imagery: 'satellite', clouds: true,
  errorTarget: 24, geoidOffset: 50,
  // sound
  volume: 0.5, haptics: true
};

const SCHEMA = [
  { group: 'Game' },
  { key: 'flightStyle', label: 'Flight style', options: [['plane', 'Plane (arcade)'], ['hover', 'Hover (drift anywhere)'], ['rail', 'Route rail (needs GPX)']] },
  { key: 'arcade', label: 'Balloons, drones and rings', type: 'bool' },
  { key: 'steer', label: 'Steer the plane with', options: [['stick', 'Right thumbstick'], ['hand', 'Right hand tilt']] },
  { key: 'aim', label: 'Aim guns with', options: [['hand', 'Left hand pointing'], ['nose', 'Plane nose / where you look']] },
  { key: 'leftTrigger', label: 'Left trigger does', options: [['fire', 'Fire (X also fires)'], ['reverse', 'Reverse / brake (X fires)']] },
  { key: 'view', label: 'Plane view', options: [['chase', 'Chase (see your plane)'], ['first', 'Open air (no plane)']] },

  { group: 'Plane' },
  { key: 'planeMaxSpeed', label: 'Top speed (m/s)', min: 30, max: 400, step: 5 },
  { key: 'planeIdleSpeed', label: 'Speed with no throttle (m/s)', min: 0, max: 80, step: 1 },
  { key: 'planeTurn', label: 'Turn rate (deg/s)', min: 15, max: 120, step: 5 },
  { key: 'planePitch', label: 'Max climb / dive angle (deg)', min: 10, max: 75, step: 5 },
  { key: 'boost', label: 'Boost multiplier (hold A)', min: 1, max: 4, step: 0.25 },
  { key: 'invertPitch', label: 'Push forward to climb', type: 'bool' },

  { group: 'Hover and route rail' },
  { key: 'hoverSpeed', label: 'Top speed (m/s)', min: 5, max: 400, step: 5 },
  { key: 'strafeSpeed', label: 'Strafe speed (m/s)', min: 1, max: 60, step: 1 },
  { key: 'altSpeed', label: 'Climb / descend speed (m/s)', min: 1, max: 60, step: 1 },
  { key: 'turnSpeed', label: 'Turn speed (deg/s)', min: 15, max: 180, step: 5 },
  { key: 'clearance', label: 'Route and ring height above ground (m)', min: 10, max: 400, step: 10 },
  { key: 'showRoute', label: 'Show route line', type: 'bool' },

  { group: 'Feel' },
  { key: 'smoothing', label: 'Acceleration response', min: 0.5, max: 8, step: 0.5 },
  { key: 'triggerCurve', label: 'Trigger curve (1 linear, 3 very fine)', min: 1, max: 3, step: 0.1 },
  { key: 'deadzone', label: 'Stick deadzone', min: 0, max: 0.4, step: 0.01 },
  { key: 'startAlt', label: 'Start height above ground (m)', min: 30, max: 2000, step: 10 },

  { group: 'Targets' },
  { key: 'balloons', label: 'Balloons in the sky', min: 0, max: 80, step: 5 },
  { key: 'drones', label: 'Drones', min: 0, max: 12, step: 1 },
  { key: 'ringRadius', label: 'Ring size (m)', min: 15, max: 80, step: 5 },
  { key: 'fireRate', label: 'Fire rate (shots/s)', min: 3, max: 25, step: 1 },
  { key: 'aimAssist', label: 'Aim assist (degrees, 0 = off)', min: 0, max: 10, step: 0.5 },

  { group: 'Graphics' },
  { key: 'renderScale', label: 'Render scale (lower = smoother)', min: 0.5, max: 1.5, step: 0.05 },
  { key: 'viewTiles', label: 'Free terrain view distance', min: 1, max: 4, step: 1 },
  { key: 'terrainZoom', label: 'Free terrain detail (zoom)', min: 10, max: 13, step: 1 },
  { key: 'imagery', label: 'Free terrain look', options: [['satellite', 'Satellite photo'], ['painted', 'Painted relief']] },
  { key: 'clouds', label: 'Clouds', type: 'bool' },
  { key: 'errorTarget', label: 'Google 3D detail (lower = sharper)', min: 6, max: 64, step: 1 },
  { key: 'geoidOffset', label: 'Google 3D route height offset (m)', min: -100, max: 150, step: 5 },

  { group: 'Sound' },
  { key: 'volume', label: 'Volume', min: 0, max: 1, step: 0.05 },
  { key: 'haptics', label: 'Controller vibration', type: 'bool' }
];

const S = { ...DEFAULTS };
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === typeof DEFAULTS[k]) S[k] = saved[k];
  } catch (e) { /* ignore corrupt settings */ }
}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }
function store(key, value) { try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
function recall(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

// ====================================================================
// Logging
// ====================================================================
const logLines = [];
function log(msg) {
  msg = String(msg);
  console.log('[open-flight]', msg);
  logLines.push(msg);
  if (logLines.length > 5) logLines.shift();
  $('status').textContent = msg;
  hudMsg = msg; hudMsgUntil = performance.now() + 6000;
}
let hudMsg = '', hudMsgUntil = 0;
function flash(msg, ms = 2500) { hudMsg = msg; hudMsgUntil = performance.now() + ms; }
window.addEventListener('error', e => log('Error: ' + e.message));
window.addEventListener('unhandledrejection', e => log('Error: ' + (e.reason?.message ?? e.reason)));

// ====================================================================
// Renderer and scene
// ====================================================================
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.xr.enabled = true;
renderer.domElement.id = 'scene-canvas';
document.body.appendChild(renderer.domElement);

const SKY_HORIZON = new THREE.Color(0xbcd9f0), SKY_TOP = new THREE.Color(0x2f6fc4);
const scene = new THREE.Scene();
scene.background = SKY_HORIZON.clone();
scene.fog = new THREE.Fog(SKY_HORIZON.getHex(), 2000, 20000);
scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 2.2));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
sun.position.set(-1, 2, -1);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 80000);
const rig = new THREE.Group();        // the player's moving platform; only ever yaws, so the horizon stays level
rig.add(camera);
camera.position.set(0, 1.5, 0);
scene.add(rig);

// sky dome with a vertical gradient
const sky = (() => {
  const geo = new THREE.SphereGeometry(60000, 24, 12);
  const col = [], pos = geo.attributes.position, c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = clamp(pos.getY(i) / 60000, 0, 1);
    c.copy(SKY_HORIZON).lerp(SKY_TOP, Math.pow(t, 0.6));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10; m.frustumCulled = false;
  scene.add(m);
  return m;
})();

const sea = new THREE.Mesh(new THREE.PlaneGeometry(400000, 400000), new THREE.MeshBasicMaterial({ color: 0x2c6f9c }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -0.2; sea.visible = false;
scene.add(sea);

// ====================================================================
// World state
// ====================================================================
const W = { running: false, mode: null, source: 'free', tilesMode: false, origin: { lat: 0, lon: 0 }, placed: false, startY: 0, time: 0 };
const P = { pos: V(), yaw: 0, pitch: 0, roll: 0, speed: 0, vel: V(), railS: 0, railSide: 0, railAlt: 0, railYaw: 0 };
const G = { score: 0, combo: 0, comboUntil: 0, pops: 0 };
let route = null;                  // active route (projected)
const routes = [];                 // loaded GPX routes

// ====================================================================
// Geo helpers
// ====================================================================
function mercTile(lat, lon, z) {
  const n = 2 ** z;
  return { x: (lon + 180) / 360 * n, y: (1 - Math.asinh(Math.tan(lat * DEG)) / Math.PI) / 2 * n };
}
function ecef(lat, lon, h) {
  const p = lat * DEG, l = lon * DEG, sp = Math.sin(p), cp = Math.cos(p);
  const N = R_E / Math.sqrt(1 - E2 * sp * sp);
  return [(N + h) * cp * Math.cos(l), (N + h) * cp * Math.sin(l), (N * (1 - E2) + h) * sp];
}
const enuM = new THREE.Matrix4();   // ECEF -> local (x east, y up, z south)
function setEnuOrigin(lat, lon) {
  const p = lat * DEG, l = lon * DEG, sp = Math.sin(p), cp = Math.cos(p), sl = Math.sin(l), cl = Math.cos(l);
  const O = ecef(lat, lon, 0);
  const e = [-sl, cl, 0], n = [-sp * cl, -sp * sl, cp], u = [cp * cl, cp * sl, sp];
  const d = a => a[0] * O[0] + a[1] * O[1] + a[2] * O[2];
  enuM.set(e[0], e[1], e[2], -d(e), u[0], u[1], u[2], -d(u), -n[0], -n[1], -n[2], d(n), 0, 0, 0, 1);
}
function geoToLocal(lat, lon, ele) {
  if (W.tilesMode) {
    const c = ecef(lat, lon, (ele ?? 0) + S.geoidOffset);
    const v = new THREE.Vector3(c[0], c[1], c[2]).applyMatrix4(enuM);
    return { x: v.x, z: v.z, y: v.y };
  }
  const t = mercTile(lat, lon, terrain.Z);
  return { x: (t.x - terrain.o.x) * terrain.tileM, z: (t.y - terrain.o.y) * terrain.tileM, y: ele ?? null };
}

// ====================================================================
// Free terrain (keyless elevation + imagery tiles)
// ====================================================================
const ELEV_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const IMG_URL = (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/${z}/${y}/${x}.jpg`;
const SEG = 64, NV = SEG + 3;       // grid plus a skirt ring that hides seams between tiles
const terrain = { group: new THREE.Group(), tiles: new Map(), queue: [], active: 0, Z: 12, o: { x: 0, y: 0 }, tileM: 1, cx: null, cy: null, gen: 0, warned: false, index: null };
scene.add(terrain.group);

const readCanvas = document.createElement('canvas'); readCanvas.width = readCanvas.height = 256;
const readCtx = readCanvas.getContext('2d', { willReadFrequently: true });

async function fetchBitmap(url, raw) {
  const r = await fetch(url, { mode: 'cors' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const b = await r.blob();
  return createImageBitmap(b, raw ? { colorSpaceConversion: 'none', premultiplyAlpha: 'none' } : undefined);
}

function terrainReset() {
  const T = terrain;
  T.gen++;
  for (const t of T.tiles.values()) disposeTile(t);
  T.tiles.clear(); T.queue.length = 0; T.cx = T.cy = null; T.warned = false;
  T.Z = S.terrainZoom;
  T.o = mercTile(W.origin.lat, W.origin.lon, T.Z);
  T.tileM = CIRC / 2 ** T.Z * Math.cos(W.origin.lat * DEG);
}

function disposeTile(t) {
  t.dead = true;
  if (t.mesh) {
    terrain.group.remove(t.mesh);
    t.mesh.geometry.dispose();
    t.mesh.material.map?.dispose();
    t.mesh.material.dispose();
    t.mesh = null;
  }
}

function terrainUpdate(force) {
  const T = terrain;
  const cx = Math.floor(T.o.x + P.pos.x / T.tileM), cy = Math.floor(T.o.y + P.pos.z / T.tileM);
  if (force || cx !== T.cx || cy !== T.cy) {
    T.cx = cx; T.cy = cy;
    const r = S.viewTiles, n = 2 ** T.Z;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const y = cy + dy;
      if (y < 0 || y >= n) continue;
      const key = (cx + dx) + '/' + y;
      if (!T.tiles.has(key)) {
        const t = { x: cx + dx, y, key, mesh: null, heights: null, dead: false };
        T.tiles.set(key, t); T.queue.push(t);
      }
    }
    for (const [k, t] of T.tiles) {
      if (Math.max(Math.abs(t.x - cx), Math.abs(t.y - cy)) > r + 1) { disposeTile(t); T.tiles.delete(k); }
    }
    T.queue = T.queue.filter(t => !t.dead);
    T.queue.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    scene.fog.far = (r + 0.45) * T.tileM;
    scene.fog.near = scene.fog.far * 0.35;
  }
  while (T.active < 4 && T.queue.length) loadTile(T.queue.shift());
}

function heightColor(h, out) {
  // simple hypsometric ramp: water, lowland green, upland, rock, snow
  const stops = [[-1e9, 30, 84, 140], [0.5, 30, 84, 140], [1, 190, 180, 140], [8, 96, 148, 74], [250, 122, 150, 78],
    [600, 142, 128, 88], [1300, 126, 116, 108], [2400, 150, 146, 144], [3200, 240, 242, 246], [1e9, 250, 250, 252]];
  for (let i = 1; i < stops.length; i++) {
    if (h <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i], t = clamp((h - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1);
      out[0] = a[1] + (b[1] - a[1]) * t; out[1] = a[2] + (b[2] - a[2]) * t; out[2] = a[3] + (b[3] - a[3]) * t;
      return;
    }
  }
}

function paintTile(heights, pixelM) {
  const color = document.createElement('canvas'); color.width = color.height = 256;
  const shade = document.createElement('canvas'); shade.width = shade.height = 256;
  const cctx = color.getContext('2d'), sctx = shade.getContext('2d');
  const cd = cctx.createImageData(256, 256), sd = sctx.createImageData(256, 256);
  const rgb = [0, 0, 0];
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = y * 256 + x, h = heights[i];
    const hx = heights[y * 256 + Math.min(255, x + 1)] - heights[y * 256 + Math.max(0, x - 1)];
    const hz = heights[Math.min(255, y + 1) * 256 + x] - heights[Math.max(0, y - 1) * 256 + x];
    const s = h <= 0.5 ? 1 : clamp(1 + (hx + hz) / (2 * pixelM) * 0.9, 0.45, 1.45);   // light from the north-west
    heightColor(h, rgb);
    const n = (Math.random() - 0.5) * 8, o = i * 4;
    cd.data[o] = clamp(rgb[0] * s + n, 0, 255); cd.data[o + 1] = clamp(rgb[1] * s + n, 0, 255); cd.data[o + 2] = clamp(rgb[2] * s + n, 0, 255); cd.data[o + 3] = 255;
    const g = clamp(s, 0, 1) * 255;
    sd.data[o] = sd.data[o + 1] = sd.data[o + 2] = g; sd.data[o + 3] = 255;
  }
  cctx.putImageData(cd, 0, 0); sctx.putImageData(sd, 0, 0);
  return { color, shade };
}

function makeTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function tileIndex() {
  if (terrain.index) return terrain.index;
  const idx = [];
  for (let j = 0; j < NV - 1; j++) for (let i = 0; i < NV - 1; i++) {
    const a = j * NV + i, b = a + 1, c = a + NV, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  terrain.index = new THREE.BufferAttribute(new Uint16Array(idx), 1);
  return terrain.index;
}

async function loadTile(t) {
  const T = terrain, gen = T.gen, n = 2 ** T.Z;
  T.active++;
  try {
    const xw = ((t.x % n) + n) % n;
    let heights = new Float32Array(65536);
    try {
      const bmp = await fetchBitmap(ELEV_URL(T.Z, xw, t.y), true);
      if (t.dead || gen !== T.gen) return;
      readCtx.clearRect(0, 0, 256, 256);
      readCtx.drawImage(bmp, 0, 0, 256, 256);
      bmp.close?.();
      const d = readCtx.getImageData(0, 0, 256, 256).data;
      for (let i = 0; i < 65536; i++) heights[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    } catch (e) {
      heights.fill(20);
      if (!T.warned) { T.warned = true; log('Could not download terrain heights (' + e.message + '). Flying over flat ground. Check the headset is online.'); }
    }
    if (t.dead || gen !== T.gen) return;
    t.heights = heights;

    // geometry
    const pos = new Float32Array(NV * NV * 3), uv = new Float32Array(NV * NV * 2);
    const x0 = (t.x - T.o.x) * T.tileM, z0 = (t.y - T.o.y) * T.tileM;
    for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) {
      const u = clamp(i - 1, 0, SEG) / SEG, v = clamp(j - 1, 0, SEG) / SEG;
      const skirt = i === 0 || j === 0 || i === NV - 1 || j === NV - 1;
      const h = heights[Math.round(v * 255) * 256 + Math.round(u * 255)];
      const k = j * NV + i;
      pos[k * 3] = x0 + u * T.tileM; pos[k * 3 + 1] = Math.max(h, -3) - (skirt ? 250 : 0); pos[k * 3 + 2] = z0 + v * T.tileM;
      uv[k * 2] = u; uv[k * 2 + 1] = v;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(tileIndex());
    geo.computeBoundingSphere();

    const painted = paintTile(heights, T.tileM / 256);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: makeTexture(painted.color) }));
    mesh.matrixAutoUpdate = false;
    t.mesh = mesh;
    T.group.add(mesh);

    // satellite imagery on top, if wanted and reachable
    if (S.imagery === 'satellite') {
      try {
        const z = T.Z + 1, m = 2 ** z;
        const imgs = await Promise.all([[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) =>
          fetchBitmap(IMG_URL(z, ((xw * 2 + dx) % m + m) % m, t.y * 2 + dy), false)));
        if (t.dead || gen !== T.gen) return;
        const c = document.createElement('canvas'); c.width = c.height = 512;
        const ctx = c.getContext('2d');
        imgs.forEach((im, i) => { ctx.drawImage(im, (i % 2) * 256, (i >> 1) * 256, 256, 256); im.close?.(); });
        ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.55;
        ctx.drawImage(painted.shade, 0, 0, 512, 512);
        const old = mesh.material.map;
        mesh.material.map = makeTexture(c);
        mesh.material.needsUpdate = true;
        old.dispose();
      } catch (e) {
        if (!T.imgWarned) { T.imgWarned = true; log('Satellite imagery unavailable (' + e.message + '). Using painted terrain.'); }
      }
    }
  } finally {
    T.active--;
  }
}

function freeGround(x, z) {
  const T = terrain, tx = T.o.x + x / T.tileM, ty = T.o.y + z / T.tileM;
  const fx = Math.floor(tx), fy = Math.floor(ty);
  const t = T.tiles.get(fx + '/' + fy);
  if (!t || !t.heights) return null;
  const px = (tx - fx) * 255, py = (ty - fy) * 255;
  const ix = Math.min(254, Math.floor(px)), iy = Math.min(254, Math.floor(py)), ax = px - ix, ay = py - iy;
  const h = t.heights, i = iy * 256 + ix;
  const v = (h[i] * (1 - ax) + h[i + 1] * ax) * (1 - ay) + (h[i + 256] * (1 - ax) + h[i + 257] * ax) * ay;
  return Math.max(v, 0);
}

// ====================================================================
// Google / Cesium photorealistic 3D tiles
// ====================================================================
const geoFrame = new THREE.Group();
geoFrame.matrixAutoUpdate = false;
scene.add(geoFrame);
let tiles = null, tilesId = null, tilesXr = false, tilesGround = null, tilesGroundAt = V(), tilesRayT = 0;
const groundRay = new THREE.Raycaster();
groundRay.firstHitOnly = true;

async function tilesInit(source, token) {
  const id = source + ':' + token;
  if (tiles && tilesId !== id) { geoFrame.remove(tiles.group); tiles.dispose(); tiles = null; }
  if (!tiles) {
    const L = await import('./lib/tiles.bundle.js');
    if (source === 'cesium') {
      tiles = new L.TilesRenderer();
      tiles.registerPlugin(new L.CesiumIonAuthPlugin({ apiToken: token, assetId: '2275207', autoRefreshToken: true }));
    } else {
      tiles = new L.TilesRenderer('https://tile.googleapis.com/v1/3dtiles/root.json');
      tiles.registerPlugin(new L.GoogleCloudAuthPlugin({ apiToken: token, autoRefreshToken: true }));
    }
    tiles.registerPlugin(new L.GLTFExtensionsPlugin({ dracoLoader: new L.DRACOLoader().setDecoderPath('./lib/draco/') }));
    tiles.addEventListener('load-error', e => log('Map tile error: ' + (e.error?.message ?? 'failed to load') + '. Check the key and its restrictions.'));
    geoFrame.add(tiles.group);
    tilesId = id;
  }
  tiles.errorTarget = S.errorTarget;
  setEnuOrigin(W.origin.lat, W.origin.lon);
  geoFrame.matrix.copy(enuM);
  geoFrame.updateMatrixWorld(true);
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);
  tilesXr = false; tilesGround = null;
}

function tilesUpdate(dt) {
  if (!tiles) return;
  if (renderer.xr.isPresenting && !tilesXr) {
    const xc = renderer.xr.getCamera();
    if (xc.cameras && xc.cameras.length) {
      const vp = xc.cameras[0].viewport;
      tiles.setCamera(xc);
      tiles.setResolution(xc, vp.z, vp.w);
      tilesXr = true;
    }
  }
  tiles.errorTarget = S.errorTarget;
  tiles.update();
  tilesRayT -= dt;
  if (tilesRayT <= 0) {
    tilesRayT = 0.4;
    try {
      groundRay.set(new THREE.Vector3(P.pos.x, P.pos.y + 4000, P.pos.z), new THREE.Vector3(0, -1, 0));
      const hit = groundRay.intersectObject(tiles.group, true)[0];
      if (hit) { tilesGround = hit.point.y; tilesGroundAt.copy(P.pos); }
    } catch (e) { /* tiles not ready */ }
  }
}

// ground height under a point, or null when unknown
function groundHeight(x, z) {
  if (!W.tilesMode) return freeGround(x, z);
  if (tilesGround == null) return null;
  return Math.hypot(x - tilesGroundAt.x, z - tilesGroundAt.z) < 400 ? tilesGround : null;
}

// ====================================================================
// GPX routes
// ====================================================================
function parseGpx(text, name) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('not valid XML');
  let nodes = [...doc.getElementsByTagName('trkpt')];
  if (!nodes.length) nodes = [...doc.getElementsByTagName('rtept')];
  if (!nodes.length) nodes = [...doc.getElementsByTagName('wpt')];
  let geo = nodes.map(n => {
    const ele = parseFloat(n.getElementsByTagName('ele')[0]?.textContent);
    return { lat: parseFloat(n.getAttribute('lat')), lon: parseFloat(n.getAttribute('lon')), ele: Number.isFinite(ele) ? ele : null };
  }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (geo.length < 2) throw new Error('needs at least 2 points');
  const stride = Math.max(1, Math.ceil(geo.length / 8000));
  geo = geo.filter((_, i) => i % stride === 0);
  // rough length for the menu
  let km = 0;
  for (let i = 1; i < geo.length; i++) {
    const a = geo[i - 1], b = geo[i];
    km += Math.hypot((b.lat - a.lat) * DEG * R_E, (b.lon - a.lon) * DEG * R_E * Math.cos(a.lat * DEG)) / 1000;
  }
  return { name, geo, km, pts: [], cum: [0], total: 0 };
}

function projectRoute(r) {
  r.pts = r.geo.map(g => geoToLocal(g.lat, g.lon, g.ele));
  r.cum = [0];
  for (let i = 1; i < r.pts.length; i++) r.cum.push(r.cum[i - 1] + Math.hypot(r.pts[i].x - r.pts[i - 1].x, r.pts[i].z - r.pts[i - 1].z));
  r.total = r.cum[r.cum.length - 1];
}

function routeAt(r, s) {
  const cum = r.cum;
  let lo = 0, hi = cum.length - 2;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid - 1; }
  const a = r.pts[lo], b = r.pts[lo + 1];
  const t = clamp((s - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1), 0, 1);
  const dX = b.x - a.x, dZ = b.z - a.z, len = Math.hypot(dX, dZ) || 1;
  const y = (a.y != null && b.y != null) ? a.y + (b.y - a.y) * t : (a.y ?? b.y ?? null);
  return { x: a.x + dX * t, z: a.z + dZ * t, y, dirX: dX / len, dirZ: dZ / len, yaw: Math.atan2(-dX, -dZ) };
}
function routeGround(p) {
  if (W.tilesMode) return p.y ?? W.startY;
  return groundHeight(p.x, p.z) ?? p.y ?? 0;
}

let routeLine = null, routeLineT = 0;
function buildRouteLine() {
  if (routeLine) { scene.remove(routeLine); routeLine.geometry.dispose(); routeLine = null; }
  if (!route) return;
  const pos = new Float32Array(route.pts.length * 3);
  route.pts.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = (p.y ?? 0) + S.clearance; pos[i * 3 + 2] = p.z; });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  routeLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffcc33, fog: false }));
  routeLine.frustumCulled = false;
  scene.add(routeLine);
}
function updateRouteLine(dt) {
  if (!routeLine) return;
  routeLine.visible = S.showRoute;
  routeLineT -= dt;
  if (routeLineT > 0 || W.tilesMode) return;
  routeLineT = 2;
  const a = routeLine.geometry.attributes.position;
  route.pts.forEach((p, i) => { const g = groundHeight(p.x, p.z); if (g != null) a.setY(i, g + S.clearance); });
  a.needsUpdate = true;
}

// ====================================================================
// The plane model
// ====================================================================
const plane = (() => {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xe23b2e }), white = new THREE.MeshLambertMaterial({ color: 0xf4f1e8 }),
    dark = new THREE.MeshLambertMaterial({ color: 0x24303a });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 6, 10), red); body.rotation.x = -Math.PI / 2; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 10), white); nose.rotation.x = -Math.PI / 2; nose.position.z = -3.45; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9, 0.14, 1.5), white); wing.position.set(0, 0.1, -0.6); g.add(wing);
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 1.52), red); tipL.position.set(-3.9, 0.1, -0.6); g.add(tipL);
  const tipR = tipL.clone(); tipR.position.x = 3.9; g.add(tipR);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.9), white); tail.position.set(0, 0.1, 2.6); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 1), red); fin.position.set(0, 0.7, 2.6); g.add(fin);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), dark); canopy.scale.set(0.9, 0.7, 1.6); canopy.position.set(0, 0.45, -0.8); g.add(canopy);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.06), dark); prop.position.z = -3.95; g.add(prop);
  g.userData.prop = prop;
  g.scale.setScalar(0.6);
  g.position.set(0, -0.8, -13);
  rig.add(g);
  return g;
})();

// ====================================================================
// Sound and haptics
// ====================================================================
const sfx = {
  ctx: null, master: null, eng: null, noise: null,
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = S.volume; this.master.connect(c.destination);
      const o = c.createOscillator(); o.type = 'sawtooth';
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      const g = c.createGain(); g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(this.master); o.start();
      this.eng = { o, g };
      const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
    } catch (e) { this.ctx = null; }
  },
  engine(speed, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(S.volume, t, 0.1);
    this.eng.o.frequency.setTargetAtTime(48 + speed * 0.8, t, 0.12);
    this.eng.g.gain.setTargetAtTime(on ? 0.05 + Math.min(speed, 250) / 250 * 0.07 : 0, t, 0.2);
  },
  tone(f0, f1, dur, type = 'sine', vol = 0.3, delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  burst(dur, freq, vol) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  gun() { this.burst(0.07, 1900, 0.22); },
  pop() { this.tone(760, 170, 0.18, 'sine', 0.4); },
  hit() { this.tone(320, 110, 0.12, 'square', 0.18); },
  boom() { this.burst(0.5, 320, 0.7); this.tone(190, 40, 0.5, 'sine', 0.5); },
  gate() { this.tone(880, 880, 0.3, 'triangle', 0.3); this.tone(1320, 1320, 0.45, 'triangle', 0.25, 0.09); },
  win() { [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, f, 0.35, 'triangle', 0.3, i * 0.12)); },
  bump() { this.burst(0.3, 140, 0.8); }
};
const pads = { left: null, right: null };
function buzz(hand, strength, ms) {
  if (!S.haptics) return;
  const gp = pads[hand];
  try {
    if (gp?.hapticActuators?.[0]?.pulse) gp.hapticActuators[0].pulse(strength, ms);
    else gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength });
  } catch (e) { /* no haptics */ }
}

// ====================================================================
// Particles
// ====================================================================
const PN = 400;
const parts = (() => {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(PN * 3).fill(-1e6), col = new Float32Array(PN * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, sizeAttenuation: true, fog: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  return { pts, pos, col, vel: new Float32Array(PN * 3), life: new Float32Array(PN), next: 0 };
})();
function burst(p, color, count, speed) {
  const c = new THREE.Color(color);
  for (let n = 0; n < count; n++) {
    const i = parts.next; parts.next = (parts.next + 1) % PN;
    const a = Math.random() * Math.PI * 2, b = Math.acos(rand(-1, 1)), s = speed * rand(0.3, 1);
    parts.pos[i * 3] = p.x; parts.pos[i * 3 + 1] = p.y; parts.pos[i * 3 + 2] = p.z;
    parts.vel[i * 3] = Math.sin(b) * Math.cos(a) * s; parts.vel[i * 3 + 1] = Math.cos(b) * s; parts.vel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * s;
    parts.col[i * 3] = c.r; parts.col[i * 3 + 1] = c.g; parts.col[i * 3 + 2] = c.b;
    parts.life[i] = rand(0.6, 1.3);
  }
  parts.pts.geometry.attributes.color.needsUpdate = true;
}
function updateParticles(dt) {
  for (let i = 0; i < PN; i++) {
    if (parts.life[i] <= 0) continue;
    parts.life[i] -= dt;
    if (parts.life[i] <= 0) { parts.pos[i * 3 + 1] = -1e6; continue; }
    parts.vel[i * 3 + 1] -= 9 * dt;
    parts.pos[i * 3] += parts.vel[i * 3] * dt; parts.pos[i * 3 + 1] += parts.vel[i * 3 + 1] * dt; parts.pos[i * 3 + 2] += parts.vel[i * 3 + 2] * dt;
  }
  parts.pts.geometry.attributes.position.needsUpdate = true;
}

// ====================================================================
// Clouds
// ====================================================================
const clouds = (() => {
  const group = new THREE.Group(), list = [];
  const geo = new THREE.IcosahedronGeometry(1, 1), mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(rand(90, 200), rand(40, 70), rand(90, 180));
      m.position.set(rand(-160, 160), rand(-15, 15), rand(-160, 160));
      c.add(m);
    }
    group.add(c); list.push(c);
  }
  scene.add(group);
  return { group, list };
})();
function placeCloud(c, near) {
  const a = Math.random() * Math.PI * 2, d = near ? rand(500, 9000) : rand(7000, 9000);
  c.position.set(P.pos.x + Math.sin(a) * d, (W.placed ? W.startY : P.pos.y) + rand(900, 2200), P.pos.z + Math.cos(a) * d);
}
function updateClouds(dt) {
  clouds.group.visible = S.clouds;
  if (!S.clouds) return;
  for (const c of clouds.list) {
    c.position.x += 6 * dt;
    if (Math.hypot(c.position.x - P.pos.x, c.position.z - P.pos.z) > 9500) placeCloud(c, false);
  }
}

// ====================================================================
// Targets: balloons and drones
// ====================================================================
const targets = [];
const targetGroup = new THREE.Group();
scene.add(targetGroup);
const BALLOON_COLORS = [0xff4d4d, 0xffa53a, 0x3ad17a, 0x3aa7ff, 0xc56cff, 0xff6fb5];
const balloonGeo = new THREE.SphereGeometry(1, 14, 10), knotGeo = new THREE.ConeGeometry(0.18, 0.35, 6);
const balloonMats = BALLOON_COLORS.map(c => new THREE.MeshLambertMaterial({ color: c, fog: false }));
const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x805000, fog: false });

function makeBalloon() {
  const gold = Math.random() < 0.12, ci = Math.floor(Math.random() * BALLOON_COLORS.length);
  const m = new THREE.Mesh(balloonGeo, gold ? goldMat : balloonMats[ci]);
  const r = gold ? 9 : 14;
  m.scale.set(r, r * 1.2, r);
  const knot = new THREE.Mesh(knotGeo, m.material); knot.position.y = -1.05; m.add(knot);
  targetGroup.add(m);
  return { type: 'balloon', mesh: m, r: r * 1.1, gold, color: gold ? 0xffd23a : BALLOON_COLORS[ci], hp: 1, base: V(), phase: rand(0, 6), vel: V() };
}
function makeDrone() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshLambertMaterial({ color: 0x4a5560, fog: false })); hull.scale.set(1, 0.28, 1); g.add(hull);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), new THREE.MeshLambertMaterial({ color: 0x7df0ff, emissive: 0x2a8fa0, fog: false })); dome.position.y = 0.18; g.add(dome);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 20), new THREE.MeshBasicMaterial({ color: 0xff3355, fog: false })); rim.rotation.x = Math.PI / 2; g.add(rim);
  g.scale.setScalar(11);
  targetGroup.add(g);
  return { type: 'drone', mesh: g, hull, r: 11, hp: 3, color: 0xff3355, base: V(), phase: rand(0, 6), orbit: rand(150, 400), fleeUntil: 0, vel: V() };
}
function spawnTarget(t, anywhere) {
  const a = P.yaw + (anywhere ? rand(-Math.PI, Math.PI) : rand(-1.4, 1.4)), d = anywhere ? rand(250, 1900) : rand(900, 2100);
  const x = P.pos.x - Math.sin(a) * d, z = P.pos.z - Math.cos(a) * d;
  const g = groundHeight(x, z);
  const y = g != null ? Math.max(g + 40, (P.pos.y + g + 150) / 2 + rand(-140, 140)) : P.pos.y + rand(-120, 160);
  t.base.set(x, y, z);
  t.mesh.position.copy(t.base);
  t.hp = t.type === 'drone' ? 3 : 1;
  t.mesh.visible = true;
}
function syncTargets() {
  const want = S.arcade ? { balloon: S.balloons, drone: S.drones } : { balloon: 0, drone: 0 };
  for (const type of ['balloon', 'drone']) {
    let have = targets.filter(t => t.type === type);
    while (have.length > want[type]) { const t = have.pop(); targetGroup.remove(t.mesh); targets.splice(targets.indexOf(t), 1); }
    while (have.length < want[type]) { const t = type === 'balloon' ? makeBalloon() : makeDrone(); spawnTarget(t, true); targets.push(t); have.push(t); }
  }
}
function addScore(points, label) {
  const now = W.time;
  G.combo = now < G.comboUntil ? G.combo + 1 : 1;
  G.comboUntil = now + 4;
  const mult = Math.min(8, 1 + Math.floor((G.combo - 1) / 3));
  G.score += points * mult;
  flash(`${label} +${points * mult}${mult > 1 ? '  (x' + mult + ' combo)' : ''}`, 1800);
}
function killTarget(t, rammed) {
  burst(t.mesh.position, t.color, t.type === 'drone' ? 70 : 28, t.type === 'drone' ? 60 : 30);
  if (t.type === 'drone') { sfx.boom(); addScore(1000, 'Drone down!'); buzz('left', 1, 160); buzz('right', 1, 160); }
  else { sfx.pop(); addScore(rammed ? 50 : (t.gold ? 500 : 100), rammed ? 'Rammed!' : (t.gold ? 'Gold balloon!' : 'Pop!')); buzz('left', 0.5, 50); }
  G.pops++;
  spawnTarget(t, false);
}
function updateTargets(dt) {
  syncTargets();
  for (const t of targets) {
    const m = t.mesh;
    if (t.type === 'balloon') {
      m.position.y = t.base.y + Math.sin(W.time * 0.8 + t.phase) * 6;
      t.vel.set(0, 0, 0);
    } else {
      const fast = W.time < t.fleeUntil ? 2.2 : 1;
      const prevX = m.position.x, prevZ = m.position.z;
      t.phase += 45 * fast / t.orbit * dt;
      m.position.set(t.base.x + Math.cos(t.phase) * t.orbit, t.base.y + Math.sin(W.time * 0.6 + t.phase) * 25, t.base.z + Math.sin(t.phase) * t.orbit);
      t.vel.set((m.position.x - prevX) / dt, 0, (m.position.z - prevZ) / dt);
      m.rotation.y += 2 * dt;
    }
    const d = m.position.distanceTo(planePoint);
    if (d > 3000) spawnTarget(t, false);
    else if (d < t.r + 4 && W.placed) killTarget(t, true);
  }
}

// ====================================================================
// Guns
// ====================================================================
const BN = 60, BULLET_SPEED = 520;
const bullets = (() => {
  const geo = new THREE.BoxGeometry(0.35, 0.35, 9), mat = new THREE.MeshBasicMaterial({ color: 0xfff28a, fog: false });
  const list = [];
  for (let i = 0; i < BN; i++) {
    const m = new THREE.Mesh(geo, mat); m.visible = false; m.frustumCulled = false; scene.add(m);
    list.push({ mesh: m, vel: V(), life: 0 });
  }
  return { list, next: 0, cool: 0 };
})();

const reticle = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 22, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#ff4040'; x.beginPath(); x.arc(32, 32, 4, 0, Math.PI * 2); x.fill();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, fog: false, transparent: true }));
  s.renderOrder = 998; s.scale.setScalar(9);
  scene.add(s);
  return s;
})();

const muzzle = V(), aimDir = V(), planePoint = V();
const hands = { left: null, right: null };
const _q = new THREE.Quaternion(), _v = V(), _v2 = V();

function noseDir(out) {
  if (S.flightStyle === 'plane') return out.set(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
  return camera.getWorldDirection(out);
}
function updateAim() {
  const chase = S.flightStyle === 'plane' && S.view === 'chase';
  if (chase) plane.getWorldPosition(muzzle);
  else { camera.getWorldPosition(muzzle); muzzle.y -= 0.6; }
  planePoint.copy(chase ? muzzle : P.pos);

  const hand = hands.left;
  if (S.aim === 'hand' && W.mode === 'vr' && hand && hand.visible) {
    hand.getWorldPosition(_v);
    hand.getWorldQuaternion(_q);
    _v2.set(0, 0, -1).applyQuaternion(_q);
    if (chase) aimDir.copy(_v).addScaledVector(_v2, 500).sub(muzzle).normalize();   // converge on where the hand points
    else { aimDir.copy(_v2); muzzle.copy(_v); }
  } else noseDir(aimDir);

  // aim assist: snap to the closest target inside a small cone
  if (S.aimAssist > 0) {
    let best = null, bestCos = Math.cos(S.aimAssist * DEG);
    for (const t of targets) {
      _v.copy(t.mesh.position).sub(muzzle);
      const d = _v.length();
      if (d > 1600) continue;
      const c = _v.dot(aimDir) / d;
      if (c > bestCos) { bestCos = c; best = t; }
    }
    if (best) {
      const d = best.mesh.position.distanceTo(muzzle);
      aimDir.copy(best.mesh.position).addScaledVector(best.vel, d / BULLET_SPEED).sub(muzzle).normalize();
    }
  }
  reticle.visible = S.arcade;
  reticle.position.copy(muzzle).addScaledVector(aimDir, 220);
}
function fire() {
  const b = bullets.list[bullets.next]; bullets.next = (bullets.next + 1) % BN;
  b.mesh.position.copy(muzzle).addScaledVector(aimDir, 4);
  b.vel.copy(aimDir).multiplyScalar(BULLET_SPEED).addScaledVector(P.vel, 0.5);
  b.mesh.lookAt(_v.copy(b.mesh.position).add(aimDir));
  b.life = 2.2; b.mesh.visible = true;
  sfx.gun(); buzz('left', 0.35, 30);
}
function updateBullets(dt, firing) {
  bullets.cool -= dt;
  if (firing && bullets.cool <= 0 && S.arcade) { fire(); bullets.cool = 1 / S.fireRate; }
  for (const b of bullets.list) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const a = _v.copy(b.mesh.position);
    b.mesh.position.addScaledVector(b.vel, dt);
    const p = b.mesh.position;
    let dead = b.life <= 0;
    // segment vs target spheres
    const seg = _v2.copy(p).sub(a), len2 = seg.lengthSq() || 1;
    for (const t of targets) {
      const c = t.mesh.position;
      const k = clamp(((c.x - a.x) * seg.x + (c.y - a.y) * seg.y + (c.z - a.z) * seg.z) / len2, 0, 1);
      const dx = a.x + seg.x * k - c.x, dy = a.y + seg.y * k - c.y, dz = a.z + seg.z * k - c.z;
      if (dx * dx + dy * dy + dz * dz < (t.r + 1.5) ** 2) {
        dead = true;
        if (--t.hp <= 0) killTarget(t, false);
        else { sfx.hit(); burst(c, 0xffffff, 10, 25); t.fleeUntil = W.time + 3; flash('Hit! ' + t.hp + ' to go', 900); }
        break;
      }
    }
    if (!dead) {
      const g = groundHeight(p.x, p.z);
      if (g != null && p.y < g) { dead = true; burst(_v.set(p.x, g + 1, p.z), 0xc9b08a, 8, 14); }
    }
    if (dead) { b.life = 0; b.mesh.visible = false; }
  }
}

// ====================================================================
// Ring course
// ====================================================================
const course = { gates: [], next: 0, t0: null, name: '', best: null, doneAt: null, group: new THREE.Group() };
scene.add(course.group);
function clearCourse() {
  for (const g of course.gates) { course.group.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); }
  course.gates = []; course.next = 0; course.t0 = null; course.doneAt = null;
}
function buildCourse() {
  clearCourse();
  if (!S.arcade) return;
  const list = [];
  if (route) {
    const spacing = clamp(route.total / 30, 250, 1500);
    for (let s = spacing * 0.5; s < route.total; s += spacing) {
      const p = routeAt(route, s);
      list.push({ x: p.x, z: p.z, yaw: p.yaw, y: W.tilesMode && p.y != null ? p.y + S.clearance : null });
    }
    course.name = 'gpx:' + route.name;
  } else {
    const n = 12;
    for (let i = 0; i < n; i++) {
      // a loop that starts just ahead of you and comes back round
      const a = Math.PI + (i + 1) / (n + 1) * Math.PI * 2, rad = 2200 + 500 * Math.sin(i * 2.3);
      list.push({ x: Math.sin(a) * rad + 300, z: -Math.cos(a) * rad - 2200, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), y: null, extra: rand(0, 120) });
    }
    course.name = 'loop:' + W.source + ':' + W.origin.lat.toFixed(3) + ',' + W.origin.lon.toFixed(3);
  }
  for (const g of list) {
    g.mesh = new THREE.Mesh(new THREE.TorusGeometry(S.ringRadius, S.ringRadius * 0.05, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x35d6ff, transparent: true, opacity: 0.5, fog: false }));
    g.mesh.rotation.y = g.yaw;
    g.mesh.visible = false;
    course.group.add(g.mesh);
    course.gates.push(g);
  }
  const b = parseFloat(recall('of2best:' + course.name));
  course.best = Number.isFinite(b) ? b : null;
}
function fmtTime(s) { const m = Math.floor(s / 60); return m + ':' + (s - m * 60).toFixed(1).padStart(4, '0'); }
function updateCourse(dt) {
  const C = course;
  if (!C.gates.length) return;
  if (C.doneAt != null) { if (W.time - C.doneAt > 8) buildCourse(); return; }
  for (let i = 0; i < C.gates.length; i++) {
    const g = C.gates[i], rel = i - C.next;
    const show = rel >= 0 && rel < 4;
    g.mesh.visible = show;
    if (!show) continue;
    if (!g.fixed) {
      if (W.tilesMode) {
        // ground is only known under the player here, so rings sit at a set height
        if (g.y != null) g.fixed = true;
        else if (W.placed) { g.y = W.startY + S.startAlt * 0.8 + (g.extra || 0); g.fixed = true; }
      } else {
        const gh = groundHeight(g.x, g.z);
        if (gh != null) { g.y = gh + S.clearance + S.ringRadius * 0.4 + (g.extra || 0); g.fixed = true; }
      }
      if (g.y == null) g.mesh.position.set(g.x, P.pos.y, g.z);
    }
    if (g.y != null) g.mesh.position.set(g.x, g.y, g.z);
    const m = g.mesh.material;
    if (rel === 0) { m.color.setHex(0xfff04a); m.opacity = 0.75 + 0.25 * Math.sin(W.time * 8); g.mesh.scale.setScalar(1 + 0.04 * Math.sin(W.time * 8)); }
    else { m.color.setHex(0x35d6ff); m.opacity = 0.4; g.mesh.scale.setScalar(1); }
  }
  const g = C.gates[C.next];
  if (g && W.placed && g.mesh.position.distanceTo(planePoint) < S.ringRadius * 1.05) {
    if (C.t0 == null) C.t0 = W.time;
    C.next++;
    G.score += 250;
    burst(g.mesh.position, 0xfff04a, 30, 45);
    buzz('right', 0.7, 80);
    if (C.next >= C.gates.length) {
      const t = W.time - C.t0;
      const record = C.best == null || t < C.best;
      if (record) { C.best = t; store('of2best:' + C.name, String(t)); }
      G.score += 2000;
      sfx.win();
      for (let k = 0; k < 5; k++) burst(_v.copy(planePoint).add(V().set(rand(-60, 60), rand(10, 60), rand(-60, 60))), BALLOON_COLORS[k], 40, 50);
      flash(`Course complete in ${fmtTime(t)}${record ? '  NEW BEST!' : '  (best ' + fmtTime(C.best) + ')'}`, 8000);
      C.doneAt = W.time;
    } else { sfx.gate(); flash(`Ring ${C.next}/${C.gates.length}`, 1200); }
  }
}

// ====================================================================
// HUD (a dashboard panel that rides with you, also shows errors in VR)
// ====================================================================
const hudCanvas = document.createElement('canvas'); hudCanvas.width = 1024; hudCanvas.height = 300;
const hctx = hudCanvas.getContext('2d');
const hudTex = new THREE.CanvasTexture(hudCanvas);
hudTex.colorSpace = THREE.SRGBColorSpace;
const hud = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.337), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, fog: false }));
hud.renderOrder = 999;
hud.position.set(0, 0.78, -1.45); hud.rotation.x = -0.5;
rig.add(hud);
let hudTimer = 0, hudOn = true;
const SOURCE_CREDIT = { free: 'Terrain: Mapzen/AWS  |  Imagery: Sentinel-2 cloudless by EOX', google: 'Map data: Google', cesium: 'Map data: Google, via Cesium ion' };

function updateHud(dt) {
  hud.visible = hudOn;
  if (W.mode === 'screen') { hud.position.set(0, 0.92, -1.5); hud.rotation.x = -0.25; } else { hud.position.set(0, 0.78, -1.45); hud.rotation.x = -0.5; }
  hudTimer -= dt;
  if (hudTimer > 0 || !hudOn) return;
  hudTimer = 0.15;
  const c = hctx, w = 1024, h = 300;
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(8, 18, 28, 0.72)';
  if (c.roundRect) { c.beginPath(); c.roundRect(0, 0, w, h, 28); c.fill(); } else c.fillRect(0, 0, w, h);
  c.textBaseline = 'middle';

  const g = groundHeight(P.pos.x, P.pos.z);
  c.fillStyle = '#e8f4ff'; c.textAlign = 'left';
  if (S.arcade) {
    c.font = 'bold 30px sans-serif'; c.fillStyle = '#9fd8ff'; c.fillText('SCORE', 34, 44);
    c.font = 'bold 76px sans-serif'; c.fillStyle = '#fff'; c.fillText(String(G.score), 34, 110);
    if (W.time < G.comboUntil && G.combo > 1) { c.font = 'bold 34px sans-serif'; c.fillStyle = '#ffd23a'; c.fillText('COMBO ' + G.combo, 34, 172); }
  }
  c.textAlign = 'right';
  c.font = 'bold 30px sans-serif'; c.fillStyle = '#9fd8ff'; c.fillText('KM/H', w - 34, 44);
  c.font = 'bold 76px sans-serif'; c.fillStyle = '#fff'; c.fillText((Math.abs(P.speed) * 3.6).toFixed(0), w - 34, 110);
  c.font = 'bold 34px sans-serif'; c.fillStyle = '#cfe6f7';
  c.fillText(g != null ? Math.max(0, Math.round(P.pos.y - g)) + ' m up' : 'alt ' + Math.round(P.pos.y) + ' m', w - 34, 172);

  // next ring: arrow, distance, timer
  c.textAlign = 'center';
  const gate = course.gates[course.next];
  if (gate && course.doneAt == null) {
    const dx = gate.mesh.position.x - P.pos.x, dz = gate.mesh.position.z - P.pos.z, dy = gate.mesh.position.y - P.pos.y;
    const fwd = -dx * Math.sin(P.yaw) - dz * Math.cos(P.yaw), right = dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw);
    const ang = Math.atan2(right, fwd);
    c.save(); c.translate(w / 2, 78); c.rotate(ang);
    c.fillStyle = '#fff04a'; c.beginPath(); c.moveTo(0, -46); c.lineTo(30, 30); c.lineTo(0, 12); c.lineTo(-30, 30); c.closePath(); c.fill();
    c.restore();
    c.font = 'bold 32px sans-serif'; c.fillStyle = '#fff';
    c.fillText(`Ring ${course.next + 1}/${course.gates.length}  ${(Math.hypot(dx, dz) / 1000).toFixed(1)} km${dy > 25 ? '  climb' : dy < -25 ? '  dive' : ''}`, w / 2, 152);
    c.font = '28px sans-serif'; c.fillStyle = '#cfe6f7';
    c.fillText(course.t0 != null ? fmtTime(W.time - course.t0) + (course.best != null ? '   best ' + fmtTime(course.best) : '') : (course.best != null ? 'Best ' + fmtTime(course.best) : 'Fly through the yellow ring'), w / 2, 192);
  } else if (S.flightStyle === 'rail' && route) {
    c.font = 'bold 34px sans-serif'; c.fillStyle = '#fff';
    c.fillText(`${route.name.slice(0, 26)}  ${(100 * P.railS / (route.total || 1)).toFixed(0)}%`, w / 2, 100);
  }
  const msg = performance.now() < hudMsgUntil ? hudMsg : (W.placed ? SOURCE_CREDIT[W.source] : 'Loading the world...');
  c.font = (performance.now() < hudMsgUntil ? 'bold 32px' : '24px') + ' sans-serif';
  c.fillStyle = performance.now() < hudMsgUntil ? '#ffe9a8' : '#8fa9ba';
  c.fillText(msg.slice(0, 62), w / 2, 256);
  hudTex.needsUpdate = true;
}

// ====================================================================
// Input
// ====================================================================
const keys = new Set();
window.addEventListener('keydown', e => { keys.add(e.code); if (W.running && W.mode === 'screen' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); });
window.addEventListener('keyup', e => keys.delete(e.code));
const touch = { id: null, x0: 0, y0: 0, dx: 0, dy: 0, count: 0 };
renderer.domElement.addEventListener('pointerdown', e => {
  touch.count++;
  if (touch.id == null) { touch.id = e.pointerId; touch.x0 = e.clientX; touch.y0 = e.clientY; touch.dx = touch.dy = 0; }
  e.preventDefault();
});
renderer.domElement.addEventListener('pointermove', e => { if (e.pointerId === touch.id) { touch.dx = clamp((e.clientX - touch.x0) / 90, -1, 1); touch.dy = clamp((e.clientY - touch.y0) / 90, -1, 1); } });
const pointerEnd = e => { touch.count = Math.max(0, touch.count - 1); if (e.pointerId === touch.id) { touch.id = null; touch.dx = touch.dy = 0; } };
renderer.domElement.addEventListener('pointerup', pointerEnd);
renderer.domElement.addEventListener('pointercancel', pointerEnd);

for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i);
  c.visible = false;
  c.addEventListener('connected', e => { const h = e.data?.handedness; if (h === 'left' || h === 'right') { hands[h] = c; c.userData.hand = h; } c.visible = true; });
  c.addEventListener('disconnected', () => { const h = c.userData.hand; if (h && hands[h] === c) hands[h] = null; c.visible = false; });
  // a small pointer so you can see where each hand is aiming
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.09, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  tip.rotation.x = -Math.PI / 2; tip.position.z = -0.05; c.add(tip);
  rig.add(c);
}

const dzone = v => Math.abs(v) < S.deadzone ? 0 : (v - Math.sign(v) * S.deadzone) / (1 - S.deadzone);
const curve = t => Math.sign(t) * Math.pow(Math.abs(t), S.triggerCurve);
const prevBtn = {};
function readInput() {
  const o = { lx: 0, ly: 0, rx: 0, ry: 0, tR: 0, tL: 0, gripL: false, gripR: false, a: false, b: false, x: false, y: false };
  pads.left = pads.right = null;
  const session = renderer.xr.getSession();
  if (session) {
    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;
      const ax = gp.axes, bt = gp.buttons, off = ax.length >= 4 ? 2 : 0;
      const x = dzone(ax[off] ?? 0), y = dzone(ax[off + 1] ?? 0);
      if (src.handedness === 'left') {
        pads.left = gp; o.lx = x; o.ly = y; o.tL = bt[0]?.value ?? 0; o.gripL = !!bt[1]?.pressed; o.x = !!bt[4]?.pressed; o.y = !!bt[5]?.pressed;
      } else if (src.handedness === 'right') {
        pads.right = gp; o.rx = x; o.ry = y; o.tR = bt[0]?.value ?? 0; o.gripR = !!bt[1]?.pressed; o.a = !!bt[4]?.pressed; o.b = !!bt[5]?.pressed;
      }
    }
  } else {
    // keyboard and touch stand in for the controllers
    const k = c => keys.has(c) ? 1 : 0;
    o.rx = k('ArrowRight') + k('KeyD') - k('ArrowLeft') - k('KeyA') + touch.dx;
    o.ry = k('ArrowDown') + k('KeyS') - k('ArrowUp') - k('KeyW') + touch.dy;
    o.tR = Math.max(k('ShiftLeft'), k('ShiftRight'), touch.count > 0 ? 0.7 : 0);
    o.tL = Math.max(k('Space'), touch.count > 1 ? 1 : 0);
    o.lx = k('KeyE') - k('KeyQ'); o.ly = k('KeyF') - k('KeyR');
    o.gripL = !!k('KeyX'); o.a = !!k('KeyB'); o.b = !!k('KeyV'); o.y = !!k('KeyT'); o.x = !!k('KeyH');
    o.rx = clamp(o.rx, -1, 1); o.ry = clamp(o.ry, -1, 1);
    if (W.mode === 'screen' && S.leftTrigger === 'reverse') { o.x = o.x || o.tL > 0.5; o.tL = k('KeyX'); }
  }
  o.pressed = {};
  for (const n of ['a', 'b', 'x', 'y']) { o.pressed[n] = o[n] && !prevBtn[n]; prevBtn[n] = o[n]; }
  return o;
}

// ====================================================================
// Flight
// ====================================================================
function handTilt() {
  // the right hand held flat like a toy plane: tip it to climb, bank it to turn
  const h = hands.right;
  if (!h || !h.visible) return null;
  _v.set(0, 0, -1).applyQuaternion(h.quaternion);       // rig-local forward of the hand
  _v2.set(1, 0, 0).applyQuaternion(h.quaternion);       // rig-local right of the hand
  const pitch = Math.asin(clamp(_v.y, -1, 1)) + 0.35;   // a relaxed hand points the controller slightly down
  const roll = Math.asin(clamp(_v2.y, -1, 1));
  const dz = v => Math.abs(v) < 0.12 ? 0 : v - Math.sign(v) * 0.12;
  return { sx: clamp(-dz(roll) / 0.6, -1, 1), sy: clamp(dz(pitch) / 0.5, -1, 1) };
}

function updatePlane(dt, inp) {
  let sx = inp.rx, sy = S.invertPitch ? -inp.ry : inp.ry;
  if (S.steer === 'hand' && W.mode === 'vr') { const t = handTilt(); if (t) { sx = t.sx; sy = t.sy; } }
  const reverse = S.leftTrigger === 'reverse' ? inp.tL : (inp.gripL ? 1 : 0);
  const throttle = curve(inp.tR);
  let target = S.planeIdleSpeed + throttle * (S.planeMaxSpeed - S.planeIdleSpeed);
  if (inp.a) target *= S.boost;
  if (reverse > 0.05) target = -30 * reverse;
  if (inp.gripR) target = 0;

  P.speed = damp(P.speed, target, S.smoothing * 0.6, dt);
  P.roll = damp(P.roll, -sx * 55 * DEG, 5, dt);
  P.pitch = damp(P.pitch, sy * S.planePitch * DEG, 3, dt);
  P.yaw -= sx * S.planeTurn * DEG * dt;

  P.vel.set(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch)).multiplyScalar(P.speed);
  P.pos.addScaledVector(P.vel, dt);
  // left stick: gentle side-slip and lift for lining up shots
  P.pos.x += Math.cos(P.yaw) * inp.lx * S.strafeSpeed * dt; P.pos.z += -Math.sin(P.yaw) * inp.lx * S.strafeSpeed * dt;
  P.pos.y += -inp.ly * S.altSpeed * dt;

  plane.visible = S.view === 'chase';
  plane.rotation.set(P.pitch, 0, P.roll, 'YXZ');
  plane.userData.prop.rotation.z += (8 + Math.abs(P.speed) * 0.4) * dt;
}

function updateHover(dt, inp) {
  const fwd = camera.getWorldDirection(_v);
  const right = _v2.crossVectors(fwd, UP);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const back = S.leftTrigger === 'reverse' ? inp.tL : (inp.gripL ? 1 : 0);
  const speed = curve(inp.tR - back) * S.hoverSpeed * (inp.a ? S.boost : 1);
  const target = V().copy(fwd).multiplyScalar(speed).addScaledVector(right, inp.lx * S.strafeSpeed).addScaledVector(UP, -inp.ly * S.altSpeed);
  if (inp.gripR) target.set(0, 0, 0);
  P.vel.lerp(target, 1 - Math.exp(-dt * S.smoothing * 1.5));
  P.pos.addScaledVector(P.vel, dt);
  P.yaw -= inp.rx * S.turnSpeed * DEG * dt;
  P.speed = P.vel.length(); P.pitch = 0; P.roll = 0;
  plane.visible = false;
}

function updateRail(dt, inp) {
  const back = S.leftTrigger === 'reverse' ? inp.tL : (inp.gripL ? 1 : 0);
  const v = inp.gripR ? 0 : curve(inp.tR - back) * S.hoverSpeed * (inp.a ? S.boost : 1);
  P.railS = clamp(P.railS + v * dt, 0, route.total);
  P.railSide = clamp(P.railSide + inp.lx * S.strafeSpeed * dt, -400, 400);
  P.railAlt = clamp(P.railAlt - inp.ly * S.altSpeed * dt, -200, 1500);
  P.railYaw -= inp.rx * S.turnSpeed * DEG * dt;
  const p = routeAt(route, P.railS);
  const prev = _v.copy(P.pos);
  P.pos.set(p.x - p.dirZ * P.railSide, damp(P.pos.y, routeGround(p) + S.clearance + P.railAlt, 3, dt), p.z + p.dirX * P.railSide);
  P.vel.copy(P.pos).sub(prev).divideScalar(Math.max(dt, 1e-3));
  P.yaw = p.yaw + P.railYaw; P.speed = Math.abs(v); P.pitch = 0; P.roll = 0;
  plane.visible = false;
}

function respawn() {
  P.vel.set(0, 0, 0); P.speed = 0; P.pitch = P.roll = 0; P.railS = P.railSide = P.railAlt = P.railYaw = 0;
  if (route) { const p = routeAt(route, 0); P.pos.set(p.x, 600, p.z); P.yaw = p.yaw; }
  else { P.pos.set(0, 600, 0); P.yaw = 0; }
  W.placed = false;
}

function placeOnceGroundKnown() {
  if (W.placed) return;
  const g = groundHeight(P.pos.x, P.pos.z);
  // give the map a few seconds; if the ground never arrives, start anyway
  if (g == null && W.time < (W.tilesMode ? 12 : 6)) return;
  W.startY = g ?? 0;
  P.pos.y = W.startY + (S.flightStyle === 'rail' ? S.clearance : S.startAlt);
  W.placed = true;
  for (const c of clouds.list) placeCloud(c, true);
  for (const t of targets) spawnTarget(t, true);
}

function keepAboveGround() {
  const g = groundHeight(P.pos.x, P.pos.z);
  if (g == null || !W.placed) return;
  const floor = g + (S.flightStyle === 'plane' ? 4 : 2);
  if (P.pos.y >= floor) return;
  P.pos.y = floor;
  if (S.flightStyle === 'plane' && Math.abs(P.speed) > 12) {
    P.pitch = 0.35; P.speed *= 0.6; G.combo = 0;
    sfx.bump(); buzz('left', 1, 200); buzz('right', 1, 200);
    burst(planePoint, 0xc9b08a, 24, 30);
    flash('Bump! Pull up', 1500);
  }
}

// ====================================================================
// Main loop
// ====================================================================
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  W.time += dt;
  const inp = readInput();

  if (inp.pressed.b) { S.view = S.view === 'chase' ? 'first' : 'chase'; saveSettings(); flash(S.view === 'chase' ? 'Chase view' : 'Open air view', 1200); }
  if (inp.pressed.y) { respawn(); buildCourse(); flash('Back to the start', 1500); }

  if (W.placed) {
    if (S.flightStyle === 'rail' && route) updateRail(dt, inp);
    else if (S.flightStyle === 'plane') updatePlane(dt, inp);
    else updateHover(dt, inp);
    keepAboveGround();
  }
  rig.position.copy(P.pos);
  rig.rotation.set(0, P.yaw, 0);
  if (W.mode === 'screen') camera.rotation.set(P.pitch * 0.5, 0, P.roll * 0.25);
  rig.updateMatrixWorld(true);

  if (W.tilesMode) tilesUpdate(dt); else terrainUpdate(false);
  placeOnceGroundKnown();

  updateAim();
  updateTargets(dt);
  updateBullets(dt, W.placed && (S.leftTrigger === 'fire' ? inp.tL > 0.4 || inp.x : inp.x));
  updateCourse(dt);
  updateParticles(dt);
  updateClouds(dt);
  updateRouteLine(dt);

  sky.position.copy(P.pos);
  sea.position.x = P.pos.x; sea.position.z = P.pos.z;
  sfx.engine(Math.abs(P.speed), W.placed);
  updateHud(dt);
  renderer.render(scene, camera);
}

// ====================================================================
// Starting and stopping
// ====================================================================
function currentOrigin() {
  if (route) return { lat: route.geo[0].lat, lon: route.geo[0].lon };
  if (S.place === 'custom') return { lat: clamp(S.customLat, -84, 84), lon: clamp(S.customLon, -180, 180) };
  const p = PLACES.find(p => p[0] === S.place) || PLACES[0];
  return { lat: p[2], lon: p[3] };
}

async function startGame(mode) {
  const source = S.source;
  const token = source === 'google' ? $('key').value.trim() : source === 'cesium' ? $('cesiumKey').value.trim() : '';
  if (source !== 'free' && !token) return log(source === 'cesium' ? 'Paste your Cesium ion token first, or choose the free map.' : 'Paste your Google Maps key first, or choose the free map.');
  if (mode === 'vr') {
    let ok = false;
    try { ok = !!navigator.xr && await navigator.xr.isSessionSupported('immersive-vr'); } catch (e) { ok = false; }
    if (!ok) return log('VR is not available in this browser. Open this page in the Meta Quest Browser, or use "Play on this screen".');
  }
  if (S.flightStyle === 'rail' && !route) flash('Route rail needs a GPX route, so hover is used.', 5000);

  // request the VR session straight away, while the button press still counts
  let session = null;
  if (mode === 'vr') {
    try {
      renderer.xr.setFramebufferScaleFactor(S.renderScale);
      session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    } catch (e) { return log('Could not start VR: ' + e.message); }
  }
  sfx.init();

  try {
    W.source = source; W.tilesMode = source !== 'free'; W.mode = mode; W.time = 0;
    W.origin = currentOrigin();
    G.score = 0; G.combo = 0; G.pops = 0;
    terrain.imgWarned = false;
    if (W.tilesMode) {
      terrainReset(); terrain.group.visible = false; sea.visible = false; geoFrame.visible = true;
      scene.fog.near = 3000; scene.fog.far = 45000;
      await tilesInit(source, token);
    } else {
      geoFrame.visible = false; terrain.group.visible = true; sea.visible = true;
      terrainReset();
    }
    if (route) projectRoute(route);
    buildRouteLine();
    respawn();
    buildCourse();
    for (const t of targets.splice(0)) targetGroup.remove(t.mesh);
  } catch (e) {
    log('Could not load the map: ' + e.message);
    if (session) session.end().catch(() => {});
    return;
  }

  W.running = true;
  clock.getDelta();
  $('setup').style.display = 'none';
  if (mode === 'vr') {
    session.addEventListener('end', stopGame);
    await renderer.xr.setSession(session);
    try { renderer.xr.setFoveation?.(1); } catch (e) { /* optional */ }
  } else {
    renderer.domElement.style.display = 'block';
    $('overlay').style.display = 'block';
    $('hint').textContent = 'Arrows or WASD steer, Shift throttle, Space fire, B boost, V view, T restart. Touch: drag to steer, second finger fires.';
    resize();
    camera.position.set(0, 1.5, 0);
  }
  renderer.setAnimationLoop(frame);
  log('Flying. Right trigger is the throttle.');
}

function stopGame() {
  if (!W.running) return;
  W.running = false;
  renderer.setAnimationLoop(null);
  sfx.engine(0, false);
  renderer.domElement.style.display = 'none';
  $('overlay').style.display = 'none';
  $('setup').style.display = 'flex';
  camera.rotation.set(0, 0, 0);
  log(S.arcade ? `Landed. Score ${G.score}.` : 'Landed.');
}
function resize() {
  if (renderer.xr.isPresenting) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
$('exitBtn').onclick = stopGame;
$('enter').onclick = () => startGame('vr');
$('screen').onclick = () => startGame('screen');

// ====================================================================
// Menu
// ====================================================================
function setSetting(key, value) {
  S[key] = value; saveSettings();
  if (key === 'viewTiles' && W.running && !W.tilesMode) terrainUpdate(true);
  if (key === 'ringRadius' || key === 'arcade') { if (W.running) buildCourse(); }
  if (key === 'leftTrigger' || key === 'steer' || key === 'aim') buildHelp();
}

function buildSettingsUI() {
  const box = $('settingsBox');
  box.innerHTML = '';
  for (const item of SCHEMA) {
    if (item.group) { const g = document.createElement('div'); g.className = 'group'; g.textContent = item.group; box.appendChild(g); continue; }
    const row = document.createElement('div'); row.className = 'srow';
    const label = document.createElement('span'); label.textContent = item.label; row.appendChild(label);
    if (item.type === 'bool') {
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!S[item.key];
      cb.onchange = () => setSetting(item.key, cb.checked);
      row.appendChild(cb); row.appendChild(document.createElement('span'));
    } else if (item.options) {
      const sel = document.createElement('select');
      item.options.forEach(([v, t]) => sel.add(new Option(t, v)));
      sel.value = S[item.key];
      sel.onchange = () => setSetting(item.key, sel.value);
      row.appendChild(sel);
    } else {
      const slider = document.createElement('input'); slider.type = 'range';
      slider.min = item.min; slider.max = item.max; slider.step = item.step; slider.value = S[item.key];
      const val = document.createElement('span'); val.className = 'val'; val.textContent = S[item.key];
      slider.oninput = () => { const v = Number(slider.value); val.textContent = v; setSetting(item.key, v); };
      row.appendChild(slider); row.appendChild(val);
    }
    box.appendChild(row);
  }
}

function buildHelp() {
  const fireOnTrigger = S.leftTrigger === 'fire';
  $('helpText').innerHTML = `
    <b>Plane</b><br>
    Right trigger: throttle. A: boost. Right grip: stop and hover.<br>
    ${S.steer === 'hand' ? 'Right hand: hold it flat like a toy plane. Bank it to turn, tip it to climb or dive.' : 'Right stick: turn left/right, pull back to climb, push to dive.'}<br>
    ${fireOnTrigger ? 'Left trigger (or X): fire. Left grip: reverse.' : 'Left trigger: reverse. X: fire.'}<br>
    ${S.aim === 'hand' ? 'Aim by pointing your left hand. The red dot shows where shots go.' : 'Shots go where the plane points.'}<br>
    Left stick: side-slip and extra lift. B: switch view. Y: back to the start.<br><br>
    <b>Hover</b><br>
    Right trigger: fly where you look. ${fireOnTrigger ? 'Left grip' : 'Left trigger'}: backwards. Left stick: strafe and height. Right stick: turn.<br><br>
    <b>Route rail</b> (GPX loaded)<br>
    Right trigger: forward along your route. ${fireOnTrigger ? 'Left grip' : 'Left trigger'}: back along it.<br><br>
    <b>Scoring</b><br>
    Balloon 100, gold balloon 500, drone 1000 (three hits), ring 250, finishing a course 2000. Quick hits build a combo of up to x8.
    With a GPX route loaded the rings follow your track; your best time is saved.`;
}

function showTab(which) {
  for (const [id, tab] of [['flightView', 'tabFlight'], ['settingsView', 'tabSettings'], ['helpView', 'tabHelp']]) {
    $(id).classList.toggle('hidden', id !== which);
    $(tab).classList.toggle('on', id === which);
  }
}
$('tabFlight').onclick = () => showTab('flightView');
$('tabSettings').onclick = () => showTab('settingsView');
$('tabHelp').onclick = () => showTab('helpView');

function syncFlyTab() {
  $('source').value = S.source;
  $('googleBox').classList.toggle('hidden', S.source !== 'google');
  $('cesiumBox').classList.toggle('hidden', S.source !== 'cesium');
  $('keyButtons').classList.toggle('hidden', S.source === 'free');
  $('place').value = S.place;
  $('customBox').classList.toggle('hidden', S.place !== 'custom');
  $('customLat').value = S.customLat; $('customLon').value = S.customLon;
  $('place').disabled = !!route;
}
PLACES.forEach(p => $('place').add(new Option(p[1], p[0])));
$('source').onchange = e => { setSetting('source', e.target.value); syncFlyTab(); };
$('place').onchange = e => { setSetting('place', e.target.value); syncFlyTab(); };
$('customLat').onchange = e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) setSetting('customLat', v); };
$('customLon').onchange = e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) setSetting('customLon', v); };

$('key').value = recall('gmapsKey') || '';
$('cesiumKey').value = recall('cesiumToken') || '';
$('save').onclick = () => { store('gmapsKey', $('key').value.trim() || null); store('cesiumToken', $('cesiumKey').value.trim() || null); log('Saved on this device.'); };
$('forget').onclick = () => { store('gmapsKey', null); store('cesiumToken', null); $('key').value = ''; $('cesiumKey').value = ''; log('Keys removed from this device.'); };

function refreshRouteList() {
  const sel = $('route');
  sel.innerHTML = '';
  sel.add(new Option('No route (fly anywhere)', '-1'));
  routes.forEach((r, i) => sel.add(new Option(`${r.name} (${r.km.toFixed(1)} km)`, String(i))));
  sel.value = route ? String(routes.indexOf(route)) : '-1';
}
$('gpx').onchange = async e => {
  for (const f of e.target.files) {
    try { const r = parseGpx(await f.text(), f.name); routes.push(r); route = r; log(`Loaded ${f.name}. Rings will follow it.`); }
    catch (err) { log(`Could not read ${f.name}: ${err.message}`); }
  }
  e.target.value = '';
  refreshRouteList(); syncFlyTab();
};
$('route').onchange = e => { const i = Number(e.target.value); route = i < 0 ? null : routes[i]; syncFlyTab(); log(route ? `Route selected: ${route.name}` : 'No route. Flying from the chosen place.'); };

$('resetBtn').onclick = () => { Object.assign(S, DEFAULTS); saveSettings(); buildSettingsUI(); syncFlyTab(); buildHelp(); log('Settings reset to defaults.'); };
$('exportBtn').onclick = () => { $('json').value = JSON.stringify(S, null, 2); log('Settings exported to the box.'); };
$('importBtn').onclick = () => {
  try {
    const incoming = JSON.parse($('json').value); let count = 0;
    for (const k of Object.keys(DEFAULTS)) if (typeof incoming[k] === typeof DEFAULTS[k]) { S[k] = incoming[k]; count++; }
    saveSettings(); buildSettingsUI(); syncFlyTab(); buildHelp(); log(`Imported ${count} settings.`);
  } catch (e) { log('Import failed: paste the exported text first.'); }
};

// ====================================================================
// Init
// ====================================================================
loadSettings();
buildSettingsUI();
buildHelp();
refreshRouteList();
syncFlyTab();
window.__openFlightReady = true;
window.__game = { W, P, G, S, terrain, course, targets, bullets, groundHeight, startGame, stopGame, parseGpx, routes, setRoute: r => { route = r; } };
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (!ok) $('enter').textContent = 'Enter VR (open in the Quest Browser)'; }).catch(() => {});
log('Pick a place and press Enter VR. The free map needs no key.');
