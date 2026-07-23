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
  var chest    = measurements.fitme_chest.value;
  var waist    = measurements.fitme_waist.value;
  var hips     = measurements.fitme_hips.value;
  var inseam   = measurements.fitme_inseam.value;
  var shoulder = measurements.fitme_shoulder.value;
  var sleeve   = measurements.fitme_sleeve.value;
  var neck     = measurements.fitme_neck.value;
  var thigh    = measurements.fitme_thigh.value;

  var chestR    = cr(chest);
  var waistR    = cr(waist);
  var hipsR     = cr(hips);
  var neckR     = cr(neck);
  var thighR    = cr(thigh);
  var calfR     = thighR * 0.68;
  var upperArmR = 4.0;
  var forearmR  = 3.2;

  var HEAD_R        = 11;
  var NECK_H        = 10;
  var UPPER_TORSO_H = 30;
  var LOWER_TORSO_H = 20;
  var FOOT_H        = 6;

  var upperLegH = inseam * 0.5;
  var lowerLegH = inseam * 0.5;
  var upperArmH = sleeve * 0.55;
  var forearmH  = sleeve * 0.45;

  var yAnkle    = FOOT_H;
  var yKnee     = FOOT_H + lowerLegH;
  var yHip      = FOOT_H + inseam;
  var yWaist    = yHip + LOWER_TORSO_H;
  var yShoulder = yWaist + UPPER_TORSO_H;
  var yNeckTop  = yShoulder + NECK_H;
  var yHeadCtr  = yNeckTop + HEAD_R;
  var totalH    = yHeadCtr + HEAD_R;
  var yOff      = -totalH / 2;

  var bodyMat  = new THREE.MeshPhongMaterial({ color: 0xF0EDE4 });
  var jointMat = new THREE.MeshPhongMaterial({ color: 0xC4BEB2 });

  var group = new THREE.Group();

  function add(mesh, x, y, z) {
    mesh.position.set(x, yOff + y, z);
    group.add(mesh);
  }

  add(makeSphere(HEAD_R, bodyMat), 0, yHeadCtr, 0);

  add(makeCyl(neckR, neckR, NECK_H, bodyMat), 0, yShoulder + NECK_H / 2, 0);

  var neckRing = makeSphere(neckR * 1.2, jointMat);
  neckRing.scale.y = 0.4;
  add(neckRing, 0, yShoulder, 0);

  add(makeCyl(chestR, waistR, UPPER_TORSO_H, bodyMat), 0, yWaist + UPPER_TORSO_H / 2, 0);
  add(makeCyl(waistR, hipsR, LOWER_TORSO_H, bodyMat), 0, yHip + LOWER_TORSO_H / 2, 0);

  var hipRing = makeSphere(hipsR * 0.55, jointMat);
  hipRing.scale.set(2.5, 0.28, 1.0);
  add(hipRing, 0, yHip, 0);

  [-1, 1].forEach(function(side) {
    var legX = hipsR * 0.52 * side;

    add(makeCyl(thighR, calfR * 1.05, upperLegH, bodyMat), legX, yKnee + upperLegH / 2, 0);

    var knee = makeSphere(calfR * 1.1, jointMat);
    knee.scale.y = 0.6;
    add(knee, legX, yKnee, 0);

    add(makeCyl(calfR, calfR * 0.82, lowerLegH, bodyMat), legX, yAnkle + lowerLegH / 2, 0);

    var ankle = makeSphere(calfR * 0.82, jointMat);
    ankle.scale.y = 0.5;
    add(ankle, legX, yAnkle, 0);

    var foot = makeSphere(FOOT_H * 0.85, bodyMat);
    foot.scale.set(1.3, 0.55, 2.0);
    add(foot, legX + side * 1.5, FOOT_H * 0.5, FOOT_H * 0.6);
  });

  var armX = shoulder / 2;
  [-1, 1].forEach(function(side) {
    var sX = armX * side;

    add(makeSphere(upperArmR * 1.35, jointMat), sX, yShoulder, 0);
    add(makeCyl(upperArmR, upperArmR * 0.88, upperArmH, bodyMat), sX, yShoulder - upperArmH / 2, 0);
    add(makeSphere(upperArmR * 0.9, jointMat), sX, yShoulder - upperArmH, 0);
    add(makeCyl(forearmR, forearmR * 0.82, forearmH, bodyMat), sX, yShoulder - upperArmH - forearmH / 2, 0);
    add(makeSphere(forearmR * 0.82, jointMat), sX, yShoulder - upperArmH - forearmH, 0);

    var hand = makeSphere(forearmR * 1.05, bodyMat);
    hand.scale.set(1.1, 0.75, 0.65);
    add(hand, sX, yShoulder - upperArmH - forearmH - forearmR * 1.05, 0);
  });

  return group;
}

// ─── Scene setup ────────────────────────────────────────────

function initScene() {
  var canvas = document.getElementById('mannequinCanvas');
  var hint   = document.getElementById('dragHint');

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xEDEAE2);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  camera.position.set(0, 10, 220);

  scene.add(new THREE.AmbientLight(0xfff8f0, 0.7));
  var dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(-60, 120, 80);
  scene.add(dir);

  var measurements = window.FITME_MEASUREMENTS;
  var mannequin = buildMannequin(measurements);
  scene.add(mannequin);

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan  = false;
  controls.target.set(0, 0, 0);
  controls.update();

  controls.addEventListener('start', function() {
    hint.style.opacity = '0';
  });

  function resize() {
    var w = canvas.parentElement.clientWidth;
    var h = Math.round(window.innerHeight * 0.65);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

try {
  initScene();
} catch (err) {
  var errEl = document.getElementById('mannequinError');
  if (errEl) {
    errEl.textContent = 'Could not load 3D view: ' + err.message;
    errEl.hidden = false;
  }
  console.error('Mannequin init failed:', err);
}
