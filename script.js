var drawerMessages = [
  { id: 1, accent: "red", text: "أنت أجمل صدفة حصلت في حياتي ❤️" },
  { id: 2, accent: "white", text: "لو رجع بيا الزمن هاختارك كل مرة." },
  { id: 3, accent: "red", text: "كل يوم بحبك أكتر." },
  { id: 4, accent: "white", text: "ابتسامتك بتخلّي يومي أحسن." },
  { id: 5, accent: "red", text: "وجودك نعمة." },
  { id: 6, accent: "white", text: "I Love You Forever ❤️" },
];

var state = {
  stage: "idle",
  sequenceStarted: false,
  activeDrawerId: null,
  openedDrawerIds: new Set(),
  finaleShown: false,
};

var container = document.getElementById("container");
var statusText = document.getElementById("status-text");
var progressText = document.getElementById("progress-text");
var restartButton = document.getElementById("restart-button");
var finalAcceptButton = document.getElementById("final-accept");
var finalYesButton = document.getElementById("final-yes");
var messageOverlay = document.getElementById("message-overlay");
var messageBody = document.getElementById("message-body");
var closeMessageButton = document.getElementById("close-message");
var finaleOverlay = document.getElementById("finale-overlay");
var heartRain = document.getElementById("heart-rain");

var scene;
var camera;
var renderer;
var raycaster;
var pointer;
var clock;
var fridgeLight;
var floorGlow;
var fridgeGroup;
var doorPivot;
var frostGeometry;
var frostPositions;
var frostVelocities = [];
var frostAges;
var backgroundSnowMaterial;
var backgroundSnowGeometry;
var backgroundSnowPositions;
var backgroundSnowVelocities = [];
var heartParticles = [];
var drawerMap = new Map();
var clickableObjects = [];
var drawerLayouts = [];
var frostParticleCount = 150;
var backgroundSnowParticleCount = 820;
var drawersUnlocked = false;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050814);
  scene.fog = new THREE.Fog(0x050814, 8, 15);

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  applyResponsiveCamera("idle");

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  clock = new THREE.Clock();

  buildLights();
  buildEnvironment();
  buildBackgroundSnow();
  buildFridge();
  buildFrost();
  buildHearts();
  buildHeartRain();
  bindEvents();
  updateStatus();
  animate();
}

function buildLights() {
  scene.add(new THREE.AmbientLight(0xa6c0ff, 0.45));

  var rimLight = new THREE.DirectionalLight(0xffd3e6, 0.9);
  rimLight.position.set(4.2, 5.8, 5.2);
  scene.add(rimLight);

  fridgeLight = new THREE.PointLight(0xaeefff, 0.35, 10, 2);
  fridgeLight.position.set(0, 0.6, 0.7);
  scene.add(fridgeLight);
}

