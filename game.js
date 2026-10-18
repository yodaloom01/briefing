// Press Room — client
import * as THREE from 'three';

// ======================================================================
// Join screen
// ======================================================================
const SUITS = ['#1d2433', '#2b2f36', '#1b2a4a', '#3a3a3a', '#4a3b2a', '#0e0e10'];
const TIES = ['#b3202a', '#1f4fa8', '#c9a24a', '#2f7d4f', '#6b2d8f', '#d9d9d9', '#e06a8c'];
const SKINS = ['#f2d0b0', '#e0b48f', '#c69472', '#a2704d', '#7a4e32', '#4f3222'];
const choice = { suit: SUITS[0], tie: TIES[0], skin: SKINS[1] };
function swatchRow(el, list, key) {
  list.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'sw' + (c === choice[key] ? ' on' : '');
    d.style.background = c;
    d.onclick = () => { choice[key] = c; [...el.children].forEach((x) => x.classList.remove('on')); d.classList.add('on'); };
    el.appendChild(d);
  });
}
swatchRow(document.getElementById('suits'), SUITS, 'suit');
swatchRow(document.getElementById('ties'), TIES, 'tie');
swatchRow(document.getElementById('skins'), SKINS, 'skin');
const nameInput = document.getElementById('name');
try { nameInput.value = localStorage.getItem('pr_name') || ''; } catch {}

// ======================================================================
// Renderer / scene
// ======================================================================
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0f18');
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 100);
camera.rotation.order = 'YXZ';
scene.add(camera);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// Room dimensions
const ROOM = { x0: -5, x1: 5, z0: -11, z1: 5, h: 4.4 };
const STAGE = { z: -8.4, h: 0.35 };
const PODIUM = { x: 0, z: -9.6 };
const SPEAKER_SPOT = { x: 0, z: -10.2 };
const TV = { x: ROOM.x0 + 0.06, y: 2.55, z: -1.6, w: 2.6, h: 1.46 };

// ---------- texture helpers ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.canvas = c;
  return t;
}
function drawBuilding(g, cx, cy, s, color) {
  g.fillStyle = color;
  g.fillRect(cx - 1.0 * s, cy + 0.15 * s, 2.0 * s, 0.12 * s); // base
  g.fillRect(cx - 0.95 * s, cy - 0.35 * s, 1.9 * s, 0.08 * s); // entablature
  for (let i = 0; i < 8; i++) g.fillRect(cx - 0.85 * s + i * 0.237 * s, cy - 0.27 * s, 0.07 * s, 0.42 * s); // columns
  g.beginPath(); g.moveTo(cx - 0.55 * s, cy - 0.35 * s); g.lineTo(cx, cy - 0.62 * s); g.lineTo(cx + 0.55 * s, cy - 0.35 * s); g.fill(); // pediment
}
const sealTex = canvasTex(512, 512, (g, w) => {
  const c = w / 2;
  g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(c, c, 250, 0, 7); g.fill();
  g.fillStyle = '#16346f'; g.beginPath(); g.arc(c, c, 232, 0, 7); g.fill();
  g.strokeStyle = '#c9a24a'; g.lineWidth = 4; g.beginPath(); g.arc(c, c, 170, 0, 7); g.stroke();
  drawBuilding(g, c, c + 20, 120, '#e8e3d4');
  g.fillStyle = '#e8e3d4'; g.font = 'bold 34px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = '★ PRESS BRIEFING ROOM ★ ON THE RECORD ';
  for (let i = 0; i < txt.length; i++) {
    const a = -Math.PI / 2 + (i / txt.length) * Math.PI * 2;
    g.save(); g.translate(c + Math.cos(a) * 202, c + Math.sin(a) * 202); g.rotate(a + Math.PI / 2); g.fillText(txt[i], 0, 0); g.restore();
  }
});
const backdropTex = canvasTex(512, 1024, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h * 0.45, 30, w / 2, h * 0.45, h * 0.7);
  gr.addColorStop(0, '#7fb3ea'); gr.addColorStop(0.5, '#3f7fd0'); gr.addColorStop(1, '#1d4f9c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.12; g.strokeStyle = '#fff';
  for (let y = 40; y < h; y += 64) { g.beginPath(); g.moveTo(30, y); g.lineTo(w - 30, y); g.stroke(); }
  g.globalAlpha = 1;
  // oval sign
  g.save(); g.translate(w / 2, h * 0.24);
  g.fillStyle = '#c9a24a'; g.beginPath(); g.ellipse(0, 0, 190, 110, 0, 0, 7); g.fill();
  g.fillStyle = '#14336b'; g.beginPath(); g.ellipse(0, 0, 180, 100, 0, 0, 7); g.fill();
  drawBuilding(g, 0, -12, 70, '#ffffff');
  g.fillStyle = '#fff'; g.font = 'bold 30px Georgia'; g.textAlign = 'center';
  g.fillText('THE PRESS ROOM', 0, 68);
  g.restore();
});
const stripeTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#5c5f66'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#9a9ca3';
  for (let x = 6; x < w; x += 18) g.fillRect(x, 0, 7, h);
});
const carpetTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a4152'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { g.fillStyle = Math.random() < 0.5 ? '#333a4a' : '#434b5d'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping; carpetTex.repeat.set(6, 10);
const flagTex = canvasTex(760, 400, (g, w, h) => {
  const sh = h / 13;
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#b22234'; g.fillRect(0, i * sh, w, sh + 1); }
  const cw = w * 0.4, ch = sh * 7;
  g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#fff';
  for (let r = 0; r < 9; r++) {
    const n = r % 2 ? 5 : 6;
    for (let k = 0; k < n; k++) {
      const x = (cw / 12) * (r % 2 ? 2 + k * 2 : 1 + k * 2), y = (ch / 10) * (r + 1);
      star(g, x, y, 9);
    }
  }
  function star(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
});
const exitTex = canvasTex(256, 96, (g, w, h) => {
  g.fillStyle = '#3a0000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ff2b2b'; g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', w / 2, h / 2 + 3);
});

// ---------- materials ----------
const M = {
  blue: new THREE.MeshStandardMaterial({ color: '#1f4ea5', roughness: 0.75 }),
  blueDark: new THREE.MeshStandardMaterial({ color: '#173e88', roughness: 0.8 }),
  white: new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.6 }),
  cream: new THREE.MeshStandardMaterial({ color: '#e9e4d6', roughness: 0.9 }),
  wainscot: new THREE.MeshStandardMaterial({ color: '#c9bea6', roughness: 0.85 }),
  carpet: new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 1 }),
  stage: new THREE.MeshStandardMaterial({ color: '#33415e', roughness: 0.95 }),
  wood: new THREE.MeshStandardMaterial({ color: '#6b3a22', roughness: 0.55 }),
  woodLight: new THREE.MeshStandardMaterial({ color: '#a8673c', roughness: 0.45 }),
  seatWood: new THREE.MeshStandardMaterial({ color: '#5a2e1c', roughness: 0.6 }),
  stripe: new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.9 }),
  black: new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4, metalness: 0.3 }),
  metal: new THREE.MeshStandardMaterial({ color: '#888c94', roughness: 0.3, metalness: 0.8 }),
  gold: new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 0.9 }),
  light: new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff8e8', emissiveIntensity: 1.2 }),
  window: new THREE.MeshStandardMaterial({ color: '#dfeaf7', emissive: '#cfe3ff', emissiveIntensity: 0.9 }),
  navyChair: new THREE.MeshStandardMaterial({ color: '#1a2c5c', roughness: 0.8 }),
};
function box(w, h, d, mat, x, y, z, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function plane(w, h, mat, x, y, z, ry = 0, parent = scene) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; parent.add(m); return m;
}

