import * as THREE from 'three';

// ─── Scale constant: mm → meters ───
const S = 1 / 1000;

// ─── Material palette ───
const MAT = {
  body: () =>
    new THREE.MeshStandardMaterial({
      color: 0xe8dcc8,
      roughness: 0.7,
      metalness: 0.02,
    }),
  panel: () =>
    new THREE.MeshStandardMaterial({
      color: 0xddd0ba,
      roughness: 0.55,
      metalness: 0.02,
    }),
  panelDark: () =>
    new THREE.MeshStandardMaterial({
      color: 0xc4b89c,
      roughness: 0.55,
      metalness: 0.02,
    }),
  handle: () =>
    new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.15,
      metalness: 0.85,
    }),
  gap: () =>
    new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
      metalness: 0.0,
    }),
  ovenInterior: () =>
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.1,
    }),
  ovenGlass: () =>
    new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    }),
  sinkBowl: () =>
    new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.2,
      metalness: 0.7,
    }),
  upper: () =>
    new THREE.MeshStandardMaterial({
      color: 0xd5c9b3,
      roughness: 0.6,
      metalness: 0.02,
    }),
  upperPanel: () =>
    new THREE.MeshStandardMaterial({
      color: 0xcabeaa,
      roughness: 0.5,
      metalness: 0.02,
    }),
};

// ─── Reusable geometry helpers ───

