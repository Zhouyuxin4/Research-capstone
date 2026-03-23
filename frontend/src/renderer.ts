import { CH, CW, WEATHER_CFG, type WeatherKey } from "./constants";
import type { LocalState } from "./types";

export function render(ctx: CanvasRenderingContext2D, ls: LocalState, weather: WeatherKey) {
  const w = WEATHER_CFG[weather] ?? WEATHER_CFG.clear;
  const horizY = CH * 0.42;
  const toS = (wx: number, wy: number) => ({ x: wx - ls.cam.x + CW / 2, y: wy - ls.cam.y + CH / 2 });

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, horizY);
  sky.addColorStop(0, w.sky[0]);
  sky.addColorStop(1, w.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, horizY);

  // Mountains
  [
    [-80, 300, 200, "#3d5060", 48],
    [200, 280, 190, "#4a5a6a", 40],
    [460, 310, 215, "#3d5060", 52],
    [720, 270, 195, "#4a5a6a", 43],
    [980, 295, 205, "#3d5060", 46],
  ].forEach(([mx, mw, mh, mc, ms]) => {
    const sx = (((mx as number) - ls.cam.x * 0.15 + CW / 2 - 100 + 5000) % (CW + 400)) - 150;
    ctx.fillStyle = mc as string;
    ctx.beginPath();
    ctx.moveTo(sx, horizY);
    ctx.lineTo(sx + (mw as number) / 2, horizY - (mh as number));
    ctx.lineTo(sx + (mw as number), horizY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(240,246,252,0.82)";
    ctx.beginPath();
    ctx.moveTo(sx + (mw as number) / 2, horizY - (mh as number));
    ctx.lineTo(sx + (mw as number) / 2 - (ms as number), horizY - (mh as number) + (ms as number) * 1.5);
    ctx.lineTo(sx + (mw as number) / 2 + (ms as number), horizY - (mh as number) + (ms as number) * 1.5);
    ctx.closePath();
    ctx.fill();
  });

  // Buildings
  [
    [830, 26, 125, "#1e3048"],
    [860, 22, 92, "#2a3f5a"],
    [885, 34, 148, "#2d4460"],
    [922, 22, 106, "#1e3048"],
    [948, 28, 124, "#2a3f5a"],
    [1510, 24, 102, "#1e3048"],
    [1538, 36, 144, "#2d4460"],
    [1578, 20, 82, "#2a3f5a"],
  ].forEach(([bwx, bw, bh, bc]) => {
    const { x: bx } = toS(bwx as number, 0);
    if (bx < -50 || bx > CW + 50) return;
    ctx.fillStyle = bc as string;
    ctx.fillRect(bx, horizY - (bh as number) + 8, bw as number, (bh as number) - 8);
    ctx.fillStyle = "rgba(255,224,100,0.25)";
    for (let ry = horizY - (bh as number) + 14; ry < horizY - 4; ry += 10) {
      for (let rx = bx + 3; rx < bx + (bw as number) - 3; rx += 7) {
        if (Math.sin(rx * 2.7 + ry * 1.9) > 0.1) ctx.fillRect(rx, ry, 4, 5);
      }
    }
  });

  // Water
  const wg = ctx.createLinearGradient(0, horizY, 0, CH);
  wg.addColorStop(0, w.water[0]);
  wg.addColorStop(1, w.water[1]);
  ctx.fillStyle = wg;
  ctx.fillRect(0, horizY, CW, CH - horizY);

  // Waves
  for (let i = 0; i < 12; i++) {
    const wy = horizY + 14 + i * 17 + Math.sin(ls.time * 0.7 + i) * w.waves * 5;
    const wx = (i * 173 - ls.cam.x * 0.4 + 9000) % CW;
    ctx.strokeStyle = `rgba(255,255,255,${0.06 * w.waves})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.bezierCurveTo(wx + 16, wy - 2, wx + 36, wy + 2, wx + 60, wy);
    ctx.stroke();
  }

  // Zone bands
  [
    { wx: 0, w: 1100, col: "rgba(50,200,90,0.07)", brd: "rgba(50,200,90,0.35)", lbl: "OPEN WATER" },
    { wx: 1100, w: 500, col: "rgba(255,200,40,0.07)", brd: "rgba(255,200,40,0.35)", lbl: "HARBOUR ENTRY" },
    { wx: 1600, w: 1600, col: "rgba(255,120,40,0.07)", brd: "rgba(255,120,40,0.35)", lbl: "DOCKING ZONE" },
  ].forEach((z) => {
    const { x: zx } = toS(z.wx, horizY);
    const { x: zx2 } = toS(z.wx + z.w, horizY);
    if (zx2 < 0 || zx > CW) return;
    ctx.fillStyle = z.col;
    ctx.fillRect(zx, horizY, zx2 - zx, CH - horizY);
    ctx.strokeStyle = z.brd;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(zx, horizY);
    ctx.lineTo(zx, CH);
    ctx.stroke();
    ctx.setLineDash([]);
    if (zx > -50 && zx < CW - 10) {
      ctx.fillStyle = z.brd;
      ctx.font = "9px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(z.lbl, Math.max(4, zx + 5), horizY + 15);
    }
  });

  // Docks
  [
    [1200, 300, "#6a5a40"],
    [1660, 220, "#5a4a30"],
  ].forEach(([dwx, dw, dc]) => {
    const { x: dx, y: dy } = toS(dwx as number, 756);
    if (dx + (dw as number) < 0 || dx > CW) return;
    ctx.fillStyle = dc as string;
    ctx.fillRect(dx, dy, dw as number, 13);
    ctx.fillStyle = "#3a2a18";
    for (let p = dx + 10; p < dx + (dw as number); p += 20) ctx.fillRect(p, dy, 5, 20);
  });

  // Berth target
  const { x: bthX, y: bthY } = toS(1900, 762);
  ctx.strokeStyle = "rgba(255,220,50,0.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(bthX - 28, bthY - 18, 56, 36);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,220,50,0.15)";
  ctx.fillRect(bthX - 28, bthY - 18, 56, 36);
  ctx.fillStyle = "rgba(255,220,50,0.9)";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BERTH", bthX, bthY + 5);

  // Crane
  const { x: crx, y: cry } = toS(1320, 722);
  if (crx > -10 && crx < CW + 10) {
    ctx.fillStyle = "#5a5040";
    ctx.fillRect(crx - 4, cry - 88, 8, 88);
    ctx.fillRect(crx - 4, cry - 88, 70, 6);
    ctx.strokeStyle = "#4a4030";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(crx + 66, cry - 82);
    ctx.lineTo(crx + 66, cry - 8);
    ctx.stroke();
  }

  // Lighthouse
  const { x: lhx, y: lhy } = toS(1760, 722);
  if (lhx > -10 && lhx < CW + 10) {
    ctx.fillStyle = "#ede8dc";
    ctx.fillRect(lhx - 5, lhy - 58, 10, 58);
    ctx.fillStyle = "#cc3818";
    ctx.fillRect(lhx - 7, lhy - 66, 14, 10);
    ctx.save();
    ctx.translate(lhx, lhy - 62);
    ctx.rotate(ls.time * 1.4);
    ctx.fillStyle = "rgba(255,240,80,0.07)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(130, -22);
    ctx.lineTo(130, 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // AI ships
  const drawShip = (vx: number, vy: number, hdg: number, len: number, wid: number, hull: string, cabin: string, lbl: string, spd: number) => {
    const { x: sx, y: sy } = toS(vx, vy);
    if (sx < -80 || sx > CW + 80 || sy < horizY - 10 || sy > CH + 60) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate((hdg * Math.PI) / 180);
    if (spd > 0.5) {
      const wk = ctx.createRadialGradient(0, len * 0.55, 2, 0, len * 0.55, 40);
      wk.addColorStop(0, "rgba(255,255,255,0.18)");
      wk.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = wk;
      ctx.beginPath();
      ctx.moveTo(0, len * 0.4);
      ctx.lineTo(-28, len * 0.4 + 52);
      ctx.lineTo(28, len * 0.4 + 52);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(wid * 0.85, -len * 0.1);
    ctx.lineTo(wid, len * 0.55);
    ctx.lineTo(-wid, len * 0.55);
    ctx.lineTo(-wid * 0.85, -len * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cabin;
    ctx.fillRect(-wid * 0.5, -len * 0.2, wid, len * 0.55);
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(lbl, sx, sy + len + 13);
  };

  drawShip(ls.cargo.x, ls.cargo.y, ls.cargo.heading, 40, 17, "#3a5a78", "#4a6a88", "Cargo", ls.cargo.speed);
  drawShip(ls.ferry.x, ls.ferry.y, ls.ferry.heading, 32, 14, "#5a7a9a", "#6a8aaa", "BC Ferry", ls.ferry.speed);
  ls.fishers.forEach((f) => drawShip(f.x, f.y, f.heading, 13, 5, "#6a5030", "#8a7050", "", f.speed));

  // Tugboat
  const { x: tx, y: ty } = toS(ls.tug.x, ls.tug.y);
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate((ls.tug.heading * Math.PI) / 180);
  if (Math.abs(ls.tug.speed) > 0.3) {
    const wk = ctx.createRadialGradient(0, 16, 1, 0, 16, 36);
    wk.addColorStop(0, "rgba(255,255,255,0.25)");
    wk.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = wk;
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.lineTo(-24, 50);
    ctx.lineTo(24, 50);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#c85020";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(11, -4);
  ctx.lineTo(11, 14);
  ctx.lineTo(-11, 14);
  ctx.lineTo(-11, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d86030";
  ctx.fillRect(-10, -20, 20, 30);
  ctx.fillStyle = "#ece4d4";
  ctx.fillRect(-6, -9, 12, 14);
  ctx.fillStyle = "#6aa4d8";
  ctx.fillRect(-5, -7, 4, 5);
  ctx.fillRect(1, -7, 4, 5);
  ctx.fillStyle = "#444";
  ctx.fillRect(-3, -18, 6, 10);
  ctx.save();
  ctx.translate(0, 16);
  ctx.rotate((ls.tug.rudder * Math.PI) / 180);
  ctx.fillStyle = "#ffd040";
  ctx.fillRect(-1.5, 0, 3, 9);
  ctx.restore();
  ctx.restore();

  // Distance line
  const { x: csx, y: csy } = toS(ls.cargo.x, ls.cargo.y);
  const dist = Math.sqrt((ls.tug.x - ls.cargo.x) ** 2 + (ls.tug.y - ls.cargo.y) ** 2);
  if (dist < 220) {
    const col =
      dist < 65
        ? "rgba(255,50,30,0.7)"
        : dist < 130
          ? "rgba(255,180,30,0.5)"
          : "rgba(80,150,220,0.28)";
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(csx, csy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(dist)}m`, (tx + csx) / 2, (ty + csy) / 2 - 4);
  }

  // Rain
  if (w.rain) {
    ctx.strokeStyle = "rgba(150,185,225,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 80; i++) {
      const rx = (i * 137 + ls.time * 220) % CW;
      const ry = horizY + ((i * 97 + ls.time * 310) % (CH - horizY));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 3, ry + 12);
      ctx.stroke();
    }
  }

  // Fog
  if (w.fog > 0) {
    const fg = ctx.createLinearGradient(0, horizY, 0, horizY + 90);
    fg.addColorStop(0, "rgba(160,180,190,0)");
    fg.addColorStop(1, `rgba(160,180,190,${w.fog})`);
    ctx.fillStyle = fg;
    ctx.fillRect(0, horizY, CW, 90);
    if (w.fog > 0.5) {
      ctx.fillStyle = `rgba(160,180,190,${w.fog * 0.28})`;
      ctx.fillRect(0, 0, CW, CH);
    }
  }

  // Zone badge
  const zc = ls.zone === "docking_zone" ? "#ff8040" : ls.zone === "harbour_entry" ? "#ffcc40" : "#40cc80";
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(CW / 2 - 72, 7, 144, 22);
  ctx.fillStyle = zc;
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(ls.zone.replace(/_/g, " ").toUpperCase(), CW / 2, 22);
}