// ======================================================================
// Build the briefing room
// ======================================================================
const colliders = []; // xz AABBs {x0,x1,z0,z1}
const solid = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1 });
const seats = []; // {x, z, mesh, npc:bool}
const seatMeshes = [];

(function buildRoom() {
  const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0, H = ROOM.h, cz = (ROOM.z0 + ROOM.z1) / 2;
  // floor + ceiling
  const floor = plane(W, D, M.carpet, 0, 0, cz); floor.rotation.x = -Math.PI / 2;
  const ceil = plane(W, D, M.white, 0, H, cz); ceil.rotation.x = Math.PI / 2;
  // side + back walls: cream upper, wainscot lower
  for (const side of [-1, 1]) {
    const x = side < 0 ? ROOM.x0 : ROOM.x1, ry = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    plane(D, H - 1.1, M.cream, x, 1.1 + (H - 1.1) / 2, cz, ry);
    plane(D, 1.1, M.wainscot, x, 0.55, cz, ry);
    box(0.04, 0.06, D, M.white, x - side * 0.02, 1.1, cz); // chair rail
  }
  plane(W, H, M.cream, 0, H / 2, ROOM.z1, Math.PI);
  plane(W, 1.1, M.wainscot, 0, 0.55, ROOM.z1 - 0.01, Math.PI);

  // front wall: blue panels, light backdrop, white columns
  const fz = ROOM.z0;
  plane(W, H, M.blue, 0, H / 2, fz);
  for (const x of [-3.6, -2.5, 2.5, 3.6]) box(0.9, 2.6, 0.03, M.blueDark, x, 1.65, fz + 0.02); // door-like panels
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 3.4), new THREE.MeshStandardMaterial({ map: backdropTex, emissive: '#ffffff', emissiveMap: backdropTex, emissiveIntensity: 0.45, roughness: 0.6 }));
  backdrop.position.set(0, STAGE.h + 1.7, fz + 0.05); scene.add(backdrop);
  for (const x of [-1.8, 1.8]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 3.2, 24), M.white);
    col.position.set(x, STAGE.h + 1.6, fz + 0.3); col.castShadow = true; scene.add(col);
    box(0.55, 0.18, 0.55, M.white, x, STAGE.h + 0.09, fz + 0.3);
    box(0.55, 0.18, 0.55, M.white, x, STAGE.h + 3.25, fz + 0.3);
    solid(x - 0.3, x + 0.3, fz, fz + 0.6);
  }
  // proscenium soffit with light fixtures
  box(W, 0.55, 0.9, M.white, 0, H - 0.27, fz + 0.45);
  for (let i = 0; i < 9; i++) box(0.5, 0.25, 0.35, M.light, -4 + i, H - 0.65, fz + 0.75);
  // ceiling light panels
  for (let z = -7; z <= 3; z += 2.5) for (const x of [-2.5, 0, 2.5]) box(1.1, 0.04, 0.6, M.light, x, H - 0.02, z);

  // stage platform
  box(W, STAGE.h, STAGE.z - fz, M.stage, 0, STAGE.h / 2, (STAGE.z + fz) / 2);
  box(W, 0.02, 0.06, M.metal, 0, STAGE.h, STAGE.z); // nosing

  // podium
  const pod = new THREE.Group(); pod.position.set(PODIUM.x, STAGE.h, PODIUM.z); scene.add(pod);
  box(0.62, 1.0, 0.42, M.woodLight, 0, 0.5, 0, pod);
  box(0.66, 0.06, 0.46, M.wood, 0, 0.03, 0, pod);
  box(0.5, 0.82, 0.02, M.wood, 0, 0.52, -0.215, pod); // inset front... (speaker faces +z, audience sees -z side? no)
  const top = box(0.95, 0.07, 0.62, M.black, 0, 1.08, 0, pod); top.rotation.x = -0.12;
  box(0.95, 0.1, 0.06, M.black, 0, 1.08, 0.3, pod);
  // seal on the audience-facing side (audience is at +z)
  const podSeal = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), new THREE.MeshStandardMaterial({ map: sealTex, roughness: 0.4 }));
  podSeal.position.set(0, 0.68, 0.215); pod.add(podSeal);
  for (const s of [-1, 1]) {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), M.black);
    neck.position.set(s * 0.07, 1.3, 0.17); neck.rotation.x = 0.55; neck.rotation.z = -s * 0.25; pod.add(neck);
    const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.07, 10), M.black);
    capsule.position.set(s * 0.12, 1.48, 0.29); capsule.rotation.x = 1.1; pod.add(capsule);
  }
  solid(PODIUM.x - 0.5, PODIUM.x + 0.5, PODIUM.z - 0.33, PODIUM.z + 0.36);

  // flag + pole (stage left of podium)
  const fx = -1.25, fzP = fz + 0.65;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.9, 12), M.gold);
  pole.position.set(fx, STAGE.h + 1.45, fzP); scene.add(pole);
  const fbase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 20), M.gold); fbase.position.set(fx, STAGE.h + 0.04, fzP); scene.add(fbase);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), M.gold); fin.position.set(fx, STAGE.h + 2.95, fzP); scene.add(fin);
  const finTip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 12), M.gold); finTip.position.set(fx, STAGE.h + 3.06, fzP); scene.add(finTip);
  const flagGeo = new THREE.PlaneGeometry(0.95, 1.5, 24, 24);
  flagGeo.translate(0.475, 0, 0); // attach left edge to pole
  flagGeo.userData.base = flagGeo.attributes.position.array.slice();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.85 }));
  // hang vertically: rotate so stripes run down (flag displayed vertically, canton top-left from audience)
  flag.position.set(fx + 0.02, STAGE.h + 2.08, fzP + 0.01);
  flagTex.center.set(0.5, 0.5); flagTex.rotation = -Math.PI / 2;
  flag.castShadow = true; scene.add(flag);
  scene.userData.flag = flag;
  solid(fx - 0.25, fx + 0.25, fzP - 0.25, fzP + 0.25);

  // chair (stage right, like the photo)
  const chair = new THREE.Group(); chair.position.set(1.15, STAGE.h, fz + 0.9); chair.rotation.y = -0.4; scene.add(chair);
  const beige = new THREE.MeshStandardMaterial({ color: '#d8ccb4', roughness: 0.9 });
  box(0.6, 0.45, 0.6, beige, 0, 0.32, 0, chair); box(0.6, 0.65, 0.12, beige, 0, 0.75, -0.25, chair);
  box(0.1, 0.25, 0.6, beige, -0.3, 0.6, 0, chair); box(0.1, 0.25, 0.6, beige, 0.3, 0.6, 0, chair);
  solid(0.8, 1.5, fz + 0.5, fz + 1.3);

  // camera riser (front right) with TV cameras on tripods
  box(1.7, 0.5, 2.6, M.stage, 4.1, 0.25, -7.9);
  solid(3.25, ROOM.x1, -9.2, -6.6);
  for (const [x, z] of [[3.7, -8.8], [4.3, -7.9], [3.8, -7.0]]) tvCamera(x, 0.5, z, Math.atan2(PODIUM.x - x, PODIUM.z - z) + Math.PI);
  // pool camera behind the seats — this is the one that records the speeches
  tvCamera(0, 0, 2.55, 0, true);
  solid(-0.35, 0.35, 2.2, 2.9);

  // left wall: seal plaque, side chairs
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshStandardMaterial({ map: sealTex, roughness: 0.4 }));
  seal.position.set(ROOM.x0 + 0.02, 3.1, -8.6); seal.rotation.y = Math.PI / 2; scene.add(seal);
  const plaque = box(0.03, 0.5, 0.4, M.wood, ROOM.x0 + 0.02, 2.4, -6.4);
  for (let i = 0; i < 5; i++) {
    const z = -8.4 + i * 0.62;
    box(0.5, 0.08, 0.5, M.navyChair, ROOM.x0 + 0.45, 0.46, z);
    box(0.08, 0.6, 0.5, M.navyChair, ROOM.x0 + 0.22, 0.8, z);
    box(0.05, 0.42, 0.05, M.black, ROOM.x0 + 0.45, 0.21, z);
  }
  solid(ROOM.x0, ROOM.x0 + 0.75, -8.8, -5.6);

  // right wall: exit sign + windows
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: exitTex }));
  exit.position.set(ROOM.x1 - 0.02, 3.6, -9.4); exit.rotation.y = -Math.PI / 2; scene.add(exit);
  for (const z of [-4.5, -0.5]) {
    box(0.04, 2.1, 1.0, M.window, ROOM.x1 - 0.03, 2.0, z);
    box(0.08, 0.08, 1.1, M.white, ROOM.x1 - 0.05, 3.08, z);
    box(0.08, 2.2, 0.06, M.white, ROOM.x1 - 0.05, 2.0, z);
  }

  // audience seats: 7 rows × 7, brown backs with grey striped panels
  const seatBack = new THREE.BoxGeometry(0.64, 0.82, 0.07);
  const seatBase = new THREE.BoxGeometry(0.6, 0.09, 0.52);
  const stripePanel = new THREE.PlaneGeometry(0.22, 0.6);
  const ped = new THREE.CylinderGeometry(0.04, 0.06, 0.42, 8);
  let idx = 0;
  for (let r = 0; r < 7; r++) {
    const z = -6.2 + r * 1.3;
    for (let c = 0; c < 7; c++) {
      const x = -2.55 + c * 0.85;
      const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
      const base = new THREE.Mesh(seatBase, M.seatWood); base.position.set(0, 0.46, 0); g.add(base);
      const back = new THREE.Mesh(seatBack, M.seatWood); back.position.set(0, 0.86, 0.27); g.add(back);
      const sp = new THREE.Mesh(stripePanel, M.stripe); sp.position.set(0, 0.86, 0.306); g.add(sp);
      const pd = new THREE.Mesh(ped, M.black); pd.position.set(0, 0.21, 0.05); g.add(pd);
      [base, back].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.userData.seatIndex = idx; seatMeshes.push(m); });
      seats.push({ x, z, npc: false });
      idx++;
    }
    solid(-2.98, 2.98, z - 0.28, z + 0.34);
  }

  // TV on the left wall
  const bezel = box(0.08, TV.h + 0.14, TV.w + 0.14, M.black, TV.x + 0.03, TV.y, TV.z);
  const mount = box(0.06, 0.3, 0.3, M.metal, TV.x + 0.01, TV.y, TV.z);
})();

