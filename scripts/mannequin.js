import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Measurement data ────────────────────────────────────────

const DEFAULTS = {
  fitme_chest:    95,
  fitme_waist:    80,
  fitme_hips:     97,
  fitme_inseam:   76,
  fitme_shoulder: 44,
  fitme_sleeve:   63,
  fitme_neck:     37,
  fitme_thigh:    58,
};

const MEASUREMENT_META = [
  { key: 'fitme_chest',    label: 'Chest / bust',   href: 'guide/chest.html' },
  { key: 'fitme_waist',    label: 'Waist',           href: 'guide/waist.html' },
  { key: 'fitme_hips',     label: 'Hips',            href: 'guide/hips.html' },
  { key: 'fitme_inseam',   label: 'Inseam',          href: 'guide/inseam.html' },
  { key: 'fitme_shoulder', label: 'Shoulder width',  href: 'guide/shoulder.html' },
  { key: 'fitme_sleeve',   label: 'Sleeve length',   href: 'guide/sleeve.html' },
  { key: 'fitme_neck',     label: 'Neck',            href: 'guide/neck.html' },
  { key: 'fitme_thigh',    label: 'Thigh',           href: 'guide/thigh.html' },
];

function getMeasurements() {
  const result = {};
  for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
    const raw = localStorage.getItem(key);
    const parsed = raw !== null ? parseFloat(raw) : NaN;
    const isDefault = raw === null || Number.isNaN(parsed);
    result[key] = { value: isDefault ? defaultVal : parsed, isDefault };
  }
  return result;
}

function populatePanel(measurements) {
  const list = document.getElementById('measurementList');
  list.innerHTML = '';
  for (const { key, label, href } of MEASUREMENT_META) {
    const { value, isDefault } = measurements[key];
    const li = document.createElement('li');
    li.className = 'measurement-row';
    if (isDefault) {
      li.innerHTML =
        `<span class="measurement-label">${label}</span>` +
        `<span class="measurement-value">` +
        `<span class="default-badge">default</span>` +
        `<a class="measure-link" href="${href}">Measure →</a>` +
        `</span>`;
    } else {
      li.innerHTML =
        `<span class="measurement-label">${label}</span>` +
        `<span class="measurement-value saved">` +
        `${Math.round(value * 10) / 10} cm ` +
        `<a class="measure-link" href="${href}">Edit →</a>` +
        `</span>`;
    }
    list.appendChild(li);
  }
}

// ─── Geometry helpers ────────────────────────────────────────

function cr(circumference) {
  return circumference / (2 * Math.PI);
}

function makeCyl(rTop, rBot, height, mat) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, height, 16), mat);
}

function makeSphere(radius, mat) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat);
}

// ─── Mannequin builder ───────────────────────────────────────

