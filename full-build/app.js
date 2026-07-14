import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  constructionData,
  getPart,
  getJoint,
  getStage,
} from './construction-data.js';
import {
  distance2D,
  roofZ,
  postTop,
  rightBoundaryAtY,
  roofPlan,
  computeRafterSegments,
  computeBattenSegments,
  pointAlong,
} from './geometry.js';

const canvas = document.querySelector('#modelCanvas');
const viewport = document.querySelector('#viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xedf0ec);
scene.fog = new THREE.Fog(0xedf0ec, 9000, 15000);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const camera = new THREE.PerspectiveCamera(39, 1, 5, 30000);
camera.up.set(0, 0, 1);
const INITIAL_CAMERA = new THREE.Vector3(5750, -6500, 4400);
const INITIAL_TARGET = new THREE.Vector3(1450, 1450, 1450);
camera.position.copy(INITIAL_CAMERA);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(INITIAL_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 600;
controls.maxDistance = 13500;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

scene.add(new THREE.HemisphereLight(0xfffbf1, 0x65716d, 2.2));
const sun = new THREE.DirectionalLight(0xfff3df, 3.1);
sun.position.set(-3200, -4300, 7600);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -6000;
sun.shadow.camera.right = 6000;
sun.shadow.camera.top = 6000;
sun.shadow.camera.bottom = -6000;
sun.shadow.camera.near = 500;
sun.shadow.camera.far = 15000;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(15000, 15000),
  new THREE.MeshStandardMaterial({ color: 0xdde3dd, roughness: 0.95 }),
);
ground.receiveShadow = true;
ground.position.set(1500, 1500, -8);
ground.userData.raycastIgnore = true;
scene.add(ground);

const grid = new THREE.GridHelper(7200, 18, 0x9ea9a3, 0xc3cbc5);
grid.rotation.x = Math.PI / 2;
grid.position.set(1500, 1500, 1);
grid.material.transparent = true;
grid.material.opacity = 0.35;
grid.userData.raycastIgnore = true;
scene.add(grid);

function makeWoodTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext('2d');
  ctx.fillStyle = '#c2844f';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 48; i += 1) {
    const y = (i * 41) % 256;
    ctx.strokeStyle = i % 3 ? 'rgba(100,55,28,.11)' : 'rgba(255,230,190,.12)';
    ctx.lineWidth = 1 + (i % 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(65, y - 5, 170, y + 7, 256, y - 2);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const woodTexture = makeWoodTexture();
const materials = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x7c8581, roughness: 0.96 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x181b1a, roughness: 0.88 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xc08049, map: woodTexture, roughness: 0.72 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0xa96739, map: woodTexture, roughness: 0.76 }),
  woodLight: new THREE.MeshStandardMaterial({ color: 0xd5a06e, map: woodTexture, roughness: 0.7 }),
  temp: new THREE.MeshStandardMaterial({ color: 0xdfb06f, roughness: 0.72, transparent: true, opacity: 0.78 }),
  floor: new THREE.MeshStandardMaterial({ color: 0xc9915d, map: woodTexture, roughness: 0.68 }),
  fastener: new THREE.MeshStandardMaterial({ color: 0x4f5c64, roughness: 0.34, metalness: 0.76 }),
  connector: new THREE.MeshStandardMaterial({ color: 0x8c999e, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide }),
  drill: new THREE.MeshBasicMaterial({ color: 0xd85c42, transparent: true, opacity: 0.42, depthWrite: false }),
  roof: new THREE.MeshStandardMaterial({ color: 0x285e72, roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide }),
  roofTrim: new THREE.MeshStandardMaterial({ color: 0x1f4f60, roughness: 0.42, metalness: 0.46 }),
  fence: new THREE.MeshStandardMaterial({ color: 0x536661, roughness: 0.66, metalness: 0.24, transparent: true, opacity: 0.32 }),
};

const layerGroups = new Map();
const layerMeta = new Map();
constructionData.layers.forEach((layer) => {
  const group = new THREE.Group();
  group.name = layer.id;
  group.userData.layerIndex = layer.index;
  group.userData.basePosition = new THREE.Vector3();
  scene.add(group);
  layerGroups.set(layer.id, group);
  layerMeta.set(layer.id, layer);
});

const selectableMeshes = [];
const partMeshMap = new Map();
const jointMeshMap = new Map();
const foundationMeshes = [];
const postMeshes = [];
const upperFrameMeshes = [];
const permanentBraceMeshes = [];
const wallBackingMeshes = [];
const wallCladdingMeshes = [];
const rafterMeshes = [];
const battenMeshes = [];
let roofMesh = null;

const pointVector = (id, z = 0) => {
  const [x, y] = constructionData.points[id];
  return new THREE.Vector3(x, y, z);
};