function tvCamera(x, y, z, ry, pool = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 6), M.black);
    leg.position.set(Math.cos(a) * 0.2, 0.74, Math.sin(a) * 0.2);
    leg.rotation.z = Math.cos(a) * 0.25; leg.rotation.x = -Math.sin(a) * 0.25; g.add(leg);
  }
  const head = pool ? 1.75 : 1.5;
  box(0.06, 0.6, 0.06, M.black, 0, head - 0.3, 0, g);
  box(0.22, 0.24, 0.5, M.black, 0, head + 0.05, 0, g);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.22, 16), M.black);
  lens.rotation.x = Math.PI / 2; lens.position.set(0, head + 0.05, -0.34); g.add(lens);
  box(0.12, 0.08, 0.1, M.metal, 0.1, head + 0.22, 0.1, g);
  if (pool) { const tally = box(0.03, 0.03, 0.03, new THREE.MeshBasicMaterial({ color: '#ff2020' }), 0, head + 0.2, -0.24, g); scene.userData.tally = tally; }
}

// ---------- lights ----------
scene.add(new THREE.HemisphereLight('#fff8ee', '#3a4152', 1.3));
if (scene.userData.tally) scene.userData.tally.visible = false;
scene.add(new THREE.AmbientLight('#ffffff', 0.25));
const spot = new THREE.SpotLight('#fff3e0', 40, 18, 0.45, 0.6, 1.5);
spot.position.set(0, 4.2, -5.5); spot.target.position.set(0, 1.2, -10); spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005;
scene.add(spot, spot.target);
for (const x of [-3, 0, 3]) { const p = new THREE.PointLight('#fff6e8', 6, 12, 1.6); p.position.set(x, 4.1, -1); scene.add(p); }

