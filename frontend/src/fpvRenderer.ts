/**
 * First-person bridge view — full canvas, wheelhouse overlay + mini-map.
 */
import { CW, CH, WEATHER_CFG, DOCK_A_CENTER_X, DOCK_B_CENTER_X, PORT_BASIN_START_X, type WeatherKey } from "./constants";
import type { CherryFlower, LocalState, LocalVessel } from "./types";

// ── Layout ────────────────────────────────────────────────────────────
const PILLAR_W  = 32;          // side pillar width
const DASH_TOP  = 330;         // top of dashboard (bottom of scene window)
const HORIZ_Y   = 210;         // horizon line in screen Y
const SCENE_CX  = CW / 2;     // 400
const HALF_FOV  = 45;          // ±degrees

// Focal length derived from FOV (for perspective projection)
const FOCAL = SCENE_CX / Math.tan((HALF_FOV * Math.PI) / 180); // ≈400

// Mini-map
const MM_X = PILLAR_W + 6;
const MM_Y = 6;
const MM_W = 152;
const MM_H = 108;
const MM_SCALE = 0.018; // world units → mini-map pixels

// ── Helpers ───────────────────────────────────────────────────────────

function relBearing(tugX: number, tugY: number, hdg: number, wx: number, wy: number): number {
  const dx = wx - tugX;
  const dy = wy - tugY;
  const a = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  return ((a - hdg + 540) % 360) - 180;
}

function dist2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/** Project a world point at a given altitude (world units above sea) to screen coords. */
function project(
  tugX: number, tugY: number, hdg: number,
  wx: number, wy: number, altitude: number,
): { sx: number; sy: number; dist: number } | null {
  const dx = wx - tugX;
  const dy = wy - tugY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 6) return null;
  const bearing = relBearing(tugX, tugY, hdg, wx, wy);
  if (Math.abs(bearing) > HALF_FOV + 14) return null;
  const sx = SCENE_CX + (bearing / HALF_FOV) * SCENE_CX;
  // Altitude in screen Y (positive altitude → above horizon)
  const sy = HORIZ_Y - (altitude / dist) * FOCAL;
  return { sx, sy, dist };
}

// ── Main export ───────────────────────────────────────────────────────