function buildEnvironment() {
  var floor = new THREE.Mesh(
    new THREE.CircleGeometry(11, 64),
    new THREE.MeshStandardMaterial({
      color: 0x07101d,
      metalness: 0.55,
      roughness: 0.24,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.3;
  scene.add(floor);

  floorGlow = new THREE.Mesh(
    new THREE.RingGeometry(2.8, 5.8, 64),
    new THREE.MeshBasicMaterial({
      color: 0x19304f,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = -2.28;
  scene.add(floorGlow);
}

function buildBackgroundSnow() {
  backgroundSnowPositions = new Float32Array(backgroundSnowParticleCount * 3);
  backgroundSnowGeometry = new THREE.BufferGeometry();
  backgroundSnowGeometry.setAttribute("position", new THREE.BufferAttribute(backgroundSnowPositions, 3));
  backgroundSnowMaterial = new THREE.PointsMaterial({
    map: createSnowflakeTexture(),
    color: 0xffffff,
    size: getBackgroundSnowSize(),
    sizeAttenuation: false,
    transparent: true,
    opacity: 1,
    alphaTest: 0.28,
    depthWrite: false,
  });

  var snowPoints = new THREE.Points(
    backgroundSnowGeometry,
    backgroundSnowMaterial,
  );
  snowPoints.position.z = -0.25;
  scene.add(snowPoints);

  backgroundSnowVelocities = Array.from({ length: backgroundSnowParticleCount }, function (_, index) {
    resetBackgroundSnowParticle(index, true);
    return {
      drift: -0.003 - Math.random() * 0.004,
      fall: 0.03 + Math.random() * 0.05,
      sway: 0.006 + Math.random() * 0.012,
      phase: Math.random() * Math.PI * 2,
    };
  });
}

function resetBackgroundSnowParticle(index, initial) {
  var stride = index * 3;
  backgroundSnowPositions[stride] = (Math.random() - 0.5) * 15.5;
  backgroundSnowPositions[stride + 1] = initial ? -3.4 + Math.random() * 11.4 : 7.4 + Math.random() * 2.4;
  backgroundSnowPositions[stride + 2] = -5.8 + Math.random() * 3.2;
}

function getBackgroundSnowSize() {
  return isMobileViewport() ? 14 : 10;
}

function createSnowflakeTexture() {
  var canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  var context = canvas.getContext("2d");
  var gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.46, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.78, "rgba(240, 248, 255, 0.78)");
  gradient.addColorStop(1, "rgba(232, 245, 255, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(32, 32, 30, 0, Math.PI * 2);
  context.fill();

  return new THREE.CanvasTexture(canvas);
}

function buildFridge() {
  fridgeGroup = new THREE.Group();
  fridgeGroup.position.y = 0.08;
  scene.add(fridgeGroup);

  var bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xedf6ff,
    roughness: 0.18,
    metalness: 0.52,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
  });

  var innerMaterial = new THREE.MeshStandardMaterial({
    color: 0x09111d,
    roughness: 0.84,
    metalness: 0.12,
  });

  addBox(fridgeGroup, [2.7, 0.12, 2.5], [0, 2.44, 0], bodyMaterial);
  addBox(fridgeGroup, [2.7, 0.12, 2.5], [0, -2.32, 0], bodyMaterial);
  addBox(fridgeGroup, [0.12, 4.72, 2.5], [-1.29, 0.06, 0], bodyMaterial);
  addBox(fridgeGroup, [0.12, 4.72, 2.5], [1.29, 0.06, 0], bodyMaterial);
  addBox(fridgeGroup, [2.46, 4.72, 0.12], [0, 0.06, -1.2], bodyMaterial);
  addBox(fridgeGroup, [2.24, 4.56, 2.16], [0, 0.06, -0.02], innerMaterial);

  doorPivot = new THREE.Group();
  doorPivot.position.set(-1.3, 0.06, 1.26);
  fridgeGroup.add(doorPivot);

  var door = addBox(doorPivot, [2.6, 4.8, 0.12], [1.3, 0, 0], bodyMaterial);
  door.userData.type = "door";
  clickableObjects.push(door);

  var handleMaterial = new THREE.MeshStandardMaterial({
    color: 0x9cc7ef,
    metalness: 0.62,
    roughness: 0.2,
    emissive: 0x75b6f7,
    emissiveIntensity: 0.14,
  });

  addBox(doorPivot, [0.1, 2.2, 0.08], [2.34, 0, 0.08], handleMaterial);

  var engravingTextures = createFridgeEngravingTextures();
  var namePlate = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.82),
    new THREE.MeshPhysicalMaterial({
      map: engravingTextures.colorTexture,
      bumpMap: engravingTextures.bumpTexture,
      bumpScale: 0.085,
      roughness: 0.18,
      metalness: 0.52,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      side: THREE.FrontSide,
    }),
  );
  namePlate.position.set(-0.14, 0.18, 0.0615);
  namePlate.renderOrder = 3;
  namePlate.frustumCulled = false;
  door.add(namePlate);

  var introHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 4.85, 2.65),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
  );
  introHitbox.position.set(0, 0.08, 0.1);
  introHitbox.userData.type = "door";
  fridgeGroup.add(introHitbox);
  clickableObjects.push(introHitbox);

  var drawerGroup = new THREE.Group();
  fridgeGroup.add(drawerGroup);

  drawerLayouts = drawerMessages.map(function (message, index) {
    return {
      id: message.id,
      accent: message.accent,
      y: 1.52 - index * 0.56,
    };
  });

  drawerLayouts.forEach(function (layout) {
    var group = new THREE.Group();
    group.position.set(0, layout.y, -0.04);
    group.visible = true;
    group.scale.set(0.98, 0.98, 0.98);

    addBox(
      group,
      [2.02, 0.39, 1.54],
      [0, 0, 0],
      new THREE.MeshStandardMaterial({
        color: 0xe8f4ff,
        roughness: 0.18,
        metalness: 0.62,
      }),
    );

    var face = addBox(
      group,
      [2.1, 0.43, 0.1],
      [0, 0, 0.83],
      new THREE.MeshStandardMaterial({
        color: layout.accent === "red" ? 0xff5b86 : 0xffffff,
        roughness: 0.08,
        metalness: 0.5,
        emissive: layout.accent === "red" ? 0x34111d : 0x19334f,
        emissiveIntensity: 0.42,
      }),
    );
    face.userData.type = "drawer";
    face.userData.drawerId = layout.id;
    clickableObjects.push(face);

    addBox(
      group,
      [0.62, 0.06, 0.08],
      [0, 0, 0.93],
      new THREE.MeshStandardMaterial({
        color: 0xb8d7ff,
        emissive: 0xaeefff,
        emissiveIntensity: 0.4,
        metalness: 0.42,
        roughness: 0.1,
      }),
    );

    var tapZone = new THREE.Mesh(
      new THREE.BoxGeometry(2.18, 0.5, 0.8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
    );
    tapZone.position.set(0, 0, 1.02);
    tapZone.userData.type = "drawer";
    tapZone.userData.drawerId = layout.id;
    group.add(tapZone);
    clickableObjects.push(tapZone);

    drawerGroup.add(group);
    drawerMap.set(layout.id, group);
  });
}

function buildFrost() {
  frostPositions = new Float32Array(frostParticleCount * 3);
  frostGeometry = new THREE.BufferGeometry();
  frostGeometry.setAttribute("position", new THREE.BufferAttribute(frostPositions, 3));

  var frostPoints = new THREE.Points(
    frostGeometry,
    new THREE.PointsMaterial({
      color: 0xdff6ff,
      size: 0.11,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(frostPoints);

  frostVelocities = Array.from({ length: frostParticleCount }, function () {
    return new THREE.Vector3();
  });
  frostAges = new Float32Array(frostParticleCount);
}

function buildHearts() {
  var texture = createHeartTexture();
  var group = new THREE.Group();
  scene.add(group);

  heartParticles = Array.from({ length: 48 }, function () {
    var material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    var sprite = new THREE.Sprite(material);
    sprite.visible = false;
    group.add(sprite);

    return {
      sprite: sprite,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 99,
      life: 0,
      scale: 0.2,
      rotation: 0,
      color: new THREE.Color(),
    };
  });
}

function bindEvents() {
  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  restartButton.addEventListener("click", resetExperience);
  finalAcceptButton.addEventListener("click", resetExperience);
  finalYesButton.addEventListener("click", resetExperience);
  closeMessageButton.addEventListener("click", closeMessageCard);
  messageOverlay.addEventListener("click", function (event) {
    if (event.target === messageOverlay || event.target.classList.contains("message-backdrop")) {
      closeMessageCard();
    }
  });
}

function addBox(parent, size, position, material) {
  var mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  parent.add(mesh);
  return mesh;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = getCameraFov(state.stage === "finale" ? "finale" : state.sequenceStarted ? "open" : "idle");
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (backgroundSnowMaterial) {
    backgroundSnowMaterial.size = getBackgroundSnowSize();
  }
  applyResponsiveCamera(state.stage === "finale" ? "finale" : state.sequenceStarted ? "open" : "idle");
}

function isMobileViewport() {
  return window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
}

function getCameraFov(stage) {
  var mobile = isMobileViewport();
  if (stage === "open") {
    return mobile ? 58 : 44;
  }

  if (stage === "finale") {
    return mobile ? 44 : 38;
  }

  return mobile ? 44 : 38;
}

function getCameraPreset(stage) {
  var mobile = isMobileViewport();

  if (stage === "finale") {
    return mobile
      ? { x: 0, y: 1.46, z: 5.45 }
      : { x: 0, y: 1.55, z: 4.25 };
  }

  if (stage === "open") {
    return mobile
      ? { x: 0, y: 0.98, z: 9.8 }
      : { x: 0.08, y: 1.04, z: 7.4 };
  }

  return mobile
    ? { x: 0, y: 1.16, z: 10.05 }
    : { x: 0, y: 1.32, z: 8.95 };
}

function applyResponsiveCamera(stage) {
  var preset = getCameraPreset(stage);
  camera.position.set(preset.x, preset.y, preset.z);
  camera.fov = getCameraFov(stage);
  camera.updateProjectionMatrix();
}

function getCameraLookTarget(stage) {
  if (stage === "open") {
    return { x: 0, y: 0.1, z: 0.78 };
  }

  if (stage === "finale") {
    return { x: 0, y: 0.72, z: 0.68 };
  }

  return { x: 0, y: 0.55, z: 0.72 };
}

function createHeartTexture() {
  var canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  var context = canvas.getContext("2d");

  context.clearRect(0, 0, 128, 128);
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(64, 112);
  context.bezierCurveTo(20, 82, 10, 46, 32, 28);
  context.bezierCurveTo(48, 14, 62, 24, 64, 36);
  context.bezierCurveTo(66, 24, 80, 14, 96, 28);
  context.bezierCurveTo(118, 46, 108, 82, 64, 112);
  context.closePath();
  context.fill();

  return new THREE.CanvasTexture(canvas);
}

function createFridgeEngravingTextures() {
  var colorCanvas = document.createElement("canvas");
  colorCanvas.width = 2048;
  colorCanvas.height = 1280;
  var bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 2048;
  bumpCanvas.height = 1280;

  var colorTexture = new THREE.CanvasTexture(colorCanvas);
  var bumpTexture = new THREE.CanvasTexture(bumpCanvas);

  [colorTexture, bumpTexture].forEach(function (texture) {
    texture.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  });

  renderFridgeEngravingTextures(colorTexture, bumpTexture);

  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 210px "Alexandria"').then(function () {
      renderFridgeEngravingTextures(colorTexture, bumpTexture);
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      renderFridgeEngravingTextures(colorTexture, bumpTexture);
    });
  }

  return {
    colorTexture: colorTexture,
    bumpTexture: bumpTexture,
  };
}

function renderFridgeEngravingTextures(colorTexture, bumpTexture) {
  var canvas = colorTexture.image;
  var context = canvas.getContext("2d");
  var bumpContext = bumpTexture.image.getContext("2d");
  var quoteLines = [
    "اسمكِ ليس مجرد اسم... بل معنى.",
    'فـ"منتهى" هي الغاية، وأقصى ما يُرجى الوصول إليه.',
    "ولذلك، حين أناديكِ باسمك،",
    "أشعر أنني أنادي غايتي، ومنتهاي،",
    "وآخر أحلامي.",
    "كأن القدر اختار لكِ اسمًا",
    "يختصر ما أصبحتِ عليه في حياتي؛",
    "فأنتِ بدايتي الجميلة...",
    "ومنتهاي الذي لا أريد بعده شيئًا.  \u2764",
  ];

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.direction = "rtl";
  context.lineJoin = "round";
  context.lineCap = "round";

  bumpContext.clearRect(0, 0, canvas.width, canvas.height);
  bumpContext.fillStyle = "#8a8a8a";
  bumpContext.fillRect(0, 0, canvas.width, canvas.height);
  bumpContext.textBaseline = "middle";
  bumpContext.textAlign = "center";
  bumpContext.direction = "rtl";
  bumpContext.lineJoin = "round";
  bumpContext.lineCap = "round";

  context.fillStyle = "#edf6ff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = '700 182px "Segoe UI Symbol", "Noto Sans Symbols 2", "Cairo", sans-serif';
  bumpContext.font = context.font;

  context.shadowColor = "rgba(255, 255, 255, 0.5)";
  context.shadowBlur = 0;
  context.shadowOffsetX = -3;
  context.shadowOffsetY = -3;
  context.fillStyle = "#f7fbff";
  context.fillText("♡", 860, 220);

  context.shadowColor = "rgba(144, 152, 164, 0.26)";
  context.shadowOffsetX = 3;
  context.shadowOffsetY = 3;
  context.fillStyle = "#c7d2dc";
  context.fillText("♡", 856, 216);

  bumpContext.fillStyle = "#545454";
  bumpContext.fillText("♡", 858, 218);

  context.font = '800 220px "Alexandria", "Noto Kufi Arabic", "Cairo", sans-serif';
  bumpContext.font = context.font;

  context.shadowColor = "rgba(255, 255, 255, 0.55)";
  context.shadowBlur = 0;
  context.shadowOffsetX = -4;
  context.shadowOffsetY = -4;
  context.fillStyle = "#f8fcff";
  context.fillText("منتهى", 1138, 252);

  context.shadowColor = "rgba(144, 152, 164, 0.28)";
  context.shadowOffsetX = 4;
  context.shadowOffsetY = 4;
  context.fillStyle = "#c9d4de";
  context.fillText("منتهى", 1134, 248);

  bumpContext.fillStyle = "#525252";
  bumpContext.fillText("منتهى", 1136, 250);

  context.font = '700 72px "Cairo", "Alexandria", sans-serif';
  bumpContext.font = context.font;

  context.shadowColor = "rgba(255, 255, 255, 0.42)";
  context.shadowBlur = 0;
  context.shadowOffsetX = -2;
  context.shadowOffsetY = -2;
  context.fillStyle = "#f6fbff";

  quoteLines.forEach(function (line, index) {
    context.fillText(line, 1024, 470 + index * 88);
  });

  context.shadowColor = "rgba(146, 154, 168, 0.24)";
  context.shadowOffsetX = 3;
  context.shadowOffsetY = 3;
  context.fillStyle = "#ccd6df";
  quoteLines.forEach(function (line, index) {
    context.fillText(line, 1020, 466 + index * 88);
  });

  bumpContext.fillStyle = "#575757";
  quoteLines.forEach(function (line, index) {
    bumpContext.fillText(line, 1022, 468 + index * 88);
  });

  colorTexture.needsUpdate = true;
  bumpTexture.needsUpdate = true;
}

function buildHeartRain() {
  var fragments = [];
  for (var index = 0; index < 24; index += 1) {
    var left = (index * 4.1) % 100 + "%";
    var delay = (index % 8) * 0.42 + "s";
    var duration = 5 + (index % 5) * 0.75 + "s";
    var scale = (0.72 + (index % 4) * 0.12).toFixed(2);
    fragments.push(
      '<span style="left:' + left + ";animation-delay:" + delay + ";animation-duration:" + duration + ";transform:scale(" + scale + ')">❤</span>',
    );
  }
  heartRain.innerHTML = fragments.join("");
}

function updateStatus() {
  var openedCount = state.openedDrawerIds.size;

  if (state.stage === "idle") {
    statusText.textContent = "جاهز للبداية";
    progressText.textContent = "اضغط على الثلاجة من منتصف الشاشة.";
    return;
  }

  if (state.stage === "zooming") {
    statusText.textContent = "الكاميرا بتقرب";
    progressText.textContent = "الباب هيفتح بعد ثوانٍ قليلة.";
    return;
  }

  if (state.stage === "doorOpening") {
    statusText.textContent = "الباب بيتفتح";
    progressText.textContent = "الصقيع والقلوب بدأوا يظهروا.";
    return;
  }

  if (state.stage === "drawersReady") {
    statusText.textContent = "الأدراج جاهزة";
    progressText.textContent = "تم فتح " + openedCount + " من " + drawerMessages.length + " أدراج.";
    return;
  }

  if (state.stage === "drawerOpen") {
    statusText.textContent = "رسالة ظهرت";
    progressText.textContent = "تم فتح " + openedCount + " من " + drawerMessages.length + " أدراج.";
    return;
  }

  statusText.textContent = "النهاية الرومانسية";
  progressText.textContent = "كل الأدراج اتفتحت والقلوب نازلة من فوق.";
}

function onPointerDown(event) {
  var rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  var intersects = raycaster.intersectObjects(clickableObjects, false);
  if (!intersects.length) {
    return;
  }

  var target = intersects[0].object;
  if (!state.sequenceStarted && target.userData.type === "door") {
    startSequence();
    return;
  }

  if ((state.stage === "drawersReady" || state.stage === "drawerOpen") && target.userData.type === "drawer") {
    openDrawer(target.userData.drawerId);
  }
}

function startSequence() {
  if (state.sequenceStarted) {
    return;
  }

  state.sequenceStarted = true;
  state.stage = "zooming";
  updateStatus();

  gsap
    .timeline()
    .to(camera.position, {
      x: getCameraPreset("open").x,
      y: getCameraPreset("open").y,
      z: getCameraPreset("open").z,
      duration: 1.35,
      ease: "power2.inOut",
    })
    .call(function () {
      state.stage = "doorOpening";
      updateStatus();
    })
    .to(
      doorPivot.rotation,
      {
        y: -1.82,
        duration: 1.7,
        ease: "power3.inOut",
      },
      "-=0.15",
    )
    .call(triggerFrost)
    .call(
      function () {
        spawnHeartBurst(new THREE.Vector3(0, 0.75, 1.25), 24);
      },
      null,
      ">-0.3",
    )
    .call(
      function () {
        revealDrawers();
        state.stage = "drawersReady";
        updateStatus();
      },
      null,
      ">-0.15",
    );
}

function triggerFrost() {
  for (var index = 0; index < frostParticleCount; index += 1) {
    var stride = index * 3;
    frostPositions[stride] = (Math.random() - 0.5) * 0.45;
    frostPositions[stride + 1] = -0.15 + Math.random() * 2.35;
    frostPositions[stride + 2] = 1.05 + Math.random() * 0.1;
    frostVelocities[index].set(
      (Math.random() - 0.5) * 0.02,
      0.012 + Math.random() * 0.022,
      0.016 + Math.random() * 0.022,
    );
    frostAges[index] = 0;
  }

  frostGeometry.attributes.position.needsUpdate = true;
}

function revealDrawers() {
  drawersUnlocked = true;
  drawerMap.forEach(function (group, id) {
    gsap.to(group.position, {
      y: drawerLayouts.find(function (item) {
        return item.id === id;
      }).y,
      z: 0.28,
      duration: 0.55,
      ease: "back.out(1.4)",
      delay: id * 0.06,
    });
    gsap.to(group.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.45,
      delay: id * 0.06,
      ease: "power2.out",
    });
  });
}