// ======================================================================
// Avatars (everyone in suit and tie)
// ======================================================================
const SKIN_GEO = { head: new THREE.SphereGeometry(0.125, 20, 16), neck: new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10) };
function nameSprite(text, sub) {
  const t = canvasTex(512, 128, (g, w, h) => {
    g.font = 'bold 44px Inter, Arial'; const tw = g.measureText(text).width;
    g.fillStyle = 'rgba(10,18,36,.78)'; roundRect(g, w / 2 - tw / 2 - 22, 18, tw + 44, 66, 14); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 52);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true }));
  s.scale.set(0.9, 0.225, 1); return s;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function makeAvatar({ suit = '#1d2433', tie = '#b3202a', skin = '#e0b48f', name = '', hair } = {}) {
  const suitM = new THREE.MeshStandardMaterial({ color: suit, roughness: 0.7 });
  const pantsM = new THREE.MeshStandardMaterial({ color: new THREE.Color(suit).multiplyScalar(0.85), roughness: 0.75 });
  const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });
  const tieM = new THREE.MeshStandardMaterial({ color: tie, roughness: 0.5 });
  const shirtM = new THREE.MeshStandardMaterial({ color: '#f5f5f2', roughness: 0.6 });
  const hairM = new THREE.MeshStandardMaterial({ color: hair || ['#1b1410', '#3b2a1e', '#6b4a2b', '#9a9a9a', '#c9a46a'][Math.floor(Math.random() * 5)], roughness: 0.9 });
  const shoeM = M.black;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const legs = [];
  for (const s of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(s * 0.1, 0.86, 0); body.add(thigh);
    box(0.16, 0.44, 0.18, pantsM, 0, -0.22, 0, thigh);
    const shin = new THREE.Group(); shin.position.set(0, -0.43, 0); thigh.add(shin);
    box(0.15, 0.42, 0.16, pantsM, 0, -0.21, 0, shin);
    box(0.15, 0.08, 0.28, shoeM, 0, -0.43, -0.05, shin);
    legs.push({ thigh, shin });
  }
  box(0.46, 0.62, 0.25, suitM, 0, 1.17, 0, body); // jacket
  box(0.48, 0.12, 0.27, suitM, 0, 1.43, 0, body); // shoulders
  // shirt V + tie on the front (avatar faces -z)
  const shirt = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.085, 1.47, 0), new THREE.Vector3(0.085, 1.47, 0), new THREE.Vector3(0, 1.15, 0)]), shirtM);
  shirt.geometry.computeVertexNormals(); shirt.position.z = -0.127; shirt.material.side = THREE.DoubleSide; body.add(shirt);
  box(0.06, 0.04, 0.02, tieM, 0, 1.44, -0.132, body); // knot
  const tieMesh = box(0.05, 0.26, 0.012, tieM, 0, 1.29, -0.132, body);
  box(0.02, 0.36, 0.01, new THREE.MeshStandardMaterial({ color: new THREE.Color(suit).multiplyScalar(0.6) }), -0.1, 1.32, -0.128, body).rotation.z = 0.3; // lapels
  box(0.02, 0.36, 0.01, new THREE.MeshStandardMaterial({ color: new THREE.Color(suit).multiplyScalar(0.6) }), 0.1, 1.32, -0.128, body).rotation.z = -0.3;
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.29, 1.43, 0); body.add(arm);
    box(0.12, 0.58, 0.14, suitM, 0, -0.29, 0, arm);
    box(0.125, 0.04, 0.145, shirtM, 0, -0.58, 0, arm);
    box(0.09, 0.1, 0.1, skinM, 0, -0.65, 0, arm);
    arms.push(arm);
  }
  const neck = new THREE.Mesh(SKIN_GEO.neck, skinM); neck.position.y = 1.53; body.add(neck);
  const head = new THREE.Group(); head.position.y = 1.66; body.add(head);
  const skull = new THREE.Mesh(SKIN_GEO.head, skinM); skull.scale.set(0.95, 1.08, 1); skull.castShadow = true; head.add(skull);
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), hairM); hairMesh.position.y = 0.02; hairMesh.scale.set(0.98, 1.05, 1.02); head.add(hairMesh);
  for (const s of [-1, 1]) { const eye = box(0.025, 0.018, 0.01, M.black, s * 0.045, 0.02, -0.118, head); eye.castShadow = false; }
  box(0.05, 0.012, 0.01, new THREE.MeshStandardMaterial({ color: '#7a3b33' }), 0, -0.055, -0.117, head); // mouth
  let label = null;
  if (name) { label = nameSprite(name); label.position.y = 2.05; root.add(label); }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, body, legs, arms, head, label, phase: Math.random() * 10 };
}
function poseAvatar(a, { seated = false, walk = 0, t = 0 }) {
  if (seated) {
    a.body.position.y = -0.34;
    for (const l of a.legs) { l.thigh.rotation.x = Math.PI / 2; l.shin.rotation.x = -Math.PI / 2; }
    a.arms.forEach((arm, i) => { arm.rotation.x = 0.5; arm.rotation.z = (i ? -1 : 1) * 0.08; });
  } else {
    a.body.position.y = 0;
    const sw = Math.sin(t * 8 + a.phase) * 0.5 * walk;
    a.legs[0].thigh.rotation.x = sw; a.legs[1].thigh.rotation.x = -sw;
    a.legs[0].shin.rotation.x = Math.max(0, -sw) * 0.8; a.legs[1].shin.rotation.x = Math.max(0, sw) * 0.8;
    a.arms[0].rotation.x = -sw * 0.7; a.arms[1].rotation.x = sw * 0.7;
    a.arms.forEach((arm, i) => (arm.rotation.z = (i ? -1 : 1) * 0.05));
  }
}
function setLayer(obj, layer) { obj.traverse((o) => o.layers.set(layer)); }

// ---------- NPC press corps (fills the room) ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const npcs = [];
const NPC_SEATS = [1, 3, 5, 8, 9, 12, 15, 17, 18, 22, 24, 27, 29, 31, 34, 37, 40, 44, 46];
for (const si of NPC_SEATS) {
  const s = seats[si]; s.npc = true;
  const a = makeAvatar({
    suit: SUITS[Math.floor(rnd() * SUITS.length)], tie: TIES[Math.floor(rnd() * TIES.length)],
    skin: SKINS[Math.floor(rnd() * SKINS.length)], hair: ['#1b1410', '#3b2a1e', '#6b4a2b', '#9a9a9a', '#c9a46a'][Math.floor(rnd() * 5)],
  });
  a.root.position.set(s.x, 0, s.z + 0.04);
  poseAvatar(a, { seated: true });
  scene.add(a.root);
  npcs.push({ a, look: 0, target: 0, next: rnd() * 5 });
}

// ======================================================================
// Speech camera, TV, recording canvases
// ======================================================================
const poolCam = new THREE.PerspectiveCamera(17, 16 / 9, 0.1, 60);
poolCam.position.set(0, 1.8, 2.0);
poolCam.lookAt(0, STAGE.h + 1.5, SPEAKER_SPOT.z);
poolCam.layers.enable(1); // sees the local player's own avatar too

const liveRT = new THREE.WebGLRenderTarget(640, 360, { colorSpace: THREE.SRGBColorSpace });
const tvIdleTex = canvasTex(1024, 576, () => {});
const tvChyronTex = canvasTex(1024, 88, () => {});
const tvMat = new THREE.MeshBasicMaterial({ map: tvIdleTex, toneMapped: false });
const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(TV.w, TV.h), tvMat);
tvScreen.position.set(TV.x + 0.075, TV.y, TV.z); tvScreen.rotation.y = Math.PI / 2; scene.add(tvScreen);
const chyron = new THREE.Mesh(new THREE.PlaneGeometry(TV.w, TV.w * (88 / 1024)), new THREE.MeshBasicMaterial({ map: tvChyronTex, toneMapped: false }));
chyron.position.set(TV.x + 0.082, TV.y - TV.h / 2 + (TV.w * 88 / 1024) / 2, TV.z); chyron.rotation.y = Math.PI / 2; scene.add(chyron);

const tvVideo = document.createElement('video');
tvVideo.crossOrigin = 'anonymous'; tvVideo.playsInline = true;
const tvVideoTex = new THREE.VideoTexture(tvVideo); tvVideoTex.colorSpace = THREE.SRGBColorSpace;
let tvMode = 'idle'; // idle | live | playback
let playbackTitle = '';

