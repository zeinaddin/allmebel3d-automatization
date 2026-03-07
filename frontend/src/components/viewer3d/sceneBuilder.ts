import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildCabinet } from './proceduralModels';
import {
  createWoodFloorTexture,
  createPlasterWallTexture,
  createSubwayTileTexture,
  createGraniteTexture,
  createEnvTexture,
  type EnvResult,
} from './textureFactory';

// ─── Physical dimensions (mm) ───
const LOWER_H = 820;
const LOWER_D = 470;
const UPPER_H = 720;
const UPPER_D = 291;
const UPPER_Y = 1400;
const COUNTERTOP_H = 26;
const PLINTH_H = 80;
const S = 1 / 1000; // mm → meters

// ─── Scene colors (non-cabinet elements) ───
const COLORS = {
  plinth: 0x333333,
  baseboard: 0xeae7e2, // Warm white molding
  wallEdge: 0xccc7c0,  // Visible wall-edge tint
};

export interface PlacedMod {
  id: string;
  width: number;
  x: number;
  subtype: string;
  /** Module code from catalog, e.g. "С 300", "СЯШ 600" */
  code?: string;
  /** Module name from catalog */
  name?: string;
  /** Pre-built URL to the GLB asset on the backend (via getAssetUrl) */
  glbUrl?: string;
}

export interface SceneConfig {
  wallMm: number;
  lowerMods: PlacedMod[];
  upperMods: PlacedMod[];
  isL: boolean;
  wallBMm: number;
  cornerW: number;
  lowerModsB: PlacedMod[];
  upperModsB: PlacedMod[];
  cornerCode?: string;
  cornerGlbUrl?: string;
}

// ─── GLB Loading ───

const glbLoader = new GLTFLoader();
const glbCache = new Map<string, Promise<THREE.Group>>();

/**
 * Load a GLB model from a backend URL. Results are cached by URL
 * so duplicate modules only fetch once.
 */
function loadGLB(url: string): Promise<THREE.Group> {
  let cached = glbCache.get(url);
  if (!cached) {
    cached = new Promise<THREE.Group>((resolve, reject) => {
      glbLoader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        reject,
      );
    });
    glbCache.set(url, cached);
  }
  // Always clone so each placement gets its own instance
  return cached.then((g) => g.clone());
}

/**
 * Scale a loaded GLB model to target dimensions and position it.
 * The model is scaled to fit exactly within (targetW × targetH × targetD) mm
 * and centered at (cx, cy, cz) in meters.
 */
function fitModel(
  model: THREE.Group,
  targetW: number,
  targetH: number,
  targetD: number,
  cx: number,
  cy: number,
  cz: number,
  rotY: number = 0,
): THREE.Group | null {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());

  if (size.x < 0.0001 || size.y < 0.0001 || size.z < 0.0001) {
    return null;
  }

  const wM = targetW * S;
  const hM = targetH * S;
  const dM = targetD * S;

  // Scale X (width) and Z (depth) to match target exactly so cabinets
  // align side-by-side and against the wall.
  // Scale Y proportionally to X so models with protruding parts
  // (faucets, handles) keep correct proportions instead of being compressed.
  const scaleX = wM / size.x;
  const scaleZ = dM / size.z;
  const scaleY = scaleX; // proportional to width — prevents height distortion

  model.scale.set(scaleX, scaleY, scaleZ);

  // Recompute bounds after scaling
  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  const scaledMin = scaledBox.min;

  // Center model at wrapper origin
  model.position.sub(scaledCenter);

  // Enable shadows on all meshes
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      (child as THREE.Mesh).castShadow = true;
      (child as THREE.Mesh).receiveShadow = true;
    }
  });

  const wrapper = new THREE.Group();
  wrapper.add(model);
  wrapper.rotation.y = rotY;

  // Align model bottom to target slot bottom (plinth top),
  // keep X/Z at the target center
  const targetBottomY = cy - hM / 2;
  const modelHalfH = scaledCenter.y - scaledMin.y;
  wrapper.position.set(cx, targetBottomY + modelHalfH, cz);

  return wrapper;
}

function disposeGroup(group: THREE.Object3D) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m.dispose());
    }
  });
}

