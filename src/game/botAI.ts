import {
  BotAIState,
  BotDifficulty,
  FighterActionState,
} from '../types/game';

export interface BotDifficultyProfile {
  decisionInterval: number;
  speedMultiplier: number;
  attackInterval: number;
  defensiveReactionChance: number;
  dodgeVsBlockRatio: number;
  kickPreference: number;
  specialChance: number;
  lowHealthRetreatBias: number;
  aggressionMultiplier: number;
}

export const BOT_DIFFICULTY_PROFILES: Record<BotDifficulty, BotDifficultyProfile> = {
  easy: {
    decisionInterval: 0.44,
    speedMultiplier: 0.78,
    attackInterval: 1.15,
    defensiveReactionChance: 0.24,
    dodgeVsBlockRatio: 0.25,
    kickPreference: 0.25,
    specialChance: 0.08,
    lowHealthRetreatBias: 0.35,
    aggressionMultiplier: 0.6,
  },
  medium: {
    decisionInterval: 0.22,
    speedMultiplier: 0.94,
    attackInterval: 0.68,
    defensiveReactionChance: 0.54,
    dodgeVsBlockRatio: 0.42,
    kickPreference: 0.42,
    specialChance: 0.22,
    lowHealthRetreatBias: 0.52,
    aggressionMultiplier: 1.0,
  },
  hard: {
    decisionInterval: 0.11,
    speedMultiplier: 1.08,
    attackInterval: 0.4,
    defensiveReactionChance: 0.84,
    dodgeVsBlockRatio: 0.55,
    kickPreference: 0.52,
    specialChance: 0.35,
    lowHealthRetreatBias: 0.65,
    aggressionMultiplier: 1.35,
  },
};

export interface BotDecisionContext {
  dt: number;
  difficulty: BotDifficulty;
  mode2D?: boolean;
  botX: number;
  botZ: number;
  botGrounded?: boolean;
  botHealth: number;
  botMaxHealth: number;
  botCurrentAction: FighterActionState;
  botPunchCd: number;
  botKickCd: number;
  botDodgeCd: number;
  botSpecialCd: number;
  playerX: number;
  playerZ: number;
  playerHealth: number;
  playerMaxHealth: number;
  playerAction: FighterActionState;
  playerGrounded: boolean;
  obstacles?: Array<{ x: number; z: number; radius: number }>;
  activeHazards?: Array<{ x: number; z: number; radius: number }>;
}

export interface BotCommand {
  state: BotAIState;
  moveX: number;
  moveZ: number;
  sprint: boolean;
  wantJump: boolean;
  wantPunch: boolean;
  wantKick: boolean;
  wantSpecial: boolean;
  wantBlock: boolean;
  wantDodge: boolean;
  dodgeDirX: number;
  dodgeDirZ: number;
}

const OPTIMAL_MIN_DIST = 1.75;
const OPTIMAL_MAX_DIST = 2.65;
const RUN_APPROACH_DIST = 4.3;
const ATTACK_RANGE_PUNCH = 2.15;
const ATTACK_RANGE_KICK = 2.45;
const ATTACK_RANGE_SPECIAL = 2.75;
const THREAT_RANGE = 3.0;

/**
 * Finite State Machine (FSM) driving the AI Bot fighter.
 * Supports 2D footsies, obstacle/hazard jumping, spacing, blocking, dodging, and combos.
 */
export class BotAIController {
  public state: BotAIState = 'idle';
  private stateTimer = 0;
  private decisionCooldown = 0;
  private attackWaitTimer = 0.45;
  private strafeSign = 1;
  private reactedToPlayerSwing = false;
  private blockHoldTimer = 0;
  private retreatTimer = 0;
  private jumpCooldown = 0;

  private readonly command: BotCommand = {
    state: 'idle',
    moveX: 0,
    moveZ: 0,
    sprint: false,
    wantJump: false,
    wantPunch: false,
    wantKick: false,
    wantSpecial: false,
    wantBlock: false,
    wantDodge: false,
    dodgeDirX: 0,
    dodgeDirZ: 0,
  };

  public reset(): void {
    this.state = 'idle';
    this.stateTimer = 0;
    this.decisionCooldown = 0.25;
    this.attackWaitTimer = 0.45;
    this.strafeSign = Math.random() < 0.5 ? 1 : -1;
    this.reactedToPlayerSwing = false;
    this.blockHoldTimer = 0;
    this.retreatTimer = 0;
    this.jumpCooldown = 0;
  }