function addMesh(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

/** Horizontal bar handle */
function addHHandle(
  group: THREE.Group,
  y: number,
  _wM: number,
  dM: number,
  handleW: number = 0.06,
) {
  const hMat = MAT.handle();
  addMesh(
    group,
    new THREE.BoxGeometry(handleW, 0.006, 0.012),
    hMat,
    0, y, dM / 2 + 0.007,
  );
}

/** Vertical bar handle on left or right side */
function addVHandle(
  group: THREE.Group,
  x: number,
  y: number,
  dM: number,
  handleH: number = 0.08,
) {
  const hMat = MAT.handle();
  addMesh(
    group,
    new THREE.BoxGeometry(0.006, handleH, 0.012),
    hMat,
    x, y, dM / 2 + 0.007,
  );
}

/** Door panel (inset from front face) */
function addDoorPanel(
  group: THREE.Group,
  px: number,
  py: number,
  pW: number,
  pH: number,
  dM: number,
  mat?: THREE.Material,
) {
  const panelMat = mat ?? MAT.panel();
  const inset = 0.002;
  addMesh(
    group,
    new THREE.BoxGeometry(pW, pH, 0.016),
    panelMat,
    px, py, dM / 2 - inset,
  );
}

/** Horizontal gap line between sections */
function addGapLine(
  group: THREE.Group,
  y: number,
  lineW: number,
  dM: number,
) {
  const gapMat = MAT.gap();
  addMesh(
    group,
    new THREE.PlaneGeometry(lineW, 0.002),
    gapMat,
    0, y, dM / 2 + 0.0005,
  );
}

/** Vertical gap line (center split for double doors) */
function addVertGapLine(
  group: THREE.Group,
  x: number,
  lineH: number,
  y: number,
  dM: number,
) {
  const gapMat = MAT.gap();
  addMesh(
    group,
    new THREE.PlaneGeometry(0.002, lineH),
    gapMat,
    x, y, dM / 2 + 0.0005,
  );
}

// ─── Cabinet body (common to all subtypes) ───

function buildBody(wM: number, hM: number, dM: number, mat?: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = mat ?? MAT.body();

  // Main body box (slightly inset for visual depth)
  addMesh(
    group,
    new THREE.BoxGeometry(wM - 0.004, hM - 0.004, dM - 0.002),
    bodyMat,
    0, 0, 0,
  );

  return group;
}

// ─── Subtype-specific builders ───

function buildStandard(wM: number, hM: number, dM: number): THREE.Group {
  const group = buildBody(wM, hM, dM);
  const panelInset = 0.012;
  const panelH = hM - 2 * panelInset;

  if (wM > 0.65 * S * 1000) {
    // Double door
    const halfW = (wM - 3 * panelInset) / 2;
    addDoorPanel(group, -(halfW / 2 + panelInset / 2), 0, halfW, panelH, dM);
    addDoorPanel(group, halfW / 2 + panelInset / 2, 0, halfW, panelH, dM);
    addVertGapLine(group, 0, panelH + 0.004, 0, dM);
    addVHandle(group, -0.012, 0, dM);
    addVHandle(group, 0.012, 0, dM);
  } else {
    // Single door
    const panelW = wM - 2 * panelInset;
    addDoorPanel(group, 0, 0, panelW, panelH, dM);
    addVHandle(group, wM * 0.3, 0, dM);
  }

  return group;
}

function buildDrawer(wM: number, hM: number, dM: number): THREE.Group {
  const group = buildBody(wM, hM, dM);
  const panelInset = 0.012;
  const panelW = wM - 2 * panelInset;

  // 4 drawers
  const drawerCount = 4;
  const gapH = 0.003;
  const totalGaps = (drawerCount - 1) * gapH;
  const drawerH = (hM - 2 * panelInset - totalGaps) / drawerCount;

  for (let i = 0; i < drawerCount; i++) {
    const y = hM / 2 - panelInset - drawerH / 2 - i * (drawerH + gapH);
    addDoorPanel(group, 0, y, panelW, drawerH - 0.002, dM);
    addHHandle(group, y, wM, dM, Math.min(wM * 0.35, 0.08));

    if (i < drawerCount - 1) {
      addGapLine(group, y - drawerH / 2 - gapH / 2, panelW + 0.004, dM);
    }
  }

  return group;
}

function buildCombo(wM: number, hM: number, dM: number): THREE.Group {
  const group = buildBody(wM, hM, dM);
  const panelInset = 0.012;
  const panelW = wM - 2 * panelInset;
  const gapH = 0.003;

  // Top drawer (30% of height)
  const drawerH = hM * 0.28 - panelInset;
  const drawerY = hM / 2 - panelInset - drawerH / 2;
  addDoorPanel(group, 0, drawerY, panelW, drawerH, dM);
  addHHandle(group, drawerY, wM, dM, Math.min(wM * 0.35, 0.08));

  // Gap line
  const gapY = drawerY - drawerH / 2 - gapH / 2;
  addGapLine(group, gapY, panelW + 0.004, dM);

  // Bottom door section (double or single based on width)
  const doorH = hM - drawerH - 2 * panelInset - gapH;
  const doorY = -hM / 2 + panelInset + doorH / 2;

  if (wM > 0.50) {
    // Double door below
    const halfW = (panelW - panelInset) / 2;
    addDoorPanel(group, -(halfW / 2 + panelInset / 4), doorY, halfW, doorH - 0.002, dM);
    addDoorPanel(group, halfW / 2 + panelInset / 4, doorY, halfW, doorH - 0.002, dM);
    addVertGapLine(group, 0, doorH, doorY, dM);
    addVHandle(group, -0.012, doorY, dM);
    addVHandle(group, 0.012, doorY, dM);
  } else {
    addDoorPanel(group, 0, doorY, panelW, doorH - 0.002, dM);
    addVHandle(group, wM * 0.3, doorY, dM);
  }

  return group;
}

function buildSink(wM: number, hM: number, dM: number): THREE.Group {
  const group = buildBody(wM, hM, dM);
  const panelInset = 0.012;
  const panelH = hM - 2 * panelInset;

  // Always double door for sink cabinet
  const halfW = (wM - 3 * panelInset) / 2;
  const panelMat = MAT.panel();
  addDoorPanel(group, -(halfW / 2 + panelInset / 2), 0, halfW, panelH, dM, panelMat);
  addDoorPanel(group, halfW / 2 + panelInset / 2, 0, halfW, panelH, dM, panelMat);
  addVertGapLine(group, 0, panelH + 0.004, 0, dM);

  // Knob handles (round) for sink
  const hMat = MAT.handle();
  const knobGeo = new THREE.SphereGeometry(0.008, 8, 8);
  addMesh(group, knobGeo, hMat, -0.015, 0, dM / 2 + 0.01);
  addMesh(group, knobGeo.clone(), hMat.clone(), 0.015, 0, dM / 2 + 0.01);

  return group;
}

function buildOven(wM: number, hM: number, dM: number): THREE.Group {
  const group = buildBody(wM, hM, dM);
  const panelInset = 0.012;
  const panelW = wM - 2 * panelInset;
  const gapH = 0.003;

  // Top narrow drawer (15% height)
  const topH = hM * 0.14;
  const topY = hM / 2 - panelInset - topH / 2;
  addDoorPanel(group, 0, topY, panelW, topH, dM);
  addHHandle(group, topY, wM, dM, Math.min(wM * 0.4, 0.1));

  // Gap
  addGapLine(group, topY - topH / 2 - gapH / 2, panelW + 0.004, dM);

  // Oven opening (60% height) — dark recessed area with glass front
  const ovenH = hM * 0.55;
  const ovenY = topY - topH / 2 - gapH - ovenH / 2;
  const ovenW = panelW - 0.01;

  // Dark interior recess
  addMesh(
    group,
    new THREE.BoxGeometry(ovenW, ovenH, dM * 0.3),
    MAT.ovenInterior(),
    0, ovenY, dM * 0.15,
  );

  // Glass door overlay
  addMesh(
    group,
    new THREE.BoxGeometry(ovenW, ovenH, 0.004),
    MAT.ovenGlass(),
    0, ovenY, dM / 2 - 0.001,
  );

  // Oven handle at top of glass
  addHHandle(group, ovenY + ovenH / 2 - 0.015, wM, dM, Math.min(wM * 0.5, 0.14));

  // Gap below oven
  addGapLine(group, ovenY - ovenH / 2 - gapH / 2, panelW + 0.004, dM);

  // Bottom drawer (remaining height)
  const botH = hM - topH - ovenH - 2 * panelInset - 3 * gapH;
  const botY = -hM / 2 + panelInset + botH / 2;
  addDoorPanel(group, 0, botY, panelW, Math.max(botH, 0.02), dM);
  addHHandle(group, botY, wM, dM, Math.min(wM * 0.35, 0.08));

  return group;
}

function buildFiller(wM: number, hM: number, dM: number): THREE.Group {
  const group = buildBody(wM, hM, dM, MAT.panelDark());
  // Filler is just a narrow strip, no handles or doors
  return group;
}

function buildCorner(wM: number, hM: number, dM: number): THREE.Group {
  // Corner modules are L-shaped; we approximate with the standard box
  // since the actual corner geometry depends on wall context
  const group = buildBody(wM, hM, dM);
  const panelInset = 0.012;
  const panelH = hM - 2 * panelInset;

  // Single door panel on front face
  const panelW = Math.min(wM - 2 * panelInset, 0.45);
  addDoorPanel(group, 0, 0, panelW, panelH, dM, MAT.panelDark());
  addVHandle(group, panelW * 0.35, 0, dM);

  return group;
}

function buildUpper(wM: number, hM: number, dM: number): THREE.Group {
  const group = buildBody(wM, hM, dM, MAT.upper());
  const panelInset = 0.010;
  const panelH = hM - 2 * panelInset;
  const panelMat = MAT.upperPanel();

  if (wM > 0.55) {
    // Double door upper
    const halfW = (wM - 3 * panelInset) / 2;
    addDoorPanel(group, -(halfW / 2 + panelInset / 2), 0, halfW, panelH, dM, panelMat);
    addDoorPanel(group, halfW / 2 + panelInset / 2, 0, halfW, panelH, dM, panelMat);
    addVertGapLine(group, 0, panelH + 0.004, 0, dM);
    // Horizontal handles at bottom
    addHHandle(group, -hM / 2 + panelInset + 0.025, wM, dM, Math.min(halfW * 0.5, 0.06));
  } else {
    // Single door upper
    const panelW = wM - 2 * panelInset;
    addDoorPanel(group, 0, 0, panelW, panelH, dM, panelMat);
    addHHandle(group, -hM / 2 + panelInset + 0.025, wM, dM, Math.min(panelW * 0.5, 0.06));
  }

  return group;
}

// ─── Main export ───

/**
 * Build a procedural 3D cabinet model based on module dimensions and subtype.
 * Returns a THREE.Group centered at origin (0,0,0) — caller must position it.
 *
 * All dimensions in mm, internally converted to meters.
 */
export function buildCabinet(
  widthMm: number,
  heightMm: number,
  depthMm: number,
  subtype: string,
): THREE.Group {
  const wM = widthMm * S;
  const hM = heightMm * S;
  const dM = depthMm * S;

  let cabinet: THREE.Group;

  switch (subtype) {
    case 'drawer':
      cabinet = buildDrawer(wM, hM, dM);
      break;
    case 'combo':
      cabinet = buildCombo(wM, hM, dM);
      break;
    case 'sink':
      cabinet = buildSink(wM, hM, dM);
      break;
    case 'oven':
    case 'with_oven':
    case 'with_oven_microwave':
      cabinet = buildOven(wM, hM, dM);
      break;
    case 'filler':
      cabinet = buildFiller(wM, hM, dM);
      break;
    case 'corner':
      cabinet = buildCorner(wM, hM, dM);
      break;
    case 'upper':
      cabinet = buildUpper(wM, hM, dM);
      break;
    default:
      cabinet = buildStandard(wM, hM, dM);
      break;
  }

  return cabinet;
}
