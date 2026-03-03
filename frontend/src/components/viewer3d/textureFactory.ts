import * as THREE from 'three';

// ─── Helpers ───

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

/** Seeded-ish pseudo-random based on index */
function seeded(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function wrapTexture(tex: THREE.CanvasTexture): void {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
}

// ─── Wood Floor ───

export interface TextureResult {
  map: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  dispose: () => void;
}

export function createWoodFloorTexture(): TextureResult {
  const SIZE = 512;
  const [canvas, ctx] = createCanvas(SIZE, SIZE);

  // Base warm oak (slightly darker for better contrast with walls)
  const baseR = 172, baseG = 138, baseB = 98;
  ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const plankCount = 6; // Fewer planks = larger, more realistic
  const plankH = SIZE / plankCount;

  for (let i = 0; i < plankCount; i++) {
    const y = i * plankH;
    // Per-plank hue variation (all in warm range, NO green/blue shifts)
    const rOff = Math.round((seeded(i * 3) - 0.5) * 12);
    const gOff = Math.round((seeded(i * 3 + 1) - 0.5) * 10);
    const bOff = Math.round((seeded(i * 3 + 2) - 0.5) * 8);
    ctx.fillStyle = `rgb(${baseR + rOff}, ${baseG + gOff}, ${baseB + bOff})`;
    ctx.fillRect(0, y + 1, SIZE, plankH - 2);

    // Grain lines (warm brown only)
    const grainCount = 14 + Math.floor(seeded(i * 7) * 14);
    for (let g = 0; g < grainCount; g++) {
      const gy = y + 3 + seeded(i * 100 + g) * (plankH - 6);
      const alpha = 0.03 + seeded(i * 200 + g) * 0.07;
      ctx.strokeStyle = `rgba(130, 95, 55, ${alpha})`;
      ctx.lineWidth = 0.5 + seeded(i * 300 + g) * 0.8;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      // Slight wobble
      for (let x = 0; x < SIZE; x += 40) {
        const wobble = (seeded(i * 1000 + g * 50 + x) - 0.5) * 1.2;
        ctx.lineTo(x + 40, gy + wobble);
      }
      ctx.stroke();
    }

    // Plank gap (dark line)
    ctx.fillStyle = 'rgba(90, 65, 40, 0.5)';
    ctx.fillRect(0, y, SIZE, 2);
  }

  // Per-pixel noise pass (very subtle to avoid color artifacts)
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imageData.data;
  for (let p = 0; p < d.length; p += 16) {
    // Every 4th pixel — uniform warm noise
    const noise = (seeded(p) - 0.5) * 3;
    d[p] = Math.max(0, Math.min(255, (d[p] ?? 0) + noise));
    d[p + 1] = Math.max(0, Math.min(255, (d[p + 1] ?? 0) + noise * 0.9));
    d[p + 2] = Math.max(0, Math.min(255, (d[p + 2] ?? 0) + noise * 0.7));
  }
  ctx.putImageData(imageData, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  wrapTexture(map);

  // Bump map: grayscale version emphasizing plank gaps
  const [bCanvas, bCtx] = createCanvas(SIZE, SIZE);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < plankCount; i++) {
    const y = i * plankH;
    bCtx.fillStyle = '#404040'; // Dark = recessed
    bCtx.fillRect(0, y, SIZE, 2);
  }
  const bumpMap = new THREE.CanvasTexture(bCanvas);
  wrapTexture(bumpMap);

  return {
    map,
    bumpMap,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
    },
  };
}

// ─── Plaster Wall ───

export function createPlasterWallTexture(): TextureResult {
  const SIZE = 256;
  const [canvas, ctx] = createCanvas(SIZE, SIZE);

  // Base warm light gray — visible against white cabinets
  ctx.fillStyle = 'rgb(210, 206, 200)';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle horizontal brush strokes (more visible)
  for (let y = 0; y < SIZE; y += 3) {
    const brightness = 205 + Math.round((seeded(y * 17) - 0.5) * 10);
    ctx.strokeStyle = `rgba(${brightness}, ${brightness - 2}, ${brightness - 5}, 0.05)`;
    ctx.lineWidth = 1 + seeded(y * 23) * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y + (seeded(y * 31) - 0.5) * 2);
    ctx.stroke();
  }

  // Per-pixel noise for organic texture
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imageData.data;
  for (let p = 0; p < d.length; p += 4) {
    const noise = (seeded(p * 0.7 + 99) - 0.5) * 6;
    d[p] = Math.max(0, Math.min(255, (d[p] ?? 0) + noise));
    d[p + 1] = Math.max(0, Math.min(255, (d[p + 1] ?? 0) + noise * 0.9));
    d[p + 2] = Math.max(0, Math.min(255, (d[p + 2] ?? 0) + noise * 0.8));
  }
  ctx.putImageData(imageData, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  wrapTexture(map);

  return {
    map,
    dispose: () => { map.dispose(); },
  };
}

// ─── Subway Tile Backsplash ───