function fmtDur(s) { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function drawTVIdle() {
  const c = tvIdleTex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0f2347'); gr.addColorStop(1, '#060c19');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#b3202a'; g.fillRect(0, 0, w, 10);
  g.fillStyle = '#fff'; g.font = 'bold 54px Georgia'; g.fillText('SPEECH ARCHIVE', 48, 92);
  g.fillStyle = '#9fb2d8'; g.font = '26px Inter, Arial'; g.fillText('Walk up and press E to watch or download', 50, 134);
  const list = speeches.slice(0, 6);
  g.font = '30px Inter, Arial';
  if (!list.length) { g.fillStyle = '#7d8db0'; g.fillText('No speeches yet. Take the podium.', 50, 230); }
  list.forEach((s, i) => {
    const y = 210 + i * 58;
    g.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; g.fillRect(40, y - 38, w - 80, 52);
    g.fillStyle = '#c9a24a'; g.fillText('▶', 58, y);
    g.fillStyle = '#fff'; g.fillText(s.name, 100, y);
    g.fillStyle = '#9fb2d8'; g.textAlign = 'right';
    g.fillText(`${fmtDur(s.duration)}  ·  ${new Date(s.createdAt).toLocaleDateString()}`, w - 60, y);
    g.textAlign = 'left';
  });
  tvIdleTex.needsUpdate = true;
}
function drawChyron(text, live) {
  const c = tvChyronTex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
  g.fillStyle = '#0f2347'; g.fillRect(0, 0, w, h);
  g.fillStyle = live ? '#b3202a' : '#c9a24a'; g.fillRect(0, 0, live ? 150 : 210, h);
  g.fillStyle = '#fff'; g.font = 'bold 40px Inter, Arial'; g.textBaseline = 'middle';
  g.fillText(live ? '● LIVE' : 'ARCHIVE', 22, h / 2 + 2);
  g.font = 'bold 40px Inter, Arial'; g.fillText(text, live ? 180 : 240, h / 2 + 2);
  tvChyronTex.needsUpdate = true;
}
function setTV(mode) {
  tvMode = mode;
  if (mode === 'live') { tvMat.map = liveRT.texture; drawChyron(players[speakerId]?.name || (speakerId === myId ? myName : 'Speaker'), true); }
  else if (mode === 'playback') { tvMat.map = tvVideoTex; drawChyron(playbackTitle, false); }
  else { tvMat.map = tvIdleTex; drawTVIdle(); drawChyron('THE PRESS ROOM  ·  press E at the TV', false); }
  tvMat.needsUpdate = true;
}

// recording renderer: renders the pool camera to its own canvas, composited with a lower-third
const recCanvas = document.createElement('canvas'); recCanvas.width = 960; recCanvas.height = 540;
let recRenderer = null;
const compCanvas = document.createElement('canvas'); compCanvas.width = 960; compCanvas.height = 540;
const comp = compCanvas.getContext('2d');

// ======================================================================
// Audio: mic, the PA ("speaking into a microphone to a room"), proximity voice
// ======================================================================
let actx = null, master = null, roomBus = null, micStream = null, micSrc = null;
let remotePA = null; // PA chain for whoever is at the podium (remote)
const sounds = {};
let monitorOn = false;

function makeIR(ctx, seconds = 1.6, decay = 3.2) {
  const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // early reflections + diffuse tail of a medium carpeted room
      const early = i < ctx.sampleRate * 0.04 && Math.random() < 0.01 ? (Math.random() * 2 - 1) * 0.8 : 0;
      d[i] = early + (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return ir;
}
// Mic -> podium gooseneck -> PA amp -> ceiling speakers -> room reverb
function buildPA(ctx, out) {
  const input = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140; hp.Q.value = 0.8;
  const prox = ctx.createBiquadFilter(); prox.type = 'lowshelf'; prox.frequency.value = 220; prox.gain.value = 3; // proximity effect
  const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2800; pres.Q.value = 1.1; pres.gain.value = 6; // presence bump
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500; lp.Q.value = 0.7; // PA horn rolloff
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); }
  shaper.curve = curve; shaper.oversample = '2x';
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -26; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2; comp.knee.value = 8;
  const makeup = ctx.createGain(); makeup.gain.value = 2.2;
  input.connect(hp).connect(prox).connect(pres).connect(lp).connect(shaper).connect(comp).connect(makeup);
  // two ceiling speakers, slightly offset in time -> wide "PA in a room" image
  const panL = ctx.createStereoPanner(); panL.pan.value = -0.55;
  const panR = ctx.createStereoPanner(); panR.pan.value = 0.55;
  const dly = ctx.createDelay(0.1); dly.delayTime.value = 0.013;
  const dry = ctx.createGain(); dry.gain.value = 0.75;
  makeup.connect(dry); dry.connect(panL).connect(out); dry.connect(dly).connect(panR).connect(out);
  const verb = ctx.createConvolver(); verb.buffer = makeIR(ctx);
  const pre = ctx.createDelay(0.2); pre.delayTime.value = 0.025;
  const wet = ctx.createGain(); wet.gain.value = 0.32;
  makeup.connect(pre).connect(verb).connect(wet).connect(out);
  return input;
}

async function initAudio() {
  actx = new (window.AudioContext || window.webkitAudioContext)();
  master = actx.createGain(); master.gain.value = 1; master.connect(actx.destination);
  roomBus = actx.createGain(); roomBus.connect(master);
  remotePA = buildPA(actx, master);
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    micSrc = actx.createMediaStreamSource(micStream);
    setMicStatus('🎙️ mic on — talk to people near you');
  } catch (e) {
    setMicStatus('🔇 no mic — you can listen, not speak');
  }
  // Optional sound files you supply in /public/sounds (game works without them)
  for (const name of ['mic_on', 'applause', 'clap', 'room_tone']) {
    try {
      const r = await fetch(`/sounds/${name}.mp3`);
      if (r.ok) sounds[name] = await actx.decodeAudioData(await r.arrayBuffer());
    } catch {}
  }
  if (sounds.room_tone) { const s = actx.createBufferSource(); s.buffer = sounds.room_tone; s.loop = true; const g = actx.createGain(); g.gain.value = 0.25; s.connect(g).connect(master); s.start(); }
}
function playSound(name, { at = null, gain = 1, dest = null } = {}) {
  if (!actx || !sounds[name]) return;
  const s = actx.createBufferSource(); s.buffer = sounds[name];
  const g = actx.createGain(); g.gain.value = gain; s.connect(g);
  if (at) { const p = makePanner(); p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z; g.connect(p).connect(roomBus); }
  else g.connect(dest || roomBus);
  s.start();
}
function makePanner() {
  const p = actx.createPanner();
  p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.3; p.rolloffFactor = 1.5; p.maxDistance = 40;
  return p;
}
const micStatusEl = document.getElementById('micstatus');
function setMicStatus(t) { micStatusEl.textContent = t; }

// ======================================================================
// Networking + WebRTC voice mesh
// ======================================================================
const socket = io();
let myId = null, myName = '';
const players = {};   // server snapshot
const remotes = {};   // id -> { av, target:{p,r,seat}, last }
const peers = {};     // id -> { pc, pending:[], audio nodes }
let speakerId = null, speakerSince = 0, speakerMax = 300;
let speeches = [];
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

function createPeer(id, initiator) {
  if (peers[id]) return peers[id];
  const pc = new RTCPeerConnection(ICE);
  const peer = (peers[id] = { pc, pending: [], remoteSet: false });
  if (micStream) micStream.getTracks().forEach((t) => pc.addTrack(t, micStream));
  else pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.onicecandidate = (e) => e.candidate && socket.emit('signal', { to: id, data: { candidate: e.candidate } });
  pc.ontrack = (e) => attachRemoteAudio(id, e.streams[0] || new MediaStream([e.track]));
  if (initiator) {
    pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => socket.emit('signal', { to: id, data: { sdp: pc.localDescription } }));
  }
  return peer;
}
socket.on('signal', async ({ from, data }) => {
  const peer = peers[from] || createPeer(from, false);
  const pc = peer.pc;
  try {
    if (data.sdp) {
      await pc.setRemoteDescription(data.sdp);
      peer.remoteSet = true;
      for (const c of peer.pending) await pc.addIceCandidate(c).catch(() => {});
      peer.pending = [];
      if (data.sdp.type === 'offer') {
        await pc.setLocalDescription(await pc.createAnswer());
        socket.emit('signal', { to: from, data: { sdp: pc.localDescription } });
      }
    } else if (data.candidate) {
      if (peer.remoteSet) await pc.addIceCandidate(data.candidate).catch(() => {});
      else peer.pending.push(data.candidate);
    }
  } catch (e) { console.warn('signal error', e); }
});
function attachRemoteAudio(id, stream) {
  const peer = peers[id]; if (!peer || peer.src) return;
  // Chrome needs the remote stream attached to a (muted) element before WebAudio receives samples
  const el = new Audio(); el.srcObject = stream; el.muted = true; el.play().catch(() => {});
  peer.el = el;
  peer.src = actx.createMediaStreamSource(stream);
  peer.prox = actx.createGain();
  peer.panner = makePanner();
  peer.paSend = actx.createGain(); peer.paSend.gain.value = 0;
  peer.src.connect(peer.prox).connect(peer.panner).connect(roomBus); // normal talking voice, positional
  peer.src.connect(peer.paSend).connect(remotePA);                   // through the PA when at the podium
  routePeer(id);
}
function routePeer(id) {
  const peer = peers[id]; if (!peer || !peer.prox) return;
  const onMic = id === speakerId, t = actx.currentTime;
  peer.prox.gain.setTargetAtTime(onMic ? 0 : 1, t, 0.05);
  peer.paSend.gain.setTargetAtTime(onMic ? 1 : 0, t, 0.05);
}
function closePeer(id) {
  const p = peers[id]; if (!p) return;
  try { p.pc.close(); } catch {}
  try { p.src && p.src.disconnect(); p.prox && p.prox.disconnect(); p.panner && p.panner.disconnect(); p.paSend && p.paSend.disconnect(); } catch {}
  if (p.el) p.el.srcObject = null;
  delete peers[id];
}