function openDrawer(id) {
  var group = drawerMap.get(id);
  var message = drawerMessages.find(function (item) {
    return item.id === id;
  });

  if (!group || !message) {
    return;
  }

  if (state.activeDrawerId === id && !messageOverlay.classList.contains("is-visible")) {
    closeDrawer(id);
    return;
  }

  state.activeDrawerId = id;
  state.openedDrawerIds.add(id);
  state.stage = "drawerOpen";
  updateStatus();

  drawerMap.forEach(function (drawerGroupItem, drawerId) {
    gsap.to(drawerGroupItem.position, {
      z: drawerId === id ? 1.16 : state.openedDrawerIds.has(drawerId) ? 0.38 : 0.28,
      duration: 0.42,
      ease: "power2.out",
    });
  });

  spawnHeartBurst(
    new THREE.Vector3(
      0,
      drawerLayouts.find(function (item) {
        return item.id === id;
      }).y,
      1.18,
    ),
    12,
  );
  openMessageCard(message);
}

function closeDrawer(id) {
  state.activeDrawerId = null;
  state.stage = "drawersReady";
  updateStatus();

  drawerMap.forEach(function (drawerGroupItem, drawerId) {
    gsap.to(drawerGroupItem.position, {
      z: state.openedDrawerIds.has(drawerId) ? 0.38 : 0.28,
      duration: 0.34,
      ease: "power2.out",
    });
  });
}