function buildMannequin(measurements) {
  const chest    = measurements.fitme_chest.value;
  const waist    = measurements.fitme_waist.value;
  const hips     = measurements.fitme_hips.value;
  const inseam   = measurements.fitme_inseam.value;
  const shoulder = measurements.fitme_shoulder.value;
  const sleeve   = measurements.fitme_sleeve.value;
  const neck     = measurements.fitme_neck.value;
  const thigh    = measurements.fitme_thigh.value;

  // Radii from circumferences (1 unit = 1 cm)
  const chestR    = cr(chest);
  const waistR    = cr(waist);
  const hipsR     = cr(hips);
  const neckR     = cr(neck);
  const thighR    = cr(thigh);
  const calfR     = thighR * 0.68;
  const upperArmR = 4.0;   // fixed: ~25 cm circumference
  const forearmR  = 3.2;

  // Fixed segment heights (cm)
  const HEAD_R        = 11;
  const NECK_H        = 10;
  const UPPER_TORSO_H = 30;
  const LOWER_TORSO_H = 20;
  const FOOT_H        = 6;

  // Variable lengths
  const upperLegH = inseam * 0.5;
  const lowerLegH = inseam * 0.5;
  const upperArmH = sleeve * 0.55;
  const forearmH  = sleeve * 0.45;

  // Y positions from feet bottom = 0, building upward
  const yAnkle    = FOOT_H;
  const yKnee     = FOOT_H + lowerLegH;
  const yHip      = FOOT_H + inseam;
  const yWaist    = yHip + LOWER_TORSO_H;
  const yShoulder = yWaist + UPPER_TORSO_H;
  const yNeckTop  = yShoulder + NECK_H;
  const yHeadCtr  = yNeckTop + HEAD_R;
  const totalH    = yHeadCtr + HEAD_R;

  // Center the whole figure vertically at Y=0
  const yOff = -totalH / 2;

  const bodyMat  = new THREE.MeshPhongMaterial({ color: 0xF0EDE4 });
  const jointMat = new THREE.MeshPhongMaterial({ color: 0xC4BEB2 });

  const group = new THREE.Group();

  function add(mesh, x, y, z) {
    mesh.position.set(x, yOff + y, z);
    group.add(mesh);
  }

  // Head
  add(makeSphere(HEAD_R, bodyMat), 0, yHeadCtr, 0);

  // Neck
  add(makeCyl(neckR, neckR, NECK_H, bodyMat), 0, yShoulder + NECK_H / 2, 0);

  // Neck-shoulder joint ring
  const neckRing = makeSphere(neckR * 1.2, jointMat);
  neckRing.scale.y = 0.4;
  add(neckRing, 0, yShoulder, 0);

  // Upper torso: chest radius at top, narrows to waist at bottom
  add(makeCyl(chestR, waistR, UPPER_TORSO_H, bodyMat), 0, yWaist + UPPER_TORSO_H / 2, 0);

  // Lower torso: waist at top, widens to hips at bottom
  add(makeCyl(waistR, hipsR, LOWER_TORSO_H, bodyMat), 0, yHip + LOWER_TORSO_H / 2, 0);

  // Hip joint ring (flattened sphere stretched wide)
  const hipRing = makeSphere(hipsR * 0.55, jointMat);
  hipRing.scale.set(2.5, 0.28, 1.0);
  add(hipRing, 0, yHip, 0);

  // Legs (mirrored left/right)
  for (const side of [-1, 1]) {
    const legX = hipsR * 0.52 * side;

    // Upper leg (thigh)
    add(makeCyl(thighR, calfR * 1.05, upperLegH, bodyMat), legX, yKnee + upperLegH / 2, 0);

    // Knee joint
    const knee = makeSphere(calfR * 1.1, jointMat);
    knee.scale.y = 0.6;
    add(knee, legX, yKnee, 0);

    // Lower leg (calf)
    add(makeCyl(calfR, calfR * 0.82, lowerLegH, bodyMat), legX, yAnkle + lowerLegH / 2, 0);

    // Ankle joint
    const ankle = makeSphere(calfR * 0.82, jointMat);
    ankle.scale.y = 0.5;
    add(ankle, legX, yAnkle, 0);

    // Foot (flattened sphere, offset slightly forward and outward)
    const foot = makeSphere(FOOT_H * 0.85, bodyMat);
    foot.scale.set(1.3, 0.55, 2.0);
    add(foot, legX + side * 1.5, FOOT_H * 0.5, FOOT_H * 0.6);
  }

  // Arms (mirrored left/right)
  const armX = shoulder / 2;
  for (const side of [-1, 1]) {
    const sX = armX * side;

    // Shoulder joint
    add(makeSphere(upperArmR * 1.35, jointMat), sX, yShoulder, 0);

    // Upper arm (hangs down from shoulder joint)
    add(makeCyl(upperArmR, upperArmR * 0.88, upperArmH, bodyMat), sX, yShoulder - upperArmH / 2, 0);

    // Elbow joint
    add(makeSphere(upperArmR * 0.9, jointMat), sX, yShoulder - upperArmH, 0);

    // Forearm
    add(makeCyl(forearmR, forearmR * 0.82, forearmH, bodyMat), sX, yShoulder - upperArmH - forearmH / 2, 0);

    // Wrist joint
    add(makeSphere(forearmR * 0.82, jointMat), sX, yShoulder - upperArmH - forearmH, 0);

    // Hand
    const hand = makeSphere(forearmR * 1.05, bodyMat);
    hand.scale.set(1.1, 0.75, 0.65);
    add(hand, sX, yShoulder - upperArmH - forearmH - forearmR * 1.05, 0);
  }

  return group;
}

// ─── Scene setup ────────────────────────────────────────────

function initScene() {
  const canvas = document.getElementById('mannequinCanvas');
  const hint   = document.getElementById('dragHint');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xEDEAE2);  // --color-muslin

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  camera.position.set(0, 10, 220);

  // Lighting: ambient fill + directional from above-left (mirrors Phase 1 SVG gradients)
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(-60, 120, 80);
  scene.add(dir);

  // Build and add mannequin
  const measurements = getMeasurements();
  const mannequin = buildMannequin(measurements);
  scene.add(mannequin);

  // OrbitControls — rotation only, no zoom or pan
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan  = false;
  controls.target.set(0, 0, 0);
  controls.update();

  // Fade out "Drag to rotate" hint on first interaction
  controls.addEventListener('start', () => {
    hint.style.opacity = '0';
  });

  // Resize canvas to fill its wrapper at 65% of viewport height
  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = Math.round(window.innerHeight * 0.65);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Populate measurements panel
  populatePanel(measurements);
}

initScene();
