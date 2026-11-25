import { CharacterDefinition, FighterMotionData } from '../../types/game';
import { GENERATED_SPRITE_SHEETS } from '../../game/generatedSpriteSheets';

export type SpriteAnimName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'punch'
  | 'kick'
  | 'block'
  | 'jump_crouch'
  | 'jump_rise'
  | 'jump_peak'
  | 'jump_land'
  | 'hurt'
  | 'victory'
  | 'defeat'
  | 'special';

export interface SpriteFrameSpec {
  url: string;
  sourceRect?: { x: number; y: number; w: number; h: number };
  /** Native pixel width of the cropped transparent PNG */
  w: number;
  /** Native pixel height of the cropped transparent PNG */
  h: number;
  /** Normalized horizontal torso pivot (0..1) so body stays anchored while limbs/beams extend forward */
  anchorX: number;
  /** Normalized vertical foot baseline (0..1) so feet sit flush on the stage floor */
  footY: number;
  /** Scale correction factor to normalize sprite sheet row sizes to CarryMinati's standing height */
  scaleFix: number;
}

export interface SpriteCharacterSheet {
  id: string;
  /** Target standing height in canvas pixels at worldScale = 1 (matches procedural 2D fighters) */
  baseStandingHeightPx: number;
  /** Native pixel height of the reference idle frame */
  refNativeHeight: number;
  frames: Record<string, SpriteFrameSpec>;
}

const CARRY_BASE = '/assets/characters/carryminati';

