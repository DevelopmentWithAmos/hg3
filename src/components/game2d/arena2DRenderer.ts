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

export type ArenaLightingTier = 'calm' | 'heated' | 'critical' | 'climax';

export interface ArenaLightingState {
  tier: ArenaLightingTier;
  /** 0 (full health / calm) -> 1 (critical / near-KO) */
  intensity: number;
  /** 0..1 rhythmic pulse factor (gentle breath when calm, fast heartbeat when critical) */
  pulse: number;
  /** Current pulse frequency in rad/s */
  pulseSpeed: number;
  /** 0..1 danger level for Player 1 (left side bias) */
  playerDanger: number;
  /** 0..1 danger level for AI Bot (right side bias) */
  botDanger: number;
  /** 0..1 transient flash from heavy hits/specials/KO */
  impactBoost: number;
  /** Primary dynamic spotlight RGB [r,g,b] */
  primaryRgb: [number, number, number];
  /** Secondary dynamic spotlight RGB [r,g,b] */
  secondaryRgb: [number, number, number];
  /** Horizon rim RGB [r,g,b] */
  horizonRgb: [number, number, number];
  /** Edge vignette RGB [r,g,b] */
  vignetteRgb: [number, number, number];
  /** CSS rgb() string for crisp glowing horizon line */
  horizonColor: string;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  } else if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  return fallback;
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const k = clamp01(t);
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