function registerMesh(layerId, mesh, info = {}) {
  mesh.castShadow = info.castShadow !== false;
  mesh.receiveShadow = info.receiveShadow !== false;
  mesh.userData = {
    ...mesh.userData,
    selectable: info.selectable !== false,
    id: info.id || mesh.name || 'ELEMENT',
    layerId,
    displayName: info.name || mesh.name || 'Элемент',
    section: info.section || '—',
    length: Number.isFinite(info.length) ? info.length : null,
    guideAnchor: info.guideAnchor || null,
    jointId: info.jointId || null,
    hiddenOnStages: info.hiddenOnStages || [],
  };
  layerGroups.get(layerId).add(mesh);
  if (mesh.userData.selectable) selectableMeshes.push(mesh);
  if (mesh.userData.id) {
    const existing = partMeshMap.get(mesh.userData.id);
    if (existing) {
      const list = Array.isArray(existing) ? existing : [existing];
      list.push(mesh);
      partMeshMap.set(mesh.userData.id, list);
    } else {
      partMeshMap.set(mesh.userData.id, mesh);
    }
  }
  if (mesh.userData.jointId) jointMeshMap.set(mesh.userData.jointId, mesh);
  return mesh;
}

function boxElement(layerId, id, name, size, position, material, info = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.name = name;
  mesh.position.copy(position);
  if (info.rotationZ) mesh.rotation.z = info.rotationZ;
  return registerMesh(layerId, mesh, { id, name, ...info });
}

function beamBetween(layerId, id, name, start, end, width, height, material, info = {}) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, width, height), material);
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.clone().normalize());
  return registerMesh(layerId, mesh, {
    id,
    name,
    section: info.section || `${width}×${height} мм`,
    length,
    ...info,
  });
}

function buildJointVisual(joint) {
  const primary = joint.fasteners[0];
  const axis = new THREE.Vector3(...joint.axis).normalize();
  const visualCount = Math.min(primary.quantity, 4);
  const tangentA = Math.abs(axis.z) > 0.8 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const tangentB = new THREE.Vector3().crossVectors(axis, tangentA).normalize();
  const center = new THREE.Vector3(...joint.position);

  for (let index = 0; index < visualCount; index += 1) {
    const row = Math.floor(index / 2) - (visualCount > 2 ? 0.5 : 0);
    const column = (index % 2) - 0.5;
    const offset = tangentA.clone().multiplyScalar(column * 34).add(tangentB.clone().multiplyScalar(row * 34));
    const fastener = new THREE.Mesh(
      new THREE.CylinderGeometry(primary.diameterMm * 0.52, primary.diameterMm * 0.52, primary.lengthMm, 14),
      materials.fastener,
    );
    fastener.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    fastener.position.copy(center).add(offset);
    registerMesh('15_fasteners', fastener, {
      id: `${joint.id}-FASTENER-${index + 1}`,
      name: `${joint.name}, крепёж ${index + 1}`,
      section: `Ø${primary.diameterMm}×${primary.lengthMm} мм`,
      length: primary.lengthMm,
      jointId: joint.id,
      guideAnchor: joint.guideAnchor,
    });

    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(primary.diameterMm, primary.diameterMm, Math.max(4, primary.diameterMm * 0.55), 16),
      materials.fastener,
    );
    head.quaternion.copy(fastener.quaternion);
    head.position.copy(center).add(offset).add(axis.clone().multiplyScalar(primary.lengthMm / 2));
    registerMesh('15_fasteners', head, {
      id: `${joint.id}-HEAD-${index + 1}`,
      name: `${joint.name}, головка крепежа ${index + 1}`,
      section: `Ø${primary.diameterMm} мм`,
      length: Math.max(4, primary.diameterMm * 0.55),
      jointId: joint.id,
      guideAnchor: joint.guideAnchor,
    });
    if (index === 0) jointMeshMap.set(joint.id, fastener);
  }

  const drillAxis = new THREE.Mesh(
    new THREE.CylinderGeometry(
      joint.drilling.bitDiameterMm * 0.7,
      joint.drilling.bitDiameterMm * 0.7,
      joint.drilling.depthMm + 50,
      12,
      1,
      true,
    ),
    materials.drill,
  );
  drillAxis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  drillAxis.position.copy(center);
  registerMesh('14_drill_axes', drillAxis, {
    id: `${joint.id}-DRILL-AXIS`,
    name: `${joint.name}, ось сверления`,
    section: `сверло Ø${joint.drilling.bitDiameterMm} мм`,
    length: joint.drilling.depthMm,
    jointId: joint.id,
    guideAnchor: joint.guideAnchor,
  });
}

function guideAnchorToHref(anchor) {
  return `../Руководство_по_строительству_угловой_беседки.docx#${encodeURIComponent(anchor)}`;
}

function buildFoundation() {
  const positions = [
    ['A', 0, 0, 0], ['B', 3000, 0, 0], ['C', 3000, 2000, Math.PI / 2],
    ['D', 2000, 3000, 0], ['E', 0, 3000, 0], ['AB', 1500, 0, 0],
    ['AE', 0, 1500, Math.PI / 2], ['F', 1500, 3000, 0],
    ['P1', 1500, 1000, Math.PI / 2], ['P2', 1500, 2150, Math.PI / 2],
  ];

  positions.forEach(([id, x, y, rotationZ]) => {
    const block = boxElement(
      '01_foundation', `BLOCK-${id}`, `Фундаментный блок ${id}`,
      new THREE.Vector3(400, 200, 200), new THREE.Vector3(x, y, 100), materials.concrete,
      { section: '200×200×400 мм', length: 400, rotationZ, guideAnchor: `part-BLOCK-${id}` },
    );
    foundationMeshes.push(block);
    for (let layer = 0; layer < 2; layer += 1) {
      boxElement(
        '02_waterproofing', `RUBBER-${id}-${layer + 1}`, `Гидроизоляция ${id}, слой ${layer + 1}`,
        new THREE.Vector3(410, 210, 5), new THREE.Vector3(x, y, 202.5 + layer * 6), materials.rubber,
        { section: '5 мм', length: 410, rotationZ },
      );
    }
  });
}

