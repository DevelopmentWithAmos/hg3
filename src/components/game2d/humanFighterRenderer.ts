import { CharacterDefinition, FighterMotionData } from '../../types/game';
import { drawSpriteFighter2D, preloadSpriteCharacter } from './spriteFighterRenderer';

interface Vec2 {
  x: number;
  y: number;
}

interface CachedPortraitEntry {
  img: HTMLImageElement;
  failed: boolean;
}

const fighterPortraitCache = new Map<string, CachedPortraitEntry>();

/**
 * Starts loading a fighter's portrait image into the 2D canvas cache so the
 * playable character's real face appears immediately in-game.
 */
export function preloadFighterPortrait(url?: string): void {
  if (!url || typeof Image === 'undefined') return;
  if (fighterPortraitCache.has(url)) return;
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  const entry: CachedPortraitEntry = { img, failed: false };
  img.onerror = () => {
    entry.failed = true;
  };
  img.src = url;
  fighterPortraitCache.set(url, entry);
}

/**
 * Preloads both a fighter's portrait and any dedicated 2D sprite animation frames.
 */
export function preloadFighterAssets(character: CharacterDefinition): void {
  preloadFighterPortrait(character.portraitUrl);
  if (character.spriteCharacterId) {
    preloadSpriteCharacter(character.spriteCharacterId);
  }
}

function getLoadedFighterPortrait(url?: string): HTMLImageElement | null {
  if (!url || typeof Image === 'undefined') return null;
  let entry = fighterPortraitCache.get(url);
  if (!entry) {
    preloadFighterPortrait(url);
    entry = fighterPortraitCache.get(url);
  }
  if (!entry || entry.failed) return null;
  if (entry.img.complete && entry.img.naturalWidth > 0) return entry.img;
  return null;
}

/**
 * Draws the character's real photo face cleanly masked to an anatomical head oval,
 * matching their avatar image while reacting dynamically to combat states.
 */
function drawPhotoFighterHead(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  scale: number,
  char: CharacterDefinition,
  motion: FighterMotionData,
  time: number,
): void {
  const { palette, faceCrop } = char;
  const isStun = motion.action === 'stun' || motion.action === 'defeat';
  const isSpecial = motion.action === 'special';
  const isHit = motion.hitWobble > 0.35;

  const rx = 20.5 * scale;
  const ry = 23.5 * scale;

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const fx = faceCrop?.x ?? 0.5;
  const fy = faceCrop?.y ?? 0.42;
  const zoom = Math.max(1, faceCrop?.zoom ?? 1.45);
  const headAspect = rx / ry;

  const baseSide = Math.min(nw, nh) / zoom;
  let sh = Math.min(nh, baseSide * 1.12);
  let sw = Math.min(nw, sh * headAspect);
  if (sw / headAspect < sh) {
    sh = sw / headAspect;
  }

  let sx = fx * nw - sw * 0.5;
  let sy = fy * nh - sh * 0.5;
  sx = Math.max(0, Math.min(nw - sw, sx));
  sy = Math.max(0, Math.min(nh - sh, sy));

  // Optional special-move aura glow behind head
  if (isSpecial) {
    ctx.save();
    ctx.fillStyle = `${palette.accent}55`;
    ctx.beginPath();
    ctx.ellipse(0, -1 * scale, rx * 1.24, ry * 1.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Head contour path (slightly fuller temples, natural tapered jaw)
  const buildHeadPath = () => {
    ctx.beginPath();
    ctx.moveTo(0, -ry);
    ctx.bezierCurveTo(rx * 1.06, -ry, rx * 1.06, ry * 0.25, rx * 0.72, ry * 0.74);
    ctx.quadraticCurveTo(0, ry * 1.08, -rx * 0.72, ry * 0.74);
    ctx.bezierCurveTo(-rx * 1.06, ry * 0.25, -rx * 1.06, -ry, 0, -ry);
    ctx.closePath();
  };

  ctx.save();
  buildHeadPath();
  ctx.clip();

  // Solid studio backdrop behind transparent PNG cutouts (e.g. Aamir / Amitabh)
  const bgGrad = ctx.createRadialGradient(0, -ry * 0.15, rx * 0.1, 0, 0, ry * 1.15);
  bgGrad.addColorStop(0, palette.skin);
  bgGrad.addColorStop(0.7, palette.suitPrimary);
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);

  // Align photo face gaze naturally with fighter facing direction
  ctx.save();
  if (faceCrop?.sourceFacing === -1) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, sx, sy, sw, sh, -rx * 1.04, -ry * 1.04, rx * 2.08, ry * 2.08);
  ctx.restore();

  // Subtle chin shading so photo head integrates smoothly with 2D neck & body
  const chinShade = ctx.createLinearGradient(0, ry * 0.35, 0, ry * 1.05);
  chinShade.addColorStop(0, 'rgba(9, 13, 22, 0)');
  chinShade.addColorStop(1, 'rgba(9, 13, 22, 0.42)');
  ctx.fillStyle = chinShade;
  ctx.fillRect(-rx * 1.2, ry * 0.25, rx * 2.4, ry);

  // Subtle top studio rim sheen
  const rimGrad = ctx.createLinearGradient(-rx, -ry, rx, ry * 0.2);
  rimGrad.addColorStop(0, `${palette.accent}38`);
  rimGrad.addColorStop(0.45, 'rgba(255,255,255,0)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);

  // Dynamic combat reaction overlays on face
  if (isHit) {
    ctx.fillStyle = 'rgba(255, 245, 220, 0.32)';
    ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);
  } else if (isStun) {
    ctx.fillStyle = 'rgba(225, 29, 72, 0.22)';
    ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);
    // Comic dizzy impact lines near forehead
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.8 * scale;
    const pulse = Math.sin(time * 18) * 1.5 * scale;
    ctx.beginPath();
    ctx.arc(-rx * 0.35, -ry * 0.12, 4.2 * scale + pulse * 0.2, 0, Math.PI * 1.65);
    ctx.moveTo(rx * 0.35 + 4.2 * scale, -ry * 0.12);
    ctx.arc(rx * 0.35, -ry * 0.12, 4.2 * scale + pulse * 0.2, 0, Math.PI * 1.65);
    ctx.stroke();
  }
  ctx.restore();

  // Crisp 2D arcade contour + subtle accent inner rim
  ctx.save();
  buildHeadPath();
  ctx.strokeStyle = isSpecial ? palette.accent : '#090d16';
  ctx.lineWidth = (isSpecial ? 2.8 : 2.2) * scale;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a tapered, anatomically contoured limb segment (bicep/forearm or thigh/calf)
 * between points A and B with smooth rounded joints.
 */