export const CARRYMINATI_SPRITE_SHEET: SpriteCharacterSheet = {
  id: 'carryminati',
  baseStandingHeightPx: 164,
  refNativeHeight: 122,
  frames: {
    idle_0: { url: `${CARRY_BASE}/idle_0.png`, w: 61, h: 122, anchorX: 0.44, footY: 0.984, scaleFix: 1.0 },
    idle_1: { url: `${CARRY_BASE}/idle_1.png`, w: 61, h: 122, anchorX: 0.44, footY: 0.984, scaleFix: 1.0 },
    idle_2: { url: `${CARRY_BASE}/idle_2.png`, w: 62, h: 122, anchorX: 0.44, footY: 0.984, scaleFix: 1.0 },
    idle_3: { url: `${CARRY_BASE}/idle_3.png`, w: 67, h: 123, anchorX: 0.42, footY: 0.984, scaleFix: 1.0 },

    walk_0: { url: `${CARRY_BASE}/walk_0.png`, w: 74, h: 121, anchorX: 0.5, footY: 0.984, scaleFix: 1.0 },
    walk_1: { url: `${CARRY_BASE}/walk_1.png`, w: 64, h: 122, anchorX: 0.49, footY: 0.984, scaleFix: 1.0 },
    walk_2: { url: `${CARRY_BASE}/walk_2.png`, w: 67, h: 120, anchorX: 0.47, footY: 0.983, scaleFix: 1.0 },
    walk_3: { url: `${CARRY_BASE}/walk_3.png`, w: 71, h: 121, anchorX: 0.54, footY: 0.984, scaleFix: 1.0 },
    walk_4: { url: `${CARRY_BASE}/walk_4.png`, w: 76, h: 121, anchorX: 0.5, footY: 0.984, scaleFix: 1.0 },

    run_0: { url: `${CARRY_BASE}/run_0.png`, w: 80, h: 104, anchorX: 0.56, footY: 0.981, scaleFix: 1.15 },
    run_1: { url: `${CARRY_BASE}/run_1.png`, w: 80, h: 104, anchorX: 0.58, footY: 0.981, scaleFix: 1.15 },
    run_2: { url: `${CARRY_BASE}/run_2.png`, w: 77, h: 105, anchorX: 0.59, footY: 0.981, scaleFix: 1.15 },
    run_3: { url: `${CARRY_BASE}/run_3.png`, w: 80, h: 102, anchorX: 0.55, footY: 0.98, scaleFix: 1.15 },

    punch_0: { url: `${CARRY_BASE}/punch_0.png`, w: 68, h: 104, anchorX: 0.46, footY: 0.981, scaleFix: 1.17 },
    punch_1: { url: `${CARRY_BASE}/punch_1.png`, w: 62, h: 103, anchorX: 0.43, footY: 0.981, scaleFix: 1.17 },
    punch_2: { url: `${CARRY_BASE}/punch_2.png`, w: 84, h: 104, anchorX: 0.36, footY: 0.981, scaleFix: 1.17 },

    kick_0: { url: `${CARRY_BASE}/kick_0.png`, w: 52, h: 107, anchorX: 0.44, footY: 0.981, scaleFix: 1.17 },
    kick_1: { url: `${CARRY_BASE}/kick_1.png`, w: 102, h: 104, anchorX: 0.24, footY: 0.981, scaleFix: 1.17 },

    block_0: { url: `${CARRY_BASE}/block_0.png`, w: 64, h: 110, anchorX: 0.47, footY: 0.982, scaleFix: 1.12 },
    block_1: { url: `${CARRY_BASE}/block_1.png`, w: 63, h: 108, anchorX: 0.45, footY: 0.982, scaleFix: 1.12 },
    block_2: { url: `${CARRY_BASE}/block_2.png`, w: 58, h: 106, anchorX: 0.45, footY: 0.981, scaleFix: 1.12 },

    jump_0: { url: `${CARRY_BASE}/jump_0.png`, w: 53, h: 84, anchorX: 0.44, footY: 0.976, scaleFix: 1.15 },
    jump_1: { url: `${CARRY_BASE}/jump_1.png`, w: 46, h: 108, anchorX: 0.48, footY: 0.982, scaleFix: 1.15 },
    jump_2: { url: `${CARRY_BASE}/jump_2.png`, w: 64, h: 84, anchorX: 0.42, footY: 0.976, scaleFix: 1.15 },
    jump_3: { url: `${CARRY_BASE}/jump_3.png`, w: 73, h: 85, anchorX: 0.48, footY: 0.977, scaleFix: 1.15 },

    hurt_0: { url: `${CARRY_BASE}/hurt_0.png`, w: 69, h: 101, anchorX: 0.4, footY: 0.98, scaleFix: 1.16 },
    hurt_1: { url: `${CARRY_BASE}/hurt_1.png`, w: 62, h: 98, anchorX: 0.44, footY: 0.98, scaleFix: 1.16 },
    hurt_2: { url: `${CARRY_BASE}/hurt_2.png`, w: 76, h: 91, anchorX: 0.42, footY: 0.978, scaleFix: 1.16 },

    victory_0: { url: `${CARRY_BASE}/victory_0.png`, w: 75, h: 124, anchorX: 0.48, footY: 0.984, scaleFix: 1.04 },
    victory_1: { url: `${CARRY_BASE}/victory_1.png`, w: 77, h: 123, anchorX: 0.46, footY: 0.984, scaleFix: 1.04 },

    defeat_0: { url: `${CARRY_BASE}/defeat_0.png`, w: 66, h: 83, anchorX: 0.52, footY: 0.976, scaleFix: 1.06 },
    defeat_1: { url: `${CARRY_BASE}/defeat_1.png`, w: 106, h: 63, anchorX: 0.44, footY: 0.968, scaleFix: 1.06 },

    special_0: { url: `${CARRY_BASE}/special_0.png`, w: 270, h: 126, anchorX: 0.32, footY: 0.984, scaleFix: 1.24 },
  },
};

const SPRITE_SHEETS: Record<string, SpriteCharacterSheet> = {
  carryminati: CARRYMINATI_SPRITE_SHEET,
  ...GENERATED_SPRITE_SHEETS,
};

interface CachedSpriteImage {
  img: HTMLImageElement;
  failed: boolean;
}

const spriteImageCache = new Map<string, CachedSpriteImage>();

export function getSpriteCharacterSheet(spriteCharacterId?: string): SpriteCharacterSheet | null {
  if (!spriteCharacterId) return null;
  return SPRITE_SHEETS[spriteCharacterId] ?? null;
}

export function getStaticSpriteCharacterImageUrl(spriteCharacterId?: string): string | null {
  const sheet = getSpriteCharacterSheet(spriteCharacterId);
  if (!sheet) return null;

  const idleFrame = Object.entries(sheet.frames)
    .filter(
      ([key, frame]) =>
        /^idle_\d+$/.test(key) &&
        frame.w > 0 &&
        frame.h > 0 &&
        frame.w / frame.h <= 1,
    )
    .sort(([, first], [, second]) => second.h - first.h || first.w - second.w)[0]?.[1];
  if (!idleFrame) return null;

  return sheet.id === 'carryminati'
    ? idleFrame.url
    : `/assets/characters/roster-stills/${sheet.id}.png`;
}