function buildFloorFrame() {
  const perimeter = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']];
  perimeter.forEach(([a, b]) => beamBetween(
    '03_lower_frame', `LOWER-${a}${b}`, `Нижняя обвязка ${a}–${b}`,
    pointVector(a, 275), pointVector(b, 275), 150, 150, materials.wood,
    { section: '150×150 мм', guideAnchor: `part-LOWER-${a}${b}` },
  ));

  [1475, 1525].forEach((x, index) => beamBetween(
    '04_central_beam', `CENTRAL-${index + 1}`, `Центральный прогон, доска ${index + 1}`,
    new THREE.Vector3(x, 0, 275), new THREE.Vector3(x, 3000, 275), 50, 150, materials.woodDark,
    { section: '50×150 мм', guideAnchor: 'part-CENTRAL-BEAM' },
  ));

  [350, 750, 1150, 1550, 1950, 2350, 2750].forEach((y, index) => {
    const x1 = 75;
    const x2 = rightBoundaryAtY(y) - 75;
    beamBetween(
      '05_floor_joists', `JOIST-${index + 1}`, `Лага пола ${index + 1}`,
      new THREE.Vector3(x1, y, 425), new THREE.Vector3(x2, y, 425), 50, 150, materials.wood,
      { section: '50×150 мм', guideAnchor: 'part-FLOOR-JOISTS' },
    );
  });

  const partialShape = new THREE.Shape();
  partialShape.moveTo(0, 0);
  partialShape.lineTo(1800, 0);
  partialShape.lineTo(1800, 3000);
  partialShape.lineTo(0, 3000);
  partialShape.closePath();
  const partialDeck = new THREE.Mesh(
    new THREE.ExtrudeGeometry(partialShape, { depth: 40, bevelEnabled: false }),
    materials.floor,
  );
  partialDeck.position.z = 500;
  registerMesh('06_floor_deck', partialDeck, {
    id: 'DECK-PARTIAL', name: 'Рабочая полоса настила', section: '40 мм', length: 3000, guideAnchor: 'part-DECK',
  });

  const remainderShape = new THREE.Shape();
  remainderShape.moveTo(1800, 0);
  remainderShape.lineTo(3000, 0);
  remainderShape.lineTo(3000, 2000);
  remainderShape.lineTo(2000, 3000);
  remainderShape.lineTo(1800, 3000);
  remainderShape.closePath();
  const remainderDeck = new THREE.Mesh(
    new THREE.ExtrudeGeometry(remainderShape, { depth: 40, bevelEnabled: false }),
    materials.floor,
  );
  remainderDeck.position.z = 500;
  registerMesh('06_floor_deck', remainderDeck, {
    id: 'DECK-REMAINDER', name: 'Оставшаяся часть настила', section: '40 мм', length: 3000,
    guideAnchor: 'part-DECK', hiddenOnStages: ['05'],
  });
  const seamMaterial = new THREE.LineBasicMaterial({ color: 0x81502e, transparent: true, opacity: 0.48 });
  for (let x = 120; x < 3000; x += constructionData.floor.boardVisualStep) {
    const maxY = x <= 2000 ? 3000 : 5000 - x;
    const seam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 8, 542), new THREE.Vector3(x, maxY - 8, 542)]),
      seamMaterial,
    );
    seam.userData.raycastIgnore = true;
    seam.userData.hiddenOnStages = x >= 1800 ? ['05'] : [];
    layerGroups.get('06_floor_deck').add(seam);
  }
}

function buildPosts() {
  Object.keys(constructionData.points).forEach((id) => {
    const [x, y] = constructionData.points[id];
    const top = postTop(id);
    const height = top - 350;
    const part = getPart(`POST-${id}`);
    const post = boxElement(
      '07_posts', `POST-${id}`, `Стойка ${id}`,
      new THREE.Vector3(100, 100, height), new THREE.Vector3(x, y, 350 + height / 2), materials.wood,
      { section: '100×100 мм', length: height, guideAnchor: part?.guideAnchor },
    );
    post.userData.bottomZ = 350;
    postMeshes.push(post);
  });

  const tempDefinitions = [
    ['A', [720, 360, 560]], ['B', [2300, 360, 560]],
    ['D', [1650, 2450, 560]], ['E', [360, 2300, 560]],
  ];
  tempDefinitions.forEach(([id, end], index) => {
    const [x, y] = constructionData.points[id];
    beamBetween(
      '08_temp_braces', `TEMP-${index + 1}`, `Временная укосина ${id}`,
      new THREE.Vector3(x, y, 1250), new THREE.Vector3(...end), 35, 75, materials.temp,
      { section: '35×75 мм', guideAnchor: 'stage-06' },
    );
  });

  constructionData.joints.filter(({ id }) => id.startsWith('J-POST-')).forEach((joint) => {
    const [x, y, z] = joint.position;
    const plateA = boxElement(
      '09_post_joints', `PLATE-${joint.id}-A`, `${joint.name}, уголок 1`,
      new THREE.Vector3(110, 6, 90), new THREE.Vector3(x, y - 53, z), materials.connector,
      { section: 'усиленный оцинкованный уголок', length: 110, jointId: joint.id, guideAnchor: joint.guideAnchor },
    );
    jointMeshMap.set(joint.id, plateA);
    boxElement(
      '09_post_joints', `PLATE-${joint.id}-B`, `${joint.name}, уголок 2`,
      new THREE.Vector3(6, 110, 90), new THREE.Vector3(x - 53, y, z), materials.connector,
      { section: 'усиленный оцинкованный уголок', length: 110, jointId: joint.id, guideAnchor: joint.guideAnchor },
    );
  });
}