function addRemote(p) {
  if (p.id === myId || remotes[p.id]) return;
  const av = makeAvatar({ suit: p.suit, tie: p.tie, skin: p.skin, name: p.name });
  av.root.position.set(...p.p); av.root.rotation.y = p.r;
  scene.add(av.root);
  remotes[p.id] = { av, target: { p: p.p.slice(), r: p.r, seat: p.seat }, speed: 0 };
}
function removeRemote(id) {
  const r = remotes[id]; if (r) { scene.remove(r.av.root); delete remotes[id]; }
  closePeer(id);
}

socket.on('welcome', (w) => {
  myId = w.id;
  speeches = w.speeches || [];
  for (const id in w.players) { players[id] = w.players[id]; if (id !== myId) { addRemote(w.players[id]); createPeer(id, true); } }
  applySpeaker(w.speaker);
  setTV(tvMode === 'live' ? 'live' : 'idle');
  updateRoster();
});
socket.on('player:join', (p) => { players[p.id] = p; addRemote(p); updateRoster(); });
socket.on('player:leave', (id) => { delete players[id]; removeRemote(id); updateRoster(); });
socket.on('players', (snap) => {
  for (const id in snap) {
    players[id] = snap[id];
    if (id === myId) continue;
    if (!remotes[id]) addRemote(snap[id]);
    const r = remotes[id]; r.target = { p: snap[id].p, r: snap[id].r, seat: snap[id].seat };
  }
});
socket.on('podium:speaker', applySpeaker);
socket.on('speeches:update', (list) => { speeches = list; if (tvMode === 'idle') drawTVIdle(); renderArchive(); });
socket.on('react', ({ id, type }) => {
  if (type !== 'clap') return;
  const pos = id === myId ? me.pos.clone().setY(me.pos.y + 1.2) : remotes[id]?.av.root.position.clone().setY(1.3);
  if (pos) { playSound('clap', { at: pos }); popEmoji(pos, '👏'); }
});

function applySpeaker(s) {
  const prev = speakerId;
  speakerId = s?.id || null; speakerSince = s?.since || 0; speakerMax = s?.max || 300;
  for (const id in peers) routePeer(id);
  if (scene.userData.tally) scene.userData.tally.visible = !!speakerId;
  if (speakerId && speakerId !== prev) {
    if (tvMode === 'playback') tvVideo.pause();
    setTV('live');
    playSound('mic_on', { dest: speakerId === myId ? null : remotePA, gain: 0.6 });
    if (speakerId === myId) beginSpeech();
  }
  if (!speakerId && prev) {
    if (tvMode === 'live') setTV('idle');
    playSound('applause', { gain: 0.7 });
    if (prev === myId) endSpeech();
  }
  updateHUD(); updateRoster();
}

// ======================================================================
// Speaking at the podium + recording
// ======================================================================
let localPA = null, recDest = null, monitorGain = null, recorder = null, recChunks = [], recStart = 0, recMime = '';
let roomToRec = null;

