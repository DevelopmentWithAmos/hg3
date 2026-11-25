import { CharacterDefinition, FighterMotionData } from '../../types/game';

interface Vec2 {
  x: number;
  y: number;
}

interface LimbWidths {
  rStart: number;
  rMid: number;
  rEnd: number;
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

  // Outfit-specific realistic details
  if (outfitStyle === 'hero_suit') {
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

  // Belt / waist sash
  ctx.fillStyle = palette.belt;
  ctx.strokeStyle = '#0b0f19';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-waistW * 0.56, torsoH * 0.33, waistW * 1.12, 7.5 * scaleY, 2);
  ctx.fill();
  ctx.stroke();

  // Optional signature neck muffler / scarf
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
  yPx: number; // ground contact Y in pixels
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
    facing,
    character,
    motion,
    time,
    isPlayer,
    showShadow = true,
    worldScale = 1,
  } = opts;

  const sx = character.bodyScale[0] * worldScale;
  const sy = character.bodyScale[1] * worldScale;
  const p = motion.actionProgress;

  // Ground contact ring indicator (subtle 2D arcade cue)
  ctx.save();
  ctx.fillStyle = isPlayer ? 'rgba(56, 189, 248, 0.25)' : 'rgba(251, 113, 133, 0.25)';
  ctx.strokeStyle = isPlayer ? 'rgba(56, 189, 248, 0.7)' : 'rgba(251, 113, 133, 0.7)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(xPx, yPx + 2, 30 * sx, 7.5 * sx, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (showShadow) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    ctx.ellipse(xPx, yPx + 1, 26 * sx, 6 * sx, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Squash & stretch + wobble calculations
  const squashFactor = 1 - motion.landingSquash * 0.16;
  const stretchFactor = 1 + motion.landingSquash * 0.12;
  const isCrouch = Boolean(motion.isCrouching) && motion.grounded && motion.action === 'none';

  // Build skeletal pose in local coordinates (origin at feet, +X = facing forward, -Y = upward)
  const breath = Math.sin(time * 4.2 + (isPlayer ? 0 : 1.7)) * 2.2 * sy;
  const runCycle = time * (motion.locomotion === 'run' ? 14 : 9);
  const walkAmp =
    motion.locomotion === 'run' ? 1.0 : motion.locomotion === 'walk' ? 0.6 : 0;

  let hipY = (-68 + breath) * sy * squashFactor;
  let hipX = 0;
  let torsoLean = 0.08 + walkAmp * 0.16;
  let headTilt = 0;

  // Limb joint angles (radians relative to downward vector +Y in flipped screen space)
  let frontThighAng = 0.22;
  let frontKneeBend = 0.26;
  let backThighAng = -0.26;
  let backKneeBend = 0.28;

  let frontShoulderAng = -0.35;
  let frontElbowAngle = -1.65; // raised boxer guard
  let backShoulderAng = 0.35;
  let backElbowAngle = -1.75;

  let frontFootAngle = 0;
  let backFootAngle = 0;
  let frontFistActive = false;
  let backFistActive = false;

  if (walkAmp > 0 && motion.grounded && motion.action === 'none') {
    const s = Math.sin(runCycle);
    const c = Math.cos(runCycle);
    hipY += Math.abs(c) * 4.5 * walkAmp * sy;
    frontThighAng = s * 0.68 * walkAmp + 0.1;
    frontKneeBend = Math.max(0.12, -c * 0.8 * walkAmp + 0.25);
    backThighAng = -s * 0.68 * walkAmp - 0.05;
    backKneeBend = Math.max(0.12, c * 0.8 * walkAmp + 0.25);

    frontShoulderAng = -s * 0.45 * walkAmp - 0.25;
    backShoulderAng = s * 0.45 * walkAmp + 0.25;
  }

  if (!motion.grounded && motion.action === 'none') {
    torsoLean = motion.verticalVelocity > 0 ? -0.08 : 0.15;
    frontThighAng = 0.72;
    frontKneeBend = 1.15;
    backThighAng = -0.35;
    backKneeBend = 0.85;
    frontShoulderAng = -0.8;
    frontElbowAngle = -1.2;
    backShoulderAng = 0.7;
    backElbowAngle = -1.1;
  }

  if (isCrouch) {
    hipY = -44 * sy;
    torsoLean = 0.34;
    frontThighAng = 1.05;
    frontKneeBend = 1.75;
    backThighAng = 0.55;
    backKneeBend = 1.65;
    frontShoulderAng = -0.25;
    frontElbowAngle = -1.9;
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
    frontShoulderAng = -0.85;
    frontElbowAngle = -1.95;
    backShoulderAng = -0.55;
    backElbowAngle = -2.0;
    frontThighAng = 0.32;
    frontKneeBend = 0.48;
  } else if (motion.action === 'dodge') {
    torsoLean = 0.55;
    hipY = -54 * sy;
    frontThighAng = 0.85;
    frontKneeBend = 0.9;
    backThighAng = -0.75;
    backKneeBend = 0.4;
  } else if (motion.action === 'punch') {
    const snap = Math.sin(Math.min(1, p * 1.35) * Math.PI);
    const useLead = motion.comboStep % 2 === 0;
    torsoLean = 0.28 * snap + 0.08;
    hipX = 6 * snap * sx;
    if (useLead) {
      frontShoulderAng = -1.48 * snap - 0.2 * (1 - snap);
      frontElbowAngle = -0.08 * snap - 1.5 * (1 - snap);
      frontFistActive = p >= 0.25 && p <= 0.72;
    } else {
      backShoulderAng = -1.52 * snap + 0.2 * (1 - snap);
      backElbowAngle = -0.06 * snap - 1.6 * (1 - snap);
      backFistActive = p >= 0.25 && p <= 0.72;
    }
  } else if (motion.action === 'kick') {
    const snap = Math.sin(Math.min(1, p * 1.2) * Math.PI);
    torsoLean = -0.42 * snap;
    hipY = (-70 - 4 * snap) * sy;
    backThighAng = 0.08;
    backKneeBend = 0.18;
    // High roundhouse / side-kick extension!
    frontThighAng = 1.65 * snap + 0.22 * (1 - snap);
    frontKneeBend = 0.08 * snap + 0.35 * (1 - snap);
    frontFootAngle = -0.35 * snap;
    frontShoulderAng = 0.4;
    backShoulderAng = -0.7;
  } else if (motion.action === 'special') {
    const animType = character.special.animType;
    if (animType === 'slam') {
      const smash = p < 0.45 ? p / 0.45 : 1 - (p - 0.45) / 0.55;
      hipY = (-72 - 36 * Math.sin(p * Math.PI)) * sy;
      torsoLean = p < 0.45 ? -0.35 * smash : 0.48;
      frontShoulderAng = p < 0.45 ? -2.6 : -0.75;
      backShoulderAng = p < 0.45 ? -2.4 : -0.65;
      frontElbowAngle = -0.2;
      backElbowAngle = -0.25;
      frontFistActive = p >= 0.42 && p <= 0.8;
      backFistActive = frontFistActive;
    } else if (animType === 'helicopter') {
      const spin = Math.cos(p * Math.PI * 6);
      torsoLean = 0.25;
      hipY = (-72 - 18 * Math.sin(p * Math.PI)) * sy;
      frontShoulderAng = -1.4 * spin;
      backShoulderAng = 1.4 * spin;
      frontElbowAngle = -0.15;
      backElbowAngle = -0.15;
      frontFistActive = p >= 0.4 && p <= 0.8;
    } else if (animType === 'hurricane') {
      const spin = Math.sin(p * Math.PI * 5);
      hipY = (-74 - 22 * Math.sin(p * Math.PI)) * sy;
      torsoLean = -0.3 * spin;
      frontThighAng = 1.55 * Math.abs(spin);
      frontKneeBend = 0.1;
      backThighAng = -1.1 * Math.abs(spin);
      backKneeBend = 0.35;
    } else {
      // Rising uppercut popup!
      const rise = Math.sin(p * Math.PI);
      hipY = (-72 - 42 * rise) * sy;
      torsoLean = -0.24 * rise;
      frontShoulderAng = -2.4 * rise - 0.4 * (1 - rise);
      frontElbowAngle = -0.35;
      frontFistActive = p >= 0.35 && p <= 0.82;
    }
  } else if (motion.action === 'stun') {
    const recoil = Math.sin(time * 28) * 0.14;
    torsoLean = -0.34 + recoil;
    headTilt = -0.35;
    frontShoulderAng = 0.55;
    frontElbowAngle = -0.7;
    backShoulderAng = 0.75;
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

  const renderPose = (alpha: number, ghostOffset = 0, tintFlash = false) => {
    ctx.save();
    ctx.translate(xPx + ghostOffset, yPx - bodyLiftPx);
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

    // 1. Back Arm
    const armCol =
      character.outfitStyle === 'toaster_bot' ? pal.suitPrimary : pal.skin;
    const armShade =
      character.outfitStyle === 'toaster_bot' ? pal.suitSecondary : skinShade;

    drawTaperedLimb(ctx, backArm.sx0, backArm.sy0, backArm.ex, backArm.ey, 7.2 * sx, 5.8 * sx, armCol, armShade);
    drawTaperedLimb(ctx, backArm.ex, backArm.ey, backArm.wx, backArm.wy, 5.6 * sx, 4.4 * sx, armCol, armShade);
    drawFistOrGlove(ctx, backArm.wx, backArm.wy, Math.PI * 0.5 - backArm.fAng, sx, character, backFistActive);

    // 2. Back Leg
    drawTaperedLimb(ctx, backLeg.hx, backLeg.hy, backLeg.kx, backLeg.ky, 9.2 * sx, 7.0 * sx, pal.shorts, pantsShade);
    drawTaperedLimb(ctx, backLeg.kx, backLeg.ky, backLeg.ax, backLeg.ay, 6.8 * sx, 4.8 * sx, pal.shorts, pantsShade);
    drawFootwear(ctx, backLeg.ax, backLeg.ay, backFootAngle, sx, character);

    // 3. Torso
    drawTorso(ctx, hip, shoulder, torsoLean, sx, sy, character);

    // 4. Neck & Human Head
    drawTaperedLimb(ctx, shoulder.x, shoulder.y, head.x, head.y + 8 * sy, 6.5 * sx, 5.8 * sx, pal.skin, skinShade);
    drawHumanHeadAndFace(ctx, head.x, head.y, headTilt + torsoLean * 0.35, sx, character, motion, time);

    // 5. Front Leg
    drawTaperedLimb(ctx, frontLeg.hx, frontLeg.hy, frontLeg.kx, frontLeg.ky, 9.8 * sx, 7.4 * sx, pal.shorts, pantsShade);
    drawTaperedLimb(ctx, frontLeg.kx, frontLeg.ky, frontLeg.ax, frontLeg.ay, 7.2 * sx, 5.0 * sx, pal.shorts, pantsShade);
    drawFootwear(ctx, frontLeg.ax, frontLeg.ay, frontFootAngle, sx, character);

    // 6. Front Arm
    drawTaperedLimb(ctx, frontArm.sx0, frontArm.sy0, frontArm.ex, frontArm.ey, 7.8 * sx, 6.2 * sx, armCol, armShade);
    drawTaperedLimb(ctx, frontArm.ex, frontArm.ey, frontArm.wx, frontArm.wy, 6.0 * sx, 4.6 * sx, armCol, armShade);
    drawFistOrGlove(ctx, frontArm.wx, frontArm.wy, Math.PI * 0.5 - frontArm.fAng, sx, character, frontFistActive);

    // Hit flash highlight
    if (tintFlash && motion.hitWobble > 0.45) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(hip.x, hip.y - 25 * sy, 32 * sx, 58 * sy, 0, 0, Math.PI * 2);
      ctx.fill();
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