function rgbaStr(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp01(alpha).toFixed(3)})`;
}

/**
 * Computes dynamic, health-reactive arena lighting colors, pulse cadence, and
 * side danger bias so stage atmosphere intensifies as fighters lose health.
 */
export function computeArenaLightingState(params: {
  playerHealthPct: number;
  botHealthPct: number;
  arenaTime: number;
  arenaAccentColor: string;
  arenaRimColor: string;
  impactFlash?: number;
  isMatchActive?: boolean;
}): ArenaLightingState {
  const {
    arenaTime,
    arenaAccentColor,
    arenaRimColor,
    impactFlash = 0,
    isMatchActive = true,
  } = params;

  const pHp = isMatchActive ? clamp01(params.playerHealthPct) : 1;
  const bHp = isMatchActive ? clamp01(params.botHealthPct) : 1;
  const minHp = Math.min(pHp, bHp);
  const avgHp = (pHp + bHp) * 0.5;

  const baseAccent = hexToRgb(arenaAccentColor, [56, 189, 248]);
  const baseRim = hexToRgb(arenaRimColor, [244, 63, 94]);

  // Intensity blends lowest fighter health (urgency) with overall match attrition
  const rawIntensity = isMatchActive ? clamp01(1 - (minHp * 0.68 + avgHp * 0.32)) : 0;
  const intensity = clamp01(Math.pow(rawIntensity, 0.92));

  const playerDanger = isMatchActive ? clamp01((0.48 - pHp) / 0.48) : 0;
  const botDanger = isMatchActive ? clamp01((0.48 - bHp) / 0.48) : 0;
  const bothCritical = isMatchActive && pHp <= 0.32 && bHp <= 0.32;

  let tier: ArenaLightingTier = 'calm';
  if (bothCritical) tier = 'climax';
  else if (minHp <= 0.35) tier = 'critical';
  else if (minHp <= 0.65) tier = 'heated';

  // Pulse cadence accelerates from calm breathing to urgent double-beat heartbeat
  const pulseSpeed =
    tier === 'climax'
      ? 9.2 + (1 - minHp) * 3.2
      : tier === 'critical'
        ? 6.4 + (1 - minHp) * 3.4
        : tier === 'heated'
          ? 3.4 + intensity * 2.2
          : 1.5;

  let pulse: number;
  if (tier === 'critical' || tier === 'climax') {
    // Heartbeat double-pulse wave (lub-dub) for dramatic low-health tension
    const phase = (arenaTime * (pulseSpeed / (Math.PI * 2))) % 1;
    const beat1 = Math.exp(-Math.pow((phase - 0.16) / 0.085, 2));
    const beat2 = 0.72 * Math.exp(-Math.pow((phase - 0.36) / 0.095, 2));
    pulse = clamp01(0.18 + Math.max(beat1, beat2) * 0.82);
  } else {
    pulse = 0.5 + 0.5 * Math.sin(arenaTime * pulseSpeed);
  }

  // Color palette progression:
  // Calm: arena native accent/rim -> Heated: molten amber/orange -> Critical: crimson/magenta + gold -> Climax: electric cyan-gold vs hot crimson
  const heatedAmber: [number, number, number] = [245, 158, 11];
  const heatedOrange: [number, number, number] = [251, 113, 133];
  const criticalCrimson: [number, number, number] = [239, 68, 68];
  const criticalGold: [number, number, number] = [250, 204, 21];
  const climaxCyan: [number, number, number] = [56, 189, 248];
  const climaxMagenta: [number, number, number] = [244, 63, 94];

  let primaryRgb: [number, number, number];
  let secondaryRgb: [number, number, number];
  let vignetteRgb: [number, number, number];

  if (!isMatchActive || intensity <= 0.02) {
    primaryRgb = baseAccent;
    secondaryRgb = baseRim;
    vignetteRgb = baseAccent;
  } else if (tier === 'climax') {
    const strobeMix = 0.5 + 0.5 * Math.sin(arenaTime * 11.5);
    primaryRgb = lerpRgb(climaxMagenta, criticalGold, strobeMix * 0.55);
    secondaryRgb = lerpRgb(climaxCyan, criticalCrimson, strobeMix * 0.6);
    vignetteRgb = lerpRgb(criticalCrimson, climaxMagenta, 0.45);
  } else if (intensity < 0.48) {
    const t = intensity / 0.48;
    primaryRgb = lerpRgb(baseAccent, heatedAmber, t * 0.85);
    secondaryRgb = lerpRgb(baseRim, heatedOrange, t * 0.8);
    vignetteRgb = lerpRgb(heatedAmber, criticalCrimson, t * 0.35);
  } else {
    const t = (intensity - 0.48) / 0.52;
    primaryRgb = lerpRgb(heatedAmber, criticalCrimson, t);
    secondaryRgb = lerpRgb(heatedOrange, criticalGold, t * 0.72);
    vignetteRgb = lerpRgb(heatedAmber, criticalCrimson, 0.35 + t * 0.65);
  }

  // Side-specific color shift when Player vs Bot is uniquely in danger
  if (isMatchActive && tier !== 'climax' && Math.abs(playerDanger - botDanger) > 0.15) {
    if (playerDanger > botDanger) {
      // Player in danger -> cooler warning red pulse on primary
      primaryRgb = lerpRgb(primaryRgb, criticalCrimson, playerDanger * 0.45);
    } else {
      // Bot close to KO -> triumphant blazing gold/orange surge
      primaryRgb = lerpRgb(primaryRgb, criticalGold, botDanger * 0.4);
      secondaryRgb = lerpRgb(secondaryRgb, heatedOrange, botDanger * 0.35);
    }
  }

  const impactBoost = clamp01(impactFlash);
  if (impactBoost > 0.01) {
    primaryRgb = lerpRgb(primaryRgb, [255, 245, 200], impactBoost * 0.35);
  }

  const horizonRgb = lerpRgb(baseAccent, primaryRgb, clamp01(intensity * 0.92 + impactBoost * 0.35));

  return {
    tier,
    intensity,
    pulse,
    pulseSpeed,
    playerDanger,
    botDanger,
    impactBoost,
    primaryRgb,
    secondaryRgb,
    horizonRgb,
    vignetteRgb,
    horizonColor: `rgb(${horizonRgb[0]}, ${horizonRgb[1]}, ${horizonRgb[2]})`,
  };
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
  lighting?: ArenaLightingState,
  focusScreenX?: number,
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

  // Health-reactive ambient atmospheric wash over the arena sky/backdrop
  if (lighting && (lighting.intensity > 0.03 || lighting.impactBoost > 0.03)) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const washAlpha =
      (0.06 + lighting.intensity * 0.17 + lighting.pulse * lighting.intensity * 0.11) +
      lighting.impactBoost * 0.14;
    const atmGrad = ctx.createRadialGradient(
      width * 0.5,
      floorY * 0.62,
      width * 0.06,
      width * 0.5,
      floorY * 0.62,
      width * 0.72,
    );
    atmGrad.addColorStop(0, rgbaStr(lighting.primaryRgb, washAlpha));
    atmGrad.addColorStop(0.55, rgbaStr(lighting.secondaryRgb, washAlpha * 0.55));
    atmGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = atmGrad;
    ctx.fillRect(0, 0, width, floorY + 12);

    // Subtle dramatic backdrop darkening at critical health to make spotlights & fighters pop
    if (lighting.intensity > 0.45) {
      ctx.globalCompositeOperation = 'source-over';
      const dramaDark = (lighting.intensity - 0.45) * 0.34;
      ctx.fillStyle = `rgba(4, 6, 16, ${dramaDark.toFixed(3)})`;
      ctx.fillRect(0, 0, width, floorY);
    }
    ctx.restore();
  }

  // Subtle horizon atmosphere scrim for fighter contrast
  const scrim = ctx.createLinearGradient(0, floorY - 190, 0, floorY);
  scrim.addColorStop(0, 'rgba(2, 6, 23, 0)');
  scrim.addColorStop(1, 'rgba(2, 6, 23, 0.52)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, floorY - 190, width, 190);

  // Dynamic volumetric spotlights (react in color, sweep speed, width & pulse to fighter health)
  if (shadowsEnabled) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const intensity = lighting?.intensity ?? 0;
    const pulse = lighting?.pulse ?? 0.5;
    const impact = lighting?.impactBoost ?? 0;
    const primaryRgb = lighting?.primaryRgb ?? hexToRgb(arena.accentColor, [56, 189, 248]);
    const secondaryRgb = lighting?.secondaryRgb ?? hexToRgb(arena.rimColor, [244, 63, 94]);

    const sweepSpeed = 1.1 + intensity * 2.1;
    const swayAmp = 45 + intensity * 65;
    const sway = Math.sin(arenaTime * sweepSpeed) * swayAmp;
    const beamAlphaLeft =
      0.18 + intensity * 0.18 + pulse * (0.04 + intensity * 0.16) + impact * 0.16;
    const beamAlphaRight =
      0.16 + intensity * 0.18 + (1 - pulse * 0.35) * (0.04 + intensity * 0.14) + impact * 0.14;
    const spreadBoost = intensity * 0.045;

    const beamLeft = ctx.createLinearGradient(width * 0.15, 0, width * 0.4 + sway, floorY);
    beamLeft.addColorStop(0, rgbaStr(primaryRgb, beamAlphaLeft));
    beamLeft.addColorStop(0.68, rgbaStr(primaryRgb, beamAlphaLeft * 0.38));
    beamLeft.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beamLeft;
    ctx.beginPath();
    ctx.moveTo(width * 0.11, 0);
    ctx.lineTo(width * 0.23, 0);
    ctx.lineTo(width * (0.48 + spreadBoost) + sway, floorY);
    ctx.lineTo(width * (0.28 - spreadBoost) + sway, floorY);
    ctx.closePath();
    ctx.fill();

    const beamRight = ctx.createLinearGradient(width * 0.85, 0, width * 0.6 - sway, floorY);
    beamRight.addColorStop(0, rgbaStr(secondaryRgb, beamAlphaRight));
    beamRight.addColorStop(0.68, rgbaStr(secondaryRgb, beamAlphaRight * 0.38));
    beamRight.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beamRight;
    ctx.beginPath();
    ctx.moveTo(width * 0.77, 0);
    ctx.lineTo(width * 0.89, 0);
    ctx.lineTo(width * (0.72 + spreadBoost) - sway, floorY);
    ctx.lineTo(width * (0.52 - spreadBoost) - sway, floorY);
    ctx.closePath();
    ctx.fill();

    // Overhead climax/critical tracking spotlight focusing on the low-health clash
    if (lighting && (lighting.intensity > 0.32 || lighting.impactBoost > 0.15)) {
      const targetX =
        typeof focusScreenX === 'number'
          ? Math.max(width * 0.16, Math.min(width * 0.84, focusScreenX))
          : width * 0.5;
      const centerAlpha =
        Math.max(0, lighting.intensity - 0.28) * (0.22 + lighting.pulse * 0.24) +
        lighting.impactBoost * 0.18;
      const centerHalfW = width * (0.11 + lighting.pulse * 0.035);
      const centerBeam = ctx.createLinearGradient(width * 0.5, 0, targetX, floorY);
      centerBeam.addColorStop(0, rgbaStr(lighting.primaryRgb, centerAlpha));
      centerBeam.addColorStop(0.65, rgbaStr(lighting.secondaryRgb, centerAlpha * 0.42));
      centerBeam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerBeam;
      ctx.beginPath();
      ctx.moveTo(width * 0.46, 0);
      ctx.lineTo(width * 0.54, 0);
      ctx.lineTo(targetX + centerHalfW, floorY);
      ctx.lineTo(targetX - centerHalfW, floorY);
      ctx.closePath();
      ctx.fill();
    }

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
  lighting?: ArenaLightingState,
  playerScreenX?: number,
  botScreenX?: number,
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

  // Dynamic pulsing stage floor light reflections & danger pools
  if (lighting && (lighting.intensity > 0.04 || lighting.impactBoost > 0.04)) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Horizon floor wash reflecting overhead arena lights
    const floorGlowH = Math.min(height - floorY, 54 + lighting.intensity * 42);
    const floorGlowAlpha =
      0.08 + lighting.intensity * 0.22 + lighting.pulse * lighting.intensity * 0.14 + lighting.impactBoost * 0.16;
    const floorLightGrad = ctx.createLinearGradient(0, floorY, 0, floorY + floorGlowH);
    floorLightGrad.addColorStop(0, rgbaStr(lighting.horizonRgb, floorGlowAlpha));
    floorLightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floorLightGrad;
    ctx.fillRect(0, floorY, width, floorGlowH);

    // Subtle pulsing floor aura beneath any fighter in critical danger
    const drawDangerFloorPool = (sx: number | undefined, danger: number, rgb: [number, number, number]) => {
      if (typeof sx !== 'number' || danger <= 0.08) return;
      const rx = (52 + danger * 42 + lighting.pulse * 18) * (ppm / 84);
      const ry = Math.max(10, rx * 0.22);
      const poolAlpha = danger * (0.16 + lighting.pulse * 0.22);
      const poolGrad = ctx.createRadialGradient(sx, floorY + 6, 4, sx, floorY + 6, rx);
      poolGrad.addColorStop(0, rgbaStr(rgb, poolAlpha));
      poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.ellipse(sx, floorY + 6, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawDangerFloorPool(playerScreenX, lighting.playerDanger, [239, 68, 68]);
    drawDangerFloorPool(botScreenX, lighting.botDanger, [250, 204, 21]);
    ctx.restore();
  }

  // Crisp glowing stage horizon rim (shifts color & glow with match intensity)
  ctx.save();
  if (lighting && (lighting.intensity > 0.05 || lighting.impactBoost > 0.05)) {
    ctx.shadowColor = lighting.horizonColor;
    ctx.shadowBlur = 6 + lighting.intensity * 14 + lighting.pulse * lighting.intensity * 10 + lighting.impactBoost * 12;
  }
  ctx.strokeStyle = lighting ? lighting.horizonColor : arena.accentColor;
  ctx.lineWidth = lighting ? 2.5 + lighting.intensity * 1.4 + lighting.pulse * lighting.intensity * 0.8 : 2.5;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(width, floorY);
  ctx.stroke();
  ctx.restore();

  // Boundary markers
  ctx.fillStyle = lighting && lighting.intensity > 0.5 ? lighting.horizonColor : '#f43f5e';
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

/**
 * Draws a subtle, foreground health-reactive lighting atmosphere pass (edge tension
 * vignette, low-health side danger rim, and heavy-hit bloom) after fighters are drawn
 * while keeping center stage crystal-clear for readability.
 */
export function drawArenaDynamicLightingOverlay2D(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lighting: ArenaLightingState,
): void {
  if (lighting.intensity <= 0.06 && lighting.impactBoost <= 0.03) return;

  ctx.save();

  // 1. Peripheral tension vignette — transparent across center arena, pulsing at edges
  if (lighting.intensity > 0.18) {
    const vigStrength =
      Math.max(0, lighting.intensity - 0.18) *
      (0.2 + lighting.pulse * (lighting.tier === 'critical' || lighting.tier === 'climax' ? 0.24 : 0.12));
    const maxR = Math.hypot(width * 0.52, height * 0.52);
    const vigGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.52,
      Math.min(width, height) * 0.34,
      width * 0.5,
      height * 0.52,
      maxR,
    );
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.68, rgbaStr(lighting.vignetteRgb, vigStrength * 0.22));
    vigGrad.addColorStop(1, rgbaStr(lighting.vignetteRgb, vigStrength));
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Asymmetric side-edge tension glow when Player (left) or Bot (right) is in critical danger
  if (lighting.playerDanger > 0.12) {
    const sideW = width * 0.18;
    const alpha = lighting.playerDanger * (0.14 + lighting.pulse * 0.18);
    const leftGrad = ctx.createLinearGradient(0, 0, sideW, 0);
    leftGrad.addColorStop(0, `rgba(239, 68, 68, ${clamp01(alpha).toFixed(3)})`);
    leftGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, sideW, height);
  }

  if (lighting.botDanger > 0.12) {
    const sideW = width * 0.18;
    const alpha = lighting.botDanger * (0.12 + lighting.pulse * 0.16);
    const rightGrad = ctx.createLinearGradient(width, 0, width - sideW, 0);
    rightGrad.addColorStop(0, `rgba(251, 146, 60, ${clamp01(alpha).toFixed(3)})`);
    rightGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(width - sideW, 0, sideW, height);
  }

  // 3. Transient impact bloom on heavy attacks, specials, and K.O. blows
  if (lighting.impactBoost > 0.04) {
    ctx.globalCompositeOperation = 'screen';
    const bloomGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      20,
      width * 0.5,
      height * 0.48,
      Math.max(width, height) * 0.62,
    );
    bloomGrad.addColorStop(0, rgbaStr(lighting.primaryRgb, lighting.impactBoost * 0.18));
    bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloomGrad;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}