function buildUpperFrame() {
  constructionData.members.upperFrame.forEach(([a, b]) => {
    const startPoint = constructionData.points[a];
    const endPoint = constructionData.points[b];
    const part = getPart(`UPPER-${a}${b}`);
    const beam = beamBetween(
      '10_upper_frame', `UPPER-${a}${b}`, `Верхняя обвязка ${a}–${b}`,
      new THREE.Vector3(startPoint[0], startPoint[1], postTop(a)),
      new THREE.Vector3(endPoint[0], endPoint[1], postTop(b)),
      100, 100, materials.woodDark,
      { section: '100×100 мм', guideAnchor: part?.guideAnchor },
    );
    upperFrameMeshes.push(beam);
  });
}

function addPermanentBrace(id, a, b, fromA = true) {
  const aPoint = constructionData.points[a];
  const bPoint = constructionData.points[b];
  const lowCorner = fromA ? aPoint : bPoint;
  const highT = fromA ? 0.34 : 0.66;
  const highPlan = pointAlong(aPoint, bPoint, highT, 0);
  const highZ = roofZ(highPlan[0], highPlan[1]) - 210;
  const low = new THREE.Vector3(lowCorner[0], lowCorner[1], 690);
  const high = new THREE.Vector3(highPlan[0], highPlan[1], highZ);
  const brace = beamBetween(
    '11_permanent_braces', id, `Постоянная укосина ${a}–${b}`,
    low, high, 50, 100, materials.wood,
    { section: '50×100 мм', guideAnchor: 'joint-J-BRACE-TYP' },
  );
  permanentBraceMeshes.push(brace);
}

function addWallBackingStuds(layout) {
  const a = constructionData.points[layout.a];
  const b = constructionData.points[layout.b];
  layout.positions.forEach((t, index) => {
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const bottomZ = constructionData.walls.bottomZ;
    const topZ = roofZ(x, y) - 100;
    const stud = beamBetween(
      layout.layerId,
      `WALL-BACKING-${layout.wallId}-${index + 1}`,
      `Промежуточная стойка обшивки ${layout.wallId}-${index + 1}`,
      new THREE.Vector3(x, y, bottomZ),
      new THREE.Vector3(x, y, topZ),
      50,
      50,
      materials.woodDark,
      { section: '50×50 мм', guideAnchor: 'part-WALL-BACKING-SET' },
    );
    wallBackingMeshes.push(stud);
  });
}

function addHorizontalBoards(name, wallId, aId, bId, options, layerId) {
  const a = constructionData.points[aId];
  const b = constructionData.points[bId];
  const wallLength = distance2D(a, b);
  const insetT = 60 / wallLength;
  const wallBottom = constructionData.walls.bottomZ;
  const roofClearance = constructionData.walls.roofClearance;
  const roofAtA = roofZ(a[0], a[1]) - roofClearance;
  const roofAtB = roofZ(b[0], b[1]) - roofClearance;
  const highestTop = options.followRoof ? Math.max(roofAtA, roofAtB) : options.maxZ;
  let row = 0;

  for (let bottom = wallBottom; bottom + options.boardHeight <= highestTop; bottom += options.boardHeight + options.gap) {
    const centerZ = bottom + options.boardHeight / 2;
    const boardTop = bottom + options.boardHeight;
    let startT = insetT;
    let endT = 1 - insetT;

    if (options.followRoof) {
      const roofDelta = roofAtB - roofAtA;
      if (Math.abs(roofDelta) < 1e-6 && boardTop > roofAtA) continue;
      if (roofDelta > 0 && boardTop > roofAtA) startT = Math.max(startT, (boardTop - roofAtA) / roofDelta);
      if (roofDelta < 0 && boardTop > roofAtB) endT = Math.min(endT, 1 - (boardTop - roofAtB) / -roofDelta);
    }
    if (startT >= endT) continue;

    row += 1;
    const start = pointAlong(a, b, startT, centerZ);
    const end = pointAlong(a, b, endT, centerZ);
    const board = beamBetween(
      layerId, `${wallId}-SLAT-${String(row).padStart(2, '0')}`, `${name}, рейка ${row}`,
      new THREE.Vector3(...start), new THREE.Vector3(...end),
      options.boardDepth, options.boardHeight, materials.woodLight,
      { section: `${options.boardDepth}×${options.boardHeight} мм`, guideAnchor: `part-${wallId}` },
    );
    board.userData.wallId = wallId;
    board.userData.horizontalSlat = true;
    board.userData.gap = options.gap;
    wallCladdingMeshes.push(board);
  }
}