export function createSubwayTileTexture(): TextureResult {
  const W = 512;
  const H = 256;
  const [canvas, ctx] = createCanvas(W, H);

  // Grout base
  ctx.fillStyle = 'rgb(200, 195, 190)';
  ctx.fillRect(0, 0, W, H);

  const tileW = 120;
  const tileH = 55;
  const grout = 4;

  const cols = Math.ceil(W / (tileW + grout)) + 1;
  const rows = Math.ceil(H / (tileH + grout)) + 1;

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (tileW / 2 + grout / 2);
    for (let col = -1; col < cols; col++) {
      const x = col * (tileW + grout) + offset;
      const y = row * (tileH + grout);

      // Per-tile color variation
      const variation = Math.round((seeded(row * 100 + col) - 0.5) * 6);
      const r = 242 + variation;
      const g = 240 + variation;
      const b = 237 + variation;

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      // Slightly rounded tile corners
      const cr = 2;
      ctx.beginPath();
      ctx.roundRect(x + grout / 2, y + grout / 2, tileW, tileH, cr);
      ctx.fill();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  wrapTexture(map);

  // Bump map: grout lines recessed
  const [bCanvas, bCtx] = createCanvas(W, H);
  bCtx.fillStyle = '#404040'; // Grout = recessed
  bCtx.fillRect(0, 0, W, H);

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (tileW / 2 + grout / 2);
    for (let col = -1; col < cols; col++) {
      const x = col * (tileW + grout) + offset;
      const y = row * (tileH + grout);
      bCtx.fillStyle = '#b0b0b0'; // Tile = raised
      bCtx.fillRect(x + grout / 2, y + grout / 2, tileW, tileH);
    }
  }
  const bumpMap = new THREE.CanvasTexture(bCanvas);
  wrapTexture(bumpMap);

  return {
    map,
    bumpMap,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
    },
  };
}

// ─── Granite Countertop ───

export function createGraniteTexture(): TextureResult {
  // Smaller size — 256 is plenty for a countertop texture
  const SIZE = 256;
  const [canvas, ctx] = createCanvas(SIZE, SIZE);

  // Base fill
  ctx.fillStyle = 'rgb(195, 190, 185)';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // All speckle done via direct ImageData — orders of magnitude faster than fillRect
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const px = i / 4;
    const s1 = seeded(px * 1.3);
    const s2 = seeded(px * 2.7 + 100);
    // Speckle: random brightness variation
    const noise = (s1 - 0.5) * 30;
    // Occasional dark/light spots
    const spot = s2 > 0.92 ? -25 : s2 < 0.08 ? 20 : 0;
    d[i]     = Math.max(0, Math.min(255, 195 + noise + spot));
    d[i + 1] = Math.max(0, Math.min(255, 190 + noise * 0.95 + spot));
    d[i + 2] = Math.max(0, Math.min(255, 185 + noise * 0.85 + spot));
    // alpha stays 255
  }
  ctx.putImageData(imageData, 0, 0);

  // 2 subtle veins via canvas API (fast — only 2 strokes)
  for (let v = 0; v < 2; v++) {
    ctx.strokeStyle = 'rgba(170, 165, 155, 0.08)';
    ctx.lineWidth = 4 + seeded(v * 77) * 4;
    ctx.beginPath();
    ctx.moveTo(seeded(v * 50) * SIZE, seeded(v * 50 + 1) * SIZE);
    ctx.bezierCurveTo(
      seeded(v * 50 + 2) * SIZE, seeded(v * 50 + 3) * SIZE,
      seeded(v * 50 + 4) * SIZE, seeded(v * 50 + 5) * SIZE,
      seeded(v * 50 + 6) * SIZE, seeded(v * 50 + 7) * SIZE,
    );
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  wrapTexture(map);

  // No bump map needed — the noise in the color map is enough
  return {
    map,
    dispose: () => { map.dispose(); },
  };
}

// ─── Environment Map (for PBR reflections) ───

export interface EnvResult {
  envMap: THREE.Texture;
  dispose: () => void;
}

export function createEnvTexture(renderer: THREE.WebGLRenderer): EnvResult {
  const pmremGen = new THREE.PMREMGenerator(renderer);
  pmremGen.compileEquirectangularShader();

  // Create equirectangular gradient for environment
  const SIZE = 64;
  const [canvas, ctx] = createCanvas(SIZE * 2, SIZE);

  // Draw equirectangular gradient: top=warm white, middle=cool blue-gray, bottom=warm dark
  for (let y = 0; y < SIZE; y++) {
    const t = y / SIZE; // 0=top, 1=bottom
    let r: number, g: number, b: number;
    if (t < 0.35) {
      // Sky / ceiling: warm white
      const s = t / 0.35;
      r = 250 - s * 20;
      g = 247 - s * 22;
      b = 240 - s * 25;
    } else if (t < 0.55) {
      // Horizon: cool blue-gray
      const s = (t - 0.35) / 0.2;
      r = 230 - s * 30;
      g = 225 - s * 20;
      b = 215 + s * 5;
    } else {
      // Ground: warm dark
      const s = (t - 0.55) / 0.45;
      r = 200 - s * 80;
      g = 205 - s * 95;
      b = 220 - s * 110;
    }
    ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    ctx.fillRect(0, y, SIZE * 2, 1);
  }

  const envTexture = new THREE.CanvasTexture(canvas);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;

  const envMap = pmremGen.fromEquirectangular(envTexture).texture;

  envTexture.dispose();
  pmremGen.dispose();

  return {
    envMap,
    dispose: () => {
      envMap.dispose();
    },
  };
}