function openMessageCard(message) {
  messageBody.textContent = message.text;
  messageOverlay.classList.add("is-visible");
  messageOverlay.setAttribute("aria-hidden", "false");
}

function closeMessageCard() {
  messageOverlay.classList.remove("is-visible");
  messageOverlay.setAttribute("aria-hidden", "true");

  if (state.openedDrawerIds.size === drawerMessages.length && !state.finaleShown) {
    triggerFinale();
    return;
  }

  state.stage = "drawersReady";
  updateStatus();
}

function triggerFinale() {
  state.finaleShown = true;
  state.stage = "finale";
  updateStatus();

  gsap.to(fridgeLight, {
    intensity: 3.15,
    duration: 0.7,
    ease: "power2.out",
  });

  gsap.to(camera.position, {
    x: getCameraPreset("finale").x,
    y: getCameraPreset("finale").y,
    z: getCameraPreset("finale").z,
    duration: 1.1,
    ease: "power2.inOut",
  });

  spawnHeartBurst(new THREE.Vector3(0, 0.6, 1.4), 30);
  finaleOverlay.classList.add("is-visible");
  finaleOverlay.setAttribute("aria-hidden", "false");
}

function spawnHeartBurst(center, count) {
  var palette = ["#ff0040", "#ff6699", "#ffffff"];
  var available = heartParticles.filter(function (particle) {
    return particle.age > particle.life;
  });

  for (var index = 0; index < Math.min(count, available.length); index += 1) {
    var particle = available[index];
    particle.position.copy(center);
    particle.velocity.set(
      (Math.random() - 0.5) * 0.032,
      0.028 + Math.random() * 0.038,
      (Math.random() - 0.2) * 0.02,
    );
    particle.age = 0;
    particle.life = 2.3 + Math.random() * 0.8;
    particle.scale = 0.18 + Math.random() * 0.18;
    particle.rotation = Math.random() * Math.PI * 2;
    particle.color.set(palette[index % palette.length]);
    particle.sprite.position.copy(center);
    particle.sprite.scale.setScalar(particle.scale);
    particle.sprite.material.opacity = 1;
    particle.sprite.material.color.copy(particle.color);
    particle.sprite.visible = true;
  }
}