function buildWallCladding() {
  addPermanentBrace('BRACE-AB-L', 'A', 'B', true);
  addPermanentBrace('BRACE-AB-R', 'A', 'B', false);
  addPermanentBrace('BRACE-AE-L', 'A', 'E', true);
  addPermanentBrace('BRACE-AE-R', 'A', 'E', false);
  addPermanentBrace('BRACE-BC', 'B', 'C', true);
  addPermanentBrace('BRACE-DE', 'D', 'E', true);

  constructionData.members.wallBacking.forEach(addWallBackingStuds);

  addHorizontalBoards('Сплошная стена A–B', 'WALL-SOLID-AB', 'A', 'B', {
    ...constructionData.walls.solid, followRoof: true,
  }, '12_solid_cladding');
  addHorizontalBoards('Сплошная стена A–E', 'WALL-SOLID-AE', 'A', 'E', {
    ...constructionData.walls.solid, followRoof: true,
  }, '12_solid_cladding');
  addHorizontalBoards('Решётчатая стена B–C', 'WALL-LATTICE-BC', 'B', 'C', {
    ...constructionData.walls.lattice, followRoof: false,
  }, '13_lattice_cladding');
  addHorizontalBoards('Решётчатая стена D–E', 'WALL-LATTICE-DE', 'D', 'E', {
    ...constructionData.walls.lattice, followRoof: false,
  }, '13_lattice_cladding');
}

function buildRoofFrame() {
  computeRafterSegments().forEach((segment) => {
    const mesh = beamBetween(
      '16_rafters', segment.id, `Стропило ${segment.id.split('-')[1]}`,
      new THREE.Vector3(...segment.start), new THREE.Vector3(...segment.end),
      50, 150, materials.woodDark,
      { section: '50×150 мм', length: segment.lengthMm, guideAnchor: 'part-RAFTER-SET' },
    );
    rafterMeshes.push(mesh);
  });

  computeBattenSegments().forEach((segment) => {
    const mesh = beamBetween(
      '17_battens', segment.id, `Обрешётка ${segment.id.split('-')[1]}`,
      new THREE.Vector3(...segment.start), new THREE.Vector3(...segment.end),
      50, 50, materials.wood,
      { section: '50×50 мм', length: segment.lengthMm, guideAnchor: 'part-BATTEN-SET' },
    );
    battenMeshes.push(mesh);
  });
}

function roofPrismGeometry(plan, thickness) {
  const vertices = [];
  plan.forEach(([x, y]) => vertices.push(x, y, roofZ(x, y) + 200));
  plan.forEach(([x, y]) => vertices.push(x, y, roofZ(x, y) + 200 + thickness));
  const indices = [];
  for (let i = 1; i < plan.length - 1; i += 1) indices.push(0, i + 1, i);
  for (let i = 1; i < plan.length - 1; i += 1) indices.push(plan.length, plan.length + i, plan.length + i + 1);
  for (let i = 0; i < plan.length; i += 1) {
    const next = (i + 1) % plan.length;
    indices.push(i, next, plan.length + next, i, plan.length + next, plan.length + i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildRoofSheet() {
  roofMesh = new THREE.Mesh(roofPrismGeometry(roofPlan(), constructionData.roof.thickness), materials.roof);
  roofMesh.name = 'Кровельный профнастил';
  registerMesh('18_roof_sheet', roofMesh, {
    id: 'ROOF-SHEET', name: 'Кровельный профнастил', section: 'по паспорту выбранного профиля',
    length: 3900, guideAnchor: 'part-ROOF-SHEET',
  });

  const waveMaterial = new THREE.LineBasicMaterial({ color: 0x173d4b, transparent: true, opacity: 0.58 });
  const diagonal = 1 / Math.sqrt(2);
  const polygon = roofPlan();
  for (let offset = -3120; offset <= 3120; offset += 120) {
    const point = [offset / 2, -offset / 2];
    const direction = [diagonal, diagonal];
    const hits = [];
    polygon.forEach((a, index) => {
      const b = polygon[(index + 1) % polygon.length];
      const edge = [b[0] - a[0], b[1] - a[1]];
      const delta = [a[0] - point[0], a[1] - point[1]];
      const denominator = direction[0] * edge[1] - direction[1] * edge[0];
      if (Math.abs(denominator) < 1e-9) return;
      const t = (delta[0] * edge[1] - delta[1] * edge[0]) / denominator;
      const u = (delta[0] * direction[1] - delta[1] * direction[0]) / denominator;
      if (u >= -1e-6 && u <= 1 + 1e-6) hits.push({ t, p: [point[0] + t * direction[0], point[1] + t * direction[1]] });
    });
    const unique = [...new Map(hits.map((hit) => [hit.t.toFixed(5), hit])).values()].sort((a, b) => a.t - b.t);
    if (unique.length < 2) continue;
    const start = unique[0].p;
    const end = unique.at(-1).p;
    const wave = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(start[0], start[1], roofZ(...start) + 214),
        new THREE.Vector3(end[0], end[1], roofZ(...end) + 214),
      ]),
      waveMaterial,
    );
    wave.userData.raycastIgnore = true;
    layerGroups.get('18_roof_sheet').add(wave);
  }

  const outline = roofPlan();
  outline.forEach((start, index) => {
    const end = outline[(index + 1) % outline.length];
    beamBetween(
      '19_roof_trim', `ROOF-TRIM-${index + 1}`, `Торцевая планка кровли ${index + 1}`,
      new THREE.Vector3(start[0], start[1], roofZ(...start) + 228),
      new THREE.Vector3(end[0], end[1], roofZ(...end) + 228),
      28, 42, materials.roofTrim,
      { section: 'доборный элемент', guideAnchor: 'stage-17' },
    );
  });
}