function pickMime() {
  const opts = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'];
  return opts.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function beginSpeech() {
  // walk to the spot behind the podium, face the room
  me.seat = -1;
  me.pos.set(SPEAKER_SPOT.x, STAGE.h, SPEAKER_SPOT.z);
  me.yaw = Math.PI; me.pitch = -0.05;
  if (!actx) return;
  recDest = actx.createMediaStreamDestination();
  localPA = buildPA(actx, recDest);
  if (micSrc) micSrc.connect(localPA);
  // your own PA voice is only played back to you if you turn the monitor on (feedback risk on speakers)
  const recSrc = actx.createMediaStreamSource(recDest.stream);
  monitorGain = actx.createGain(); monitorGain.gain.value = monitorOn ? 0.9 : 0;
  recSrc.connect(monitorGain).connect(master);
  monitorGain.userData = recSrc;
  // the room (audience questions, claps) is captured on the tape too
  roomToRec = actx.createGain(); roomToRec.gain.value = 0.6; roomBus.connect(roomToRec).connect(recDest);
  if (!recRenderer) {
    recRenderer = new THREE.WebGLRenderer({ canvas: recCanvas, antialias: true });
    recRenderer.toneMapping = THREE.ACESFilmicToneMapping; recRenderer.toneMappingExposure = 1.05;
    recRenderer.shadowMap.enabled = true;
  }
  recMime = pickMime();
  if (!recMime) { toast('This browser can’t record video — speech won’t be saved'); return; }
  const stream = new MediaStream([...compCanvas.captureStream(30).getVideoTracks(), ...recDest.stream.getAudioTracks()]);
  recChunks = [];
  recorder = new MediaRecorder(stream, { mimeType: recMime, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 });
  recorder.ondataavailable = (e) => e.data.size && recChunks.push(e.data);
  recorder.onstop = uploadSpeech;
  recStart = performance.now();
  recorder.start(1000);
  toast('You’re on the air. The pool camera is rolling.');
}
function endSpeech() {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  try { micSrc && localPA && micSrc.disconnect(localPA); } catch {}
  try { roomToRec && roomBus.disconnect(roomToRec); } catch {}
  try { monitorGain && monitorGain.disconnect(); } catch {}
  localPA = null; monitorGain = null; roomToRec = null;
  me.pos.set(0.9, STAGE.h, -9.0);
}
async function uploadSpeech() {
  const duration = (performance.now() - recStart) / 1000;
  recorder = null;
  if (duration < 2 || !recChunks.length) { toast('Speech too short to save'); return; }
  const blob = new Blob(recChunks, { type: recMime.split(';')[0] });
  const fd = new FormData();
  fd.append('name', myName); fd.append('duration', String(duration));
  fd.append('file', blob, 'speech' + (recMime.includes('mp4') ? '.mp4' : '.webm'));
  toast('Saving your speech to the archive…');
  try {
    const r = await fetch('/api/speeches', { method: 'POST', body: fd });
    toast(r.ok ? 'Speech saved — it’s on the TV.' : 'Couldn’t save the speech');
  } catch { toast('Couldn’t save the speech'); }
}
function drawLowerThird() {
  const w = compCanvas.width, h = compCanvas.height, el = (performance.now() - recStart) / 1000;
  comp.fillStyle = 'rgba(15,35,71,.92)'; comp.fillRect(40, h - 110, 520, 64);
  comp.fillStyle = '#b3202a'; comp.fillRect(40, h - 110, 10, 64);
  comp.fillStyle = '#fff'; comp.font = 'bold 30px Inter, Arial'; comp.textBaseline = 'middle';
  comp.fillText(myName, 66, h - 86);
  comp.fillStyle = '#c9a24a'; comp.font = '16px Inter, Arial'; comp.fillText('ADDRESSING THE PRESS ROOM', 66, h - 60);
  comp.fillStyle = '#b3202a'; comp.fillRect(w - 150, 30, 110, 34);
  comp.fillStyle = '#fff'; comp.font = 'bold 18px Inter, Arial'; comp.fillText('● LIVE  ' + fmtDur(el), w - 142, 48);
}

// ======================================================================
// Local player + controls
// ======================================================================
const me = { pos: new THREE.Vector3(-3.7, 0, 3.6), yaw: Math.PI * 0 + 0, pitch: 0, seat: -1, eyeY: 1.65 };
me.yaw = 0; // facing the podium (-z)
let localAvatar = null;
const keys = {};
let playing = false, uiOpen = false;

addEventListener('keydown', (e) => {
  if (!playing || uiOpen) return;
  keys[e.code] = true;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyC') socket.emit('react', 'clap');
  if (e.code === 'KeyM') { monitorOn = !monitorOn; if (monitorGain) monitorGain.gain.value = monitorOn ? 0.9 : 0; toast(monitorOn ? 'PA monitor ON — use headphones' : 'PA monitor off'); }
});
addEventListener('keyup', (e) => (keys[e.code] = false));
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  me.yaw -= e.movementX * 0.0022;
  me.pitch = Math.max(-1.3, Math.min(1.3, me.pitch - e.movementY * 0.0022));
});
const resumeEl = document.getElementById('resume');
canvas.addEventListener('click', () => playing && !uiOpen && canvas.requestPointerLock());
resumeEl.addEventListener('click', () => { if (playing && !uiOpen) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => {
  resumeEl.style.display = playing && !uiOpen && document.pointerLockElement !== canvas ? 'flex' : 'none';
});

const ray = new THREE.Raycaster();
let focus = null; // current interaction target
function findFocus() {
  if (speakerId === myId) return { type: 'leave' };
  if (me.seat >= 0) return { type: 'stand' };
  const dx = me.pos.x - PODIUM.x, dz = me.pos.z - PODIUM.z;
  if (Math.hypot(dx, dz) < 1.7) return { type: speakerId ? 'occupied' : 'podium' };
  if (me.pos.x < TV.x + 3.4 && Math.abs(me.pos.z - TV.z) < 2.6) return { type: 'tv' };
  ray.setFromCamera({ x: 0, y: 0 }, camera); ray.far = 2.8;
  const hit = ray.intersectObjects(seatMeshes, false)[0];
  if (hit) {
    const i = hit.object.userData.seatIndex, s = seats[i];
    const taken = s.npc || Object.values(players).some((p) => p.id !== myId && p.seat === i);
    return { type: taken ? 'taken' : 'sit', seat: i };
  }
  return null;
}
const PROMPTS = {
  leave: '<kbd>E</kbd> Step down from the podium', stand: '<kbd>E</kbd> Stand up', podium: '<kbd>E</kbd> Take the podium',
  occupied: 'Someone has the floor', tv: '<kbd>E</kbd> Open the speech archive', sit: '<kbd>E</kbd> Take a seat', taken: 'Seat taken',
};
function interact() {
  if (!focus) return;
  if (focus.type === 'leave') socket.emit('podium:release');
  else if (focus.type === 'podium') socket.emit('podium:request');
  else if (focus.type === 'stand') { const s = seats[me.seat]; me.seat = -1; me.pos.set(s.x < 0 ? -3.4 : 3.4, 0, s.z); }
  else if (focus.type === 'sit') { const s = seats[focus.seat]; me.seat = focus.seat; me.pos.set(s.x, 0, s.z + 0.04); me.yaw = 0; }
  else if (focus.type === 'tv') openArchive();
}

function collide(p, r = 0.24) {
  p.x = Math.max(ROOM.x0 + r, Math.min(ROOM.x1 - r, p.x));
  p.z = Math.max(ROOM.z0 + 0.35, Math.min(ROOM.z1 - r, p.z));
  for (const b of colliders) {
    if (p.x > b.x0 - r && p.x < b.x1 + r && p.z > b.z0 - r && p.z < b.z1 + r) {
      const pushes = [b.x0 - r - p.x, b.x1 + r - p.x, b.z0 - r - p.z, b.z1 + r - p.z];
      const ax = Math.abs(pushes[0]) < Math.abs(pushes[1]) ? pushes[0] : pushes[1];
      const az = Math.abs(pushes[2]) < Math.abs(pushes[3]) ? pushes[2] : pushes[3];
      if (Math.abs(ax) < Math.abs(az)) p.x += ax; else p.z += az;
    }
  }
}
const floorAt = (z) => (z < STAGE.z ? STAGE.h : 0);

// ======================================================================
// HUD
// ======================================================================
const promptEl = document.getElementById('prompt'), onairEl = document.getElementById('onair'), onairText = document.getElementById('onairtext');
const rosterEl = document.getElementById('roster');
function updateHUD() {
  if (speakerId) {
    onairEl.style.display = 'block';
    const nm = speakerId === myId ? 'YOU' : (players[speakerId]?.name || 'Speaker');
    const left = Math.max(0, speakerMax - (Date.now() - speakerSince) / 1000);
    onairText.textContent = `ON AIR: ${nm}  ·  ${fmtDur(left)} left`;
  } else onairEl.style.display = 'none';
}
function updateRoster() {
  const list = Object.values(players);
  rosterEl.innerHTML = `<b>IN THE ROOM (${list.length})</b><br>` + list.map((p) => `${p.id === speakerId ? '🎤 ' : ''}${escapeHtml(p.name)}${p.id === myId ? ' (you)' : ''}`).join('<br>');
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
let toastTimer;
function toast(msg) {
  promptEl.innerHTML = escapeHtml(msg); promptEl.style.display = 'block'; promptEl.dataset.toast = '1';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (promptEl.dataset.toast = ''), 2600);
}
const emojis = [];
function popEmoji(pos, ch) {
  const t = canvasTex(128, 128, (g) => { g.font = '96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  s.scale.set(0.35, 0.35, 1); s.position.copy(pos).add(new THREE.Vector3(0, 0.7, 0)); scene.add(s);
  emojis.push({ s, born: performance.now() });
}

// ---------- archive overlay ----------
const archiveEl = document.getElementById('archive'), listEl = document.getElementById('list');
function openArchive() {
  uiOpen = true; document.exitPointerLock(); archiveEl.style.display = 'flex'; resumeEl.style.display = 'none';
  fetch('/api/speeches').then((r) => r.json()).then((l) => { speeches = l; renderArchive(); });
  renderArchive();
}
function closeArchive() { uiOpen = false; archiveEl.style.display = 'none'; canvas.requestPointerLock(); }
document.getElementById('closeArchive').onclick = closeArchive;
addEventListener('keydown', (e) => { if (uiOpen && e.code === 'Escape') closeArchive(); });
function renderArchive() {
  if (!listEl) return;
  if (!speeches.length) { listEl.innerHTML = '<p class="sub" style="margin-top:16px">No speeches yet. Be the first to take the podium.</p>'; return; }
  listEl.innerHTML = speeches.map((s) => `
    <div class="row">
      <div class="meta"><b>${escapeHtml(s.name)}</b><span>${fmtDur(s.duration)} · ${new Date(s.createdAt).toLocaleString()}</span></div>
      <button class="btn" data-play="${s.id}">▶ Play on TV</button>
      <a class="btn" href="/api/speeches/${s.id}/download" download>⬇ Download</a>
    </div>`).join('');
  listEl.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => playOnTV(b.dataset.play)));
}
let tvAudioWired = false;
function playOnTV(id) {
  const s = speeches.find((x) => x.id === id); if (!s) return;
  if (speakerId) { toast('Live speech in progress — the TV is showing it'); return; }
  if (!tvAudioWired && actx) {
    const src = actx.createMediaElementSource(tvVideo);
    const p = makePanner(); p.refDistance = 2.5; p.positionX.value = TV.x + 0.2; p.positionY.value = TV.y; p.positionZ.value = TV.z;
    src.connect(p).connect(master); tvAudioWired = true;
  }
  tvVideo.src = `/api/speeches/${id}/stream`;
  tvVideo.play().catch(() => {});
  playbackTitle = `${s.name} · ${fmtDur(s.duration)}`;
  setTV('playback');
  closeArchive();
}
tvVideo.addEventListener('ended', () => tvMode === 'playback' && setTV('idle'));

// ======================================================================
// Join
// ======================================================================
document.getElementById('enter').onclick = async () => {
  myName = (nameInput.value.trim() || 'Reporter').slice(0, 20);
  try { localStorage.setItem('pr_name', myName); } catch {}
  document.getElementById('join').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  await initAudio();
  localAvatar = makeAvatar({ ...choice, name: '' });
  setLayer(localAvatar.root, 1); // hidden from your own eyes, visible to the pool camera
  scene.add(localAvatar.root);
  socket.emit('join', { name: myName, ...choice });
  playing = true;
  resumeEl.style.display = 'flex'; // mic prompt can eat the click; one more click locks the mouse
  canvas.requestPointerLock();
  setTV('idle');
};
setTV('idle');

// ======================================================================
// Main loop
// ======================================================================
const clock = new THREE.Clock();
let sendT = 0, liveT = 0;
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

  // movement
  let moving = 0;
  if (playing && !uiOpen && me.seat < 0 && speakerId !== myId) {
    fwd.set(-Math.sin(me.yaw), 0, -Math.cos(me.yaw)); right.set(-fwd.z, 0, fwd.x);
    const mv = new THREE.Vector3();
    if (keys.KeyW) mv.add(fwd); if (keys.KeyS) mv.sub(fwd);
    if (keys.KeyD) mv.add(right); if (keys.KeyA) mv.sub(right);
    if (mv.lengthSq() > 0) {
      mv.normalize().multiplyScalar((keys.ShiftLeft ? 4.2 : 2.6) * dt);
      me.pos.add(mv); collide(me.pos); moving = 1;
    }
  }
  if (me.seat < 0 && speakerId !== myId) me.pos.y += (floorAt(me.pos.z) - me.pos.y) * Math.min(1, dt * 14);
  const eye = me.seat >= 0 ? 1.16 : 1.65;
  me.eyeY += (eye - me.eyeY) * Math.min(1, dt * 10);
  camera.position.set(me.pos.x, me.pos.y + me.eyeY, me.pos.z);
  camera.rotation.set(me.pitch, me.yaw, 0);

  if (localAvatar) {
    localAvatar.root.position.copy(me.pos); localAvatar.root.rotation.y = me.yaw;
    poseAvatar(localAvatar, { seated: me.seat >= 0, walk: moving, t });
    localAvatar.head.rotation.x = -me.pitch * 0.5;
  }

  // remote avatars
  for (const id in remotes) {
    const r = remotes[id], a = r.av, tp = r.target.p;
    const before = a.root.position.clone();
    a.root.position.lerp(new THREE.Vector3(tp[0], tp[1], tp[2]), Math.min(1, dt * 10));
    let dr = r.target.r - a.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    a.root.rotation.y += dr * Math.min(1, dt * 10);
    const sp = before.distanceTo(a.root.position) / Math.max(dt, 1e-3);
    r.speed += (Math.min(1, sp / 1.5) - r.speed) * Math.min(1, dt * 8);
    poseAvatar(a, { seated: r.target.seat >= 0, walk: r.speed, t });
    if (id === speakerId) a.arms.forEach((arm, i) => { arm.rotation.x = -0.6 + Math.sin(t * 2 + i) * 0.15; }); // hands on the podium
    const peer = peers[id];
    if (peer && peer.panner) {
      const hp = a.root.position;
      peer.panner.positionX.value = hp.x; peer.panner.positionY.value = hp.y + 1.6; peer.panner.positionZ.value = hp.z;
    }
  }
  if (speakerId === myId && localAvatar) localAvatar.arms.forEach((arm, i) => { arm.rotation.x = -0.6 + Math.sin(t * 2 + i) * 0.15; });

  // NPC press corps look around, mostly at the podium
  for (const n of npcs) {
    n.next -= dt;
    if (n.next < 0) { n.target = speakerId ? (rnd() - 0.5) * 0.3 : (rnd() - 0.5) * 1.6; n.next = 2 + rnd() * 5; }
    n.look += (n.target - n.look) * Math.min(1, dt * 2);
    n.a.head.rotation.y = n.look;
    n.a.head.rotation.x = Math.sin(t * 0.7 + n.a.phase) * 0.04;
  }

  // flag ripple
  const flag = scene.userData.flag;
  if (flag) {
    const pos = flag.geometry.attributes.position, base = flag.geometry.userData.base;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      pos.array[i * 3 + 2] = Math.sin(x * 5 - t * 1.6 + y * 1.2) * 0.05 * x + Math.sin(x * 9 + t) * 0.01 * x;
      pos.array[i * 3 + 1] = y - x * x * 0.08;
    }
    pos.needsUpdate = true; flag.geometry.computeVertexNormals();
  }

  // emoji pops
  for (let i = emojis.length - 1; i >= 0; i--) {
    const e = emojis[i], age = (performance.now() - e.born) / 1000;
    e.s.position.y += dt * 0.5; e.s.material.opacity = Math.max(0, 1 - age / 1.4);
    if (age > 1.4) { scene.remove(e.s); emojis.splice(i, 1); }
  }

  // audio listener follows the camera
  if (actx) {
    const L = actx.listener; camera.getWorldDirection(fwd);
    if (L.positionX) {
      L.positionX.value = camera.position.x; L.positionY.value = camera.position.y; L.positionZ.value = camera.position.z;
      L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(camera.position.x, camera.position.y, camera.position.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
  }

  // interaction prompt
  if (playing) {
    focus = uiOpen ? null : findFocus();
    if (promptEl.dataset.toast !== '1') {
      if (focus) { promptEl.innerHTML = PROMPTS[focus.type]; promptEl.style.display = 'block'; } else promptEl.style.display = 'none';
    }
    updateHUD();
  }

  // network send
  sendT += dt;
  if (playing && myId && sendT > 0.066) {
    sendT = 0;
    socket.emit('state', { p: [+me.pos.x.toFixed(3), +me.pos.y.toFixed(3), +me.pos.z.toFixed(3)], r: +me.yaw.toFixed(3), seat: me.seat });
  }

  // live feed on the TV (rendered at ~30fps)
  liveT += dt;
  if (tvMode === 'live' && liveT > 0.033) {
    liveT = 0;
    tvScreen.visible = false;
    renderer.setRenderTarget(liveRT); renderer.render(scene, poolCam); renderer.setRenderTarget(null);
    tvScreen.visible = true;
  }
  // speech recording: pool camera -> composite with lower third -> MediaRecorder
  if (recorder && recRenderer) {
    tvScreen.visible = false; recRenderer.render(scene, poolCam); tvScreen.visible = true;
    comp.drawImage(recCanvas, 0, 0);
    drawLowerThird();
  }

  renderer.render(scene, camera);
}
camera.layers.set(0);
tick();