function resetExperience() {
  window.location.reload();
}

function animate() {
  requestAnimationFrame(animate);

  var delta = Math.min(clock.getDelta(), 0.033);
  var elapsed = clock.elapsedTime;

  fridgeGroup.position.y = 0.08 + Math.sin(elapsed * 1.15) * (state.sequenceStarted ? 0.018 : 0.05);
  floorGlow.material.opacity = 0.13 + Math.sin(elapsed * 1.5) * 0.03;
  fridgeLight.intensity = THREE.MathUtils.lerp(
    fridgeLight.intensity,
    state.stage === "finale" ? 3.15 : state.sequenceStarted ? 2.1 : 0.35,
    1 - Math.exp(-delta * 2.2),
  );

  if (drawersUnlocked) {
    drawerMap.forEach(function (group, id) {
      var pulse = 1 + Math.sin(elapsed * 2.2 + id * 0.35) * 0.006;
      if (state.activeDrawerId !== id) {
        group.scale.set(pulse, pulse, pulse);
      }
    });
  }

  for (var snowIndex = 0; snowIndex < backgroundSnowParticleCount; snowIndex += 1) {
    var snowStride = snowIndex * 3;
    backgroundSnowPositions[snowStride] +=
      (backgroundSnowVelocities[snowIndex].drift +
        Math.sin(elapsed * 1.5 + backgroundSnowVelocities[snowIndex].phase) *
          backgroundSnowVelocities[snowIndex].sway) *
      delta *
      60;
    backgroundSnowPositions[snowStride + 1] -= backgroundSnowVelocities[snowIndex].fall * delta * 60;

    if (backgroundSnowPositions[snowStride] < -8.4) {
      backgroundSnowPositions[snowStride] = 8.4;
    }

    if (backgroundSnowPositions[snowStride] > 8.4) {
      backgroundSnowPositions[snowStride] = -8.4;
    }

    if (backgroundSnowPositions[snowStride + 1] < -4.1) {
      resetBackgroundSnowParticle(snowIndex, false);
    }
  }
  backgroundSnowGeometry.attributes.position.needsUpdate = true;

  for (var i = 0; i < frostParticleCount; i += 1) {
    var stride = i * 3;
    frostAges[i] += delta;
    frostPositions[stride] += frostVelocities[i].x;
    frostPositions[stride + 1] += frostVelocities[i].y;
    frostPositions[stride + 2] += frostVelocities[i].z;
    frostVelocities[i].multiplyScalar(0.992);

    if (frostAges[i] > 2.4) {
      frostPositions[stride + 1] = -30;
    }
  }
  frostGeometry.attributes.position.needsUpdate = true;

  heartParticles.forEach(function (particle) {
    if (particle.age > particle.life) {
      particle.sprite.visible = false;
      return;
    }

    particle.age += delta;
    particle.position.addScaledVector(particle.velocity, delta * 60);
    particle.velocity.multiplyScalar(0.986);
    particle.velocity.x += Math.sin(particle.age * 2.4) * 0.0004;
    particle.rotation += delta * 1.8;

    var alpha = THREE.MathUtils.clamp(1 - particle.age / particle.life, 0, 1);
    particle.sprite.position.copy(particle.position);
    particle.sprite.scale.setScalar(particle.scale * (1 + particle.age * 0.25));
    particle.sprite.material.opacity = alpha;
    particle.sprite.material.rotation = particle.rotation;
    particle.sprite.material.color.copy(particle.color);
  });

  var lookTarget = getCameraLookTarget(state.stage === "finale" ? "finale" : state.sequenceStarted ? "open" : "idle");
  camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
  renderer.render(scene, camera);
}