/**
 * Starts loading all animation frames for a sprite-sheet character so there is
 * zero flicker when switching between idle, walk, run, jump, attacks, hurt, victory, and defeat.
 */
export function preloadSpriteCharacter(spriteCharacterId?: string): void {
  if (!spriteCharacterId || typeof Image === 'undefined') return;
  const sheet = getSpriteCharacterSheet(spriteCharacterId);
  if (!sheet) return;
  for (const frame of Object.values(sheet.frames)) {
    if (spriteImageCache.has(frame.url)) continue;
    const img = new Image();
    const entry: CachedSpriteImage = { img, failed: false };
    img.onerror = () => {
      entry.failed = true;
    };
    img.src = frame.url;
    spriteImageCache.set(frame.url, entry);
  }
}

function getLoadedSpriteImage(url: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let entry = spriteImageCache.get(url);
  if (!entry) {
    const img = new Image();
    entry = { img, failed: false };
    img.onerror = () => {
      entry!.failed = true;
    };
    img.src = url;
    spriteImageCache.set(url, entry);
  }
  if (entry.failed) return null;
  if (entry.img.complete && entry.img.naturalWidth > 0) return entry.img;
  return null;
}

export interface SelectedSpriteFrame {
  frameKey: string;
  anim: SpriteAnimName;
  spec: SpriteFrameSpec;
  showChargeAura?: boolean;
  showBlastGlow?: boolean;
  showGuardShield?: boolean;
  showDizzyStars?: boolean;
  showVictoryAura?: boolean;
  extraLiftPx?: number;
}

/**
 * Maps live fighter physics + combat state to the exact CarryMinati sprite animation frame.
 * Exported as a pure function so automated tests can verify every animation transition.
 */
export function selectSpriteFighterFrame(
  sheet: SpriteCharacterSheet,
  motion: FighterMotionData,
  time: number,
): SelectedSpriteFrame {
  const p = Math.max(0, Math.min(1, motion.actionProgress));

  const pick = (
    frameKey: string,
    anim: SpriteAnimName,
    extras?: Partial<Omit<SelectedSpriteFrame, 'frameKey' | 'anim' | 'spec'>>,
  ): SelectedSpriteFrame => ({
    frameKey,
    anim,
    spec: sheet.frames[frameKey] ?? sheet.frames.idle_0,
    ...extras,
  });

  // 1. Victory celebration loop
  if (motion.action === 'victory') {
    const idx = Math.floor(time * 4.5) % 2;
    const hop = Math.abs(Math.sin(time * 4.5 * Math.PI)) * 6;
    return pick(`victory_${idx}`, 'victory', {
      showVictoryAura: true,
      extraLiftPx: p > 0.3 ? hop : 0,
    });
  }

  // 2. Defeat / KO sequence (kneel slump -> flat KO collapse)
  if (motion.action === 'defeat') {
    const key = p < 0.48 ? 'defeat_0' : 'defeat_1';
    return pick(key, 'defeat', { showDizzyStars: true });
  }

  // 3. Stun / Hurt recoil
  if (motion.action === 'stun') {
    const idx = Math.min(2, Math.floor((time * 11) % 3));
    return pick(`hurt_${idx}`, 'hurt', { showDizzyStars: true });
  }

  // 4. Special Attack (brief power-up charge -> full blue Roast Energy Blast!)
  if (motion.action === 'special') {
    if (p < 0.2) {
      return pick('jump_0', 'special', { showChargeAura: true });
    }
    if (p <= 0.92) {
      return pick('special_0', 'special', { showBlastGlow: true });
    }
    return pick('punch_0', 'special');
  }

  // 5. Punch 3-frame snappy jab/cross combo
  if (motion.action === 'punch') {
    if (p < 0.22) return pick('punch_0', 'punch');
    if (p < 0.36) return pick('punch_1', 'punch');
    if (p < 0.78) return pick('punch_2', 'punch');
    return pick('punch_1', 'punch');
  }

  // 6. Kick 2-frame knee-chamber -> high side kick
  if (motion.action === 'kick') {
    if (p < 0.26) return pick('kick_0', 'kick');
    if (p < 0.82) return pick('kick_1', 'kick');
    return pick('kick_0', 'kick');
  }

  // 7. Block 3-frame high guard
  if (motion.action === 'block') {
    const idx = Math.floor(time * 6) % 3;
    return pick(`block_${idx}`, 'block', { showGuardShield: true });
  }

  // 8. Dodge forward/backward dash
  if (motion.action === 'dodge') {
    return pick(p < 0.55 ? 'run_2' : 'jump_3', 'run');
  }

  // 9. Hit recoil flash while not in full stun
  if (motion.hitWobble > 0.55) {
    return pick('hurt_0', 'hurt');
  }

  // 10. Airborne Jump phases (rising -> tucked peak -> descending prep)
  if (!motion.grounded) {
    if (motion.verticalVelocity > 2.4) return pick('jump_1', 'jump_rise');
    if (motion.verticalVelocity > -2.6) return pick('jump_2', 'jump_peak');
    return pick('jump_3', 'jump_land');
  }

  // 11. Landing impact absorption pose
  if (motion.landingSquash > 0.24) {
    return pick('jump_3', 'jump_land');
  }

  // 12. Crouching pose
  if (motion.isCrouching) {
    return pick('jump_0', 'jump_crouch');
  }

  // 13. Running cycle (4 frames @ ~11.5 fps)
  if (motion.locomotion === 'run') {
    const idx = Math.floor(time * 11.5) % 4;
    return pick(`run_${idx}`, 'run');
  }

  // 14. Walking cycle (5 frames @ ~9.5 fps)
  if (motion.locomotion === 'walk') {
    const idx = Math.floor(time * 9.5) % 5;
    return pick(`walk_${idx}`, 'walk');
  }

  // 15. Idle breathing stance (4 frames @ ~5.5 fps)
  const idx = Math.floor(time * 5.5) % 4;
  return pick(`idle_${idx}`, 'idle');
}