function makeLabel(text, position, options = {}) {
  const labelCanvas = document.createElement('canvas');
  const ctx = labelCanvas.getContext('2d');
  const fontSize = options.fontSize || 36;
  ctx.font = `700 ${fontSize}px Segoe UI, Arial`;
  const paddingX = 20;
  const paddingY = 12;
  labelCanvas.width = Math.ceil(ctx.measureText(text).width + paddingX * 2);
  labelCanvas.height = fontSize + paddingY * 2;
  ctx.font = `700 ${fontSize}px Segoe UI, Arial`;
  ctx.fillStyle = options.background || 'rgba(255,255,255,.92)';
  ctx.beginPath();
  ctx.roundRect(0, 0, labelCanvas.width, labelCanvas.height, 12);
  ctx.fill();
  ctx.fillStyle = options.color || '#24312d';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, paddingX, labelCanvas.height / 2);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.position.copy(position);
  const scale = options.scale || 1;
  sprite.scale.set(labelCanvas.width * scale, labelCanvas.height * scale, 1);
  sprite.userData.raycastIgnore = true;
  layerGroups.get('20_dimensions').add(sprite);
  return sprite;
}

function buildDimensions() {
  const offsets = { A: [-160, -160], B: [170, -150], C: [170, 70], D: [70, 160], E: [-150, 160] };
  Object.entries(constructionData.points).forEach(([id, [x, y]]) => {
    const [dx, dy] = offsets[id];
    makeLabel(id, new THREE.Vector3(x + dx, y + dy, 620), { scale: 1.15 });
  });
  makeLabel('Открытый вход C–D · 1414 мм', new THREE.Vector3(2700, 2700, 930), { scale: 0.72, color: '#a33f34' });
  makeLabel('Требуется расчёт нагрузок и анкеровки', new THREE.Vector3(1500, 1500, 3700), {
    scale: 0.72, color: '#a33f34', background: 'rgba(255,242,239,.95)',
  });
}

function buildContext() {
  boxElement(
    '21_context', 'CONTEXT-REAR', 'Заднее ограждение участка',
    new THREE.Vector3(3500, 24, 2300), new THREE.Vector3(1500, -480, 1150), materials.fence,
    { selectable: false },
  );
  boxElement(
    '21_context', 'CONTEXT-SIDE', 'Боковое ограждение участка',
    new THREE.Vector3(24, 3500, 2300), new THREE.Vector3(-480, 1500, 1150), materials.fence,
    { selectable: false },
  );
}

buildFoundation();
buildFloorFrame();
buildPosts();
buildUpperFrame();
buildWallCladding();
buildRoofFrame();
buildRoofSheet();
constructionData.joints.forEach(buildJointVisual);
buildDimensions();
buildContext();

const layerList = document.querySelector('#layerList');
const layerCheckboxes = new Map();

constructionData.layers.forEach((layer) => {
  const row = document.createElement('label');
  row.className = 'layer-row';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.dataset.layerId = layer.id;
  const swatch = document.createElement('span');
  swatch.className = 'layer-swatch';
  swatch.style.backgroundColor = layer.color;
  const text = document.createElement('span');
  text.textContent = layer.label;
  row.append(checkbox, swatch, text);
  layerList.append(row);
  layerCheckboxes.set(layer.id, checkbox);
  checkbox.addEventListener('change', () => setLayerVisible(layer.id, checkbox.checked));
});

const stageSelect = document.querySelector('#stageSelect');
constructionData.stages.forEach((stage) => {
  const option = document.createElement('option');
  option.value = stage.id;
  option.textContent = `${stage.id} · ${stage.label}`;
  stageSelect.append(option);
});

function setLayerVisible(id, visible) {
  const group = layerGroups.get(id);
  if (group) group.visible = visible;
  const checkbox = layerCheckboxes.get(id);
  if (checkbox) checkbox.checked = visible;
}

function applyStage(idOrIndex) {
  const stage = typeof idOrIndex === 'number'
    ? constructionData.stages[Math.max(0, Math.min(constructionData.stages.length - 1, idOrIndex))]
    : getStage(String(idOrIndex).padStart(2, '0'));
  if (!stage) return;
  const visible = new Set(stage.layerIds);
  constructionData.layers.forEach((layer) => setLayerVisible(layer.id, visible.has(layer.id)));
  applyStageSpecificVisibility(stage.id);
  stageSelect.value = stage.id;
  document.querySelector('#stageCounter').textContent = `${stage.id} / 18`;
  document.querySelector('#modelStatus').textContent = stage.label;
}

function applyStageSpecificVisibility(stageId) {
  layerGroups.forEach((group) => {
    group.traverse((object) => {
      if (object === group) return;
      const hiddenOnStages = object.userData.hiddenOnStages || [];
      object.visible = !hiddenOnStages.includes(stageId);
    });
  });
}

