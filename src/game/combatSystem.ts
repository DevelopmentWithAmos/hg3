import { CharacterDefinition, FighterActionState } from '../types/game';

export type AttackKind = 'punch' | 'kick' | 'special';

export interface AttackSpec {
  kind: AttackKind;
  duration: number;
  cooldown: number;
  /** Normalized progress (0..1) when hitbox becomes active */
  activeStart: number;
  /** Normalized progress (0..1) when hitbox deactivates */
  activeEnd: number;
  /** Forward distance from attacker center to hitbox center */
  hitboxForwardOffset: number;
  /** Vertical offset from attacker ground pivot to hitbox center */
  hitboxHeightOffset: number;
  /** Sphere radius of the attack hitbox */
  hitboxRadius: number;
  baseDamage: number;
  /** Fraction of damage dealt through block (0..1) */
  blockChipRatio: number;
  knockback: number;
  blockKnockback: number;
  stunDuration: number;
  hitstop: number;
  cameraShake: number;
}

export const ATTACK_SPECS: Record<AttackKind, AttackSpec> = {
  punch: {
    kind: 'punch',
    duration: 0.28,
    cooldown: 0.36,
    activeStart: 0.28,
    activeEnd: 0.68,
    hitboxForwardOffset: 1.05,
    hitboxHeightOffset: 1.25,
    hitboxRadius: 0.72,
    baseDamage: 10,
    blockChipRatio: 0.2,
    knockback: 4.5,
    blockKnockback: 2.2,
    stunDuration: 0.25,
    hitstop: 0.03,
    cameraShake: 0.16,
  },
  kick: {
    kind: 'kick',
    duration: 0.38,
    cooldown: 0.56,
    activeStart: 0.32,
    activeEnd: 0.72,
    hitboxForwardOffset: 1.28,
    hitboxHeightOffset: 0.95,
    hitboxRadius: 0.82,
    baseDamage: 16,
    blockChipRatio: 0.25,
    knockback: 6.8,
    blockKnockback: 3.4,
    stunDuration: 0.4,
    hitstop: 0.048,
    cameraShake: 0.28,
  },
  special: {
    kind: 'special',
    duration: 0.62,
    cooldown: 4.5,
    activeStart: 0.46,
    activeEnd: 0.76,
    hitboxForwardOffset: 1.15,
    hitboxHeightOffset: 1.05,
    hitboxRadius: 1.75,
    baseDamage: 26,
    blockChipRatio: 0.38,
    knockback: 10.2,
    blockKnockback: 5.5,
    stunDuration: 0.68,
    hitstop: 0.075,
    cameraShake: 0.46,
  },
};

export function getCharacterAttackSpec(
  kind: AttackKind,
  character?: CharacterDefinition,
): AttackSpec {
  const base = ATTACK_SPECS[kind];
  if (!character) return base;

  const atkSpeed = Math.max(0.7, character.stats.attackSpeedMultiplier);

  if (kind === 'special') {
    const sp = character.special;
    return {
      ...base,
      duration: sp.duration,
      cooldown: sp.cooldown,
      activeStart: sp.activeStart,
      activeEnd: sp.activeEnd,
      hitboxRadius: sp.hitboxRadius,
      baseDamage: sp.damage,
      knockback: sp.knockback,
      stunDuration: sp.stunDuration,
    };
  }

  return {
    ...base,
    duration: base.duration / atkSpeed,
    cooldown: base.cooldown / atkSpeed,
  };
}

export interface FighterHurtbox {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
}

export const HURTBOX_RADIUS = 0.62;
export const HURTBOX_HEIGHT = 2.05;

export interface HitDetectionResult {
  connected: boolean;
  evaded: boolean;
  blocked: boolean;
  counterHit: boolean;
  damage: number;
  knockback: number;
  stunDuration: number;
  hitX: number;
  hitY: number;
  hitZ: number;
  dirX: number;
  dirZ: number;
}

/**
 * Checks 3D sphere-vs-vertical-capsule intersection between an attack hitbox
 * during its active frame window and the defender's hurtbox.
 */
export function evaluateAttackCollision(
  attackerX: number,
  attackerY: number,
  attackerZ: number,
  attackerRotY: number,
  spec: AttackSpec,
  defender: FighterHurtbox,
  defenderAction: FighterActionState,
  defenderActionProgress: number,
  isBotAttacker: boolean,
  attackerPowerMult = 1,
  defenderDefenseMult = 1,
): HitDetectionResult | null {
  const fwdX = Math.sin(attackerRotY);
  const fwdZ = Math.cos(attackerRotY);

  const hbX = attackerX + fwdX * spec.hitboxForwardOffset;
  const hbY = attackerY + spec.hitboxHeightOffset;
  const hbZ = attackerZ + fwdZ * spec.hitboxForwardOffset;

  // Closest point on defender's vertical capsule segment [y + 0.4, y + height - 0.3]
  const capBottom = defender.y + 0.4;
  const capTop = defender.y + defender.height - 0.3;
  const closestY = Math.max(capBottom, Math.min(capTop, hbY));

  const dx = defender.x - hbX;
  const dy = closestY - hbY;
  const dz = defender.z - hbZ;

  const distSq = dx * dx + dy * dy + dz * dz;
  const combinedRadius = spec.hitboxRadius + defender.radius;

  if (distSq > combinedRadius * combinedRadius) {
    return null; // Hitbox missed — no contact!
  }

  // Dodge grants evasive invulnerability frames
  if (defenderAction === 'dodge') {
    return {
      connected: false,
      evaded: true,
      blocked: false,
      counterHit: false,
      damage: 0,
      knockback: 0,
      stunDuration: 0,
      hitX: (hbX + defender.x) * 0.5,
      hitY: closestY,
      hitZ: (hbZ + defender.z) * 0.5,
      dirX: fwdX,
      dirZ: fwdZ,
    };
  }

  const isBlocked = defenderAction === 'block';
  // Counter-hit if catching defender mid-windup before active frames
  const counterHit =
    !isBlocked &&
    (defenderAction === 'punch' ||
      defenderAction === 'kick' ||
      defenderAction === 'special') &&
    defenderActionProgress < 0.35;

  const statScaled =
    spec.kind === 'special'
      ? spec.baseDamage
      : spec.baseDamage * attackerPowerMult;
  const base =
    (isBotAttacker ? statScaled * 0.9 : statScaled) /
    Math.max(0.6, defenderDefenseMult);

  const damage = isBlocked
    ? Math.max(2, Math.round(base * spec.blockChipRatio))
    : Math.max(1, Math.round(counterHit ? base * 1.2 : base));

  const toDefX = defender.x - attackerX;
  const toDefZ = defender.z - attackerZ;
  const flatLen = Math.hypot(toDefX, toDefZ);
  const dirX = flatLen > 0.001 ? toDefX / flatLen : fwdX;
  const dirZ = flatLen > 0.001 ? toDefZ / flatLen : fwdZ;

  return {
    connected: true,
    evaded: false,
    blocked: isBlocked,
    counterHit,
    damage,
    knockback: isBlocked ? spec.blockKnockback : spec.knockback,
    stunDuration: isBlocked
      ? 0
      : counterHit
        ? spec.stunDuration * 1.25
        : spec.stunDuration,
    hitX: (hbX + defender.x) * 0.5,
    hitY: closestY,
    hitZ: (hbZ + defender.z) * 0.5,
    dirX,
    dirZ,
  };
}