// ─── Text Sprite for 3D Labels ───

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Create a billboard sprite showing module code (e.g. "С 300") */
function createTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 128;

  const fontSize = 44;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const pillW = textW + 32;
  const pillH = fontSize + 20;
  const pillX = (canvas.width - pillW) / 2;
  const pillY = (canvas.height - pillH) / 2;

  // Dark pill background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  roundRect(ctx, pillX, pillY, pillW, pillH, 14);
  ctx.fill();

  // White text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  const spriteH = 0.04;
  sprite.scale.set(spriteH * aspect, spriteH, 1);

  return sprite;
}

/**
 * Try to replace a procedural placeholder with a loaded GLB model.
 * If loading fails or glbUrl is empty, the placeholder stays.
 * Extra scene objects (e.g. sink/stove decorations) are also removed on GLB success.
 */
function tryLoadGLB(
  scene: THREE.Scene,
  placeholder: THREE.Group,
  glbUrl: string | undefined,
  targetW: number,
  targetH: number,
  targetD: number,
  cx: number,
  cy: number,
  cz: number,
  disposed: { current: boolean },
  rotY: number = 0,
  extraRemoveOnSuccess?: THREE.Object3D[],
  onLoad?: () => void,
) {
  if (!glbUrl) return;

  loadGLB(glbUrl)
    .then((model) => {
      if (disposed.current) {
        disposeGroup(model);
        return;
      }
      const wrapper = fitModel(model, targetW, targetH, targetD, cx, cy, cz, rotY);
      if (!wrapper) return;

      scene.remove(placeholder);
      disposeGroup(placeholder);

      // Remove decorative extras (sink basin, stove burners) when GLB replaces procedural
      if (extraRemoveOnSuccess) {
        for (const obj of extraRemoveOnSuccess) {
          scene.remove(obj);
          disposeGroup(obj);
        }
      }

      scene.add(wrapper);
      onLoad?.();
    })
    .catch((err) => {
      console.warn(`[3D] GLB load failed for ${glbUrl}:`, err?.message || err);
    });
}

// ─── Sink/Stove Decorations (fallback only, removed when GLB loads) ───

function createSinkDetails(x: number, w: number): THREE.Group {
  const group = new THREE.Group();

  const basin = new THREE.Mesh(
    new THREE.BoxGeometry(w * S * 0.6, 0.01, LOWER_D * S * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.7, roughness: 0.2 }),
  );
  basin.position.set(x * S + (w * S) / 2, (LOWER_H + COUNTERTOP_H + 2) * S, LOWER_D * S * 0.4);
  group.add(basin);

  const fMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), fMat);
  faucet.position.set(x * S + (w * S) / 2, (LOWER_H + COUNTERTOP_H + 60) * S, LOWER_D * S * 0.15);
  group.add(faucet);

  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 8), fMat);
  spout.rotation.z = Math.PI / 2;
  spout.position.set(x * S + (w * S) / 2, (LOWER_H + COUNTERTOP_H + 115) * S, LOWER_D * S * 0.3);
  group.add(spout);

  return group;
}

function createStoveBurners(x: number, w: number): THREE.Group {
  const group = new THREE.Group();
  for (let bx = 0; bx < 2; bx++) {
    for (let bz = 0; bz < 2; bz++) {
      const burner = new THREE.Mesh(
        new THREE.TorusGeometry(0.025, 0.004, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.3 }),
      );
      burner.rotation.x = -Math.PI / 2;
      burner.position.set(
        x * S + w * S * (0.3 + bx * 0.4),
        (LOWER_H + COUNTERTOP_H + 3) * S,
        LOWER_D * S * (0.3 + bz * 0.35),
      );
      group.add(burner);
    }
  }
  return group;
}

export interface SceneHandle {
  cleanup: () => void;
  forceRender: () => void;
}