stageSelect.addEventListener('change', () => applyStage(stageSelect.value));
document.querySelector('#prevStage').addEventListener('click', () => {
  const index = constructionData.stages.findIndex(({ id }) => id === stageSelect.value);
  applyStage(index - 1);
});
document.querySelector('#nextStage').addEventListener('click', () => {
  const index = constructionData.stages.findIndex(({ id }) => id === stageSelect.value);
  applyStage(index + 1);
});
document.querySelector('#showAllLayers').addEventListener('click', () => constructionData.layers.forEach(({ id }) => setLayerVisible(id, true)));
document.querySelector('#hideAllLayers').addEventListener('click', () => constructionData.layers.forEach(({ id }) => setLayerVisible(id, false)));

const explodeRange = document.querySelector('#explodeRange');
explodeRange.addEventListener('input', () => {
  const value = Number(explodeRange.value);
  document.querySelector('#explodeValue').textContent = `${value}%`;
  constructionData.layers.forEach((layer) => {
    const group = layerGroups.get(layer.id);
    const factor = value / 100;
    const radial = new THREE.Vector3(
      ((layer.index % 3) - 1) * 62,
      (((layer.index + 1) % 3) - 1) * 52,
      layer.index * 42,
    ).multiplyScalar(factor);
    group.position.copy(group.userData.basePosition).add(radial);
  });
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selected = null;
let selectionHelper = null;
let pointerDown = null;

function updateSelectionPanel() {
  const empty = document.querySelector('#selectionEmpty');
  const data = document.querySelector('#selectionData');
  const focusButton = document.querySelector('#focusSelected');
  if (!selected) {
    empty.hidden = false;
    data.hidden = true;
    focusButton.disabled = true;
    return;
  }
  empty.hidden = true;
  data.hidden = false;
  focusButton.disabled = false;
  const meta = selected.userData;
  document.querySelector('#selectionId').textContent = meta.id || '—';
  document.querySelector('#selectionName').textContent = meta.displayName || '—';
  document.querySelector('#selectionLayer').textContent = layerMeta.get(meta.layerId)?.label || '—';
  document.querySelector('#selectionSection').textContent = meta.section || '—';
  document.querySelector('#selectionLength').textContent = meta.length ? `${Math.round(meta.length)} мм` : '—';
  renderJointPanel(meta.jointId ? getJoint(meta.jointId) : null);
}

function renderJointPanel(joint) {
  const empty = document.querySelector('#jointEmpty');
  const data = document.querySelector('#jointData');
  if (!joint) {
    empty.hidden = false;
    data.hidden = true;
    return;
  }
  empty.hidden = true;
  data.hidden = false;
  const fastener = joint.fasteners[0];
  document.querySelector('#jointName').textContent = `${joint.id} · ${joint.name}`;
  document.querySelector('#jointFastener').textContent = `${fastener.system}. ${fastener.type}, ${fastener.diameterMm}×${fastener.lengthMm} мм; привод ${fastener.drive}; ${fastener.corrosionClass}`;
  document.querySelector('#jointQuantity').textContent = `${fastener.quantity} шт.`;
  document.querySelector('#jointBit').textContent = `Ø${joint.drilling.bitDiameterMm} мм; предварительное сверление: ${joint.drilling.pilotRequired ? 'да' : 'нет'}`;
  document.querySelector('#jointDepth').textContent = `${joint.drilling.depthMm} мм`;
  document.querySelector('#jointEdges').textContent = `от торца ${joint.edgeDistances.endMm} мм; от кромки ${joint.edgeDistances.sideMm} мм`;
  document.querySelector('#jointWarning').textContent = [joint.warning, fastener.installNote, joint.drilling.note].filter(Boolean).join(' ');
  const verification = document.querySelector('#jointVerification');
  verification.className = `verification-badge verification-${joint.verification}`;
  verification.textContent = joint.verification === 'manufacturer-verified' ? 'Проверено по паспорту' : 'Требуется проверка инженера';
  document.querySelector('#guideLink').href = guideAnchorToHref(joint.guideAnchor);
}

function clearSelection() {
  selected = null;
  if (selectionHelper) {
    scene.remove(selectionHelper);
    selectionHelper.geometry.dispose();
    selectionHelper.material.dispose();
    selectionHelper = null;
  }
  updateSelectionPanel();
}

function selectMesh(mesh) {
  clearSelection();
  selected = mesh;
  selectionHelper = new THREE.BoxHelper(mesh, 0xd85c42);
  selectionHelper.material.depthTest = false;
  selectionHelper.renderOrder = 20;
  scene.add(selectionHelper);
  updateSelectionPanel();
}

function selectById(id) {
  const target = partMeshMap.get(id) || jointMeshMap.get(id);
  const mesh = Array.isArray(target) ? target[0] : target;
  if (!mesh) return false;
  selectMesh(mesh);
  return true;
}

function pointerToNdc(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});
renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) return;
  pointerToNdc(event);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(selectableMeshes, false)
    .filter(({ object }) => object.visible && object.parent?.visible && !object.userData.raycastIgnore);
  if (hits.length) selectMesh(hits[0].object);
  else clearSelection();
});

function fitObject(object, padding = 1.4) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const direction = camera.position.clone().sub(controls.target).normalize();
  const distance = Math.max(420, (sphere.radius * padding) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)));
  controls.target.copy(sphere.center);
  camera.position.copy(sphere.center).add(direction.multiplyScalar(distance));
  controls.update();
}