export interface DrawSpriteFighterOptions {
  xPx: number;
  yPx: number;
  groundYPx: number;
  facing: 1 | -1;
  character: CharacterDefinition;
  motion: FighterMotionData;
  time: number;
  isPlayer: boolean;
  showShadow: boolean;
  worldScale: number;
}

/**
 * Renders a sprite-sheet 2D fighter with crisp pixel-aligned ground contact,
 * mirrored left/right facing, squash & stretch, shadows, and combat VFX overlays.
 * Returns true if the sprite rendered; false if still loading (allowing procedural fallback).
 */
export function drawSpriteFighter2D(
  ctx: CanvasRenderingContext2D,
  opts: DrawSpriteFighterOptions,
): boolean {
  const sheet = getSpriteCharacterSheet(opts.character.spriteCharacterId);
  if (!sheet) return false;

  // Kick off background preload of all frames on first encounter
  preloadSpriteCharacter(sheet.id);

  const selected = selectSpriteFighterFrame(sheet, opts.motion, opts.time);
  const img =
    getLoadedSpriteImage(selected.spec.url) ?? getLoadedSpriteImage(sheet.frames.idle_0.url);
  if (!img) return false;

  const {
    xPx,
    yPx,
    groundYPx,
    facing,
    character,
    motion,
    time,
    isPlayer,
    showShadow,
    worldScale,
  } = opts;

  const sx = character.bodyScale[0] * worldScale;
  const sy = character.bodyScale[1] * worldScale;

  // Landing squash & stretch + subtle hit recoil
  const landingAmt = motion.grounded ? Math.max(0, Math.min(1, motion.landingSquash)) : 0;
  const squashY = 1 - landingAmt * 0.12;
  const stretchX = 1 + landingAmt * 0.08;
  const recoilX = motion.hitWobble > 0 ? -facing * motion.hitWobble * 7 * sx : 0;
  const specialShakeX =
    selected.showBlastGlow ? Math.sin(time * 55) * 2.2 * sx : 0;
  const specialShakeY =
    selected.showBlastGlow ? Math.cos(time * 48) * 1.4 * sy : 0;
  const liftPx = (selected.extraLiftPx ?? 0) * sy;

  // Pixel scale derived from standing reference height so every row matches visually
  const pxPerNative = (sheet.baseStandingHeightPx / sheet.refNativeHeight) * selected.spec.scaleFix;
  const drawW = selected.spec.w * pxPerNative * sx * stretchX;
  const drawH = selected.spec.h * pxPerNative * sy * squashY;

  // Floor-pinned ground contact ring & shadow (attenuates smoothly during jumps)
  const altitudePx = Math.max(0, groundYPx - yPx + liftPx);
  const shadowAtten = Math.max(0.32, 1 - altitudePx / Math.max(120, 260 * sy));
  const shadowW =
    selected.anim === 'defeat' && selected.frameKey === 'defeat_1' ? 46 : 31;

  ctx.save();
  ctx.globalAlpha = shadowAtten;
  ctx.fillStyle = isPlayer ? 'rgba(56, 189, 248, 0.25)' : 'rgba(251, 113, 133, 0.25)';
  ctx.strokeStyle = isPlayer ? 'rgba(56, 189, 248, 0.72)' : 'rgba(251, 113, 133, 0.72)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(
    xPx + recoilX,
    groundYPx + 2,
    shadowW * sx * shadowAtten,
    7.5 * sx * shadowAtten,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.stroke();

  if (showShadow) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.48)';
    ctx.beginPath();
    ctx.ellipse(
      xPx + recoilX,
      groundYPx + 1,
      (shadowW - 4) * sx * shadowAtten,
      6 * sx * shadowAtten,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();

  const drawFrameAt = (alpha: number, offsetX: number, drawOverlays: boolean) => {
    ctx.save();
    ctx.translate(
      xPx + recoilX + offsetX + specialShakeX,
      yPx - liftPx + specialShakeY,
    );
    ctx.scale(facing, 1);
    ctx.globalAlpha = alpha;

    // Optional blue energy charge glow behind CarryMinati during special windup or blast
    if (drawOverlays && (selected.showChargeAura || selected.showBlastGlow)) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const pulse = 0.5 + 0.5 * Math.sin(time * 28);
      const glowX = selected.showBlastGlow ? drawW * 0.28 : 0;
      const glowY = -drawH * 0.52;
      const glowR = (selected.showBlastGlow ? 118 : 58) * sx + pulse * 14 * sx;
      const grad = ctx.createRadialGradient(glowX, glowY, 6 * sx, glowX, glowY, glowR);
      grad.addColorStop(0, 'rgba(186, 230, 253, 0.65)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.32)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(glowX, glowY, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const dx = -selected.spec.anchorX * drawW;
    const dy = -selected.spec.footY * drawH;
    ctx.imageSmoothingEnabled = true;
    if (selected.spec.sourceRect) {
      const { x, y, w, h } = selected.spec.sourceRect;
      ctx.drawImage(img, x, y, w, h, dx, dy, drawW, drawH);
    } else {
      ctx.drawImage(img, dx, dy, drawW, drawH);
    }

    // Hit impact bright flash overlay (isolated composite state)
    if (drawOverlays && motion.hitWobble > 0.4) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255, 245, 220, ${(motion.hitWobble * 0.3).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(0, -drawH * 0.52, 30 * sx, drawH * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Blocking translucent energy shield arc in front of CarryMinati
    if (drawOverlays && selected.showGuardShield) {
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(22 * sx, -drawH * 0.56, 42 * sy, -1.1, 1.1);
      ctx.fill();
      ctx.stroke();
    }

    // Victory Champion Sparkle Crown
    if (drawOverlays && selected.showVictoryAura) {
      for (let s = 0; s < 4; s++) {
        const ang = time * 4.5 + (s * Math.PI) / 2;
        const px = Math.cos(ang) * 32 * sx;
        const py = -drawH * 0.96 + Math.sin(ang * 2) * 7 * sy;
        ctx.fillStyle = s % 2 === 0 ? '#fde047' : character.palette.accent;
        ctx.beginPath();
        ctx.arc(px, py, (3.2 + Math.sin(time * 9 + s) * 1.1) * sx, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Orbiting dizzy stars when stunned or KO'd
    if (drawOverlays && selected.showDizzyStars) {
      const starBaseY = selected.anim === 'defeat' ? -drawH * 0.92 : -drawH * 1.04;
      for (let s = 0; s < 3; s++) {
        const ang = time * 5.8 + (s * Math.PI * 2) / 3;
        const stX = Math.cos(ang) * 20 * sx;
        const stY = starBaseY + Math.sin(ang) * 6 * sy;
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(stX, stY, 4.2 * sx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // Dodge motion-blur afterimages
  if (motion.action === 'dodge') {
    drawFrameAt(0.22, -facing * 28 * sx, false);
    drawFrameAt(0.4, -facing * 14 * sx, false);
  }
  drawFrameAt(1.0, 0, true);

  return true;
}
