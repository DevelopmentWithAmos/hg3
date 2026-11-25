import { ArenaDefinition, ArenaHazardSpec, ArenaObstacleSpec } from '../../types/game';
import { getHazardPhase } from '../../game/arenas';

const backdropImageCache = new Map<string, HTMLImageElement>();

function getLoadedBackdrop(url?: string): HTMLImageElement | null {
  if (!url || typeof Image === 'undefined') return null;
  let img = backdropImageCache.get(url);
  if (!img) {
    img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = url;
    backdropImageCache.set(url, img);
  }
  if (img.complete && img.naturalWidth > 0) return img;
  return null;
}

export interface PropVisual2D {
  hitBounce: number;
  brokenTimer: number;
}

export function drawArenaBackdrop2D(
  ctx: CanvasRenderingContext2D,
  arena: ArenaDefinition,
  width: number,
  height: number,
  floorY: number,
  camX: number,
  arenaTime: number,
  shadowsEnabled: boolean,
): void {
  // Base fallback sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, floorY);
  skyGrad.addColorStop(0, arena.skyColor);
  skyGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Parallax stage illustration
  const bgImg = getLoadedBackdrop(arena.backdropUrl);
  if (bgImg) {
    const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
    const viewH = Math.max(floorY + 30, height * 0.85);
    const drawH = Math.max(viewH, width / imgAspect);
    const drawW = drawH * imgAspect;
    const extraW = Math.max(0, drawW - width);
    const parallaxOffset = Math.max(-extraW * 0.5, Math.min(extraW * 0.5, -camX * 14));
    const drawX = (width - drawW) * 0.5 + parallaxOffset;
    const drawY = Math.min(0, floorY - drawH * 0.82);

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Subtle horizon atmosphere scrim for fighter contrast
  const scrim = ctx.createLinearGradient(0, floorY - 190, 0, floorY);
  scrim.addColorStop(0, 'rgba(2, 6, 23, 0)');
  scrim.addColorStop(1, 'rgba(2, 6, 23, 0.52)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, floorY - 190, width, 190);

  // Dynamic spotlights when Stage FX & Shadows enabled
  if (shadowsEnabled) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sway = Math.sin(arenaTime * 1.1) * 45;
    const beamLeft = ctx.createLinearGradient(width * 0.15, 0, width * 0.4 + sway, floorY);
    beamLeft.addColorStop(0, `${arena.accentColor}2e`);
    beamLeft.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beamLeft;
    ctx.beginPath();
    ctx.moveTo(width * 0.12, 0);
    ctx.lineTo(width * 0.22, 0);
    ctx.lineTo(width * 0.48 + sway, floorY);
    ctx.lineTo(width * 0.28 + sway, floorY);
    ctx.closePath();
    ctx.fill();

    const beamRight = ctx.createLinearGradient(width * 0.85, 0, width * 0.6 - sway, floorY);
    beamRight.addColorStop(0, `${arena.rimColor}28`);
    beamRight.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beamRight;
    ctx.beginPath();
    ctx.moveTo(width * 0.78, 0);
    ctx.lineTo(width * 0.88, 0);
    ctx.lineTo(width * 0.72 - sway, floorY);
    ctx.lineTo(width * 0.52 - sway, floorY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawArenaStageFloorAndProps2D(
  ctx: CanvasRenderingContext2D,
  arena: ArenaDefinition,
  worldToScreenX: (wx: number) => number,
  floorY: number,
  ppm: number,
  width: number,
  height: number,
  arenaTime: number,
  propVisuals: Record<string, PropVisual2D>,
): void {
  const leftEdge = worldToScreenX(-arena.playableRadius);
  const rightEdge = worldToScreenX(arena.playableRadius);

  // Stage surface fill below horizon
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
  if (arena.id === 'wrestling') {
    floorGrad.addColorStop(0, '#1e293b');
    floorGrad.addColorStop(0.18, '#0f172a');
    floorGrad.addColorStop(1, '#020617');
  } else if (arena.id === 'street') {
    floorGrad.addColorStop(0, '#27272a');
    floorGrad.addColorStop(0.2, '#18181b');
    floorGrad.addColorStop(1, '#09090b');
  } else if (arena.id === 'rooftop') {
    floorGrad.addColorStop(0, '#334155');
    floorGrad.addColorStop(0.22, '#1e293b');
    floorGrad.addColorStop(1, '#0f172a');
  } else if (arena.id === 'cricket_stadium') {
    floorGrad.addColorStop(0, '#14532d');
    floorGrad.addColorStop(0.22, '#052e16');
    floorGrad.addColorStop(1, '#02170b');
  } else if (arena.id === 'studio_set') {
    floorGrad.addColorStop(0, '#451a03');
    floorGrad.addColorStop(0.22, '#271004');
    floorGrad.addColorStop(1, '#120702');
  } else if (arena.id === 'dhaba_highway') {
    floorGrad.addColorStop(0, '#3b2820');
    floorGrad.addColorStop(0.22, '#211612');
    floorGrad.addColorStop(1, '#100a08');
  } else if (arena.id === 'parliament_hall') {
    floorGrad.addColorStop(0, '#334155');
    floorGrad.addColorStop(0.2, '#1e293b');
    floorGrad.addColorStop(1, '#0b1120');
  } else {
    floorGrad.addColorStop(0, '#3f2e3e');
    floorGrad.addColorStop(0.22, '#241428');
    floorGrad.addColorStop(1, '#120714');
  }
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, width, height - floorY);

  // Arena-specific floor details & ring ropes
  if (arena.id === 'wrestling') {
    // Back ring ropes behind fighters
    const ropeYOffsets = [-1.35 * ppm, -0.92 * ppm, -0.5 * ppm];
    const ropeColors = ['#ef4444', '#f8fafc', '#3b82f6'];
    ropeYOffsets.forEach((off, idx) => {
      ctx.strokeStyle = ropeColors[idx];
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(leftEdge, floorY + off);
      ctx.lineTo(rightEdge, floorY + off);
      ctx.stroke();
    });
    // Apron trim
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(leftEdge - 10, floorY, rightEdge - leftEdge + 20, 8);
  } else if (arena.id === 'street') {
    // Curb & yellow center road dashes
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(0, floorY - 4, width, 6);
    ctx.fillStyle = '#facc15';
    for (let x = -8; x <= 8; x += 2.4) {
      const sx = worldToScreenX(x);
      ctx.fillRect(sx - 28, floorY + 18, 56, 5);
    }
  } else if (arena.id === 'rooftop') {
    // Yellow helipad perimeter line + H pad glow
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(leftEdge, floorY, rightEdge - leftEdge, 5);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.fillRect(worldToScreenX(-1.8), floorY + 10, 3.6 * ppm, 8);
  } else if (arena.id === 'wedding') {
    // Velvet carpet runner along center stage
    const rugL = worldToScreenX(-4.8);
    const rugR = worldToScreenX(4.8);
    ctx.fillStyle = '#be123c';
    ctx.fillRect(rugL, floorY, rugR - rugL, 12);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.strokeRect(rugL, floorY, rugR - rugL, 12);
  } else if (arena.id === 'cricket_stadium') {
    // Outfield stripes + center clay cricket pitch strip & white crease lines
    const pitchL = worldToScreenX(-3.2);
    const pitchR = worldToScreenX(3.2);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(pitchL, floorY, pitchR - pitchL, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(worldToScreenX(-2.5), floorY, 4, 14);
    ctx.fillRect(worldToScreenX(2.5), floorY, 4, 14);
    ctx.fillRect(worldToScreenX(-0.9), floorY + 2, 2, 10);
    ctx.fillRect(worldToScreenX(0.9), floorY + 2, 2, 10);
    // Boundary rope cushions
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(leftEdge, floorY, 26, 7);
    ctx.fillRect(rightEdge - 26, floorY, 26, 7);
  } else if (arena.id === 'studio_set') {
    // Grand VIP red carpet & gold trim + studio floor tape marks
    const rugL = worldToScreenX(-6.0);
    const rugR = worldToScreenX(6.0);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(rugL, floorY, rugR - rugL, 14);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(rugL, floorY, rugR - rugL, 14);
    ctx.fillStyle = '#fef08a';
    for (let x = -5.5; x <= 5.5; x += 2.2) {
      ctx.fillRect(worldToScreenX(x) - 10, floorY + 20, 20, 3);
    }
  } else if (arena.id === 'dhaba_highway') {
    // Highway curb + painted stone courtyard dashes & warm lantern dots
    ctx.fillStyle = '#78350f';
    ctx.fillRect(leftEdge, floorY, rightEdge - leftEdge, 6);
    ctx.fillStyle = '#fb923c';
    for (let x = -7.5; x <= 7.5; x += 2.5) {
      ctx.fillRect(worldToScreenX(x) - 24, floorY + 18, 48, 4);
    }
  } else if (arena.id === 'parliament_hall') {
    // Marble floor inlay + dual emerald & crimson Sabha carpet runners
    const leftCarpetL = worldToScreenX(-6.8);
    const leftCarpetR = worldToScreenX(-1.2);
    const rightCarpetL = worldToScreenX(1.2);
    const rightCarpetR = worldToScreenX(6.8);
    ctx.fillStyle = '#047857';
    ctx.fillRect(leftCarpetL, floorY, leftCarpetR - leftCarpetL, 12);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(rightCarpetL, floorY, rightCarpetR - rightCarpetL, 12);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(leftCarpetL, floorY, leftCarpetR - leftCarpetL, 12);
    ctx.strokeRect(rightCarpetL, floorY, rightCarpetR - rightCarpetL, 12);
  }

  // Crisp glowing stage horizon rim
  ctx.strokeStyle = arena.accentColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(width, floorY);
  ctx.stroke();

  // Boundary markers
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(leftEdge - 4, floorY - 26, 8, 26);
  ctx.fillRect(rightEdge - 4, floorY - 26, 8, 26);

  // Draw Interactive Hazards on Floor
  for (let i = 0; i < arena.hazards.length; i++) {
    drawHazard2D(ctx, arena.hazards[i], worldToScreenX, floorY, ppm, arenaTime);
  }

  // Draw Interactive Stage Obstacles / Props
  for (let i = 0; i < arena.obstacles.length; i++) {
    const obs = arena.obstacles[i];
    const vis = propVisuals[obs.id];
    drawObstacle2D(ctx, obs, worldToScreenX, floorY, ppm, vis);
  }
}

function drawHazard2D(
  ctx: CanvasRenderingContext2D,
  haz: ArenaHazardSpec,
  worldToScreenX: (wx: number) => number,
  floorY: number,
  ppm: number,
  arenaTime: number,
): void {
  const sx = worldToScreenX(haz.x);
  const radPx = haz.radius * ppm;
  const phase = getHazardPhase(haz, arenaTime);

  ctx.save();
  if (haz.kind === 'bounce_pad') {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = haz.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(sx - radPx * 0.72, floorY - 12, radPx * 1.44, 14, 5);
    ctx.fill();
    ctx.stroke();

    // Updraft arrow chevrons
    const bob = Math.sin(arenaTime * 8) * 5;
    ctx.strokeStyle = haz.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(sx - 12, floorY - 22 + bob);
    ctx.lineTo(sx, floorY - 32 + bob);
    ctx.lineTo(sx + 12, floorY - 22 + bob);
    ctx.stroke();
  } else if (haz.kind === 'slip') {
    // Slick shiny puddle + banana/champagne hint
    ctx.fillStyle = `${haz.color}88`;
    ctx.beginPath();
    ctx.ellipse(sx, floorY + 3, radPx * 0.85, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Periodic hazards: steam_geyser, zapper, confetti_cannon
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = phase === 'calm' ? '#475569' : phase === 'warning' ? '#facc15' : haz.color;
    ctx.lineWidth = phase === 'calm' ? 1.5 : 3;
    ctx.beginPath();
    ctx.roundRect(sx - radPx * 0.6, floorY - 8, radPx * 1.2, 10, 4);
    ctx.fill();
    ctx.stroke();

    if (phase === 'warning') {
      const pulse = 0.55 + Math.sin(arenaTime * 20) * 0.45;
      ctx.fillStyle = `rgba(250, 204, 21, ${0.28 * pulse})`;
      ctx.fillRect(sx - radPx * 0.55, floorY - 120, radPx * 1.1, 112);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px "Russo One", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx, floorY - 22);
    } else if (phase === 'active') {
      const beamGrad = ctx.createLinearGradient(sx, floorY, sx, floorY - 175);
      beamGrad.addColorStop(0, `${haz.color}cc`);
      beamGrad.addColorStop(1, `${haz.color}00`);
      ctx.fillStyle = beamGrad;
      ctx.fillRect(sx - radPx * 0.65, floorY - 175, radPx * 1.3, 175);
    }
  }
  ctx.restore();
}

function drawObstacle2D(
  ctx: CanvasRenderingContext2D,
  obs: ArenaObstacleSpec,
  worldToScreenX: (wx: number) => number,
  floorY: number,
  ppm: number,
  vis?: PropVisual2D,
): void {
  const sx = worldToScreenX(obs.x);
  const wPx = obs.radius * 1.65 * ppm;
  const hPx = obs.height * ppm * 0.85;

  if (vis && vis.brokenTimer > 0) {
    // Respawn outline indicator
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - wPx * 0.45, floorY - hPx, wPx * 0.9, hPx);
    ctx.restore();
    return;
  }

  const bounceScale = vis && vis.hitBounce > 0 ? 1 + vis.hitBounce * 0.14 : 1;

  ctx.save();
  ctx.translate(sx, floorY);
  ctx.scale(bounceScale, 2 - bounceScale);

  if (obs.kind === 'crate') {
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(-wPx * 0.5, -hPx, wPx, hPx);
    ctx.strokeRect(-wPx * 0.5, -hPx, wPx, hPx);
    // Diagonal crate brace
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-wPx * 0.45, -hPx + 4);
    ctx.lineTo(wPx * 0.45, -4);
    ctx.moveTo(wPx * 0.45, -hPx + 4);
    ctx.lineTo(-wPx * 0.45, -4);
    ctx.stroke();
  } else if (obs.kind === 'hydrant') {
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-16, -hPx * 0.82, 32, hPx * 0.82, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -hPx * 0.82, 16, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    // Side nozzles
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-23, -hPx * 0.56, 7, 11);
    ctx.fillRect(16, -hPx * 0.56, 7, 11);
  } else if (obs.kind === 'cone') {
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-6, -hPx);
    ctx.lineTo(6, -hPx);
    ctx.lineTo(20, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-11, -hPx * 0.58, 22, 10);
  } else if (obs.kind === 'turnbuckle') {
    ctx.fillStyle = '#475569';
    ctx.fillRect(-8, -hPx, 16, hPx);
    ctx.fillStyle = obs.x < 0 ? '#0284c7' : '#e11d48';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, -hPx * 0.92, 28, 20, 4);
    ctx.roundRect(-14, -hPx * 0.62, 28, 20, 4);
    ctx.roundRect(-14, -hPx * 0.32, 28, 20, 4);
    ctx.fill();
    ctx.stroke();
  } else if (obs.kind === 'ac_unit') {
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(-wPx * 0.5, -hPx, wPx, hPx);
    ctx.strokeRect(-wPx * 0.5, -hPx, wPx, hPx);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, -hPx * 0.5, wPx * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (obs.kind === 'antenna') {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(0, -hPx);
    ctx.lineTo(12, 0);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -hPx, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (obs.kind === 'cake') {
    // 3-tier wedding cake!
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#fdf2f8';
    ctx.fillRect(-wPx * 0.48, -hPx * 0.36, wPx * 0.96, hPx * 0.36);
    ctx.strokeRect(-wPx * 0.48, -hPx * 0.36, wPx * 0.96, hPx * 0.36);
    ctx.fillRect(-wPx * 0.34, -hPx * 0.68, wPx * 0.68, hPx * 0.32);
    ctx.strokeRect(-wPx * 0.34, -hPx * 0.68, wPx * 0.68, hPx * 0.32);
    ctx.fillRect(-wPx * 0.2, -hPx * 0.95, wPx * 0.4, hPx * 0.27);
    ctx.strokeRect(-wPx * 0.2, -hPx * 0.95, wPx * 0.4, hPx * 0.27);
    // Pink frosting trims
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(-wPx * 0.48, -hPx * 0.36, wPx * 0.96, 6);
    ctx.fillRect(-wPx * 0.34, -hPx * 0.68, wPx * 0.68, 6);
  } else if (obs.kind === 'table') {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(-wPx * 0.48, -hPx, wPx * 0.96, hPx);
    ctx.strokeRect(-wPx * 0.48, -hPx, wPx * 0.96, hPx);
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(-wPx * 0.48, -hPx, wPx * 0.96, 12);
  } else if (obs.kind === 'wickets') {
    // 3 wooden cricket stumps + top bails
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.fillStyle = '#fde68a';
    const stumpOffsets = [-11, -2.5, 6];
    for (let s = 0; s < stumpOffsets.length; s++) {
      ctx.fillRect(stumpOffsets[s], -hPx, 5, hPx);
      ctx.strokeRect(stumpOffsets[s], -hPx, 5, hPx);
    }
    // Bails
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-12, -hPx - 4, 11, 4);
    ctx.fillRect(1, -hPx - 4, 11, 4);
  } else if (obs.kind === 'podium') {
    // Ornate wooden debate speaker podium + mic
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fillRect(-wPx * 0.42, -hPx * 0.84, wPx * 0.84, hPx * 0.84);
    ctx.strokeRect(-wPx * 0.42, -hPx * 0.84, wPx * 0.84, hPx * 0.84);
    // Top lectern slab
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-wPx * 0.5, -hPx * 0.92, wPx, 10);
    ctx.strokeRect(-wPx * 0.5, -hPx * 0.92, wPx, 10);
    // Brass emblem circle
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, -hPx * 0.48, 7, 0, Math.PI * 2);
    ctx.fill();
    // Gooseneck mic
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -hPx * 0.92);
    ctx.quadraticCurveTo(8, -hPx * 1.12, -4, -hPx * 1.14);
    ctx.stroke();
  }

  ctx.restore();
}