document.querySelector('#focusSelected').addEventListener('click', () => selected && fitObject(selected, 1.8));
document.querySelector('#fitModel').addEventListener('click', () => fitObject(scene, 1.08));
document.querySelector('#resetView').addEventListener('click', () => {
  camera.position.copy(INITIAL_CAMERA);
  controls.target.copy(INITIAL_TARGET);
  controls.update();
});

const views = {
  iso: { position: INITIAL_CAMERA, target: INITIAL_TARGET },
  top: { position: new THREE.Vector3(1500, 1500, 8500), target: new THREE.Vector3(1500, 1500, 1100) },
  front: { position: new THREE.Vector3(6200, -6000, 2300), target: new THREE.Vector3(1550, 1550, 1500) },
  joint: { position: new THREE.Vector3(2200, -2300, 1600), target: new THREE.Vector3(0, 0, 500) },
};

document.querySelectorAll('.view-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.view-button').forEach((item) => item.classList.toggle('active', item === button));
    const view = views[button.dataset.view];
    if (button.dataset.view === 'joint' && selected) {
      fitObject(selected, 2.2);
      return;
    }
    camera.position.copy(view.position);
    controls.target.copy(view.target);
    controls.update();
  });
});

function toggleDrillAxes(visible) {
  const button = document.querySelector('#drillToggle');
  button.setAttribute('aria-pressed', String(visible));
  setLayerVisible('14_drill_axes', visible);
}

document.querySelector('#drillToggle').addEventListener('click', (event) => {
  toggleDrillAxes(event.currentTarget.getAttribute('aria-pressed') !== 'true');
});

function runChecks() {
  const entranceLength = distance2D(constructionData.points.C, constructionData.points.D);
  const solidWalls = wallCladdingMeshes.filter(({ userData }) => userData.wallId?.startsWith('WALL-SOLID'));
  const latticeWalls = wallCladdingMeshes.filter(({ userData }) => userData.wallId?.startsWith('WALL-LATTICE'));
  const results = [
    { id: 'CHK-POINTS', label: 'Точки A–E совпадают с планом', passed: Object.keys(constructionData.points).join('') === 'ABCDE' },
    { id: 'CHK-BLOCKS', label: 'Фундаментных блоков 10', passed: foundationMeshes.length === 10 },
    { id: 'CHK-ENTRANCE', label: 'Вход C–D открыт и около 1414 мм', passed: Math.abs(entranceLength - Math.sqrt(2_000_000)) < 1 },
    { id: 'CHK-POSTS', label: 'Установлено пять стоек', passed: postMeshes.length === 5 },
    { id: 'CHK-POST-BEARING', label: 'Стойки начинаются на верхней отметке обвязки', passed: postMeshes.every(({ userData }) => userData.bottomZ === 350) },
    { id: 'CHK-UPPER', label: 'Верхняя обвязка содержит пять участков', passed: upperFrameMeshes.length === 5 },
    { id: 'CHK-HORIZONTAL-SLATS', label: 'Все рейки стен горизонтальны', passed: wallCladdingMeshes.length > 0 && wallCladdingMeshes.every(({ userData }) => userData.horizontalSlat) },
    { id: 'CHK-SOLID', label: 'Стены A–B и A–E сплошные', passed: solidWalls.length > 0 && solidWalls.every(({ userData }) => userData.gap === 0) },
    { id: 'CHK-LATTICE', label: 'Решётчатые стены имеют зазор 55 мм', passed: latticeWalls.length === 14 && latticeWalls.every(({ userData }) => userData.gap === 55) },
    { id: 'CHK-BRACES', label: 'Постоянные укосины присутствуют', passed: permanentBraceMeshes.length === 6 },
    { id: 'CHK-WALL-BACKING', label: 'Промежуточных опор горизонтальной обшивки 14', passed: wallBackingMeshes.length === 14 },
    { id: 'CHK-RAFTERS', label: 'Количество стропил совпадает с каталогом', passed: rafterMeshes.length === constructionData.members.rafters.offsets.length },
    { id: 'CHK-BATTENS', label: 'Количество рядов обрешётки совпадает с каталогом', passed: battenMeshes.length === constructionData.members.battens.sums.length },
    { id: 'CHK-ROOF', label: 'Кровельный слой построен', passed: Boolean(roofMesh) },
    { id: 'CHK-JOINTS', label: 'Все силовые узлы имеют карточки проверки', passed: constructionData.joints.filter(({ structural }) => structural).every(({ fasteners, verification }) => fasteners.length && verification) },
  ];
  const passed = results.filter(({ passed: ok }) => ok).length;
  document.querySelector('#checkBadge').textContent = `${passed}/${results.length}`;
  console.group('Проверки полной модели беседки');
  results.forEach(({ label, passed: ok }, index) => console.log(`${ok ? '✓' : '✗'} ${index + 1}. ${label}`));
  console.groupEnd();
  return results;
}

applyStage('18');
toggleDrillAxes(false);
const checks = runChecks();

window.gazeboModel = {
  data: constructionData,
  stages: constructionData.stages,
  checks,
  selectById,
  applyStage,
  setLayerVisible,
  layerGroups,
};

function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(viewport);
resize();

function animate() {
  controls.update();
  if (selectionHelper) selectionHelper.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

requestAnimationFrame(() => {
  document.querySelector('#loadingState').classList.add('hidden');
  if (window.lucide) window.lucide.createIcons();
});