function drawTaperedLimb(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  wA: number,
  wB: number,
  fill: string,
  shade: string,
  outline = '#0b0f19',
) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const midX = (ax + bx) * 0.5 + nx * (wA * 0.08);
  const midY = (ay + by) * 0.5 + ny * (wA * 0.08);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax + nx * wA, ay + ny * wA);
  ctx.quadraticCurveTo(
    midX + nx * ((wA + wB) * 0.54),
    midY + ny * ((wA + wB) * 0.54),
    bx + nx * wB,
    by + ny * wB,
  );
  ctx.arc(bx, by, wB, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  ctx.quadraticCurveTo(
    (ax + bx) * 0.5 - nx * ((wA + wB) * 0.52),
    (ay + by) * 0.5 - ny * ((wA + wB) * 0.52),
    ax - nx * wA,
    ay - ny * wA,
  );
  ctx.arc(ax, ay, wA, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  ctx.closePath();

  const grad = ctx.createLinearGradient(
    ax + nx * wA,
    ay + ny * wA,
    ax - nx * wA,
    ay - ny * wA,
  );
  grad.addColorStop(0, fill);
  grad.addColorStop(1, shade);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.restore();
}

function drawFistOrGlove(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale: number,
  char: CharacterDefinition,
  isAttackActive: boolean,
) {
  const { palette, outfitStyle } = char;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Wrist wrap / cuff
  ctx.fillStyle = palette.gloveCuff;
  ctx.strokeStyle = '#0b0f19';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-8 * scale, -6 * scale, 10 * scale, 12 * scale, 3 * scale);
  ctx.fill();
  ctx.stroke();

  // Taped hand / MMA glove / leather gauntlet
  const fistW = outfitStyle === 'toaster_bot' ? 16 * scale : 13.5 * scale;
  const fistH = outfitStyle === 'toaster_bot' ? 13 * scale : 11 * scale;
  ctx.fillStyle = outfitStyle === 'knight_armor' ? palette.glove : palette.glove;
  ctx.beginPath();
  ctx.roundRect(-1 * scale, -fistH * 0.5, fistW, fistH, 5 * scale);
  ctx.fill();
  ctx.stroke();

  // Knuckle / wrap ridges for realistic taped human hand feel
  ctx.strokeStyle = 'rgba(15,23,42,0.45)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(4 * scale, -fistH * 0.32);
  ctx.lineTo(4 * scale, fistH * 0.32);
  ctx.moveTo(8 * scale, -fistH * 0.32);
  ctx.lineTo(8 * scale, fistH * 0.32);
  ctx.stroke();

  if (isAttackActive) {
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(fistW * 0.55, 0, fistW * 0.65, -0.7, 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFootwear(
  ctx: CanvasRenderingContext2D,
  ankleX: number,
  ankleY: number,
  angle: number,
  scale: number,
  char: CharacterDefinition,
) {
  const { palette } = char;
  ctx.save();
  ctx.translate(ankleX, ankleY);
  ctx.rotate(angle);

  // Shoe upper
  ctx.fillStyle = palette.shoe;
  ctx.strokeStyle = '#0b0f19';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7 * scale, -6 * scale);
  ctx.lineTo(6 * scale, -5 * scale);
  ctx.quadraticCurveTo(21 * scale, -2 * scale, 22 * scale, 5 * scale);
  ctx.lineTo(-9 * scale, 5 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crisp rubber sole
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(-9.5 * scale, 3.5 * scale, 31.5 * scale, 4.2 * scale, 2 * scale);
  ctx.fill();
  ctx.stroke();

  // Sneaker stripe accent
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -1 * scale);
  ctx.lineTo(10 * scale, 1.5 * scale);
  ctx.stroke();

  ctx.restore();
}

function drawHumanHeadAndFace(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  tilt: number,
  scale: number,
  char: CharacterDefinition,
  motion: FighterMotionData,
  time: number,
) {
  const { palette, hairStyle, facialHair, headgear } = char;
  const isStun = motion.action === 'stun' || motion.action === 'defeat';
  const isAttack =
    motion.action === 'punch' ||
    motion.action === 'kick' ||
    motion.action === 'special';
  const isVictory = motion.action === 'victory';

  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(tilt);

  // When a character has a loaded photo portrait, mount their real face onto the 2D fighter!
  const photoHead = getLoadedFighterPortrait(char.portraitUrl);
  if (photoHead) {
    drawPhotoFighterHead(ctx, photoHead, scale, char, motion, time);
    ctx.restore();
    return;
  }

  const hw = 14.5 * scale;
  const hh = 17.5 * scale;

  // Back hair layer (topknot / ponytail / thick hair volume)
  ctx.fillStyle = palette.hair;
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.5;

  if (hairStyle === 'afro_curls') {
    // Natural coiled curls crown
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI * 0.95 + (i / 7) * Math.PI * 1.1;
      const cx = Math.cos(ang) * hw * 0.85 - 2 * scale;
      const cy = Math.sin(ang) * hh * 0.85 - 4 * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, 7.2 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (hairStyle === 'topknot') {
    // Pulled back topknot bun
    ctx.beginPath();
    ctx.arc(-5 * scale, -hh * 1.05, 6.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (hairStyle === 'classic_bun') {
    // Back low tied bun
    ctx.beginPath();
    ctx.arc(-hw * 0.96, hh * 0.12, 6.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Sculpted human head & jawline (facing +X in local coords)
  const skinGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  skinGrad.addColorStop(0, palette.skin);
  skinGrad.addColorStop(1, palette.cheek);
  ctx.fillStyle = skinGrad;
  ctx.beginPath();
  ctx.moveTo(-hw * 0.85, -hh * 0.45);
  ctx.quadraticCurveTo(-hw * 0.95, -hh * 1.05, 0, -hh * 1.02);
  ctx.quadraticCurveTo(hw * 0.95, -hh * 0.98, hw * 0.92, -hh * 0.2);
  // Brow & nose bridge profile subtle bump
  ctx.lineTo(hw * 1.04, hh * 0.08);
  ctx.lineTo(hw * 0.9, hh * 0.25);
  // Jawline & chin
  ctx.quadraticCurveTo(hw * 0.85, hh * 0.92, hw * 0.22, hh * 0.98);
  ctx.quadraticCurveTo(-hw * 0.55, hh * 0.92, -hw * 0.85, hh * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ear
  ctx.fillStyle = palette.cheek;
  ctx.beginPath();
  ctx.ellipse(-hw * 0.58, hh * 0.08, 3.3 * scale, 5.2 * scale, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Facial Hair
  if (facialHair === 'full_beard') {
    ctx.fillStyle = palette.hair;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.72, hh * 0.22);
    ctx.quadraticCurveTo(-hw * 0.45, hh * 1.15, hw * 0.35, hh * 1.18);
    ctx.quadraticCurveTo(hw * 0.96, hh * 1.02, hw * 0.92, hh * 0.42);
    ctx.lineTo(hw * 0.55, hh * 0.48);
    ctx.quadraticCurveTo(hw * 0.15, hh * 0.35, -hw * 0.45, hh * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (facialHair === 'goatee') {
    ctx.fillStyle = palette.hair;
    ctx.beginPath();
    ctx.ellipse(hw * 0.52, hh * 0.82, 4.5 * scale, 3.2 * scale, 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (facialHair === 'mustache') {
    ctx.fillStyle = palette.hair;
    ctx.beginPath();
    ctx.ellipse(hw * 0.58, hh * 0.36, 5.4 * scale, 2.2 * scale, -0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (facialHair === 'stubble') {
    ctx.fillStyle = 'rgba(24, 24, 27, 0.18)';
    ctx.beginPath();
    ctx.ellipse(hw * 0.25, hh * 0.65, hw * 0.58, hh * 0.32, 0, 0, Math.PI);
    ctx.fill();
  }

  // Realistic Eyes & Eyebrows
  const eyeX = hw * 0.38;
  const eyeY = -hh * 0.14;
  if (isStun) {
    // Tightly squinting pain eyes ><
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.1 * scale;
    ctx.beginPath();
    ctx.moveTo(eyeX - 3.5 * scale, eyeY - 3 * scale);
    ctx.lineTo(eyeX + 2 * scale, eyeY);
    ctx.lineTo(eyeX - 3.5 * scale, eyeY + 3 * scale);
    ctx.stroke();
  } else {
    // Sclera + Iris + Eyelid
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 4.1 * scale, 2.7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.iris;
    ctx.beginPath();
    ctx.arc(eyeX + 1.1 * scale, eyeY, 2.0 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX + 1.8 * scale, eyeY - 0.7 * scale, 0.75 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Expressive eyebrow
    ctx.strokeStyle = palette.hair;
    ctx.lineWidth = 2.6 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (isAttack) {
      ctx.moveTo(eyeX - 4.5 * scale, eyeY - 5.5 * scale);
      ctx.lineTo(eyeX + 4.5 * scale, eyeY - 3.0 * scale);
    } else if (isVictory) {
      ctx.moveTo(eyeX - 4.5 * scale, eyeY - 4.5 * scale);
      ctx.lineTo(eyeX + 4.5 * scale, eyeY - 6.0 * scale);
    } else {
      ctx.moveTo(eyeX - 4.2 * scale, eyeY - 4.5 * scale);
      ctx.lineTo(eyeX + 4.2 * scale, eyeY - 4.2 * scale);
    }
    ctx.stroke();
  }

  // Mouth expression
  ctx.strokeStyle = '#1e1b18';
  ctx.lineWidth = 1.9 * scale;
  if (motion.action === 'special' || isStun) {
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.ellipse(hw * 0.56, hh * 0.54, 4.2 * scale, 3.0 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (isVictory) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(hw * 0.25, hh * 0.48);
    ctx.quadraticCurveTo(hw * 0.55, hh * 0.72, hw * 0.8, hh * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Confident fighter smirk
    ctx.beginPath();
    ctx.moveTo(hw * 0.28, hh * 0.52);
    ctx.quadraticCurveTo(hw * 0.58, hh * 0.58, hw * 0.78, hh * 0.46);
    ctx.stroke();
  }

  // Front Hair & Headgear
  ctx.fillStyle = palette.hair;
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.5;

  if (hairStyle === 'swept_heavy') {
    ctx.beginPath();
    ctx.moveTo(-hw * 0.92, -hh * 0.2);
    ctx.quadraticCurveTo(-hw * 0.95, -hh * 1.25, hw * 0.15, -hh * 1.22);
    ctx.quadraticCurveTo(hw * 0.95, -hh * 1.15, hw * 0.85, -hh * 0.45);
    ctx.quadraticCurveTo(hw * 0.1, -hh * 0.65, -hw * 0.65, -hh * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hairStyle === 'topknot') {
    ctx.beginPath();
    ctx.moveTo(-hw * 0.88, -hh * 0.1);
    ctx.quadraticCurveTo(-hw * 0.9, -hh * 1.08, hw * 0.15, -hh * 1.05);
    ctx.quadraticCurveTo(hw * 0.75, -hh * 0.95, hw * 0.78, -hh * 0.45);
    ctx.quadraticCurveTo(0, -hh * 0.68, -hw * 0.68, -hh * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hairStyle === 'messy_waves') {
    ctx.beginPath();
    ctx.moveTo(-hw * 0.92, -hh * 0.15);
    ctx.lineTo(-hw * 1.05, -hh * 0.75);
    ctx.lineTo(-hw * 0.4, -hh * 1.25);
    ctx.lineTo(hw * 0.15, -hh * 1.12);
    ctx.lineTo(hw * 0.65, -hh * 1.22);
    ctx.lineTo(hw * 0.92, -hh * 0.55);
    ctx.quadraticCurveTo(0, -hh * 0.68, -hw * 0.7, -hh * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hairStyle === 'spiky_dark') {
    ctx.beginPath();
    ctx.moveTo(-hw * 0.88, -hh * 0.15);
    ctx.lineTo(-hw * 0.98, -hh * 0.85);
    ctx.lineTo(-hw * 0.52, -hh * 1.32);
    ctx.lineTo(-hw * 0.12, -hh * 1.08);
    ctx.lineTo(hw * 0.28, -hh * 1.38);
    ctx.lineTo(hw * 0.65, -hh * 1.05);
    ctx.lineTo(hw * 0.98, -hh * 1.2);
    ctx.lineTo(hw * 0.86, -hh * 0.45);
    ctx.quadraticCurveTo(0, -hh * 0.65, -hw * 0.68, -hh * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hairStyle === 'classic_bun') {
    ctx.beginPath();
    ctx.moveTo(-hw * 0.9, -hh * 0.05);
    ctx.quadraticCurveTo(-hw * 0.92, -hh * 1.08, hw * 0.1, -hh * 1.05);
    ctx.quadraticCurveTo(hw * 0.82, -hh * 0.96, hw * 0.78, -hh * 0.45);
    ctx.quadraticCurveTo(0, -hh * 0.68, -hw * 0.68, -hh * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hairStyle === 'bald_clean') {
    // Subtle clean-shaven crown gloss highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.beginPath();
    ctx.ellipse(hw * 0.05, -hh * 0.78, 5.2 * scale, 2.1 * scale, -0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (hairStyle === 'mystery') {
    // Sleek shadowed challenger hood/mask
    ctx.fillStyle = palette.suitPrimary;
    ctx.beginPath();
    ctx.arc(0, -hh * 0.1, hw * 1.08, Math.PI * 0.7, Math.PI * 2.1);
    ctx.fill();
    ctx.stroke();
  }

  // Optional iconic spectacles / sunglasses
  if (char.glasses && !isStun) {
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.roundRect(eyeX - 5.5 * scale, eyeY - 3.6 * scale, 10.2 * scale, 6.8 * scale, 1.8 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeX - 5.5 * scale, eyeY - 0.5 * scale);
    ctx.lineTo(-hw * 0.52, eyeY - 1.2 * scale);
    ctx.stroke();
  }

  // Headbands (Captain Bonk yellow band, Toast-Zilla white chef bandana)
  if (headgear === 'headband_spikes' || headgear === 'butter_toast') {
    const bandColor = headgear === 'headband_spikes' ? '#eab308' : '#f8fafc';
    const flutter = Math.sin(time * 9) * 3.5 * scale;
    // Trailing cloth tie behind head
    ctx.fillStyle = bandColor;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.85, -hh * 0.52);
    ctx.quadraticCurveTo(-hw * 1.55, -hh * 0.65 + flutter, -hw * 1.95, -hh * 0.35 + flutter * 1.2);
    ctx.lineTo(-hw * 1.75, -hh * 0.12 + flutter);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Forehead wrap
    ctx.beginPath();
    ctx.roundRect(-hw * 0.95, -hh * 0.66, hw * 1.88, 6.2 * scale, 2.5 * scale);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  hip: Vec2,
  shoulder: Vec2,
  lean: number,
  scaleX: number,
  scaleY: number,
  char: CharacterDefinition,
) {
  const { palette, outfitStyle } = char;
  const cx = (hip.x + shoulder.x) * 0.5;
  const cy = (hip.y + shoulder.y) * 0.5;
  const torsoH = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y) + 12 * scaleY;
  const chestW = 24 * scaleX;
  const waistW = 16.5 * scaleX;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lean);

  const grad = ctx.createLinearGradient(-chestW, -torsoH * 0.5, chestW, torsoH * 0.5);
  grad.addColorStop(0, palette.suitPrimary);
  grad.addColorStop(1, palette.suitSecondary);

  // Anatomical V-taper human torso polygon
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#0b0f19';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-chestW * 0.58, -torsoH * 0.46);
  ctx.quadraticCurveTo(0, -torsoH * 0.54, chestW * 0.58, -torsoH * 0.46);
  ctx.quadraticCurveTo(chestW * 0.5, 0, waistW * 0.52, torsoH * 0.48);
  ctx.lineTo(-waistW * 0.52, torsoH * 0.48);
  ctx.quadraticCurveTo(-chestW * 0.5, 0, -chestW * 0.58, -torsoH * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Outfit-specific & photo-matched realistic details
  if (char.chestEmblem === 'heart_tank') {
    // Modi Ji sleeveless tank top neckline + iconic red heart graphic
    ctx.fillStyle = palette.skin;
    ctx.beginPath();
    ctx.arc(2 * scaleX, -torsoH * 0.47, 8 * scaleX, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    const hx = 4 * scaleX;
    const hy = -torsoH * 0.08;
    const hs = 6.2 * scaleX;
    ctx.beginPath();
    ctx.moveTo(hx, hy + hs * 0.9);
    ctx.bezierCurveTo(hx - hs * 1.2, hy + hs * 0.1, hx - hs * 0.9, hy - hs * 0.85, hx, hy - hs * 0.25);
    ctx.bezierCurveTo(hx + hs * 0.9, hy - hs * 0.85, hx + hs * 1.2, hy + hs * 0.1, hx, hy + hs * 0.9);
    ctx.closePath();
    ctx.fill();
    // White graphic bars below heart
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-5 * scaleX, torsoH * 0.12, 16 * scaleX, 2.5 * scaleY);
    ctx.fillRect(-6 * scaleX, torsoH * 0.2, 18 * scaleX, 2.5 * scaleY);
  } else if (char.chestEmblem === 'bat_tee') {
    // Ashish Chanchlani charcoal tee + white bat-wing chest emblem
    ctx.fillStyle = '#f8fafc';
    const bx = 3 * scaleX;
    const by = -torsoH * 0.08;
    ctx.beginPath();
    ctx.moveTo(bx - 12 * scaleX, by - 3 * scaleY);
    ctx.quadraticCurveTo(bx - 5 * scaleX, by - 6 * scaleY, bx, by - 2 * scaleY);
    ctx.quadraticCurveTo(bx + 5 * scaleX, by - 6 * scaleY, bx + 12 * scaleX, by - 3 * scaleY);
    ctx.quadraticCurveTo(bx + 7 * scaleX, by + 6 * scaleY, bx, by + 7 * scaleY);
    ctx.quadraticCurveTo(bx - 7 * scaleX, by + 6 * scaleY, bx - 12 * scaleX, by - 3 * scaleY);
    ctx.closePath();
    ctx.fill();
  } else if (char.chestEmblem === 'rudraksha_mala') {
    // Rajpal Yadav Chhota Pandit bare sindoor chest + marigold & rudraksha garland
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.6 * scaleX;
    ctx.beginPath();
    ctx.arc(2 * scaleX, -torsoH * 0.36, 11 * scaleX, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Orange/yellow marigold beads
    const beads = 9;
    for (let b = 0; b < beads; b++) {
      const ang = 0.2 + (b / (beads - 1)) * (Math.PI - 0.4);
      const px = 2 * scaleX + Math.cos(ang) * 14 * scaleX;
      const py = -torsoH * 0.32 + Math.sin(ang) * 22 * scaleY;
      ctx.fillStyle = b % 2 === 0 ? '#f59e0b' : '#92400e';
      ctx.beginPath();
      ctx.arc(px, py, 2.8 * scaleX, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (char.chestEmblem === 'plaid') {
    // Samay Raina / Govinda checkered flannel pattern
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 2.6 * scaleX;
    for (let x = -12; x <= 12; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x * scaleX, -torsoH * 0.44);
      ctx.lineTo(x * scaleX, torsoH * 0.36);
      ctx.stroke();
    }
    for (let y = -16; y <= 14; y += 10) {
      ctx.beginPath();
      ctx.moveTo(-chestW * 0.45, y * scaleY);
      ctx.lineTo(chestW * 0.45, y * scaleY);
      ctx.stroke();
    }
  } else if (char.chestEmblem === 'track_stripes') {
    // Arshad Warsi lime-green track jacket with crisp white stripes & center zip
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.4 * scaleX;
    ctx.beginPath();
    ctx.moveTo(3 * scaleX, -torsoH * 0.46);
    ctx.lineTo(3 * scaleX, torsoH * 0.42);
    ctx.stroke();
    // Shoulder white racing stripes
    ctx.lineWidth = 2.0 * scaleX;
    ctx.beginPath();
    ctx.moveTo(-chestW * 0.5, -torsoH * 0.44);
    ctx.lineTo(-chestW * 0.15, -torsoH * 0.44);
    ctx.moveTo(chestW * 0.15, -torsoH * 0.44);
    ctx.lineTo(chestW * 0.5, -torsoH * 0.44);
    ctx.stroke();
    // Small crest badge on chest
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6 * scaleX, -torsoH * 0.18, 5 * scaleX, 6 * scaleY);
  } else if (char.chestEmblem === 'nehru_vest') {
    // Amitabh Bachchan / Akhilesh Yadav / Ravi Kishan / Nitish Kumar Nehru vest & collar
    ctx.fillStyle = char.sleeveColor ?? '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-4 * scaleX, -torsoH * 0.48);
    ctx.lineTo(10 * scaleX, -torsoH * 0.48);
    ctx.lineTo(3 * scaleX, -torsoH * 0.24);
    ctx.closePath();
    ctx.fill();
    // Center placket & buttons
    ctx.strokeStyle = '#0b0f19';
    ctx.lineWidth = 1.6 * scaleX;
    ctx.beginPath();
    ctx.moveTo(3 * scaleX, -torsoH * 0.28);
    ctx.lineTo(3 * scaleX, torsoH * 0.42);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    for (let b = -1; b <= 2; b++) {
      ctx.beginPath();
      ctx.arc(3 * scaleX, b * 8 * scaleY, 1.8 * scaleX, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (char.chestEmblem === 'polka_blazer') {
    // Sanjay Mishra bright pink blazer with colorful polka-dot inner V-shirt
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-5 * scaleX, -torsoH * 0.46);
    ctx.lineTo(11 * scaleX, -torsoH * 0.46);
    ctx.lineTo(3 * scaleX, torsoH * 0.08);
    ctx.closePath();
    ctx.fill();
    const dotColors = ['#fde047', '#38bdf8', '#4ade80', '#f472b6', '#fb923c'];
    for (let d = 0; d < 5; d++) {
      ctx.fillStyle = dotColors[d];
      ctx.beginPath();
      ctx.arc(
        (d % 2 === 0 ? 0.5 : 5.5) * scaleX,
        (-torsoH * 0.36 + d * 6.5) * scaleY,
        2.3 * scaleX,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (char.chestEmblem === 'backpack_straps') {
    // Ranveer Singh trekking backpack straps
    ctx.fillStyle = '#4a3228';
    ctx.strokeStyle = '#0b0f19';
    ctx.lineWidth = 1.2;
    ctx.fillRect(-chestW * 0.4, -torsoH * 0.46, 5.2 * scaleX, torsoH * 0.82);
    ctx.strokeRect(-chestW * 0.4, -torsoH * 0.46, 5.2 * scaleX, torsoH * 0.82);
    ctx.fillRect(chestW * 0.22, -torsoH * 0.46, 5.2 * scaleX, torsoH * 0.82);
    ctx.strokeRect(chestW * 0.22, -torsoH * 0.46, 5.2 * scaleX, torsoH * 0.82);
  } else if (char.chestEmblem === 'saree_drape') {
    // Mamata Banerjee / Tiger Shroff diagonal border drape
    ctx.strokeStyle = palette.suitSecondary;
    ctx.lineWidth = 4.5 * scaleX;
    ctx.beginPath();
    ctx.moveTo(-chestW * 0.45, -torsoH * 0.44);
    ctx.lineTo(waistW * 0.45, torsoH * 0.35);
    ctx.stroke();
  } else if (char.chestEmblem === 'iron_ring') {
    // Salman Khan Tere Naam dark iron neck ring
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 3.2 * scaleX;
    ctx.beginPath();
    ctx.ellipse(2 * scaleX, -torsoH * 0.4, 10.5 * scaleX, 6.2 * scaleY, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  } else if (char.chestEmblem === 'collared_shirt') {
    // Crisp button-down / kurta collar & placket
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 1.7 * scaleX;
    ctx.beginPath();
    ctx.moveTo(-5 * scaleX, -torsoH * 0.46);
    ctx.lineTo(3 * scaleX, -torsoH * 0.25);
    ctx.lineTo(10 * scaleX, -torsoH * 0.46);
    ctx.moveTo(3 * scaleX, -torsoH * 0.25);
    ctx.lineTo(3 * scaleX, torsoH * 0.36);
    ctx.stroke();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    for (let b = -1; b <= 2; b++) {
      ctx.beginPath();
      ctx.arc(3 * scaleX, b * 8 * scaleY, 1.4 * scaleX, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (char.chestEmblem === 'hoodie') {
    // Total Gaming / Arjun Kapoor hoodie collar + white drawstrings
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.0 * scaleX;
    ctx.beginPath();
    ctx.moveTo(0 * scaleX, -torsoH * 0.42);
    ctx.lineTo(1 * scaleX, -torsoH * 0.05);
    ctx.moveTo(7 * scaleX, -torsoH * 0.42);
    ctx.lineTo(8 * scaleX, -torsoH * 0.08);
    ctx.stroke();
  } else if (outfitStyle === 'hero_suit') {
    // Sleeveless hoodie drawstrings & collar
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.0 * scaleX;
    ctx.beginPath();
    ctx.moveTo(4 * scaleX, -torsoH * 0.38);
    ctx.lineTo(6 * scaleX, -torsoH * 0.05);
    ctx.moveTo(10 * scaleX, -torsoH * 0.38);
    ctx.lineTo(12 * scaleX, -torsoH * 0.08);
    ctx.stroke();
  } else if (outfitStyle === 'knight_armor') {
    // Crimson leather vest center seam & 3 metallic straps
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2 * scaleX;
    ctx.beginPath();
    ctx.moveTo(4 * scaleX, -torsoH * 0.45);
    ctx.lineTo(3 * scaleX, torsoH * 0.44);
    ctx.stroke();
    ctx.fillStyle = palette.buckle;
    for (let b = -1; b <= 1; b++) {
      ctx.fillRect(-3 * scaleX, b * 11 * scaleY, 12 * scaleX, 3.6 * scaleY);
    }
  } else if (outfitStyle === 'dojo_gi') {
    // Emerald & gold V-collar lapel + black martial sash
    ctx.strokeStyle = palette.suitSecondary;
    ctx.lineWidth = 3.2 * scaleX;
    ctx.beginPath();
    ctx.moveTo(-6 * scaleX, -torsoH * 0.46);
    ctx.lineTo(7 * scaleX, -torsoH * 0.04);
    ctx.lineTo(4 * scaleX, torsoH * 0.45);
    ctx.stroke();
  } else if (outfitStyle === 'toaster_bot') {
    // Dark inner hoodie triangle + golden bomber zipper
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-2 * scaleX, -torsoH * 0.46);
    ctx.lineTo(10 * scaleX, -torsoH * 0.46);
    ctx.lineTo(5 * scaleX, -torsoH * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  // Belt / waist sash (skip on bare sindoor Chhota Pandit torso)
  if (char.chestEmblem !== 'rudraksha_mala') {
    ctx.fillStyle = palette.belt;
    ctx.strokeStyle = '#0b0f19';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-waistW * 0.56, torsoH * 0.33, waistW * 1.12, 7.5 * scaleY, 2);
    ctx.fill();
    ctx.stroke();
  }

  // Optional signature neck muffler / scarf / shawl
  if (char.mufflerColor) {
    ctx.fillStyle = char.mufflerColor;
    ctx.strokeStyle = '#0b0f19';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-chestW * 0.52, -torsoH * 0.54, chestW * 1.04, 11 * scaleY, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-chestW * 0.45, -torsoH * 0.46, 10 * scaleX, 24 * scaleY, 3);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export interface DrawHumanFighterOptions {
  xPx: number;
  yPx: number; // fighter vertical origin in pixels (floorY - worldY * ppm)
  groundYPx?: number; // actual stage floor Y in pixels (pins shadow & contact ring during jumps)
  facing: 1 | -1; // 1 = facing right, -1 = facing left
  character: CharacterDefinition;
  motion: FighterMotionData;
  time: number;
  isPlayer: boolean;
  showShadow?: boolean;
  worldScale?: number;
}

/**
 * Renders a complete, anatomically proportioned, expressive human fighter in 2D Canvas.
 */
export function drawHumanFighter2D(
  ctx: CanvasRenderingContext2D,
  opts: DrawHumanFighterOptions,
): void {
  const {
    xPx,
    yPx,
    groundYPx = yPx,
    facing,
    character,
    motion,
    time,
    isPlayer,
    showShadow = true,
    worldScale = 1,
  } = opts;

  if (character.spriteCharacterId) {
    const rendered = drawSpriteFighter2D(ctx, {
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
    });
    if (rendered) return;
  }

  const sx = character.bodyScale[0] * worldScale;
  const sy = character.bodyScale[1] * worldScale;
  const headScale = (sx + sy) * 0.5;
  const p = motion.actionProgress;

  // Squash & stretch + wobble calculations
  const landingAmt = motion.grounded ? Math.max(0, Math.min(1, motion.landingSquash)) : 0;
  const squashFactor = 1 - landingAmt * 0.14;
  const stretchFactor = 1 + landingAmt * 0.08;
  const isCrouch = Boolean(motion.isCrouching) && motion.grounded && motion.action === 'none';

  // Build skeletal pose in local coordinates (origin at feet, +X = facing forward, -Y = upward)
  const breath = Math.sin(time * 4.2 + (isPlayer ? 0 : 1.7)) * 2.0 * sy;
  const runCycle = time * (motion.locomotion === 'run' ? 14 : 9);
  const walkAmp =
    motion.locomotion === 'run' ? 1.0 : motion.locomotion === 'walk' ? 0.62 : 0;

  let hipY = (-68 + breath) * sy * squashFactor;
  let hipX = 0;
  let torsoLean = 0.08 + walkAmp * 0.16;
  let headTilt = 0;

  // Limb joint angles in local space (+X forward, +Y down):
  // shAng > 0 points arm forward (+X); elAng < 0 bends forearm upward/forward (fAng = shAng - elAng)
  let frontThighAng = 0.24 + landingAmt * 0.42;
  let frontKneeBend = 0.28 + landingAmt * 0.72;
  let backThighAng = -0.26 - landingAmt * 0.14;
  let backKneeBend = 0.3 + landingAmt * 0.68;

  // Raised boxer guard in front of torso & chin
  let frontShoulderAng = 0.26;
  let frontElbowAngle = -1.85;
  let backShoulderAng = -0.16;
  let backElbowAngle = -1.95;

  let frontFootAngle = 0;
  let backFootAngle = 0;
  let frontFistActive = false;
  let backFistActive = false;

  if (landingAmt > 0.05 && motion.action === 'none' && !isCrouch) {
    torsoLean += landingAmt * 0.22;
    frontShoulderAng += landingAmt * 0.22;
    backShoulderAng -= landingAmt * 0.2;
  }

  if (walkAmp > 0 && motion.grounded && motion.action === 'none') {
    const s = Math.sin(runCycle);
    const c = Math.cos(runCycle);
    hipY += Math.abs(c) * 3.5 * walkAmp * sy;
    frontThighAng = s * 0.68 * walkAmp + 0.12;
    frontKneeBend = Math.max(0.14, -c * 0.78 * walkAmp + 0.28);
    backThighAng = -s * 0.68 * walkAmp - 0.06;
    backKneeBend = Math.max(0.14, c * 0.78 * walkAmp + 0.28);

    // Natural opposing arm swing while walking & sprinting
    frontShoulderAng = -s * 0.68 * walkAmp + 0.18;
    frontElbowAngle = -1.48 - walkAmp * 0.15;
    backShoulderAng = s * 0.68 * walkAmp + 0.08;
    backElbowAngle = -1.48 - walkAmp * 0.15;
  }

  if (!motion.grounded && motion.action === 'none') {
    const rising = motion.verticalVelocity > 0;
    torsoLean = rising ? -0.06 : 0.16;
    frontThighAng = rising ? 0.82 : 0.56;
    frontKneeBend = rising ? 1.25 : 0.72;
    backThighAng = rising ? -0.34 : -0.22;
    backKneeBend = rising ? 0.92 : 0.52;
    frontShoulderAng = rising ? 1.35 : 0.95;
    frontElbowAngle = -1.15;
    backShoulderAng = rising ? -0.78 : -0.55;
    backElbowAngle = -1.05;
  }

  if (isCrouch) {
    hipY = -44 * sy;
    torsoLean = 0.34;
    frontThighAng = 1.05;
    frontKneeBend = 1.75;
    backThighAng = 0.55;
    backKneeBend = 1.65;
    frontShoulderAng = 0.32;
    frontElbowAngle = -1.95;
    backShoulderAng = 0.08;
    backElbowAngle = -1.95;
  }

  let bodyLiftPx = 0;
  let bodyRotRad = 0;
  let rotPivotY = -46 * sy;
  let showChampAura = false;
  let showDefeatStars = false;
  let showSighPuff = false;
  let showToastSmoke = false;

  // Combat Action Poses
  if (motion.action === 'block') {
    hipY = -58 * sy;
    torsoLean = -0.06;
    // Tight high guard directly in front of face & ribs (+X forward)
    frontShoulderAng = 0.68;
    frontElbowAngle = -1.95;
    backShoulderAng = 0.42;
    backElbowAngle = -2.0;
    frontThighAng = 0.36;
    frontKneeBend = 0.54;
    backThighAng = -0.28;
    backKneeBend = 0.48;
  } else if (motion.action === 'dodge') {
    torsoLean = 0.52;
    hipY = -54 * sy;
    frontThighAng = 0.85;
    frontKneeBend = 0.95;
    backThighAng = -0.72;
    backKneeBend = 0.44;
    frontShoulderAng = -0.45;
    frontElbowAngle = -1.2;
    backShoulderAng = 0.55;
    backElbowAngle = -1.4;
  } else if (motion.action === 'punch') {
    const snap = Math.sin(Math.min(1, p * 1.35) * Math.PI);
    const useLead = motion.comboStep % 2 === 0;
    torsoLean = 0.26 * snap + 0.08;
    hipX = 6 * snap * sx;
    if (useLead) {
      // Snappy forward jab (+1.56 rad = straight forward +X)
      frontShoulderAng = 1.56 * snap + 0.28 * (1 - snap);
      frontElbowAngle = 0.06 * snap - 1.75 * (1 - snap);
      backShoulderAng = -0.35 * snap - 0.16 * (1 - snap);
      backElbowAngle = -1.95;
      frontFistActive = p >= 0.25 && p <= 0.72;
    } else {
      // Heavy forward cross
      backShoulderAng = 1.54 * snap - 0.16 * (1 - snap);
      backElbowAngle = 0.06 * snap - 1.85 * (1 - snap);
      frontShoulderAng = -0.28 * snap + 0.28 * (1 - snap);
      frontElbowAngle = -1.85;
      backFistActive = p >= 0.25 && p <= 0.72;
    }
  } else if (motion.action === 'kick') {
    const snap = Math.sin(Math.min(1, p * 1.2) * Math.PI);
    torsoLean = -0.38 * snap;
    hipY = (-70 - 3 * snap) * sy;
    backThighAng = 0.08;
    backKneeBend = 0.18;
    // High roundhouse / side-kick extension toward opponent (+X)
    frontThighAng = 1.65 * snap + 0.24 * (1 - snap);
    frontKneeBend = 0.08 * snap + 0.35 * (1 - snap);
    frontFootAngle = -0.35 * snap;
    frontShoulderAng = -0.45 * snap + 0.24 * (1 - snap);
    frontElbowAngle = -1.45;
    backShoulderAng = 0.65 * snap;
    backElbowAngle = -1.6;
  } else if (motion.action === 'special') {
    const animType = character.special.animType;
    if (animType === 'slam') {
      const smash = p < 0.45 ? p / 0.45 : 1 - (p - 0.45) / 0.55;
      bodyLiftPx = Math.sin(p * Math.PI) * 34 * sy;
      torsoLean = p < 0.45 ? -0.32 * smash : 0.44;
      // Overhead windup (+2.65 rad) -> crushing forward-downward slam (+0.85 rad)
      frontShoulderAng = p < 0.45 ? 2.65 : 0.85;
      backShoulderAng = p < 0.45 ? 2.45 : 0.72;
      frontElbowAngle = -0.22;
      backElbowAngle = -0.25;
      frontFistActive = p >= 0.42 && p <= 0.8;
      backFistActive = frontFistActive;
    } else if (animType === 'helicopter') {
      const spin = Math.cos(p * Math.PI * 6);
      torsoLean = 0.22;
      bodyLiftPx = Math.sin(p * Math.PI) * 18 * sy;
      frontShoulderAng = 1.5 * spin;
      backShoulderAng = -1.5 * spin;
      frontElbowAngle = -0.15;
      backElbowAngle = -0.15;
      frontFistActive = p >= 0.4 && p <= 0.8;
      backFistActive = frontFistActive;
    } else if (animType === 'hurricane') {
      const spin = Math.sin(p * Math.PI * 5);
      bodyLiftPx = Math.sin(p * Math.PI) * 24 * sy;
      torsoLean = -0.28 * spin;
      frontThighAng = 1.55 * Math.abs(spin);
      frontKneeBend = 0.1;
      backThighAng = -1.1 * Math.abs(spin);
      backKneeBend = 0.35;
      frontShoulderAng = 0.85;
      backShoulderAng = -0.85;
      frontElbowAngle = -1.1;
      backElbowAngle = -1.1;
    } else {
      // Rising forward uppercut popup!
      const rise = Math.sin(p * Math.PI);
      bodyLiftPx = 40 * rise * sy;
      torsoLean = -0.22 * rise;
      frontShoulderAng = 2.55 * rise + 0.35 * (1 - rise);
      frontElbowAngle = -0.3 * rise - 1.6 * (1 - rise);
      backShoulderAng = -0.45 * rise;
      backElbowAngle = -1.5;
      frontFistActive = p >= 0.35 && p <= 0.82;
    }
  } else if (motion.action === 'stun') {
    const recoil = Math.sin(time * 28) * 0.14;
    hipY = -63 * sy;
    torsoLean = -0.34 + recoil;
    headTilt = -0.34;
    frontThighAng = 0.38;
    frontKneeBend = 0.56;
    backThighAng = -0.34;
    backKneeBend = 0.44;
    frontShoulderAng = 0.92;
    frontElbowAngle = -0.55;
    backShoulderAng = -0.68;
    backElbowAngle = -0.5;
  } else if (motion.action === 'victory') {
    const vStyle = character.victoryStyle;
    const t = Math.max(0, Math.min(1, p));

    if (vStyle === 'boxer_shuffle_pump') {
      if (t < 0.38) {
        // Ali-shuffle footwork + double glove clash
        const shuf = Math.sin(t * Math.PI * 10);
        hipY = (-68 - Math.abs(shuf) * 6) * sy;
        torsoLean = shuf * 0.14;
        frontThighAng = 0.25 + shuf * 0.45;
        frontKneeBend = 0.35 + Math.max(0, -shuf) * 0.35;
        backThighAng = -0.25 - shuf * 0.45;
        backKneeBend = 0.35 + Math.max(0, shuf) * 0.35;
        const clash = Math.abs(Math.sin(t * Math.PI * 5));
        frontShoulderAng = 1.05 + clash * 0.4;
        frontElbowAngle = -1.6 + clash * 0.4;
        backShoulderAng = 0.9 + clash * 0.4;
        backElbowAngle = -1.65 + clash * 0.4;
      } else if (t < 0.68) {
        // Spring crouch -> celebratory jump fist pump!
        const jPhase = (t - 0.38) / 0.3;
        if (jPhase < 0.25) {
          const crouch = jPhase / 0.25;
          hipY = (-68 + crouch * 16) * sy;
          torsoLean = 0.22 * crouch;
          frontThighAng = 0.55 * crouch;
          frontKneeBend = 0.9 * crouch;
        } else {
          const air = (jPhase - 0.25) / 0.75;
          bodyLiftPx = Math.sin(air * Math.PI) * 52 * sy;
          torsoLean = -0.1;
          frontShoulderAng = 2.85;
          frontElbowAngle = -0.22;
          backShoulderAng = -2.85;
          backElbowAngle = 0.22;
          frontThighAng = 0.52;
          frontKneeBend = 0.95;
          backThighAng = -0.3;
          backKneeBend = 0.65;
          showChampAura = true;
        }
      } else {
        // Champion alternating uppercut pumps
        const pump = Math.sin(time * 8.5);
        hipY = (-68 - Math.abs(pump) * 5) * sy;
        torsoLean = pump * 0.1;
        frontShoulderAng = 2.3 + pump * 0.55;
        frontElbowAngle = -0.45;
        backShoulderAng = -2.3 + pump * 0.55;
        backElbowAngle = 0.45;
        showChampAura = true;
      }
    } else if (vStyle === 'heavy_chest_flex') {
      if (t < 0.42) {
        // Double heavy chest-thump!
        const thump = Math.abs(Math.sin((t / 0.42) * Math.PI * 2));
        hipY = (-66 - thump * 4) * sy;
        torsoLean = -0.08 * thump;
        frontThighAng = 0.32;
        backThighAng = -0.34;
        frontShoulderAng = 0.7 - thump * 0.35;
        frontElbowAngle = -1.9 - thump * 0.35;
        backShoulderAng = 0.4 - thump * 0.35;
        backElbowAngle = -1.85 - thump * 0.35;
      } else if (t < 0.62) {
        // Power squat windup
        const sq = (t - 0.42) / 0.2;
        hipY = (-66 + sq * 20) * sy;
        torsoLean = 0.25 * sq;
        frontThighAng = 0.85 * sq + 0.25;
        frontKneeBend = 1.3 * sq + 0.25;
        backThighAng = -0.55 * sq - 0.25;
        backKneeBend = 1.0 * sq + 0.25;
        frontShoulderAng = -0.6 * sq;
        backShoulderAng = 0.6 * sq;
      } else {
        // Iconic double-bicep strongman flex roar!
        const pulse = Math.sin(time * 5.2);
        hipY = (-64 + Math.abs(pulse) * 3) * sy;
        torsoLean = -0.14 + pulse * 0.04;
        headTilt = -0.18;
        frontThighAng = 0.38;
        frontKneeBend = 0.38;
        backThighAng = -0.38;
        backKneeBend = 0.38;
        frontShoulderAng = 1.62 + pulse * 0.1;
        frontElbowAngle = -1.65;
        backShoulderAng = -1.55 - pulse * 0.1;
        backElbowAngle = 1.65;
        showChampAura = true;
      }
    } else if (vStyle === 'martial_crane_bow') {
      if (t < 0.46) {
        // Dragon-Crane balanced stance!
        const k = Math.sin((t / 0.46) * Math.PI);
        hipY = (-69 - k * 4) * sy;
        torsoLean = -0.06;
        frontThighAng = 0.25 + k * 1.25;
        frontKneeBend = 0.3 + k * 1.45;
        backThighAng = 0.04;
        backKneeBend = 0.12;
        frontShoulderAng = 1.25 * k + 0.4;
        frontElbowAngle = -1.35;
        backShoulderAng = -2.2 * k;
        backElbowAngle = 0.7;
      } else if (t < 0.78) {
        // Deep respectful martial bow
        const bow = Math.sin(((t - 0.46) / 0.32) * Math.PI);
        hipY = -66 * sy;
        torsoLean = 0.1 + bow * 0.68;
        headTilt = bow * 0.24;
        frontThighAng = 0.18;
        backThighAng = -0.18;
        frontShoulderAng = 0.65 * bow;
        frontElbowAngle = -1.6 * bow - 0.3;
        backShoulderAng = 0.55 * bow;
        backElbowAngle = -1.55 * bow - 0.3;
        showChampAura = bow > 0.5;
      } else {
        // Serene crane-focus idle hold
        const calm = Math.sin(time * 3.5);
        hipY = (-68 + calm * 2) * sy;
        torsoLean = 0.04;
        frontShoulderAng = 0.95;
        frontElbowAngle = -1.75;
        backShoulderAng = -0.35;
        backElbowAngle = -1.5;
        showChampAura = true;
      }
    } else if (vStyle === 'parkour_backflip') {
      if (t < 0.18) {
        // Deep spring coil
        const c = t / 0.18;
        hipY = (-68 + c * 22) * sy;
        torsoLean = 0.4 * c;
        frontThighAng = 0.9 * c;
        frontKneeBend = 1.4 * c;
        frontShoulderAng = -0.9 * c;
        backShoulderAng = -0.8 * c;
      } else if (t < 0.64) {
        // Full 360 celebratory parkour flip!
        const flip = (t - 0.18) / 0.46;
        bodyLiftPx = Math.sin(flip * Math.PI) * 96 * sy;
        bodyRotRad = -flip * Math.PI * 2;
        rotPivotY = -64 * sy;
        hipY = -58 * sy;
        frontThighAng = 1.25;
        frontKneeBend = 1.75;
        backThighAng = 0.95;
        backKneeBend = 1.75;
        frontShoulderAng = 1.4;
        frontElbowAngle = -1.4;
        backShoulderAng = 1.2;
        backElbowAngle = -1.4;
        showChampAura = true;
      } else if (t < 0.8) {
        // Hero superhero landing
        const land = 1 - (t - 0.64) / 0.16;
        hipY = (-68 + land * 24) * sy;
        torsoLean = 0.45 * land;
        frontThighAng = 0.85 * land + 0.25;
        frontKneeBend = 1.3 * land + 0.25;
        frontShoulderAng = 1.8;
        frontElbowAngle = -0.25;
        backShoulderAng = -1.4;
        backElbowAngle = 0.25;
        showChampAura = true;
      } else {
        // Victory bounce + finger-gun hype!
        const bop = Math.abs(Math.sin(time * 9.5));
        hipY = (-68 - bop * 8) * sy;
        torsoLean = Math.sin(time * 4.5) * 0.1;
        frontShoulderAng = 1.65 + Math.sin(time * 9) * 0.15;
        frontElbowAngle = -0.15;
        backShoulderAng = 2.65;
        backElbowAngle = -0.25;
        showChampAura = true;
      }
    } else {
      // Guest fighter salute victory
      const pulse = Math.sin(time * 6);
      hipY = (-68 - Math.abs(pulse) * 5) * sy;
      torsoLean = -0.06;
      frontShoulderAng = 2.65;
      frontElbowAngle = -0.35;
      backShoulderAng = -0.45;
      backElbowAngle = -1.4;
      showChampAura = true;
    }
  } else if (motion.action === 'defeat') {
    const dStyle = character.defeatStyle;
    const t = Math.max(0, Math.min(1, p));
    showDefeatStars = true;

    if (dStyle === 'dizzy_faceplant') {
      rotPivotY = -8 * sy;
      if (t < 0.5) {
        // Woozy boxer stagger holding head
        const sway = Math.sin(t * Math.PI * 5);
        hipY = (-64 + t * 14) * sy;
        torsoLean = sway * 0.36;
        headTilt = sway * 0.35;
        frontThighAng = 0.2 + sway * 0.25;
        frontKneeBend = 0.55;
        backThighAng = -0.2 - sway * 0.25;
        backKneeBend = 0.55;
        frontShoulderAng = 1.1;
        frontElbowAngle = -2.1; // clutching brow
        backShoulderAng = -0.5 + sway * 0.4;
        backElbowAngle = -0.3;
      } else if (t < 0.78) {
        // Forward faceplant onto mat
        const fall = (t - 0.5) / 0.28;
        const ease = fall * fall;
        bodyRotRad = ease * 1.48;
        hipY = (-56 + ease * 8) * sy;
        torsoLean = 0.2;
        frontShoulderAng = 1.9;
        frontElbowAngle = -0.2;
        backShoulderAng = 1.4;
        backElbowAngle = -0.25;
      } else {
        // Mat bounce & flat faceplant exhaustion
        const bounce = t < 0.9 ? Math.abs(Math.sin(((t - 0.78) / 0.12) * Math.PI)) * 0.08 : 0;
        bodyRotRad = 1.48 - bounce;
        hipY = -50 * sy;
        torsoLean = 0.18;
        frontShoulderAng = 2.0 + Math.sin(time * 2.2) * 0.05;
        frontElbowAngle = -0.2;
        backShoulderAng = 1.1;
        backElbowAngle = -0.3;
      }
    } else if (dStyle === 'timber_topple') {
      rotPivotY = -8 * sy;
      if (t < 0.48) {
        // Stiff giant teetering backward/forward trying to balance
        const wobble = Math.sin(t * Math.PI * 4.5);
        bodyRotRad = -0.15 + wobble * 0.22 - t * 0.35;
        hipY = -68 * sy;
        torsoLean = -0.05;
        frontShoulderAng = 1.4 + wobble * 1.1;
        frontElbowAngle = -0.2;
        backShoulderAng = -1.4 - wobble * 1.1;
        backElbowAngle = 0.2;
      } else if (t < 0.78) {
        // Heavy backward timber crash!
        const fall = (t - 0.48) / 0.3;
        const ease = fall * fall;
        bodyRotRad = -0.32 - ease * 1.18;
        hipY = -66 * sy;
        frontShoulderAng = 2.2;
        backShoulderAng = -1.8;
      } else {
        // Heavy thud bounce + boot twitch
        const bounce = t < 0.92 ? Math.abs(Math.sin(((t - 0.78) / 0.14) * Math.PI)) * 0.1 : 0;
        bodyRotRad = -1.5 + bounce;
        hipY = -64 * sy;
        frontThighAng = 0.12 + Math.sin(time * 12) * (t < 0.95 ? 0.1 : 0.02);
        backThighAng = -0.18;
        frontShoulderAng = 0.8;
        frontElbowAngle = -0.2;
        backShoulderAng = -0.9;
        backElbowAngle = 0.2;
      }
    } else if (dStyle === 'dramatic_slump') {
      showDefeatStars = false;
      if (t < 0.38) {
        // Slow-mo kung-fu shock clutching chest
        const k = t / 0.38;
        hipY = (-68 + k * 10) * sy;
        torsoLean = -0.34 * Math.sin(k * Math.PI * 0.5);
        headTilt = -0.25 * k;
        frontShoulderAng = 0.95;
        frontElbowAngle = -1.85;
        backShoulderAng = -0.5;
        backElbowAngle = -0.4;
      } else if (t < 0.7) {
        // Drops dramatically onto knees
        const k = (t - 0.38) / 0.32;
        hipY = (-58 + k * 28) * sy;
        torsoLean = -0.3 + k * 0.72;
        headTilt = -0.2 + k * 0.55;
        frontThighAng = 0.95 * k + 0.2;
        frontKneeBend = 1.9 * k;
        backThighAng = 0.55 * k;
        backKneeBend = 1.95 * k;
        frontShoulderAng = 0.85;
        frontElbowAngle = -1.1 + k * 0.7;
      } else {
        // Meditative defeated slump + sighing puffs
        const breathe = Math.sin(time * 2.8) * 0.04;
        hipY = -28 * sy;
        torsoLean = 0.65 + breathe;
        headTilt = 0.45 + breathe;
        frontThighAng = 1.15;
        frontKneeBend = 1.98;
        backThighAng = 0.62;
        backKneeBend = 2.02;
        frontShoulderAng = 0.55;
        frontElbowAngle = -0.25;
        backShoulderAng = 0.65;
        backElbowAngle = -0.25;
        showSighPuff = true;
      }
    } else if (dStyle === 'crispy_splat') {
      rotPivotY = -44 * sy;
      showToastSmoke = t >= 0.45;
      if (t < 0.36) {
        // Popped-toast upward launch flailing limbs!
        const pop = t / 0.36;
        bodyLiftPx = Math.sin(pop * Math.PI) * 58 * sy;
        bodyRotRad = pop * 0.75;
        const flail = Math.sin(t * Math.PI * 14);
        frontShoulderAng = 2.1 + flail * 0.65;
        backShoulderAng = -2.1 - flail * 0.65;
        frontElbowAngle = -0.3;
        backElbowAngle = 0.3;
        frontThighAng = 0.6 * flail;
        backThighAng = -0.6 * flail;
      } else if (t < 0.66) {
        // Falls and splats flat onto stage floor
        const drop = (t - 0.36) / 0.3;
        bodyLiftPx = Math.max(0, (1 - drop) * 24 * sy);
        bodyRotRad = 0.75 + drop * 0.77;
        hipY = (-64 + drop * 20) * sy;
        frontShoulderAng = 1.9;
        backShoulderAng = -1.6;
      } else {
        // Splayed out quivering on the mat with sizzling steam wisps
        rotPivotY = -10 * sy;
        bodyRotRad = 1.52 + Math.sin(time * 22) * (t < 0.88 ? 0.035 : 0.008);
        hipY = -48 * sy;
        frontThighAng = 0.4;
        frontKneeBend = 0.4;
        backThighAng = -0.35;
        backKneeBend = 0.45;
        frontShoulderAng = 2.25;
        frontElbowAngle = -0.2;
        backShoulderAng = -1.95;
        backElbowAngle = 0.2;
      }
    } else {
      // Guest kneel defeat
      const drop = Math.min(1, t * 2.2);
      hipY = (-68 + drop * 38) * sy;
      torsoLean = drop * 0.68;
      headTilt = drop * 0.42;
      frontThighAng = drop * 1.15;
      frontKneeBend = drop * 1.95;
      backThighAng = drop * 0.65;
      backKneeBend = drop * 2.05;
      frontShoulderAng = drop * 0.85;
      frontElbowAngle = -0.25;
      backShoulderAng = drop * 0.95;
      backElbowAngle = -0.2;
    }
  }

  // Hit wobble recoil
  if (motion.hitWobble > 0) {
    torsoLean -= motion.hitWobble * 0.28;
    hipX -= motion.hitWobble * 7 * sx;
  }

  // Compute Forward Kinematics joints in local character space (origin = feet)
  const hip: Vec2 = { x: hipX, y: hipY };
  const spineLen = 46 * sy;
  const shoulder: Vec2 = {
    x: hip.x + Math.sin(torsoLean) * spineLen,
    y: hip.y - Math.cos(torsoLean) * spineLen,
  };
  const head: Vec2 = {
    x: shoulder.x + Math.sin(torsoLean * 0.7) * 20 * sy,
    y: shoulder.y - Math.cos(torsoLean * 0.7) * 20 * sy,
  };

  const thighLen = 33 * sy;
  const shinLen = 33 * sy;
  const upperArmLen = 25 * sy;
  const foreArmLen = 24 * sy;

  const solveLeg = (hOffX: number, thighAng: number, kneeBend: number) => {
    const hx = hip.x + hOffX;
    const hy = hip.y + 4 * sy;
    const kx = hx + Math.sin(thighAng) * thighLen;
    const ky = hy + Math.cos(thighAng) * thighLen;
    const shinAng = thighAng - kneeBend;
    const ax = kx + Math.sin(shinAng) * shinLen;
    const ay = ky + Math.cos(shinAng) * shinLen;
    return { hx, hy, kx, ky, ax, ay };
  };

  const solveArm = (sOffX: number, sOffY: number, shAng: number, elAng: number) => {
    const sx0 = shoulder.x + sOffX;
    const sy0 = shoulder.y + sOffY;
    const ex = sx0 + Math.sin(shAng) * upperArmLen;
    const ey = sy0 + Math.cos(shAng) * upperArmLen;
    const fAng = shAng - elAng;
    const wx = ex + Math.sin(fAng) * foreArmLen;
    const wy = ey + Math.cos(fAng) * foreArmLen;
    return { sx0, sy0, ex, ey, wx, wy, fAng };
  };

  const backLeg = solveLeg(-5 * sx, backThighAng, backKneeBend);
  const frontLeg = solveLeg(5 * sx, frontThighAng, frontKneeBend);
  const backArm = solveArm(-6 * sx, 6 * sy, backShoulderAng, backElbowAngle);
  const frontArm = solveArm(6 * sx, 6 * sy, frontShoulderAng, frontElbowAngle);

  // Lock the lowest supporting shoe sole flush onto the stage floor (yPx) for grounded poses
  // so idle, walk, run, landing, crouch, block, punch, kick & stun never sink below the floor.
  const shouldSnapFeetToFloor =
    motion.grounded &&
    bodyRotRad === 0 &&
    bodyLiftPx === 0 &&
    motion.action !== 'defeat';
  const lowestSoleY = Math.max(backLeg.ay, frontLeg.ay) + 7.5 * sx;
  const groundSnapOffsetY = shouldSnapFeetToFloor ? -lowestSoleY : 0;

  // Floor-pinned ground contact ring & shadow (attenuates smoothly with jump/flip altitude)
  const altitudePx = Math.max(0, groundYPx - yPx + bodyLiftPx);
  const shadowAtten = Math.max(0.32, 1 - altitudePx / Math.max(120, 260 * sy));
  ctx.save();
  ctx.globalAlpha = shadowAtten;
  ctx.fillStyle = isPlayer ? 'rgba(56, 189, 248, 0.25)' : 'rgba(251, 113, 133, 0.25)';
  ctx.strokeStyle = isPlayer ? 'rgba(56, 189, 248, 0.7)' : 'rgba(251, 113, 133, 0.7)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(xPx, groundYPx + 2, 30 * sx * shadowAtten, 7.5 * sx * shadowAtten, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (showShadow) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    ctx.ellipse(xPx, groundYPx + 1, 26 * sx * shadowAtten, 6 * sx * shadowAtten, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const renderPose = (alpha: number, ghostOffset = 0, tintFlash = false) => {
    ctx.save();
    ctx.translate(xPx + ghostOffset, yPx - bodyLiftPx + groundSnapOffsetY);
    ctx.scale(facing * stretchFactor, 1);
    if (bodyRotRad !== 0) {
      ctx.translate(0, rotPivotY);
      ctx.rotate(bodyRotRad);
      ctx.translate(0, -rotPivotY);
    }
    ctx.globalAlpha = alpha;

    const pal = character.palette;
    const skinShade = pal.cheek;
    const pantsShade = '#090d16';

    // 1. Back Arm (photo-matched sleeve length: bare, short, rolled, or long)
    const sleeveStyle =
      character.sleeveStyle ??
      (character.outfitStyle === 'toaster_bot' ? 'long' : 'bare');
    const fabricCol = character.sleeveColor ?? pal.suitPrimary;
    const fabricShade = character.sleeveColor ? '#94a3b8' : pal.suitSecondary;
    const upperArmCol = sleeveStyle === 'bare' ? pal.skin : fabricCol;
    const upperArmShade = sleeveStyle === 'bare' ? skinShade : fabricShade;
    const foreArmCol = sleeveStyle === 'long' ? fabricCol : pal.skin;
    const foreArmShade = sleeveStyle === 'long' ? fabricShade : skinShade;

    drawTaperedLimb(ctx, backArm.sx0, backArm.sy0, backArm.ex, backArm.ey, 7.2 * sx, 5.8 * sx, upperArmCol, upperArmShade);
    drawTaperedLimb(ctx, backArm.ex, backArm.ey, backArm.wx, backArm.wy, 5.6 * sx, 4.4 * sx, foreArmCol, foreArmShade);
    drawFistOrGlove(ctx, backArm.wx, backArm.wy, Math.PI * 0.5 - backArm.fAng, sx, character, backFistActive);

    // 2. Back Leg
    drawTaperedLimb(ctx, backLeg.hx, backLeg.hy, backLeg.kx, backLeg.ky, 9.2 * sx, 7.0 * sx, pal.shorts, pantsShade);
    drawTaperedLimb(ctx, backLeg.kx, backLeg.ky, backLeg.ax, backLeg.ay, 6.8 * sx, 4.8 * sx, pal.shorts, pantsShade);
    drawFootwear(ctx, backLeg.ax, backLeg.ay, backFootAngle, sx, character);

    // 3. Torso
    drawTorso(ctx, hip, shoulder, torsoLean, sx, sy, character);

    // 4. Neck & Human Head
    drawTaperedLimb(ctx, shoulder.x, shoulder.y, head.x, head.y + 8 * sy, 6.5 * sx, 5.8 * sx, pal.skin, skinShade);
    drawHumanHeadAndFace(ctx, head.x, head.y, headTilt + torsoLean * 0.35, headScale, character, motion, time);

    // 5. Front Leg
    drawTaperedLimb(ctx, frontLeg.hx, frontLeg.hy, frontLeg.kx, frontLeg.ky, 9.8 * sx, 7.4 * sx, pal.shorts, pantsShade);
    drawTaperedLimb(ctx, frontLeg.kx, frontLeg.ky, frontLeg.ax, frontLeg.ay, 7.2 * sx, 5.0 * sx, pal.shorts, pantsShade);
    drawFootwear(ctx, frontLeg.ax, frontLeg.ay, frontFootAngle, sx, character);

    // 6. Front Arm
    drawTaperedLimb(ctx, frontArm.sx0, frontArm.sy0, frontArm.ex, frontArm.ey, 7.8 * sx, 6.2 * sx, upperArmCol, upperArmShade);
    drawTaperedLimb(ctx, frontArm.ex, frontArm.ey, frontArm.wx, frontArm.wy, 6.0 * sx, 4.6 * sx, foreArmCol, foreArmShade);
    drawFistOrGlove(ctx, frontArm.wx, frontArm.wy, Math.PI * 0.5 - frontArm.fAng, sx, character, frontFistActive);

    // Hit flash highlight (isolated save/restore so globalCompositeOperation never leaks!)
    if (tintFlash && motion.hitWobble > 0.45) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(hip.x, hip.y - 25 * sy, 32 * sx, 58 * sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Victory Champion Sparkle Crown
    if (tintFlash && showChampAura) {
      for (let s = 0; s < 4; s++) {
        const ang = time * 4.5 + (s * Math.PI) / 2;
        const px = head.x + Math.cos(ang) * 28 * sx;
        const py = head.y - 24 * sy + Math.sin(ang * 2) * 8 * sy;
        ctx.fillStyle = s % 2 === 0 ? '#fde047' : pal.accent;
        ctx.beginPath();
        ctx.arc(px, py, (3.2 + Math.sin(time * 9 + s) * 1.1) * sx, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Blocking translucent guard shield
    if (motion.action === 'block') {
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(shoulder.x + 22 * sx, shoulder.y + 10 * sy, 42 * sy, -1.1, 1.1);
      ctx.fill();
      ctx.stroke();
    }

    // Stun / Defeat dizzy KO stars orbiting head
    if (motion.action === 'stun' || (tintFlash && showDefeatStars)) {
      for (let s = 0; s < 3; s++) {
        const ang = time * 5.8 + (s * Math.PI * 2) / 3;
        const stX = head.x + Math.cos(ang) * 20 * sx;
        const stY = head.y - 24 * sy + Math.sin(ang) * 6 * sy;
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(stX, stY, 4.2 * sx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Noodle Sensei defeated sigh puff
    if (tintFlash && showSighPuff) {
      const sighProg = (time * 0.9) % 1;
      ctx.fillStyle = `rgba(226, 232, 240, ${(1 - sighProg) * 0.6})`;
      ctx.beginPath();
      ctx.arc(
        head.x + (16 + sighProg * 14) * sx,
        head.y + (8 + sighProg * 12) * sy,
        (4 + sighProg * 5) * sx,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Toast-Zilla overcooked splat smoke wisps (drawn upward in world coords)
    if (tintFlash && showToastSmoke) {
      ctx.restore();
      ctx.save();
      ctx.translate(xPx + ghostOffset, yPx);
      ctx.globalAlpha = alpha;
      for (let w = 0; w < 3; w++) {
        const wp = (time * 1.1 + w * 0.33) % 1;
        ctx.fillStyle = `rgba(203, 213, 225, ${(1 - wp) * 0.45})`;
        ctx.beginPath();
        ctx.arc(
          (w - 1) * 16 * sx + Math.sin(time * 5 + w) * 6 * sx,
          -18 * sy - wp * 48 * sy,
          (5 + wp * 7) * sx,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    ctx.restore();
  };

  // Dodge motion-blur afterimages
  if (motion.action === 'dodge') {
    renderPose(0.22, -facing * 28 * sx, false);
    renderPose(0.4, -facing * 14 * sx, false);
  }
  renderPose(1.0, 0, true);
}

/**
 * Renders a crisp studio-lit 2D head-and-shoulders human bust portrait for roster cards and HUD badges.
 */
export function drawHumanPortrait2D(
  ctx: CanvasRenderingContext2D,
  character: CharacterDefinition,
  width: number,
  height: number,
): void {
  const { palette } = character;
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, palette.suitPrimary);
  bgGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Studio rim glow behind head
  const glow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.4,
    width * 0.05,
    width * 0.5,
    height * 0.42,
    width * 0.52,
  );
  glow.addColorStop(0, `${palette.accent}44`);
  glow.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width, height) / 68;

  // Shoulders & collar bust
  const shoulderGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
  shoulderGrad.addColorStop(0, palette.suitPrimary);
  shoulderGrad.addColorStop(1, palette.suitSecondary);
  ctx.fillStyle = shoulderGrad;
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = Math.max(1.2, 1.5 * scale);
  ctx.beginPath();
  ctx.moveTo(width * 0.1, height * 1.02);
  ctx.quadraticCurveTo(width * 0.22, height * 0.68, width * 0.5, height * 0.68);
  ctx.quadraticCurveTo(width * 0.78, height * 0.68, width * 0.9, height * 1.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (character.mufflerColor) {
    ctx.fillStyle = character.mufflerColor;
    ctx.beginPath();
    ctx.roundRect(width * 0.28, height * 0.66, width * 0.44, height * 0.16, 4 * scale);
    ctx.fill();
    ctx.stroke();
  }

  // Neck
  ctx.fillStyle = palette.cheek;
  ctx.fillRect(width * 0.41, height * 0.53, width * 0.18, height * 0.2);

  // Portrait Human Head
  drawHumanHeadAndFace(
    ctx,
    width * 0.48,
    height * 0.42,
    -0.03,
    scale * 1.08,
    character,
    {
      locomotion: 'idle',
      action: 'none',
      actionProgress: 0,
      comboStep: 0,
      speedRatio: 0,
      verticalVelocity: 0,
      grounded: true,
      landingSquash: 0,
      hitWobble: 0,
      stunTime: 0,
    },
    0,
  );

  ctx.restore();
}