export function renderFPV(ctx: CanvasRenderingContext2D, ls: LocalState, weather: WeatherKey, shake = { x: 0, y: 0 }) {
  const w = WEATHER_CFG[weather] ?? WEATHER_CFG.clear;

  // Camera shake (applied to scene, not dashboard)
  ctx.save();
  ctx.translate(shake.x * 0.6, shake.y * 0.6);
  // 1. Sky
  drawSky(ctx, ls, w);
  // 2. Water
  drawWater(ctx, ls, w);
  // 3. Horizon scenery
  drawHorizonScenery(ctx, ls);
  // 4. Clip scene area, draw projected objects
  ctx.save();
  ctx.beginPath();
  ctx.rect(PILLAR_W, 0, CW - PILLAR_W * 2, DASH_TOP);
  ctx.clip();
  drawVessels(ctx, ls);
  drawCherryBlossoms(ctx, ls);
  ctx.restore();
  // 5. Fog
  if (w.fog > 0) drawFog(ctx, w);

  ctx.restore(); // end shake translate

  // 6. Wheelhouse overlay (draws on top of everything)
  drawWheelhouse(ctx, ls);
  // 7. Mini-map (top-left, inside pillar + margin)
  drawMiniMap(ctx, ls);

  // 8. Screen flash on collision
  if (ls.screenFlash > 0) {
    ctx.fillStyle = `rgba(255,60,30,${ls.screenFlash * 0.42})`;
    ctx.fillRect(0, 0, CW, CH);
    const vg = ctx.createRadialGradient(CW / 2, CH / 2, 40, CW / 2, CH / 2, CW * 0.8);
    vg.addColorStop(0, "rgba(255,0,0,0)");
    vg.addColorStop(1, `rgba(180,0,0,${ls.screenFlash * 0.55})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, CW, CH);
    if (ls.screenFlash > 0.5) {
      ctx.fillStyle = `rgba(255,220,200,${(ls.screenFlash - 0.5) * 2})`;
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COLLISION", CW / 2, CH / 2 - 10);
    }
  }
}

// ── Sky ───────────────────────────────────────────────────────────────

function drawSky(ctx: CanvasRenderingContext2D, ls: LocalState, w: { sky: [string, string]; fog: number }) {
  const ww = w;
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZ_Y);
  sky.addColorStop(0, ww.sky[0]);
  sky.addColorStop(1, ww.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, HORIZ_Y);

  // Sun
  const sunAngle = (ls.tug.heading * Math.PI) / 180 - 0.6; // sun slightly off-axis
  const sunBearing = relBearing(ls.tug.x, ls.tug.y, ls.tug.heading,
    ls.tug.x + Math.sin(sunAngle) * 2000,
    ls.tug.y - Math.cos(sunAngle) * 2000,
  );
  if (Math.abs(sunBearing) < HALF_FOV + 20) {
    const sunX = SCENE_CX + (sunBearing / HALF_FOV) * SCENE_CX;
    const sunY = 52;
    const sunR = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 42);
    sunR.addColorStop(0, "rgba(255,250,220,0.95)");
    sunR.addColorStop(0.22, "rgba(255,230,120,0.55)");
    sunR.addColorStop(0.6, "rgba(255,200,80,0.12)");
    sunR.addColorStop(1, "rgba(255,180,50,0)");
    ctx.fillStyle = sunR;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,252,230,0.95)";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Clouds
  const clouds = [
    { b: -35, alt: 85, w: 120, h: 30 },
    { b:  -8, alt: 105, w: 160, h: 40 },
    { b:  22, alt: 75, w: 100, h: 26 },
    { b:  38, alt: 95, w: 130, h: 32 },
    { b: -20, alt: 130, w: 90, h: 22 },
  ];
  clouds.forEach(({ b, alt, w: cw, h: ch }) => {
    if (Math.abs(b) > HALF_FOV + 20) return;
    const cx2 = SCENE_CX + (b / HALF_FOV) * SCENE_CX;
    const cy2 = HORIZ_Y - (alt / 2000) * FOCAL * 8;
    const cg = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cw * 0.7);
    cg.addColorStop(0, "rgba(255,255,255,0.55)");
    cg.addColorStop(0.5, "rgba(240,245,255,0.3)");
    cg.addColorStop(1, "rgba(220,235,255,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx2, cy2, cw * 0.7, ch * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── Water ─────────────────────────────────────────────────────────────

function drawWater(ctx: CanvasRenderingContext2D, ls: LocalState, w: { water: [string, string]; waves: number }) {
  const wg = ctx.createLinearGradient(0, HORIZ_Y, 0, DASH_TOP);
  wg.addColorStop(0, w.water[0]);
  wg.addColorStop(0.5, w.water[1]);
  wg.addColorStop(1, "#0a2030");
  ctx.fillStyle = wg;
  ctx.fillRect(0, HORIZ_Y, CW, DASH_TOP - HORIZ_Y);

  // Specular shimmer near horizon
  const spec = ctx.createLinearGradient(0, HORIZ_Y, 0, HORIZ_Y + 30);
  spec.addColorStop(0, "rgba(200,230,255,0.18)");
  spec.addColorStop(1, "rgba(200,230,255,0)");
  ctx.fillStyle = spec;
  ctx.fillRect(0, HORIZ_Y, CW, 30);

  // Perspective converging lines
  for (let i = -14; i <= 14; i++) {
    if (Math.abs(i) < 1) continue;
    const bx = SCENE_CX + i * 52;
    const alpha = Math.max(0, 0.06 - Math.abs(i) * 0.003) * w.waves;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(SCENE_CX, HORIZ_Y);
    ctx.lineTo(bx, DASH_TOP);
    ctx.stroke();
  }

  // Wave bands (quadratic spacing = perspective foreshortening)
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    const wy = HORIZ_Y + (DASH_TOP - HORIZ_Y) * (t * t);
    const amp = t * 3.2 * w.waves;
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + t * 0.06})`;
    ctx.lineWidth = 0.6 + t * 0.7;
    ctx.beginPath();
    for (let x = 0; x <= CW; x += 28) {
      const y = wy + Math.sin(ls.time * 2.0 + x * 0.035 + i) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Nearby foam / wake (close water surface)
  for (let i = 0; i < 6; i++) {
    const wy = DASH_TOP - 20 - i * 15;
    const wx = (ls.time * 55 * (0.5 + i * 0.2) + i * 300) % (CW + 200) - 100;
    ctx.strokeStyle = `rgba(255,255,255,${0.06 * w.waves})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.bezierCurveTo(wx + 20, wy - 3, wx + 50, wy + 3, wx + 80, wy);
    ctx.stroke();
  }
}

// ── Horizon scenery (all elements use real world coordinates = synced with top-down) ──

const SHORE_Y = 350; // north-shore world Y (same scenery band as top-down bg)

// North-shore buildings: world X matches top-down renderer + extended along route
const WORLD_BUILDINGS = [
  { wx: 830,   h: 100, bw: 22, col: "#1e3048" },
  { wx: 860,   h: 74,  bw: 18, col: "#2a3f5a" },
  { wx: 885,   h: 118, bw: 28, col: "#2d4460" },
  { wx: 922,   h: 85,  bw: 18, col: "#1e3048" },
  { wx: 948,   h: 99,  bw: 22, col: "#2a3f5a" },
  { wx: 1510,  h: 82,  bw: 20, col: "#1e3048" },
  { wx: 1538,  h: 115, bw: 29, col: "#2d4460" },
  { wx: 1578,  h: 66,  bw: 16, col: "#2a3f5a" },
  { wx: 2180,  h: 72,  bw: 20, col: "#1e3048" },
  { wx: 2230,  h: 96,  bw: 26, col: "#243440" },
  { wx: 2290,  h: 58,  bw: 18, col: "#2a3f5a" },
  { wx: 3080,  h: 90,  bw: 24, col: "#1e3048" },
  { wx: 3160,  h: 112, bw: 30, col: "#2d4460" },
  { wx: 3240,  h: 68,  bw: 20, col: "#2a3f5a" },
  { wx: 4400,  h: 76,  bw: 22, col: "#243440" },
  { wx: 4480,  h: 104, bw: 28, col: "#1e3048" },
  { wx: 5480,  h: 88,  bw: 24, col: "#1e3048" },
  { wx: 5560,  h: 62,  bw: 18, col: "#2a3f5a" },
  { wx: 6180,  h: 98,  bw: 26, col: "#243440" },
  { wx: 6260,  h: 70,  bw: 20, col: "#2d4460" },
  { wx: 7000,  h: 80,  bw: 22, col: "#1e3048" },
  { wx: 7100,  h: 108, bw: 30, col: "#2d4460" },
  { wx: 8000,  h: 94,  bw: 26, col: "#1e3048" },
  { wx: 8100,  h: 118, bw: 32, col: "#243440" },
  { wx: 9200,  h: 86,  bw: 24, col: "#2d4460" },
  { wx: 9320,  h: 130, bw: 34, col: "#1e3048" },
  { wx: 10480, h: 110, bw: 28, col: "#2a3f5a" },
  { wx: 10600, h: 142, bw: 36, col: "#1e3048" },
];

function drawHorizonScenery(ctx: CanvasRenderingContext2D, ls: LocalState) {
  // Mountains (parallax backdrop — infinitely far, bearing relative to north)
  const bearingToNorth = ((540 - ls.tug.heading) % 360) - 180;
  const mtns = [
    { off: -46, mw: 195, mh: 68, col: "#3a4e5c" },
    { off: -28, mw: 175, mh: 54, col: "#47586a" },
    { off: -10, mw: 200, mh: 78, col: "#3a4e5c" },
    { off:   9, mw: 168, mh: 58, col: "#47586a" },
    { off:  26, mw: 182, mh: 64, col: "#3a4e5c" },
    { off:  44, mw: 158, mh: 46, col: "#47586a" },
  ];
  mtns.forEach(({ off, mw, mh, col }) => {
    const b = bearingToNorth + off;
    if (Math.abs(b) > HALF_FOV + 25) return;
    const sx = SCENE_CX + (b / HALF_FOV) * SCENE_CX;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(sx - mw / 2, HORIZ_Y + 1);
    ctx.lineTo(sx, HORIZ_Y - mh);
    ctx.lineTo(sx + mw / 2, HORIZ_Y + 1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(235,245,255,0.75)";
    const sw = mh * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx, HORIZ_Y - mh);
    ctx.lineTo(sx - sw, HORIZ_Y - mh + sw * 1.6);
    ctx.lineTo(sx + sw, HORIZ_Y - mh + sw * 1.6);
    ctx.closePath(); ctx.fill();
  });

  // North-shore buildings — projected from their actual world X positions (synced with top-down)
  WORLD_BUILDINGS.forEach(({ wx, h, bw, col }) => {
    const wdist = dist2D(ls.tug.x, ls.tug.y, wx, SHORE_Y);
    if (wdist > 3500 || wdist < 50) return;
    const bearing = relBearing(ls.tug.x, ls.tug.y, ls.tug.heading, wx, SHORE_Y);
    if (Math.abs(bearing) > HALF_FOV + 12) return;
    const edgeFade = Math.min(1, (HALF_FOV + 12 - Math.abs(bearing)) / 12);
    const distFade = Math.max(0.1, 1 - wdist / 3500);
    const scale = Math.max(0.12, Math.min(2.8, 500 / wdist));
    const screenH = h * scale;
    const screenW = Math.max(3, bw * scale);
    const bsx = SCENE_CX + (bearing / HALF_FOV) * SCENE_CX;

    ctx.save();
    ctx.globalAlpha = distFade * edgeFade * 0.92;
    ctx.fillStyle = col;
    ctx.fillRect(bsx - screenW / 2, HORIZ_Y - screenH, screenW, screenH);
    if (scale > 0.45) {
      ctx.fillStyle = "rgba(255,215,90,0.2)";
      const rs = Math.max(1, 7 * scale), cs = Math.max(1, 4 * scale);
      for (let ry = HORIZ_Y - screenH + rs; ry < HORIZ_Y - 3; ry += rs) {
        for (let rx = bsx - screenW / 2 + 2; rx < bsx + screenW / 2 - 2; rx += cs + 1) {
          if (Math.sin(rx * 2.1 + ry * 1.7) > 0.15) ctx.fillRect(rx, ry, cs, rs * 0.6);
        }
      }
    }
    ctx.restore();
  });

  // Docks — exact same world coords as top-down renderer (DOCK_WATERLINE_Y = 756)
  [DOCK_A_CENTER_X, DOCK_B_CENTER_X].forEach((dockWX) => {
    const dockDist = dist2D(ls.tug.x, ls.tug.y, dockWX, 756);
    if (dockDist > 2200) return;
    const b = relBearing(ls.tug.x, ls.tug.y, ls.tug.heading, dockWX, 756);
    if (Math.abs(b) > HALF_FOV + 12) return;
    const edgeFade = Math.min(1, (HALF_FOV + 12 - Math.abs(b)) / 12);
    const sc = Math.max(0.25, Math.min(3, 600 / dockDist));
    const sx = SCENE_CX + (b / HALF_FOV) * SCENE_CX;
    ctx.save();
    ctx.globalAlpha = edgeFade * Math.min(0.9, 600 / dockDist);
    ctx.fillStyle = "#5d4d38";
    ctx.fillRect(sx - 60 * sc, HORIZ_Y - 8 * sc, 120 * sc, 9 * sc);
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(sx + 22 * sc, HORIZ_Y - 52 * sc, 8 * sc, 46 * sc);
    ctx.fillRect(sx + 22 * sc, HORIZ_Y - 52 * sc, 36 * sc, 5 * sc);
    ctx.fillStyle = "rgba(255,220,50,0.7)";
    ctx.font = `bold ${Math.max(8, Math.round(9 * sc))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(dockWX === DOCK_A_CENTER_X ? "DOCK A" : "DOCK B", sx, HORIZ_Y - 60 * sc);
    ctx.restore();
  });

  // Port basin — exact same world X as top-down renderer
  {
    const bPort = relBearing(ls.tug.x, ls.tug.y, ls.tug.heading, PORT_BASIN_START_X + 300, 756);
    const portDist = dist2D(ls.tug.x, ls.tug.y, PORT_BASIN_START_X + 300, 756);
    if (Math.abs(bPort) < HALF_FOV + 14 && portDist < 3000) {
      const psx = SCENE_CX + (bPort / HALF_FOV) * SCENE_CX;
      const sc2 = Math.max(0.3, Math.min(2, 800 / portDist));
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, 800 / portDist);
      ctx.fillStyle = "rgba(25,32,44,0.8)";
      ctx.fillRect(psx - 100 * sc2, HORIZ_Y - 28 * sc2, 200 * sc2, 30 * sc2);
      ctx.fillStyle = "rgba(255,180,80,0.85)";
      ctx.font = `bold ${Math.max(9, Math.round(11 * sc2))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("PORT", psx, HORIZ_Y - 8 * sc2);
      ctx.restore();
    }
  }

  // Horizon haze
  const haze = ctx.createLinearGradient(0, HORIZ_Y - 18, 0, HORIZ_Y + 12);
  haze.addColorStop(0, "rgba(180,210,230,0)");
  haze.addColorStop(0.45, "rgba(180,210,230,0.13)");
  haze.addColorStop(1, "rgba(180,210,230,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, HORIZ_Y - 18, CW, 30);
}

// ── Vessels ───────────────────────────────────────────────────────────

function drawVessels(ctx: CanvasRenderingContext2D, ls: LocalState) {
  type VEntry = { v: LocalVessel; label: string; hull: string; cabin: string; baseH: number; baseW: number; isEscort?: boolean };
  const vessels: VEntry[] = [
    { v: ls.escort, label: "ESCORT", hull: "#28383a", cabin: "#3a4a48", baseH: 52, baseW: 22, isEscort: true },
    { v: ls.cargo,  label: "CARGO",  hull: "#3a5a78", cabin: "#4a6a88", baseH: 40, baseW: 17 },
    { v: ls.ferry,  label: "FERRY",  hull: "#5a7a9a", cabin: "#6a8aaa", baseH: 32, baseW: 14 },
    ...ls.fishers.map((f) => ({ v: f, label: "", hull: "#6a5030", cabin: "#8a7050", baseH: 13, baseW: 5 } as VEntry)),
    ...ls.traffic.map((t) => ({ v: t, label: "", hull: "#4a5868", cabin: "#5a6878", baseH: 22, baseW: 9 } as VEntry)),
  ];

  const projected = vessels
    .map((item) => {
      const p = project(ls.tug.x, ls.tug.y, ls.tug.heading, item.v.x, item.v.y, 0);
      if (!p) return null;
      return { ...item, ...p };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.dist - a.dist);

  for (const { v, label, hull, cabin, baseH, baseW, isEscort, sx, dist } of projected) {
    const sinkT = v.sinkT ?? 0;
    if (sinkT >= 1) continue;
    const bearing = relBearing(ls.tug.x, ls.tug.y, ls.tug.heading, v.x, v.y);
    const edgeFade = Math.min(1, (HALF_FOV + 14 - Math.abs(bearing)) / 14);
    const alpha = Math.max(0.04, 1 - sinkT * 0.9) * edgeFade;
    const scale = Math.max(0.06, Math.min(6, 300 / dist));
    const h = baseH * scale;
    const wid = baseW * scale;
    const sinkOff = sinkT * h * 2.5;
    const topY = HORIZ_Y - h * 0.65 + sinkOff;
    const botY = HORIZ_Y + h * 0.35 + sinkOff;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (isEscort) {
      drawEscortFPV(ctx, sx, topY, botY, h, wid, sinkT, dist);
    } else {
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      ctx.lineTo(sx + wid * 0.88, topY + h * 0.3);
      ctx.lineTo(sx + wid * 0.78, botY);
      ctx.lineTo(sx - wid * 0.78, botY);
      ctx.lineTo(sx - wid * 0.88, topY + h * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cabin;
      ctx.fillRect(sx - wid * 0.4, topY + h * 0.08, wid * 0.8, h * 0.4);
      if (scale > 0.3) {
        ctx.strokeStyle = "rgba(210,200,170,0.5)";
        ctx.lineWidth = Math.max(0.4, scale * 0.6);
        ctx.beginPath();
        ctx.moveTo(sx, topY);
        ctx.lineTo(sx, topY - h * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (label && dist < 500 && scale > 0.3) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.88;
      ctx.fillStyle = isEscort ? "rgba(255,230,100,0.9)" : "rgba(255,255,255,0.7)";
      ctx.font = `bold ${Math.max(8, Math.round(9 * scale))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(label, sx, topY - h * 0.55 - 4);
      ctx.fillStyle = "rgba(255,220,80,0.75)";
      ctx.font = `${Math.max(7, Math.round(8 * scale))}px sans-serif`;
      ctx.fillText(`${Math.round(dist)} m`, sx, botY + Math.max(9, 11 * scale));
      ctx.restore();
    }
  }
}

/** Detailed escort cargo ship silhouette in FPV. */
function drawEscortFPV(ctx: CanvasRenderingContext2D, sx: number, topY: number, botY: number, h: number, wid: number, sinkT: number, dist: number) {
  void sinkT;
  const mid = topY + (botY - topY) * 0.5;
  // Hull
  const hg = ctx.createLinearGradient(sx - wid, topY, sx + wid, botY);
  hg.addColorStop(0, "#28383a");
  hg.addColorStop(0.5, "#2e4244");
  hg.addColorStop(1, "#1a2830");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(sx, topY);
  ctx.lineTo(sx + wid, topY + h * 0.28);
  ctx.lineTo(sx + wid * 0.9, botY);
  ctx.lineTo(sx - wid * 0.9, botY);
  ctx.lineTo(sx - wid, topY + h * 0.28);
  ctx.closePath();
  ctx.fill();
  // Waterline stripe
  ctx.strokeStyle = "#c84820";
  ctx.lineWidth = Math.max(1, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(sx - wid * 0.92, mid + h * 0.12);
  ctx.lineTo(sx + wid * 0.92, mid + h * 0.12);
  ctx.stroke();
  // Deck
  ctx.fillStyle = "#3a4a38";
  ctx.beginPath();
  ctx.moveTo(sx, topY + h * 0.02);
  ctx.lineTo(sx + wid * 0.82, topY + h * 0.24);
  ctx.lineTo(sx + wid * 0.74, mid + h * 0.08);
  ctx.lineTo(sx - wid * 0.74, mid + h * 0.08);
  ctx.lineTo(sx - wid * 0.82, topY + h * 0.24);
  ctx.closePath();
  ctx.fill();
  // Cargo hatches (3)
  if (dist < 600) {
    const hw = wid * 0.44;
    const hh = h * 0.1;
    [-h * 0.3, -h * 0.09, h * 0.06].forEach((oy) => {
      ctx.fillStyle = "#2a3828";
      ctx.fillRect(sx - hw, topY + h * 0.26 + oy, hw * 2, hh + 2);
      ctx.fillStyle = "#3e5040";
      ctx.fillRect(sx - hw + 1, topY + h * 0.27 + oy, hw * 2 - 2, hh);
    });
    // Cranes
    ctx.strokeStyle = "#e0b820";
    ctx.lineWidth = Math.max(0.6, h * 0.015);
    [[-wid * 0.5, -h * 0.22], [wid * 0.5, -h * 0.22]].forEach(([ox, oy]) => {
      const bx2 = sx + ox;
      const by2 = topY + h * 0.28 + oy;
      ctx.beginPath();
      ctx.moveTo(bx2, by2 + h * 0.04);
      ctx.lineTo(bx2, by2 - h * 0.08);
      ctx.lineTo(bx2 + (ox > 0 ? wid * 0.28 : -wid * 0.28), by2 - h * 0.18);
      ctx.stroke();
    });
  }
  // Bridge superstructure (aft, right side in FPV facing bow)
  const bx3 = sx + wid * 0.28;
  const by3 = topY + h * 0.06;
  ctx.fillStyle = "#d0c8b8";
  ctx.fillRect(bx3 - wid * 0.22, by3, wid * 0.44, h * 0.28);
  ctx.fillStyle = "#1a2838";
  ctx.fillRect(bx3 - wid * 0.19, by3 + h * 0.04, wid * 0.38, h * 0.08);
  ctx.fillStyle = "rgba(120,180,220,0.5)";
  for (let wi = 0; wi < 3; wi++) {
    ctx.fillRect(bx3 - wid * 0.15 + wi * wid * 0.1, by3 + h * 0.05, wid * 0.07, h * 0.06);
  }
  // Funnel
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(bx3 - wid * 0.07, by3 - h * 0.12, wid * 0.14, h * 0.16);
  ctx.fillStyle = "#e8c030";
  ctx.fillRect(bx3 - wid * 0.07, by3 - h * 0.04, wid * 0.14, h * 0.04);
  // Mast
  if (dist < 700) {
    ctx.strokeStyle = "rgba(180,170,140,0.65)";
    ctx.lineWidth = Math.max(0.5, h * 0.012);
    ctx.beginPath();
    ctx.moveTo(sx, topY);
    ctx.lineTo(sx, topY - h * 0.45);
    ctx.stroke();
    // Yardarm
    ctx.beginPath();
    ctx.moveTo(sx - wid * 0.35, topY - h * 0.35);
    ctx.lineTo(sx + wid * 0.35, topY - h * 0.35);
    ctx.stroke();
    // Nav lights
    ctx.fillStyle = "#ff4040";
    ctx.beginPath(); ctx.arc(sx - wid * 0.9, mid, Math.max(1, h * 0.025), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#40ff80";
    ctx.beginPath(); ctx.arc(sx + wid * 0.9, mid, Math.max(1, h * 0.025), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffff80";
    ctx.beginPath(); ctx.arc(sx, topY - h * 0.44, Math.max(1, h * 0.022), 0, Math.PI * 2); ctx.fill();
  }
}

// ── Cherry blossoms ───────────────────────────────────────────────────

function drawCherryBlossoms(ctx: CanvasRenderingContext2D, ls: LocalState) {
  ls.cherryFlowers.forEach((fl: CherryFlower) => {
    // Give petals a virtual altitude (40–120 world units = floating in the air)
    const altitude = 60 + (fl.id % 7) * 10;
    const p = project(ls.tug.x, ls.tug.y, ls.tug.heading, fl.x, fl.y, altitude);
    if (!p || p.sy > DASH_TOP || p.sy < -40) return;
    const scale = Math.max(0.3, Math.min(3.5, 220 / p.dist));
    const bearing = relBearing(ls.tug.x, ls.tug.y, ls.tug.heading, fl.x, fl.y);
    const edgeFade = Math.min(1, (HALF_FOV + 10 - Math.abs(bearing)) / 10);
    ctx.save();
    ctx.globalAlpha = Math.min(0.95, scale * 0.7) * edgeFade;
    ctx.translate(p.sx, p.sy);
    ctx.rotate(fl.rot);
    const n = 5;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i / n) * Math.PI * 2);
      const pg = ctx.createLinearGradient(0, -10 * scale, 0, 3 * scale);
      pg.addColorStop(0, "#fff8fc");
      pg.addColorStop(0.45, "#ffc8e0");
      pg.addColorStop(1, "#ff9ec8");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(0, -5.5 * scale, 2.8 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#ffeef6";
    ctx.beginPath();
    ctx.arc(0, 0, 2.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4d060";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 1.2 * scale, Math.sin(a) * 1.2 * scale, 0.45 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

// ── Fog ───────────────────────────────────────────────────────────────

function drawFog(ctx: CanvasRenderingContext2D, w: { fog: number }) {
  const fg = ctx.createLinearGradient(0, HORIZ_Y - 30, 0, HORIZ_Y + 90);
  fg.addColorStop(0, "rgba(160,180,190,0)");
  fg.addColorStop(1, `rgba(160,180,190,${w.fog * 0.65})`);
  ctx.fillStyle = fg;
  ctx.fillRect(0, HORIZ_Y - 30, CW, 120);
  if (w.fog > 0.4) {
    ctx.fillStyle = `rgba(160,180,190,${w.fog * 0.25})`;
    ctx.fillRect(0, 0, CW, DASH_TOP);
  }
}

// ── Wheelhouse ────────────────────────────────────────────────────────

function drawWheelhouse(ctx: CanvasRenderingContext2D, ls: LocalState) {
  // Side pillars (perspective-tapered)
  ctx.fillStyle = "#141008";
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(PILLAR_W, 0);
  ctx.lineTo(PILLAR_W, DASH_TOP); ctx.lineTo(0, CH);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = "#141008";
  ctx.beginPath();
  ctx.moveTo(CW, 0); ctx.lineTo(CW - PILLAR_W, 0);
  ctx.lineTo(CW - PILLAR_W, DASH_TOP); ctx.lineTo(CW, CH);
  ctx.closePath(); ctx.fill();

  // Inner pillar bevel
  ctx.fillStyle = "rgba(70,55,25,0.4)";
  ctx.beginPath();
  ctx.moveTo(PILLAR_W, 0); ctx.lineTo(PILLAR_W + 14, 0);
  ctx.lineTo(PILLAR_W + 20, DASH_TOP); ctx.lineTo(PILLAR_W, DASH_TOP);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(CW - PILLAR_W, 0); ctx.lineTo(CW - PILLAR_W - 14, 0);
  ctx.lineTo(CW - PILLAR_W - 20, DASH_TOP); ctx.lineTo(CW - PILLAR_W, DASH_TOP);
  ctx.closePath(); ctx.fill();

  // Window trim
  ctx.strokeStyle = "rgba(140,110,50,0.3)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(PILLAR_W, 0, CW - PILLAR_W * 2, DASH_TOP);

  // Glass glare
  const glare = ctx.createLinearGradient(PILLAR_W, 0, CW - PILLAR_W, 50);
  glare.addColorStop(0, "rgba(255,255,255,0)");
  glare.addColorStop(0.4, "rgba(255,255,255,0.03)");
  glare.addColorStop(0.55, "rgba(255,255,255,0.06)");
  glare.addColorStop(0.7, "rgba(255,255,255,0.03)");
  glare.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glare;
  ctx.fillRect(PILLAR_W, 0, CW - PILLAR_W * 2, 50);

  // Dashboard
  const dg = ctx.createLinearGradient(0, DASH_TOP, 0, CH);
  dg.addColorStop(0, "#252015");
  dg.addColorStop(0.2, "#191408");
  dg.addColorStop(1, "#080602");
  ctx.fillStyle = dg;
  ctx.fillRect(0, DASH_TOP, CW, CH - DASH_TOP);
  ctx.fillStyle = "#38301a";
  ctx.fillRect(0, DASH_TOP, CW, 3);
  ctx.fillStyle = "rgba(255,200,80,0.1)";
  ctx.fillRect(0, DASH_TOP + 3, CW, 1);

  const dashH = CH - DASH_TOP;
  const midY = DASH_TOP + dashH * 0.46;

  // Instruments
  drawFPVCompass(ctx, 148, midY, 40, ls.tug.heading);
  drawFPVGauge(ctx, CW - 148, midY, 40, "SPEED", ls.tug.speed, 18, "#30e080");
  drawSteeringWheel(ctx, SCENE_CX, DASH_TOP + dashH * 0.52, 48, ls.tug.rudder);

  // Digital heading
  ctx.fillStyle = "rgba(50,220,90,0.92)";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`HDG  ${String(Math.round(ls.tug.heading) % 360).padStart(3, "0")}°`, SCENE_CX, DASH_TOP + 15);

  // Indicator lights
  const lights: Array<{ label: string; on: boolean; col: string }> = [
    { label: "ENG",  on: true,                    col: "#30e070" },
    { label: "NAV",  on: true,                    col: "#30b0ff" },
    { label: "FOG",  on: ls.zone === "sea_lanes", col: "#ffcc30" },
    { label: "PORT", on: ls.zone === "port",       col: "#ff8030" },
  ];
  lights.forEach(({ label, on, col }, i) => {
    const lx = SCENE_CX - 72 + i * 48;
    const ly = DASH_TOP + dashH * 0.82;
    ctx.fillStyle = on ? col : "rgba(255,255,255,0.09)";
    if (on) { ctx.shadowColor = col; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = on ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)";
    ctx.font = "6px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, lx, ly + 12);
  });
}

// ── Mini-map ──────────────────────────────────────────────────────────

function drawMiniMap(ctx: CanvasRenderingContext2D, ls: LocalState) {
  const mx = MM_X;
  const my = MM_Y;

  // Background
  ctx.fillStyle = "rgba(8,14,20,0.82)";
  ctx.beginPath();
  ctx.roundRect(mx, my, MM_W, MM_H, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(80,150,200,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx, my, MM_W, MM_H, 4);
  ctx.stroke();

  // Clip to map area
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mx + 1, my + 1, MM_W - 2, MM_H - 2, 3);
  ctx.clip();

  // Convert world coords to map coords (centred on tug)
  const toMap = (wx: number, wy: number) => ({
    x: mx + MM_W / 2 + (wx - ls.tug.x) * MM_SCALE,
    y: my + MM_H / 2 + (wy - ls.tug.y) * MM_SCALE,
  });

  // Zone colour bands
  const zones = [
    { wx: 0,    ww: 4500, col: "rgba(40,160,70,0.14)" },
    { wx: 4500, ww: 3700, col: "rgba(40,120,200,0.14)" },
    { wx: 8200, ww: 4000, col: "rgba(80,160,220,0.12)" },
  ];
  zones.forEach(({ wx, ww, col }) => {
    const a = toMap(wx, ls.tug.y - 2000);
    const b = toMap(wx + ww, ls.tug.y + 2000);
    ctx.fillStyle = col;
    ctx.fillRect(a.x, my, b.x - a.x, MM_H);
  });

  // Water background
  ctx.fillStyle = "rgba(20,50,80,0.4)";
  ctx.fillRect(mx, my, MM_W, MM_H);
  // Re-draw zones on top of water
  zones.forEach(({ wx, ww, col }) => {
    const a = toMap(wx, ls.tug.y - 2000);
    const b = toMap(wx + ww, ls.tug.y + 2000);
    ctx.fillStyle = col;
    ctx.fillRect(Math.max(mx, a.x), my, Math.min(b.x - a.x, MM_W), MM_H);
  });

  // Other ships (gray dots)
  const others: Array<{ v: LocalVessel; col: string }> = [
    { v: ls.cargo, col: "#5a8ab8" },
    { v: ls.ferry, col: "#7a9aba" },
    ...ls.fishers.map((f) => ({ v: f, col: "#8a7050" })),
    ...ls.traffic.map((t) => ({ v: t, col: "#607080" })),
  ];
  others.forEach(({ v, col }) => {
    if (v.sunk) return;
    const p = toMap(v.x, v.y);
    if (p.x < mx || p.x > mx + MM_W || p.y < my || p.y > my + MM_H) return;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
  });

  // Escort (green dot with heading tick)
  {
    const ep = toMap(ls.escort.x, ls.escort.y);
    if (ep.x >= mx && ep.x <= mx + MM_W && ep.y >= my && ep.y <= my + MM_H) {
      ctx.fillStyle = "#60cc60";
      ctx.beginPath(); ctx.arc(ep.x, ep.y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Tug (white dot + heading arrow)
  const tp = toMap(ls.tug.x, ls.tug.y);
  const hdgRad = (ls.tug.heading * Math.PI) / 180;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tp.x, tp.y);
  ctx.lineTo(tp.x + Math.sin(hdgRad) * 10, tp.y - Math.cos(hdgRad) * 10);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(tp.x, tp.y, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#30b0ff";
  ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(tp.x, tp.y, 3.5, 0, Math.PI * 2); ctx.stroke();

  // FOV cone
  const fovL = hdgRad - (HALF_FOV * Math.PI) / 180;
  const fovR = hdgRad + (HALF_FOV * Math.PI) / 180;
  const fovLen = 28;
  ctx.fillStyle = "rgba(100,180,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(tp.x, tp.y);
  ctx.lineTo(tp.x + Math.sin(fovL) * fovLen, tp.y - Math.cos(fovL) * fovLen);
  ctx.arc(tp.x, tp.y, fovLen, fovL - Math.PI / 2, fovR - Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(100,180,255,0.3)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.restore();

  // North arrow
  ctx.fillStyle = "rgba(255,60,60,0.9)";
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("N↑", mx + MM_W - 4, my + 11);

  // Label
  ctx.fillStyle = "rgba(160,200,240,0.7)";
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("MAP", mx + 5, my + 11);

  // Zone badge
  const zc = ls.zone === "port" ? "#ffaa60" : ls.zone === "channel" ? "#50a0e8" : ls.zone === "sea_lanes" ? "#60c0ff" : "#40cc80";
  ctx.fillStyle = zc;
  ctx.font = "6px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(ls.zone.replace(/_/g, " ").toUpperCase(), mx + MM_W / 2, my + MM_H - 4);
}

// ── Steering wheel ────────────────────────────────────────────────────

function drawSteeringWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rudder: number) {
  const rot = (rudder / 35) * ((Math.PI * 5) / 6);
  ctx.fillStyle = "#242018";
  ctx.fillRect(cx - 7, cy + r + 2, 14, 24);
  ctx.fillRect(cx - 22, cy + r + 24, 44, 5);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(0, 2, r, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = "#8a6438";
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = "rgba(200,160,80,0.4)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -1, r - 2, -Math.PI * 0.65, -Math.PI * 0.05);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.strokeStyle = "rgba(70,44,18,0.6)";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, r, a, a + 0.22); ctx.stroke();
  }

  ctx.strokeStyle = "#5a3e1e";
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }

  const hub = ctx.createRadialGradient(0, -2, 2, 0, 0, 11);
  hub.addColorStop(0, "#c08850"); hub.addColorStop(0.5, "#7a5030"); hub.addColorStop(1, "#3a2010");
  ctx.fillStyle = hub;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── Speed gauge ───────────────────────────────────────────────────────

function drawFPVGauge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, label: string, value: number, maxVal: number, col: string) {
  const bz = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.4, cx, cy, r + 6);
  bz.addColorStop(0, "#3a3020"); bz.addColorStop(1, "#1a1810");
  ctx.fillStyle = bz;
  ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#4a3c1c"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = "#060504";
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  const arcS = Math.PI * 0.72, arcE = Math.PI * 2.28;
  for (let i = 0; i <= 10; i++) {
    const a = arcS + (i / 10) * (arcE - arcS);
    const inner = i % 5 === 0 ? r - 10 : r - 7;
    ctx.strokeStyle = i % 5 === 0 ? "rgba(200,190,150,0.7)" : "rgba(150,140,110,0.35)";
    ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }

  ctx.strokeStyle = "#1e1c10"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, r - 6, arcS, arcE); ctx.stroke();

  const pct = Math.max(0, Math.min(1, value / maxVal));
  ctx.strokeStyle = col; ctx.lineWidth = 5;
  ctx.shadowColor = col; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(cx, cy, r - 6, arcS, arcS + pct * (arcE - arcS)); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(200,200,180,0.5)"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(label, cx, cy + 5);
  ctx.fillStyle = col; ctx.font = "bold 10px monospace";
  ctx.fillText(value.toFixed(1), cx, cy + 16);
}

// ── Compass ───────────────────────────────────────────────────────────

function drawFPVCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, heading: number) {
  const bz = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.4, cx, cy, r + 6);
  bz.addColorStop(0, "#3a3020"); bz.addColorStop(1, "#1a1810");
  ctx.fillStyle = bz;
  ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#4a3c1c"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-heading * Math.PI) / 180);

  ctx.fillStyle = "#060504";
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

  const cards: Array<[string, number]> = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
  cards.forEach(([lbl, deg]) => {
    const a = (deg * Math.PI) / 180;
    ctx.fillStyle = lbl === "N" ? "#ff4040" : "rgba(200,195,160,0.75)";
    ctx.font = `bold ${lbl === "N" ? 9 : 7}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(lbl, Math.sin(a) * (r - 10), -Math.cos(a) * (r - 10));
  });
  ctx.textBaseline = "alphabetic";

  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const isMajor = i % 9 === 0;
    const inner = isMajor ? r - 12 : i % 3 === 0 ? r - 9 : r - 6;
    ctx.strokeStyle = isMajor ? "rgba(255,200,90,0.75)" : "rgba(200,190,150,0.22)";
    ctx.lineWidth = isMajor ? 1.5 : 0.7;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * inner, -Math.cos(a) * inner);
    ctx.lineTo(Math.sin(a) * (r - 1), -Math.cos(a) * (r - 1));
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "#ff4040";
  ctx.beginPath(); ctx.moveTo(cx, cy - r + 1); ctx.lineTo(cx - 4, cy - r + 11); ctx.lineTo(cx + 4, cy - r + 11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#7a5c28";
  ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
}