export function createScene(
  canvas: HTMLCanvasElement,
  config: SceneConfig,
): SceneHandle {
  const { wallMm, lowerMods, upperMods, isL, wallBMm, cornerW, lowerModsB, upperModsB, cornerCode, cornerGlbUrl } =
    config;

  // Disposal flag for aborting pending GLB loads
  const disposed = { current: false };

  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const wallM = wallMm * S;
  const roomDepth = isL ? Math.max(wallBMm, 3000) : 3000;
  const depthM = roomDepth * S;
  const roomH = 2600;

  // Track texture factory results for cleanup
  const textureDisposers: Array<{ dispose: () => void }> = [];

  // ─── Renderer ───
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // Faster than PCFSoft
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  // ─── Scene ───
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e4de);
  scene.fog = new THREE.Fog(0xe8e4de, 8, 18);

  // ─── Environment Map (PBR reflections for metallic surfaces) ───
  let envResult: EnvResult | null = null;
  try {
    envResult = createEnvTexture(renderer);
    scene.environment = envResult.envMap;
    textureDisposers.push(envResult);
  } catch (_e) {
    // Fallback: no env map, handles will be less shiny
  }

  // ─── Camera ───
  const cam = new THREE.PerspectiveCamera(45, W / H, 0.01, 50);

  // ─── Lights (balanced for visible shadows and wall definition) ───

  // Hemisphere light: warm from above, cool from ground — natural indoor feel
  const hemi = new THREE.HemisphereLight(0xffeedd, 0x8090a0, 0.35);
  scene.add(hemi);

  // Low ambient to avoid washing out shadows
  scene.add(new THREE.AmbientLight(0xfff5e6, 0.2));

  // Main directional (key light) — strong enough for clear shadows
  const dir = new THREE.DirectionalLight(0xfff5e8, 1.1);
  dir.position.set(wallM * 0.4, 3.5, depthM * 0.9);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -4;
  dir.shadow.camera.right = 4;
  dir.shadow.camera.top = 4;
  dir.shadow.camera.bottom = -1;
  dir.shadow.bias = -0.002;
  dir.shadow.normalBias = 0.02;
  scene.add(dir);

  // Fill light (subtle cool tone from opposite side)
  const fill = new THREE.DirectionalLight(0xc0d0e8, 0.2);
  fill.position.set(-2, 2, 3);
  scene.add(fill);

  // ─── Procedural Textures ───
  const floorTex = createWoodFloorTexture();
  textureDisposers.push(floorTex);
  // Fewer repeats = larger planks, more realistic look
  floorTex.map.repeat.set(
    Math.max(1, Math.round((wallM + 2) / 1.0)),
    Math.max(1, Math.round((depthM + 3) / 1.0)),
  );
  if (floorTex.bumpMap) {
    floorTex.bumpMap.repeat.copy(floorTex.map.repeat);
  }

  const wallTex = createPlasterWallTexture();
  textureDisposers.push(wallTex);

  const tileTex = createSubwayTileTexture();
  textureDisposers.push(tileTex);

  const graniteTex = createGraniteTexture();
  textureDisposers.push(graniteTex);
  graniteTex.map.repeat.set(2, 2);

  // ─── Floor (wood planks) ───
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(wallM + 2, depthM + 3),
    new THREE.MeshStandardMaterial({
      map: floorTex.map,
      bumpMap: floorTex.bumpMap,
      bumpScale: 0.004,
      roughness: 0.65,
      metalness: 0.03,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(wallM / 2, 0, depthM / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  // ─── Walls (plane faces + edge strips — lightweight) ───
  const wallThick = 0.10; // 100mm visible edge thickness

  // One textured material per wall face (reuse texture, just set repeat)
  function makeWallMat(sizeX: number, sizeY: number): THREE.MeshStandardMaterial {
    const clonedMap = wallTex.map.clone();
    clonedMap.needsUpdate = true;
    clonedMap.wrapS = THREE.RepeatWrapping;
    clonedMap.wrapT = THREE.RepeatWrapping;
    clonedMap.repeat.set(
      Math.max(1, Math.round(sizeX / 0.8)),
      Math.max(1, Math.round(sizeY / 0.8)),
    );
    return new THREE.MeshStandardMaterial({ map: clonedMap, roughness: 0.92 });
  }

  // Shared edge material (no texture — just color)
  const edgeMat = new THREE.MeshStandardMaterial({ color: COLORS.wallEdge, roughness: 0.9 });

  const wallHM = roomH * S;
  const cabinetZOffset = (LOWER_D * S) / 2;

  // Back wall — face + top edge strip
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(wallM + 0.01, wallHM),
    makeWallMat(wallM, wallHM),
  );
  backWall.position.set(wallM / 2, wallHM / 2, -cabinetZOffset);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Back wall top edge (gives thickness illusion)
  const backEdge = new THREE.Mesh(
    new THREE.BoxGeometry(wallM + 0.24, wallThick, wallThick),
    edgeMat,
  );
  backEdge.position.set(wallM / 2, wallHM + wallThick / 2, -cabinetZOffset - wallThick / 2);
  scene.add(backEdge);

  // Left wall — face + top/front edge
  const leftWallD = depthM + 1.5;
  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(leftWallD, wallHM),
    makeWallMat(leftWallD, wallHM),
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(0, wallHM / 2, leftWallD / 2 - cabinetZOffset);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Left wall front edge (vertical strip at opening)
  const leftFrontEdge = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wallHM, wallThick),
    edgeMat,
  );
  leftFrontEdge.position.set(-wallThick / 2, wallHM / 2, leftWallD - cabinetZOffset);
  scene.add(leftFrontEdge);

  // Left wall top edge
  const leftTopEdge = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wallThick, leftWallD),
    edgeMat,
  );
  leftTopEdge.position.set(-wallThick / 2, wallHM + wallThick / 2, leftWallD / 2 - cabinetZOffset);
  scene.add(leftTopEdge);

  // Right wall (L-shaped)
  if (isL) {
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(leftWallD, wallHM),
      makeWallMat(leftWallD, wallHM),
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(wallM, wallHM / 2, leftWallD / 2 - cabinetZOffset);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Right wall front edge
    const rightFrontEdge = new THREE.Mesh(
      new THREE.BoxGeometry(wallThick, wallHM, wallThick),
      edgeMat,
    );
    rightFrontEdge.position.set(wallM + wallThick / 2, wallHM / 2, leftWallD - cabinetZOffset);
    scene.add(rightFrontEdge);

    // Right wall top edge
    const rightTopEdge = new THREE.Mesh(
      new THREE.BoxGeometry(wallThick, wallThick, leftWallD),
      edgeMat,
    );
    rightTopEdge.position.set(wallM + wallThick / 2, wallHM + wallThick / 2, leftWallD / 2 - cabinetZOffset);
    scene.add(rightTopEdge);
  }

  // NO ceiling — open top as requested

  // ─── Baseboard molding (warm white, subtle) ───
  const baseboardMat = new THREE.MeshStandardMaterial({
    color: COLORS.baseboard,
    roughness: 0.65,
  });
  const baseH = 0.06; // 60mm
  const baseDep = 0.014; // 14mm

  // Back wall baseboard
  const bbBack = new THREE.Mesh(
    new THREE.BoxGeometry(wallM + 0.01, baseH, baseDep),
    baseboardMat,
  );
  bbBack.position.set(wallM / 2, baseH / 2, -cabinetZOffset + baseDep / 2);
  scene.add(bbBack);

  // Left wall baseboard
  const bbLeft = new THREE.Mesh(
    new THREE.BoxGeometry(baseDep, baseH, depthM + 1),
    baseboardMat,
  );
  bbLeft.position.set(baseDep / 2, baseH / 2, depthM / 2 - cabinetZOffset);
  scene.add(bbLeft);

  // Right wall baseboard (L-shaped)
  if (isL) {
    const bbRight = new THREE.Mesh(
      new THREE.BoxGeometry(baseDep, baseH, depthM + 1),
      baseboardMat,
    );
    bbRight.position.set(wallM - baseDep / 2, baseH / 2, depthM / 2 - cabinetZOffset);
    scene.add(bbRight);
  }

  // ─── Wall A: Lower cabinets ───
  const cabinetH = LOWER_H - PLINTH_H;
  for (const mod of lowerMods) {
    const cabinetGroup = buildCabinet(mod.width, cabinetH, LOWER_D, mod.subtype);
    const cx = mod.x * S + (mod.width * S) / 2;
    const cy = PLINTH_H * S + (cabinetH * S) / 2;
    const cz = (LOWER_D * S) / 2;
    cabinetGroup.position.set(cx, cy, cz);
    scene.add(cabinetGroup);

    // Plinth (always a box)
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(mod.width * S - 0.003, PLINTH_H * S, LOWER_D * S * 0.7),
      new THREE.MeshStandardMaterial({ color: COLORS.plinth, roughness: 0.8 }),
    );
    plinth.position.set(cx, (PLINTH_H * S) / 2, LOWER_D * S * 0.15);
    plinth.castShadow = true;
    scene.add(plinth);

    // Sink/stove decorations (removed when GLB loads successfully)
    const extraDetails: THREE.Object3D[] = [];
    if (mod.subtype === 'sink') {
      const sinkGroup = createSinkDetails(mod.x, mod.width);
      scene.add(sinkGroup);
      extraDetails.push(sinkGroup);
    }
    if (mod.subtype === 'oven' || mod.id.startsWith('stove')) {
      const stoveGroup = createStoveBurners(mod.x, mod.width);
      scene.add(stoveGroup);
      extraDetails.push(stoveGroup);
    }

    // Module label from catalog (proves data comes from database)
    if (mod.code) {
      const label = createTextSprite(`${mod.code} ${mod.width}`);
      label.position.set(cx, (LOWER_H + COUNTERTOP_H + 80) * S, cz);
      scene.add(label);
    }

    // Try to load real GLB model (replaces procedural + removes extras)
    tryLoadGLB(
      scene, cabinetGroup, mod.glbUrl,
      mod.width, cabinetH, LOWER_D, cx, cy, cz, disposed,
      Math.PI,
      extraDetails.length > 0 ? extraDetails : undefined,
      requestRender,
    );
  }

  // ─── Countertop (granite texture) ───
  const ctW = lowerMods.reduce((a, m) => a + m.width, 0);
  if (ctW > 0) {
    const ct = new THREE.Mesh(
      new THREE.BoxGeometry(ctW * S + 0.01, COUNTERTOP_H * S, (LOWER_D + 20) * S),
      new THREE.MeshStandardMaterial({
        map: graniteTex.map,
        roughness: 0.2,
        metalness: 0.08,
      }),
    );
    ct.position.set(
      (ctW * S) / 2,
      (LOWER_H + COUNTERTOP_H / 2) * S,
      ((LOWER_D + 20) * S) / 2 - 0.01,
    );
    ct.castShadow = true;
    ct.receiveShadow = true;
    scene.add(ct);
  }

  // ─── Backsplash (subway tiles) — Wall A ───
  const backsplashBottom = (LOWER_H + COUNTERTOP_H) * S;
  const backsplashH = (UPPER_Y - LOWER_H - COUNTERTOP_H) * S; // ~554mm

  if (ctW > 0 && upperMods.length > 0) {
    const bsCloneMap = tileTex.map.clone();
    bsCloneMap.needsUpdate = true;
    bsCloneMap.wrapS = THREE.RepeatWrapping;
    bsCloneMap.wrapT = THREE.RepeatWrapping;
    const tileRepeatX = Math.max(1, Math.round((ctW * S) / 0.25));
    const tileRepeatY = Math.max(1, Math.round(backsplashH / 0.12));
    bsCloneMap.repeat.set(tileRepeatX, tileRepeatY);

    let bsBumpClone: THREE.CanvasTexture | undefined;
    if (tileTex.bumpMap) {
      bsBumpClone = tileTex.bumpMap.clone();
      bsBumpClone.needsUpdate = true;
      bsBumpClone.wrapS = THREE.RepeatWrapping;
      bsBumpClone.wrapT = THREE.RepeatWrapping;
      bsBumpClone.repeat.set(tileRepeatX, tileRepeatY);
    }

    const bs = new THREE.Mesh(
      new THREE.PlaneGeometry(ctW * S, backsplashH),
      new THREE.MeshStandardMaterial({
        map: bsCloneMap,
        bumpMap: bsBumpClone,
        bumpScale: 0.002,
        roughness: 0.4,
        metalness: 0.05,
      }),
    );
    bs.position.set(
      (ctW * S) / 2,
      backsplashBottom + backsplashH / 2,
      (-LOWER_D * S) / 2 + 0.002, // Slightly in front of back wall
    );
    bs.receiveShadow = true;
    scene.add(bs);
  }

  // ─── Upper cabinets (Wall A) ───
  for (const mod of upperMods) {
    const cx = mod.x * S + (mod.width * S) / 2;
    const cy = UPPER_Y * S + (UPPER_H * S) / 2;
    const cz = (UPPER_D * S) / 2;

    const cabinetGroup = buildCabinet(mod.width, UPPER_H, UPPER_D, 'upper');
    cabinetGroup.position.set(cx, cy, cz);
    scene.add(cabinetGroup);

    if (mod.code) {
      const label = createTextSprite(`${mod.code} ${mod.width}`);
      label.position.set(cx, (UPPER_Y + UPPER_H + 40) * S, cz);
      scene.add(label);
    }

    tryLoadGLB(scene, cabinetGroup, mod.glbUrl, mod.width, UPPER_H, UPPER_D, cx, cy, cz, disposed, Math.PI, undefined, requestRender);
  }

  // ─── Under-cabinet lighting (Wall A) — max 3 lights ───
  {
    const totalUpperW = upperMods.reduce((a, m) => a + m.width, 0);
    if (totalUpperW > 0) {
      const numLights = Math.max(1, Math.min(3, Math.round(totalUpperW / 900)));
      const startX = upperMods[0]?.x ?? 0;
      for (let i = 0; i < numLights; i++) {
        const lx = (startX + (totalUpperW * (i + 0.5)) / numLights) * S;
        const light = new THREE.PointLight(0xfff0d0, 0.4, 1.0);
        light.position.set(lx, UPPER_Y * S - 0.02, UPPER_D * S * 0.6);
        scene.add(light);
      }
    }
  }

  // ─── L-shaped: Corner + Wall B ───
  if (isL && lowerModsB.length > 0) {
    // Corner module
    const cornerH = LOWER_H - PLINTH_H;
    const cornerCx = wallMm * S - (cornerW * S) / 2;
    const cornerCy = (PLINTH_H + cornerH / 2) * S;
    const cornerCz = (cornerW * S) / 2;

    const cornerCabinet = buildCabinet(cornerW, cornerH, cornerW, 'corner');
    cornerCabinet.position.set(cornerCx, cornerCy, cornerCz);
    scene.add(cornerCabinet);

    if (cornerCode) {
      const label = createTextSprite(`${cornerCode} ${cornerW}`);
      label.position.set(cornerCx, (LOWER_H + COUNTERTOP_H + 80) * S, cornerCz);
      scene.add(label);
    }

    // Try GLB for corner module
    if (cornerGlbUrl) {
      tryLoadGLB(
        scene, cornerCabinet, cornerGlbUrl,
        cornerW, cornerH, cornerW,
        cornerCx, cornerCy, cornerCz, disposed,
        Math.PI, undefined, requestRender,
      );
    }

    // Corner countertop (granite)
    const cc = new THREE.Mesh(
      new THREE.BoxGeometry(cornerW * S + 0.01, COUNTERTOP_H * S, cornerW * S + 0.01),
      new THREE.MeshStandardMaterial({
        map: graniteTex.map,
        roughness: 0.2,
        metalness: 0.08,
      }),
    );
    cc.position.set(
      wallMm * S - (cornerW * S) / 2,
      (LOWER_H + COUNTERTOP_H / 2) * S,
      (cornerW * S) / 2,
    );
    scene.add(cc);

    // Wall B cabinets (rotated 90°, along Z axis)
    let curB = cornerW;
    for (const mod of lowerModsB) {
      const wM = mod.width * S;
      const hM = cabinetH * S;
      const dM = LOWER_D * S;

      // Procedural cabinet rotated -90° around Y for Wall B
      const cabinetGroup = buildCabinet(mod.width, cabinetH, LOWER_D, mod.subtype);
      cabinetGroup.rotation.y = -Math.PI / 2;

      const bCx = wallMm * S - dM / 2;
      const bCy = PLINTH_H * S + hM / 2;
      const bCz = curB * S + wM / 2;
      cabinetGroup.position.set(bCx, bCy, bCz);
      scene.add(cabinetGroup);

      if (mod.code) {
        const label = createTextSprite(`${mod.code} ${mod.width}`);
        label.position.set(bCx, (LOWER_H + COUNTERTOP_H + 80) * S, bCz);
        scene.add(label);
      }

      // GLB for Wall B: load normal orientation, then rotate +90° (180° flip + -90° wall rotation)
      tryLoadGLB(
        scene, cabinetGroup, mod.glbUrl,
        mod.width, cabinetH, LOWER_D,
        bCx, bCy, bCz, disposed,
        Math.PI / 2, undefined, requestRender,
      );

      // Plinth
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(dM * 0.7, PLINTH_H * S, wM - 0.003),
        new THREE.MeshStandardMaterial({ color: COLORS.plinth, roughness: 0.8 }),
      );
      plinth.position.set(wallMm * S - dM * 0.35 - 0.05, (PLINTH_H * S) / 2, curB * S + wM / 2);
      scene.add(plinth);

      curB += mod.width;
    }

    // Wall B countertop (granite)
    const bTotal = lowerModsB.reduce((a, m) => a + m.width, 0);
    if (bTotal > 0) {
      const bct = new THREE.Mesh(
        new THREE.BoxGeometry((LOWER_D + 20) * S, COUNTERTOP_H * S, bTotal * S + 0.01),
        new THREE.MeshStandardMaterial({
          map: graniteTex.map,
          bumpMap: graniteTex.bumpMap,
          bumpScale: 0.001,
          roughness: 0.2,
          metalness: 0.08,
        }),
      );
      bct.position.set(
        wallMm * S - ((LOWER_D + 20) * S) / 2 + 0.01,
        (LOWER_H + COUNTERTOP_H / 2) * S,
        cornerW * S + (bTotal * S) / 2,
      );
      scene.add(bct);
    }

    // Backsplash — Wall B (rotated, along Z axis)
    if (bTotal > 0 && upperModsB.length > 0) {
      const bsBCloneMap = tileTex.map.clone();
      bsBCloneMap.needsUpdate = true;
      bsBCloneMap.wrapS = THREE.RepeatWrapping;
      bsBCloneMap.wrapT = THREE.RepeatWrapping;
      bsBCloneMap.repeat.set(
        Math.max(1, Math.round((bTotal * S) / 0.25)),
        Math.max(1, Math.round(backsplashH / 0.12)),
      );
      const bsB = new THREE.Mesh(
        new THREE.PlaneGeometry(bTotal * S, backsplashH),
        new THREE.MeshStandardMaterial({
          map: bsBCloneMap,
          roughness: 0.4,
          metalness: 0.05,
        }),
      );
      bsB.rotation.y = -Math.PI / 2;
      bsB.position.set(
        wallM - 0.002, // Flush against right wall inner face
        backsplashBottom + backsplashH / 2,
        cornerW * S + (bTotal * S) / 2,
      );
      bsB.receiveShadow = true;
      scene.add(bsB);
    }

    // ─── Upper cabinets (Wall B) ───
    let curBUpper = cornerW;
    for (const mod of upperModsB) {
      const wM = mod.width * S;
      const hM = UPPER_H * S;
      const dM = UPPER_D * S;

      const cabinetGroup = buildCabinet(mod.width, UPPER_H, UPPER_D, 'upper');
      cabinetGroup.rotation.y = -Math.PI / 2;

      const bCx = wallMm * S - dM / 2;
      const bCy = UPPER_Y * S + hM / 2;
      const bCz = curBUpper * S + wM / 2;
      cabinetGroup.position.set(bCx, bCy, bCz);
      scene.add(cabinetGroup);

      if (mod.code) {
        const label = createTextSprite(`${mod.code} ${mod.width}`);
        label.position.set(bCx, (UPPER_Y + UPPER_H + 40) * S, bCz);
        scene.add(label);
      }

      tryLoadGLB(
        scene, cabinetGroup, mod.glbUrl,
        mod.width, UPPER_H, UPPER_D,
        bCx, bCy, bCz, disposed,
        Math.PI / 2, undefined, requestRender,
      );

      curBUpper += mod.width;
    }

    // Under-cabinet lighting — Wall B (max 3)
    {
      const totalUpperBW = upperModsB.reduce((a, m) => a + m.width, 0);
      if (totalUpperBW > 0) {
        const numLightsB = Math.max(1, Math.min(3, Math.round(totalUpperBW / 900)));
        for (let i = 0; i < numLightsB; i++) {
          const lz = (cornerW + (totalUpperBW * (i + 0.5)) / numLightsB) * S;
          const light = new THREE.PointLight(0xfff0d0, 0.4, 1.0);
          light.position.set(wallM - UPPER_D * S * 0.6, UPPER_Y * S - 0.02, lz);
          scene.add(light);
        }
      }
    }
  }

  // ─── Orbit Controls ───
  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };
  const spherical = { theta: 0, phi: Math.PI * 0.35, radius: depthM + 2.2 };
  const target = new THREE.Vector3(wallM * 0.5, 0.85, LOWER_D * S);

  function updateCamera() {
    const r = spherical.radius;
    cam.position.set(
      target.x + r * Math.sin(spherical.phi) * Math.sin(spherical.theta),
      target.y + r * Math.cos(spherical.phi),
      target.z + r * Math.sin(spherical.phi) * Math.cos(spherical.theta),
    );
    cam.lookAt(target);
  }
  updateCamera();

  const onDown = (e: MouseEvent | TouchEvent) => {
    isDragging = true;
    const p = 'touches' in e ? e.touches[0]! : e;
    prevMouse = { x: p.clientX, y: p.clientY };
  };
  const onMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const p = 'touches' in e ? e.touches[0]! : e;
    spherical.theta -= (p.clientX - prevMouse.x) * 0.005;
    spherical.phi = Math.max(
      0.2,
      Math.min(Math.PI * 0.48, spherical.phi - (p.clientY - prevMouse.y) * 0.005),
    );
    prevMouse = { x: p.clientX, y: p.clientY };
    updateCamera();
    requestRender();
  };
  const onUp = () => {
    isDragging = false;
  };
  const onWheel = (e: WheelEvent) => {
    spherical.radius = Math.max(
      1.5,
      Math.min(8, spherical.radius + e.deltaY * 0.003),
    );
    updateCamera();
    requestRender();
  };

  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('wheel', onWheel);
  canvas.addEventListener('touchstart', onDown, { passive: true });
  canvas.addEventListener('touchmove', onMove, { passive: true });
  canvas.addEventListener('touchend', onUp);

  // ─── Render on demand (not continuous loop) ───
  let frameId = 0;
  let dirty = false;

  function requestRender() {
    if (!dirty) {
      dirty = true;
      frameId = requestAnimationFrame(() => {
        dirty = false;
        renderer.render(scene, cam);
      });
    }
  }

  // Initial render + one extra after short delay (for async GLB loads)
  requestRender();
  const glbTimer = setTimeout(() => requestRender(), 500);

  // ─── Resize ───
  const onResize = () => {
    const w2 = canvas.clientWidth;
    const h2 = canvas.clientHeight;
    renderer.setSize(w2, h2);
    cam.aspect = w2 / h2;
    cam.updateProjectionMatrix();
    requestRender();
  };
  window.addEventListener('resize', onResize);

  // ─── Force render (for screenshot capture) ───
  function forceRender() {
    renderer.render(scene, cam);
  }

  // ─── Cleanup ───
  const cleanup = () => {
    disposed.current = true;
    cancelAnimationFrame(frameId);
    clearTimeout(glbTimer);
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('touchstart', onDown);
    canvas.removeEventListener('touchmove', onMove);
    canvas.removeEventListener('touchend', onUp);
    window.removeEventListener('resize', onResize);
    renderer.dispose();

    // Dispose all scene materials and their textures
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          std.map?.dispose();
          std.bumpMap?.dispose();
          std.normalMap?.dispose();
          std.roughnessMap?.dispose();
          std.envMap?.dispose();
          // Sprite material map
          if ('map' in m && (m as THREE.SpriteMaterial).map) {
            (m as THREE.SpriteMaterial).map!.dispose();
          }
          m.dispose();
        });
      }
    });

    // Dispose texture factory results
    for (const td of textureDisposers) {
      td.dispose();
    }

    // Clear scene environment
    scene.environment = null;
  };

  return { cleanup, forceRender };
}