  public update(ctx: BotDecisionContext): BotCommand {
    const profile = BOT_DIFFICULTY_PROFILES[ctx.difficulty];
    const cmd = this.command;

    cmd.wantJump = false;
    cmd.wantPunch = false;
    cmd.wantKick = false;
    cmd.wantSpecial = false;
    cmd.wantDodge = false;
    cmd.wantBlock = false;
    cmd.sprint = false;
    cmd.moveX = 0;
    cmd.moveZ = 0;

    if (ctx.botCurrentAction === 'stun') {
      this.transition('stun');
      cmd.state = 'stun';
      return cmd;
    }

    this.stateTimer += ctx.dt;
    this.decisionCooldown = Math.max(0, this.decisionCooldown - ctx.dt);
    this.attackWaitTimer = Math.max(0, this.attackWaitTimer - ctx.dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - ctx.dt);
    if (this.blockHoldTimer > 0) this.blockHoldTimer = Math.max(0, this.blockHoldTimer - ctx.dt);
    if (this.retreatTimer > 0) this.retreatTimer = Math.max(0, this.retreatTimer - ctx.dt);

    const is2D = ctx.mode2D !== false;
    const dx = ctx.playerX - ctx.botX;
    const dz = is2D ? 0 : ctx.playerZ - ctx.botZ;
    const dist = Math.hypot(dx, dz) || 0.001;
    const dirX = dx / dist;
    const dirZ = is2D ? 0 : dz / dist;

    const perpX = is2D ? dirX * this.strafeSign : -dirZ * this.strafeSign;
    const perpZ = is2D ? 0 : dirX * this.strafeSign;

    const botHpRatio = ctx.botHealth / Math.max(1, ctx.botMaxHealth);
    const playerHpRatio = ctx.playerHealth / Math.max(1, ctx.playerMaxHealth);
    const playerSwinging =
      ctx.playerAction === 'punch' ||
      ctx.playerAction === 'kick' ||
      ctx.playerAction === 'special';

    if (!playerSwinging) {
      this.reactedToPlayerSwing = false;
    }

    const botBusy =
      ctx.botCurrentAction === 'punch' ||
      ctx.botCurrentAction === 'kick' ||
      ctx.botCurrentAction === 'special' ||
      ctx.botCurrentAction === 'dodge';

    if (
      !botBusy &&
      playerSwinging &&
      !this.reactedToPlayerSwing &&
      dist <= THREAT_RANGE
    ) {
      this.reactedToPlayerSwing = true;
      if (Math.random() < profile.defensiveReactionChance) {
        const canDodge = ctx.botDodgeCd <= 0;
        const preferDodge =
          ctx.playerAction === 'special'
            ? 0.8
            : profile.dodgeVsBlockRatio;

        if (canDodge && Math.random() < preferDodge) {
          this.transition('dodge');
          cmd.wantDodge = true;
          if (is2D) {
            cmd.dodgeDirX = Math.random() < 0.6 ? -dirX : dirX;
            cmd.dodgeDirZ = 0;
          } else {
            const evadeX = perpX * 0.85 - dirX * 0.45;
            const evadeZ = perpZ * 0.85 - dirZ * 0.45;
            const evadeLen = Math.hypot(evadeX, evadeZ) || 1;
            cmd.dodgeDirX = evadeX / evadeLen;
            cmd.dodgeDirZ = evadeZ / evadeLen;
          }
          this.strafeSign *= -1;
          cmd.state = this.state;
          return cmd;
        } else {
          this.transition('block');
          this.blockHoldTimer =
            ctx.difficulty === 'hard' ? 0.4 : ctx.difficulty === 'medium' ? 0.48 : 0.56;
        }
      }
    }

    if (!botBusy && this.decisionCooldown <= 0) {
      this.decisionCooldown = profile.decisionInterval * (0.85 + Math.random() * 0.3);

      if (this.state === 'block' && this.blockHoldTimer > 0) {
        cmd.wantBlock = true;
        cmd.state = 'block';
        return cmd;
      }

      if (this.state === 'retreat' && this.retreatTimer > 0 && dist < 4.4) {
        cmd.moveX = -dirX;
        cmd.moveZ = -dirZ;
        cmd.sprint = botHpRatio < 0.35 && ctx.difficulty !== 'easy';
        cmd.state = 'retreat';
        return cmd;
      }

      const ringEdge = is2D ? Math.abs(ctx.botX) : Math.hypot(ctx.botX, ctx.botZ);
      const nearWall = ringEdge > 6.8;

      if (
        botHpRatio < 0.36 &&
        dist < 3.1 &&
        !nearWall &&
        Math.random() < profile.lowHealthRetreatBias * 0.52
      ) {
        this.transition('retreat');
        this.retreatTimer = 0.55 + Math.random() * 0.35;
      } else if (dist > OPTIMAL_MAX_DIST) {
        this.transition('approach');
      } else if (dist < OPTIMAL_MIN_DIST * 0.82 && !nearWall) {
        if (Math.random() < 0.45 && ctx.botDodgeCd <= 0 && ctx.difficulty !== 'easy') {
          this.transition('dodge');
          cmd.wantDodge = true;
          cmd.dodgeDirX = is2D ? -dirX : perpX * 0.7 - dirX * 0.7;
          cmd.dodgeDirZ = is2D ? 0 : perpZ * 0.7 - dirZ * 0.7;
          cmd.state = this.state;
          return cmd;
        }
        this.transition('retreat');
        this.retreatTimer = 0.35;
      } else {
        const playerBlocking = ctx.playerAction === 'block';
        const pressFactor =
          (playerHpRatio < 0.4 ? 1.25 : 1.0) * profile.aggressionMultiplier;

        const readyPunch = ctx.botPunchCd <= 0 && dist <= ATTACK_RANGE_PUNCH;
        const readyKick = ctx.botKickCd <= 0 && dist <= ATTACK_RANGE_KICK;
        const readySpecial = ctx.botSpecialCd <= 0 && dist <= ATTACK_RANGE_SPECIAL;

        // Jump-in mixup against blocking player on Medium/Hard in 2D
        if (
          is2D &&
          playerBlocking &&
          (ctx.botGrounded ?? true) &&
          this.jumpCooldown <= 0 &&
          ctx.difficulty !== 'easy' &&
          Math.random() < 0.25
        ) {
          cmd.wantJump = true;
          this.jumpCooldown = 1.6;
        }

        if (
          this.attackWaitTimer <= 0 &&
          (readyPunch || readyKick || readySpecial) &&
          ctx.playerGrounded
        ) {
          if (playerBlocking && ctx.difficulty === 'hard' && readySpecial && Math.random() < 0.55) {
            this.transition('attack');
            cmd.wantSpecial = true;
            this.attackWaitTimer = profile.attackInterval * 1.1;
            cmd.state = this.state;
            return cmd;
          }

          if (playerBlocking && ctx.difficulty === 'hard' && Math.random() < 0.4) {
            this.strafeSign *= -1;
            this.transition('circle');
          } else if (Math.random() < Math.min(0.92, 0.58 * pressFactor)) {
            this.transition('attack');
            if (readySpecial && Math.random() < profile.specialChance) {
              cmd.wantSpecial = true;
            } else if (readyKick && (!readyPunch || Math.random() < profile.kickPreference)) {
              cmd.wantKick = true;
            } else if (readyPunch) {
              cmd.wantPunch = true;
            }
            this.attackWaitTimer =
              profile.attackInterval * (0.75 + Math.random() * 0.5);
            cmd.state = this.state;
            return cmd;
          } else {
            this.transition('circle');
          }
        } else if (Math.random() < 0.14 && ctx.difficulty === 'easy') {
          this.transition('idle');
        } else {
          if (Math.random() < 0.35) this.strafeSign *= -1;
          this.transition('circle');
        }
      }
    }

    switch (this.state) {
      case 'idle': {
        if (this.stateTimer > 0.55) {
          this.transition(dist > OPTIMAL_MAX_DIST ? 'approach' : 'circle');
        }
        break;
      }
      case 'approach': {
        cmd.moveX = dirX;
        cmd.moveZ = dirZ;
        cmd.sprint = dist > RUN_APPROACH_DIST;
        break;
      }
      case 'circle': {
        if (is2D) {
          // 2D footsies: shimmy back & forth inside optimal strike spacing
          let stepDir = 0;
          if (dist > OPTIMAL_MAX_DIST - 0.15) stepDir = dirX;
          else if (dist < OPTIMAL_MIN_DIST) stepDir = -dirX;
          else stepDir = dirX * this.strafeSign * 0.55;
          cmd.moveX = stepDir;
          cmd.moveZ = 0;
        } else {
          let radialPush = 0;
          if (dist > OPTIMAL_MAX_DIST - 0.15) radialPush = 0.55;
          else if (dist < OPTIMAL_MIN_DIST) radialPush = -0.55;

          const mx = perpX * 0.85 + dirX * radialPush;
          const mz = perpZ * 0.85 + dirZ * radialPush;
          const mLen = Math.hypot(mx, mz) || 1;
          cmd.moveX = mx / mLen;
          cmd.moveZ = mz / mLen;
        }
        break;
      }
      case 'retreat': {
        cmd.moveX = is2D ? -dirX : -dirX + perpX * 0.25;
        cmd.moveZ = is2D ? 0 : -dirZ + perpZ * 0.25;
        if (!is2D) {
          const rLen = Math.hypot(cmd.moveX, cmd.moveZ) || 1;
          cmd.moveX /= rLen;
          cmd.moveZ /= rLen;
        }
        cmd.sprint = botHpRatio < 0.35 && ctx.difficulty !== 'easy';
        if (this.retreatTimer <= 0) {
          this.transition('circle');
        }
        break;
      }
      case 'block': {
        cmd.wantBlock = true;
        if (this.blockHoldTimer <= 0) {
          this.transition('circle');
        }
        break;
      }
      case 'attack':
      case 'dodge':
      case 'stun': {
        if (!botBusy && this.stateTimer > 0.15) {
          this.transition('circle');
        }
        break;
      }
    }

    // In 2D mode, jump cleanly over obstacles or active traps when approaching!
    if (is2D && !botBusy && (ctx.botGrounded ?? true) && this.jumpCooldown <= 0 && Math.abs(cmd.moveX) > 0.1) {
      const movingSign = Math.sign(cmd.moveX);
      if (ctx.obstacles) {
        for (let i = 0; i < ctx.obstacles.length; i++) {
          const obs = ctx.obstacles[i];
          const relX = obs.x - ctx.botX;
          if (relX * movingSign > 0.2 && Math.abs(relX) < obs.radius + 1.35) {
            cmd.wantJump = true;
            this.jumpCooldown = 0.9;
            break;
          }
        }
      }
      if (!cmd.wantJump && ctx.activeHazards && ctx.difficulty !== 'easy') {
        for (let i = 0; i < ctx.activeHazards.length; i++) {
          const haz = ctx.activeHazards[i];
          const relX = haz.x - ctx.botX;
          if (Math.abs(relX) < haz.radius + 0.95 && (relX * movingSign > -0.2 || Math.abs(relX) < 0.7)) {
            cmd.wantJump = true;
            this.jumpCooldown = 0.95;
            break;
          }
        }
      }
    } else if (!is2D && (ctx.obstacles || ctx.activeHazards) && (cmd.moveX !== 0 || cmd.moveZ !== 0)) {
      if (ctx.obstacles) {
        for (let i = 0; i < ctx.obstacles.length; i++) {
          const obs = ctx.obstacles[i];
          const odx = ctx.botX - obs.x;
          const odz = ctx.botZ - obs.z;
          const oDist = Math.hypot(odx, odz);
          const avoidDist = obs.radius + 1.1;
          if (oDist < avoidDist && oDist > 0.01) {
            const push = (avoidDist - oDist) / avoidDist;
            cmd.moveX += (odx / oDist) * push * 1.15;
            cmd.moveZ += (odz / oDist) * push * 1.15;
          }
        }
      }
      if (ctx.activeHazards && ctx.difficulty !== 'easy') {
        const hazardWeight = ctx.difficulty === 'hard' ? 1.5 : 0.95;
        for (let i = 0; i < ctx.activeHazards.length; i++) {
          const haz = ctx.activeHazards[i];
          const hdx = ctx.botX - haz.x;
          const hdz = ctx.botZ - haz.z;
          const hDist = Math.hypot(hdx, hdz);
          const avoidDist = haz.radius + 0.9;
          if (hDist < avoidDist && hDist > 0.01) {
            const push = (avoidDist - hDist) / avoidDist;
            cmd.moveX += (hdx / hDist) * push * hazardWeight;
            cmd.moveZ += (hdz / hDist) * push * hazardWeight;
          }
        }
      }
      const nLen = Math.hypot(cmd.moveX, cmd.moveZ);
      if (nLen > 0.001) {
        cmd.moveX /= nLen;
        cmd.moveZ /= nLen;
      }
    }

    cmd.state = this.state;
    return cmd;
  }

  private transition(next: BotAIState): void {
    if (this.state !== next) {
      this.state = next;
      this.stateTimer = 0;
    }
  }
}
