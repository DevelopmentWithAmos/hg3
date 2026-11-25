import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActionCooldownStatus,
  ArenaId,
  BotAIState,
  CombatCallout,
  FighterMotionData,
  GameScreen,
  GameSettings,
  LocomotionState,
  MatchStats,
  MatchWinner,
} from '../../types/game';
import { inputManager } from '../../game/inputManager';
import { BotAIController } from '../../game/botAI';
import {
  AttackKind,
  HURTBOX_HEIGHT,
  HURTBOX_RADIUS,
  evaluateAttackCollision,
  getCharacterAttackSpec,
} from '../../game/combatSystem';
import { getArenaById, getHazardPhase } from '../../game/arenas';
import { getCharacterById } from '../../game/characters';
import { soundEngine } from '../../utils/audio';
import { drawHumanFighter2D } from './humanFighterRenderer';
import {
  PropVisual2D,
  drawArenaBackdrop2D,
  drawArenaStageFloorAndProps2D,
} from './arena2DRenderer';

interface GameStage2DProps {
  screen: GameScreen;
  winner?: MatchWinner;
  settings: GameSettings;
  matchSeed: number;
  arenaId: ArenaId;
  playerCharacterId: string;
  botCharacterId: string;
  pauseBackgroundRender?: boolean;
  onStatusUpdate?: (status: ActionCooldownStatus) => void;
  onHealthUpdate?: (playerHealth: number, botHealth: number) => void;
  onBotStateUpdate?: (state: BotAIState) => void;
  onCallout?: (callout: CombatCallout) => void;
  onStatsUpdate?: (stats: MatchStats) => void;
  onMatchEnd?: (winner: MatchWinner) => void;
}

const WALK_SPEED = 4.6;
const RUN_SPEED = 8.2;
const BLOCK_WALK_SPEED = 2.0;
const JUMP_VELOCITY = 10.6;
const GRAVITY = -28.0;
const DODGE_DURATION = 0.24;
const DODGE_COOLDOWN = 0.82;
const DODGE_SPEED = 14.5;
const FIGHTER_MIN_SEP = 1.05;

interface FighterRuntime2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  dodgeVx: number;
  actionTimer: number;
  actionDuration: number;
  hasConnected: boolean;
  hasHitProp: boolean;
  swingFxSpawned: boolean;
  stunTimer: number;
  punchCd: number;
  kickCd: number;
  dodgeCd: number;
  specialCd: number;
  wasBlocking: boolean;
  comboStep: number;
  health: number;
  dustTimer: number;
}

interface DustPuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface Spark2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Shockwave2D {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  color: string;
}

interface Slash2D {
  x: number;
  y: number;
  facing: 1 | -1;
  angle: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

interface FloatingText2D {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface Confetti2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
}

function createRuntime(x: number, facing: 1 | -1, maxHealth: number): FighterRuntime2D {
  return {
    x,
    y: 0,
    vx: 0,
    vy: 0,
    facing,
    grounded: true,
    dodgeVx: 0,
    actionTimer: 0,
    actionDuration: 0,
    hasConnected: false,
    hasHitProp: false,
    swingFxSpawned: false,
    stunTimer: 0,
    punchCd: 0,
    kickCd: 0,
    dodgeCd: 0,
    specialCd: 0,
    wasBlocking: false,
    comboStep: 0,
    health: maxHealth,
    dustTimer: 0,
  };
}

function createMotion(facing: 1 | -1): FighterMotionData {
  return {
    locomotion: 'idle',
    action: 'none',
    actionProgress: 0,
    comboStep: 0,
    speedRatio: 0,
    verticalVelocity: 0,
    grounded: true,
    isCrouching: false,
    facing,
    landingSquash: 0,
    hitWobble: 0,
    stunTime: 0,
  };
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export const GameStage2D: React.FC<GameStage2DProps> = ({
  screen,
  winner = null,
  settings,
  matchSeed,
  arenaId,
  playerCharacterId,
  botCharacterId,
  pauseBackgroundRender = false,
  onStatusUpdate,
  onHealthUpdate,
  onBotStateUpdate,
  onCallout,
  onStatsUpdate,
  onMatchEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const arena = useMemo(() => getArenaById(arenaId), [arenaId]);
  const playerChar = useMemo(() => getCharacterById(playerCharacterId), [playerCharacterId]);
  const botChar = useMemo(() => getCharacterById(botCharacterId), [botCharacterId]);

  const propsRef = useRef({
    screen,
    winner,
    settings,
    arena,
    playerChar,
    botChar,
    pauseBackgroundRender,
    onStatusUpdate,
    onHealthUpdate,
    onBotStateUpdate,
    onCallout,
    onStatsUpdate,
    onMatchEnd,
  });

  propsRef.current = {
    screen,
    winner,
    settings,
    arena,
    playerChar,
    botChar,
    pauseBackgroundRender,
    onStatusUpdate,
    onHealthUpdate,
    onBotStateUpdate,
    onCallout,
    onStatsUpdate,
    onMatchEnd,
  };

  const simRef = useRef({
    player: createRuntime(-3.3, 1, 100),
    bot: createRuntime(3.3, -1, 100),
    playerMotion: createMotion(1),
    botMotion: createMotion(-1),
    botAI: new BotAIController(),
    stats: {
      playerHitsLanded: 0,
      botHitsLanded: 0,
      playerBlocked: 0,
      specialsUsed: 0,
    } as MatchStats,
    propVisuals: {} as Record<string, PropVisual2D>,
    hazardCooldowns: {} as Record<string, number>,
    arenaTime: 0,
    hitstopTimer: 0,
    cameraShake: 0,
    camX: 0,
    camZoom: 1,
    matchEnded: false,
    endReactionPlayed: false,
    endTimer: 0,
    endDefeatImpactTriggered: false,
    endWinnerPopTriggered: false,
    confettiTimer: 0,
    calloutSeq: 1,
    hudTimer: 0,
    lastHudSig: '',
    lastBotState: 'idle' as BotAIState,
    dusts: [] as DustPuff[],
    sparks: [] as Spark2D[],
    shockwaves: [] as Shockwave2D[],
    slashes: [] as Slash2D[],
    popups: [] as FloatingText2D[],
    confetti: [] as Confetti2D[],
  });

  // Reset match simulation on matchSeed, character, or arena change
  useEffect(() => {
    const s = simRef.current;
    s.player = createRuntime(-3.3, 1, playerChar.stats.maxHealth);
    s.bot = createRuntime(3.3, -1, botChar.stats.maxHealth);
    s.playerMotion = createMotion(1);
    s.botMotion = createMotion(-1);
    s.botAI.reset();
    s.stats = {
      playerHitsLanded: 0,
      botHitsLanded: 0,
      playerBlocked: 0,
      specialsUsed: 0,
    };
    s.propVisuals = {};
    arena.obstacles.forEach((o) => {
      s.propVisuals[o.id] = { hitBounce: 0, brokenTimer: 0 };
    });
    s.hazardCooldowns = {};
    s.arenaTime = 0;
    s.hitstopTimer = 0;
    s.cameraShake = 0;
    s.camX = 0;
    s.camZoom = 1;
    s.matchEnded = false;
    s.endReactionPlayed = false;
    s.endTimer = 0;
    s.endDefeatImpactTriggered = false;
    s.endWinnerPopTriggered = false;
    s.confettiTimer = 0;
    s.lastBotState = 'idle';
    s.lastHudSig = '';
    s.dusts.length = 0;
    s.sparks.length = 0;
    s.shockwaves.length = 0;
    s.slashes.length = 0;
    s.popups.length = 0;
    s.confetti.length = 0;

    onHealthUpdate?.(playerChar.stats.maxHealth, botChar.stats.maxHealth);
    onStatsUpdate?.({ ...s.stats });
    onBotStateUpdate?.('idle');
    onStatusUpdate?.({
      punch: 0,
      kick: 0,
      dodge: 0,
      special: 0,
      isBlocking: false,
      isCrouching: false,
      isStunned: false,
      isGrounded: true,
      activeAction: 'none',
      locomotion: 'idle',
    });
  }, [
    matchSeed,
    arena,
    playerChar,
    botChar,
    onHealthUpdate,
    onStatsUpdate,
    onBotStateUpdate,
    onStatusUpdate,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const emitCallout = (text: string, tone: CombatCallout['tone']) => {
      simRef.current.calloutSeq += 1;
      propsRef.current.onCallout?.({
        id: simRef.current.calloutSeq,
        text,
        tone,
      });
    };

    const spawnDust = (x: number, y: number, vx: number, vy: number, size = 0.2) => {
      const list = simRef.current.dusts;
      if (list.length >= 40) list.shift();
      list.push({ x, y, vx, vy, life: 0, maxLife: 0.36, size });
    };

    const spawnSparkBurst = (x: number, y: number, color: string, count: number, scale = 1) => {
      const list = simRef.current.sparks;
      for (let i = 0; i < count; i++) {
        if (list.length >= 50) list.shift();
        const ang = Math.random() * Math.PI * 2;
        const spd = (2.4 + Math.random() * 4.5) * scale;
        list.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd + 1.5,
          life: 0,
          maxLife: 0.22 + Math.random() * 0.1,
          size: (4 + Math.random() * 4) * scale,
          color,
        });
      }
    };

    const spawnSlash = (
      x: number,
      y: number,
      facing: 1 | -1,
      angle: number,
      radius: number,
      color: string,
    ) => {
      const list = simRef.current.slashes;
      if (list.length >= 16) list.shift();
      list.push({ x, y, facing, angle, radius, color, life: 0, maxLife: 0.18 });
    };

    const spawnShockwave = (x: number, y: number, color: string, maxRadius: number) => {
      const list = simRef.current.shockwaves;
      if (list.length >= 10) list.shift();
      list.push({ x, y, color, maxRadius, life: 0, maxLife: 0.38 });
    };

    const spawnPopup = (x: number, y: number, text: string, color: string) => {
      const list = simRef.current.popups;
      if (list.length >= 12) list.shift();
      list.push({ x, y, vy: 1.8, text, color, life: 0, maxLife: 0.72 });
    };

    const spawnConfetti = (x: number, count = 20) => {
      const palette = ['#fde047', '#38bdf8', '#fb7185', '#34d399', '#f59e0b'];
      const list = simRef.current.confetti;
      for (let i = 0; i < count; i++) {
        if (list.length >= 60) list.shift();
        list.push({
          x: x + (Math.random() - 0.5) * 1.4,
          y: 2.3 + Math.random() * 1.1,
          vx: (Math.random() - 0.5) * 5.2,
          vy: 3.2 + Math.random() * 3.8,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 12,
          life: 0,
          maxLife: 1.6 + Math.random() * 0.5,
          color: palette[i % palette.length],
        });
      }
    };

    const processAttack = (
      atk: FighterRuntime2D,
      atkMo: FighterMotionData,
      def: FighterRuntime2D,
      defMo: FighterMotionData,
      isBotAttacker: boolean,
    ) => {
      const kind = atkMo.action;
      if (kind !== 'punch' && kind !== 'kick' && kind !== 'special') return;

      const { arena: curArena, playerChar: pChar, botChar: bChar } = propsRef.current;
      const atkChar = isBotAttacker ? bChar : pChar;
      const defChar = isBotAttacker ? pChar : bChar;
      const spec = getCharacterAttackSpec(kind as AttackKind, atkChar);
      const prog = atkMo.actionProgress;

      if (!atk.swingFxSpawned && prog >= spec.activeStart) {
        atk.swingFxSpawned = true;
        if (kind === 'special') {
          soundEngine.playSpecialSlam(atkChar.special.animType);
          simRef.current.cameraShake = Math.max(simRef.current.cameraShake, 0.25);
          spawnShockwave(
            atk.x + atk.facing * spec.hitboxForwardOffset * 0.85,
            atk.y + 0.15,
            atkChar.special.shockwaveColor,
            Math.max(2.4, spec.hitboxRadius * 1.4),
          );
          spawnSlash(
            atk.x + atk.facing * 0.8,
            atk.y + 1.1,
            atk.facing,
            0.15,
            1.45,
            atkChar.special.shockwaveColor,
          );
        } else {
          spawnSlash(
            atk.x + atk.facing * (spec.hitboxForwardOffset * 0.8),
            atk.y + spec.hitboxHeightOffset,
            atk.facing,
            kind === 'kick' ? -0.35 : atkMo.comboStep % 2 === 0 ? 0.2 : -0.2,
            kind === 'kick' ? 1.15 : 0.88,
            atkChar.palette.accent,
          );
        }
      }

      // Hit destructible / bouncy obstacles
      if (!atk.hasHitProp && prog >= spec.activeStart && prog <= spec.activeEnd) {
        const hitX = atk.x + atk.facing * spec.hitboxForwardOffset;
        for (let i = 0; i < curArena.obstacles.length; i++) {
          const obs = curArena.obstacles[i];
          const vis = simRef.current.propVisuals[obs.id];
          if (!vis || vis.brokenTimer > 0) continue;
          if (atk.y > obs.height + 0.4) continue;
          if (Math.abs(obs.x - hitX) <= spec.hitboxRadius + obs.radius) {
            atk.hasHitProp = true;
            if (obs.breakable) {
              vis.brokenTimer = 7.5;
              vis.hitBounce = 1;
              soundEngine.playPropSmash();
              simRef.current.cameraShake = Math.max(simRef.current.cameraShake, 0.14);
              spawnSparkBurst(obs.x, 0.65, '#fde047', 8, 1.1);
              spawnPopup(obs.x, 1.2, 'SMASH!', '#fde047');
              emitCallout(
                obs.kind === 'cake'
                  ? 'CAKE WRECKED!'
                  : obs.kind === 'wickets'
                    ? 'CLEAN BOWLED!'
                    : obs.kind === 'podium'
                      ? 'PODIUM SMASHED!'
                      : obs.kind === 'table'
                        ? 'TABLE FLIPPED!'
                        : `${obs.label.toUpperCase()} SMASHED!`,
                'info',
              );
            } else {
              vis.hitBounce = 1;
              if (obs.bouncy) {
                soundEngine.playSpringBoing();
                atk.vx -= atk.facing * 4.5;
                spawnSparkBurst(obs.x, 0.7, '#38bdf8', 5, 0.9);
              } else {
                soundEngine.playBlockHit();
              }
            }
            break;
          }
        }
      }

      if (atk.hasConnected || prog < spec.activeStart || prog > spec.activeEnd) {
        return;
      }

      const defHurtHeight = defMo.isCrouching ? HURTBOX_HEIGHT * 0.65 : HURTBOX_HEIGHT;
      const result = evaluateAttackCollision(
        atk.x,
        atk.y,
        0,
        atk.facing === 1 ? Math.PI / 2 : -Math.PI / 2,
        spec,
        {
          x: def.x,
          y: def.y,
          z: 0,
          radius: HURTBOX_RADIUS,
          height: defHurtHeight,
        },
        defMo.action,
        defMo.actionProgress,
        isBotAttacker,
        atkChar.stats.powerMultiplier,
        defChar.stats.defenseMultiplier,
      );

      if (!result) return;
      atk.hasConnected = true;

      if (result.evaded) {
        soundEngine.playCharacterReaction('dodge', defChar.animationStyle);
        spawnSparkBurst(result.hitX, result.hitY, '#c084fc', 5, 0.9);
        spawnPopup(def.x, def.y + 1.85, 'DODGE!', '#c084fc');
        emitCallout('DODGED!', 'dodge');
        return;
      }

      if (!result.connected) return;

      def.health = Math.max(0, def.health - result.damage);
      def.vx += result.dirX * result.knockback;

      if (result.blocked) {
        soundEngine.playBlockHit();
        defMo.hitWobble = 0.35;
        spawnSparkBurst(result.hitX, result.hitY, '#bae6fd', 5, 0.85);
        spawnPopup(def.x, def.y + 1.85, `BLOCK -${result.damage}`, '#38bdf8');
        if (isBotAttacker) {
          simRef.current.stats.playerBlocked += 1;
          propsRef.current.onStatsUpdate?.({ ...simRef.current.stats });
        }
        emitCallout(`BLOCKED (-${result.damage})`, 'block');
      } else {
        soundEngine.playBonkHit(kind !== 'punch');
        soundEngine.playCharacterReaction('hurt', defChar.animationStyle);
        defMo.hitWobble = 1;

        if (result.stunDuration > 0) {
          def.stunTimer = Math.max(def.stunTimer, result.stunDuration);
          def.actionTimer = 0;
          def.actionDuration = 0;
          def.wasBlocking = false;
          defMo.action = 'stun';
          defMo.actionProgress = 0;
          defMo.stunTime = def.stunTimer;
        }

        const shakeScale = 0.7 + propsRef.current.settings.cameraSensitivity * 0.35;
        simRef.current.cameraShake = Math.max(
          simRef.current.cameraShake,
          spec.cameraShake * shakeScale,
        );
        simRef.current.hitstopTimer = spec.hitstop;

        const sparkColor = kind === 'special' ? '#facc15' : '#fde047';
        spawnSparkBurst(
          result.hitX,
          result.hitY,
          sparkColor,
          kind === 'special' ? 11 : kind === 'kick' ? 8 : 5,
          kind === 'special' ? 1.35 : 1.0,
        );
        spawnPopup(
          def.x,
          def.y + 1.9,
          result.counterHit ? `COUNTER -${result.damage}!` : `-${result.damage}`,
          kind === 'special' ? '#fbbf24' : '#fb7185',
        );

        if (!isBotAttacker) simRef.current.stats.playerHitsLanded += 1;
        else simRef.current.stats.botHitsLanded += 1;
        propsRef.current.onStatsUpdate?.({ ...simRef.current.stats });

        if (kind === 'special') {
          emitCallout(`${atkChar.special.calloutText} -${result.damage}`, 'special');
        } else if (result.counterHit) {
          emitCallout(`COUNTER HIT! -${result.damage}`, 'hit');
        } else if (!isBotAttacker) {
          emitCallout(`${kind.toUpperCase()} -${result.damage}`, 'hit');
        }
      }

      propsRef.current.onHealthUpdate?.(simRef.current.player.health, simRef.current.bot.health);

      if (def.health <= 0 && !simRef.current.matchEnded) {
        simRef.current.matchEnded = true;
        simRef.current.cameraShake = 0.52;
        soundEngine.playKO();
        propsRef.current.onMatchEnd?.(isBotAttacker ? 'bot' : 'player');
      }
    };

    const resolveObstacles2D = (
      nextX: number,
      nextY: number,
      st: FighterRuntime2D,
    ): number => {
      const { arena: curArena } = propsRef.current;
      let outX = nextX;
      for (let i = 0; i < curArena.obstacles.length; i++) {
        const obs = curArena.obstacles[i];
        const vis = simRef.current.propVisuals[obs.id];
        if (vis && vis.brokenTimer > 0) continue;
        if (nextY > obs.height * 0.72) continue; // Fighter clears prop vertically when jumping

        const dx = outX - obs.x;
        const minDist = obs.radius + 0.45;
        if (Math.abs(dx) < minDist) {
          const pushSign = dx >= 0 ? 1 : -1;
          outX = obs.x + pushSign * minDist;
          if (obs.bouncy && Math.abs(st.vx) > 3.2) {
            st.vx = pushSign * 6.4;
            if (vis) vis.hitBounce = 1;
            soundEngine.playSpringBoing();
            spawnSparkBurst(obs.x + pushSign * obs.radius, 0.7, '#38bdf8', 5, 0.85);
          }
        }
      }
      return outX;
    };

    const evaluateHazards2D = (
      st: FighterRuntime2D,
      mo: FighterMotionData,
      prefix: 'p1' | 'bot',
      isBot: boolean,
    ) => {
      const sim = simRef.current;
      if (sim.matchEnded) return;
      const { arena: curArena } = propsRef.current;
      const t = sim.arenaTime;

      for (let i = 0; i < curArena.hazards.length; i++) {
        const haz = curArena.hazards[i];
        const key = `${prefix}-${haz.id}`;
        if ((sim.hazardCooldowns[key] ?? 0) > 0) continue;
        if (getHazardPhase(haz, t) !== 'active') continue;

        const yCap = haz.kind === 'bounce_pad' ? 1.1 : 1.7;
        if (Math.abs(st.x - haz.x) > haz.radius + 0.32 || st.y > yCap) continue;

        sim.hazardCooldowns[key] = haz.kind === 'bounce_pad' ? 0.65 : 1.45;
        const pushDir = st.x >= haz.x ? 1 : -1;

        if (haz.launchY > 0) {
          st.vy = haz.launchY;
          st.grounded = false;
          mo.grounded = false;
        }
        if (haz.knockback > 0) {
          st.vx += pushDir * haz.knockback;
        }

        if (haz.stunDuration > 0 && mo.action !== 'dodge') {
          st.stunTimer = Math.max(st.stunTimer, haz.stunDuration);
          st.actionTimer = 0;
          st.actionDuration = 0;
          st.wasBlocking = false;
          mo.action = 'stun';
          mo.actionProgress = 0;
          mo.stunTime = st.stunTimer;
        }

        if (haz.damage > 0 && mo.action !== 'dodge') {
          st.health = Math.max(0, st.health - haz.damage);
          mo.hitWobble = 0.85;
          propsRef.current.onHealthUpdate?.(sim.player.health, sim.bot.health);
          spawnPopup(st.x, st.y + 1.8, `${haz.calloutText} -${haz.damage}`, haz.color);
        } else {
          spawnPopup(st.x, st.y + 1.8, haz.calloutText, haz.color);
        }

        if (haz.kind === 'bounce_pad') soundEngine.playSpringBoing();
        else if (haz.kind === 'steam_geyser' || haz.kind === 'confetti_cannon') {
          soundEngine.playSteamWhoosh();
          spawnShockwave(haz.x, 0.2, haz.color, haz.radius * 1.4);
        } else if (haz.kind === 'zapper') {
          soundEngine.playZap();
          spawnShockwave(haz.x, 0.2, haz.color, haz.radius * 1.4);
          sim.cameraShake = Math.max(sim.cameraShake, 0.22);
        } else if (haz.kind === 'slip') {
          soundEngine.playSlipWhoop();
        }

        spawnSparkBurst(st.x, Math.max(0.5, st.y + 0.6), haz.color, 6, 1);
        emitCallout(
          haz.damage > 0 ? `${haz.calloutText} -${haz.damage}` : haz.calloutText,
          haz.kind === 'bounce_pad' ? 'info' : 'special',
        );

        if (st.health <= 0 && !sim.matchEnded) {
          sim.matchEnded = true;
          sim.cameraShake = 0.5;
          soundEngine.playKO();
          propsRef.current.onMatchEnd?.(isBot ? 'player' : 'bot');
          break;
        }
      }
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const {
        screen: curScreen,
        winner: curWinner,
        settings: curSettings,
        arena: curArena,
        playerChar: pChar,
        botChar: bChar,
        pauseBackgroundRender: pausedBg,
      } = propsRef.current;

      if (pausedBg) return;

      const dt = Math.min(rawDt, 0.05);
      const sim = simRef.current;

      // Resize backing store cleanly with DPR cap
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayW = canvas.clientWidth || window.innerWidth;
      const displayH = canvas.clientHeight || window.innerHeight;
      const targetW = Math.floor(displayW * dpr);
      const targetH = Math.floor(displayH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      if (curScreen !== 'paused') {
        sim.arenaTime += dt;

        // Prop & hazard timers
        for (const k in sim.propVisuals) {
          const pv = sim.propVisuals[k];
          if (pv.hitBounce > 0) pv.hitBounce = Math.max(0, pv.hitBounce - dt * 4.5);
          if (pv.brokenTimer > 0) {
            pv.brokenTimer = Math.max(0, pv.brokenTimer - dt);
            if (pv.brokenTimer === 0) pv.hitBounce = 0.75;
          }
        }
        for (const k in sim.hazardCooldowns) {
          if (sim.hazardCooldowns[k] > 0) {
            sim.hazardCooldowns[k] = Math.max(0, sim.hazardCooldowns[k] - dt);
          }
        }

        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        } else {
          const ps = sim.player;
          const pm = sim.playerMotion;
          const bs = sim.bot;
          const bm = sim.botMotion;

          if (pm.hitWobble > 0) pm.hitWobble = Math.max(0, pm.hitWobble - dt * 3.4);
          if (bm.hitWobble > 0) bm.hitWobble = Math.max(0, bm.hitWobble - dt * 3.4);
          if (pm.landingSquash > 0) pm.landingSquash = Math.max(0, pm.landingSquash - dt * 5.2);
          if (bm.landingSquash > 0) bm.landingSquash = Math.max(0, bm.landingSquash - dt * 5.2);

          if (curScreen === 'playing') {
            // 1. PLAYER UPDATE
            const inp = inputManager.state;
            if (ps.punchCd > 0) ps.punchCd = Math.max(0, ps.punchCd - dt);
            if (ps.kickCd > 0) ps.kickCd = Math.max(0, ps.kickCd - dt);
            if (ps.dodgeCd > 0) ps.dodgeCd = Math.max(0, ps.dodgeCd - dt);
            if (ps.specialCd > 0) ps.specialCd = Math.max(0, ps.specialCd - dt);

            if (ps.stunTimer > 0) {
              ps.stunTimer = Math.max(0, ps.stunTimer - dt);
              pm.stunTime = ps.stunTimer;
              pm.action = ps.stunTimer > 0 ? 'stun' : 'none';
            }

            if (
              pm.action === 'punch' ||
              pm.action === 'kick' ||
              pm.action === 'special' ||
              pm.action === 'dodge'
            ) {
              ps.actionTimer += dt;
              pm.actionProgress = Math.min(1, ps.actionTimer / Math.max(0.01, ps.actionDuration));
              if (pm.action === 'punch' || pm.action === 'kick' || pm.action === 'special') {
                processAttack(ps, pm, bs, bm, false);
              }
              if (ps.actionTimer >= ps.actionDuration) {
                pm.action = 'none';
                pm.actionProgress = 0;
              }
            }

            const pBusy =
              pm.action === 'punch' ||
              pm.action === 'kick' ||
              pm.action === 'special' ||
              pm.action === 'dodge' ||
              pm.action === 'stun';

            if (!pBusy) {
              if (inp.block) {
                if (!ps.wasBlocking) soundEngine.playBlockStart();
                pm.action = 'block';
                ps.wasBlocking = true;
              } else {
                if (pm.action === 'block') pm.action = 'none';
                ps.wasBlocking = false;
              }
            }

            if (!pBusy) {
              if (ps.dodgeCd <= 0 && inputManager.consumeDodge()) {
                pm.action = 'dodge';
                pm.actionProgress = 0;
                ps.actionTimer = 0;
                ps.actionDuration = DODGE_DURATION;
                ps.dodgeCd = DODGE_COOLDOWN;
                ps.wasBlocking = false;
                const dashSign = Math.abs(inp.moveX) > 0.1 ? Math.sign(inp.moveX) : ps.facing;
                ps.dodgeVx = dashSign * DODGE_SPEED;
                ps.facing = dashSign >= 0 ? 1 : -1;
                soundEngine.playDodge();
                for (let d = 0; d < 4; d++) {
                  spawnDust(ps.x, 0.1, -ps.dodgeVx * 0.15, 0.6 + d * 0.25, 0.24);
                }
              } else if (!inp.block && ps.specialCd <= 0 && inputManager.consumeSpecial()) {
                const spec = getCharacterAttackSpec('special', pChar);
                pm.action = 'special';
                pm.actionProgress = 0;
                ps.actionTimer = 0;
                ps.actionDuration = spec.duration;
                ps.specialCd = spec.cooldown;
                ps.hasConnected = false;
                ps.hasHitProp = false;
                ps.swingFxSpawned = false;
                ps.facing = bs.x >= ps.x ? 1 : -1;
                ps.vx += ps.facing * 4.2;
                sim.stats.specialsUsed += 1;
                propsRef.current.onStatsUpdate?.({ ...sim.stats });
                soundEngine.playSpecialWindup(pChar.special.animType);
                soundEngine.playCharacterReaction('special', pChar.animationStyle);
              } else if (!inp.block && ps.punchCd <= 0 && inputManager.consumePunch()) {
                const spec = getCharacterAttackSpec('punch', pChar);
                pm.action = 'punch';
                pm.actionProgress = 0;
                ps.actionTimer = 0;
                ps.actionDuration = spec.duration;
                ps.punchCd = spec.cooldown;
                ps.hasConnected = false;
                ps.hasHitProp = false;
                ps.swingFxSpawned = false;
                ps.comboStep = (ps.comboStep + 1) % 2;
                pm.comboStep = ps.comboStep;
                ps.facing = bs.x >= ps.x ? 1 : -1;
                ps.vx += ps.facing * 2.5;
                soundEngine.playPunch(ps.comboStep);
              } else if (!inp.block && ps.kickCd <= 0 && inputManager.consumeKick()) {
                const spec = getCharacterAttackSpec('kick', pChar);
                pm.action = 'kick';
                pm.actionProgress = 0;
                ps.actionTimer = 0;
                ps.actionDuration = spec.duration;
                ps.kickCd = spec.cooldown;
                ps.hasConnected = false;
                ps.hasHitProp = false;
                ps.swingFxSpawned = false;
                ps.facing = bs.x >= ps.x ? 1 : -1;
                ps.vx += ps.facing * 3.1;
                soundEngine.playKick();
              }
            }

            if (
              ps.grounded &&
              pm.action !== 'dodge' &&
              pm.action !== 'stun' &&
              pm.action !== 'special' &&
              inputManager.consumeJump()
            ) {
              ps.vy = JUMP_VELOCITY * pChar.stats.jumpMultiplier;
              ps.grounded = false;
              pm.grounded = false;
              soundEngine.playJump();
              spawnDust(ps.x - 0.2, 0.08, -1.2, 0.8, 0.22);
              spawnDust(ps.x + 0.2, 0.08, 1.2, 0.8, 0.22);
            }

            const pBlocking = pm.action === 'block';
            const pAttacking =
              pm.action === 'punch' || pm.action === 'kick' || pm.action === 'special';
            const pDodging = pm.action === 'dodge';
            const pStunned = pm.action === 'stun';
            const pCrouching = inp.crouch && ps.grounded && !pBusy && !pBlocking;
            pm.isCrouching = pCrouching;

            if (pDodging) {
              ps.vx = ps.dodgeVx;
              ps.dodgeVx = damp(ps.dodgeVx, 0, 5.5, dt);
            } else if (pStunned) {
              ps.vx = damp(ps.vx, 0, 9, dt);
            } else {
              const hasMove = Math.abs(inp.moveX) > 0.08 && !pCrouching;
              const isRun = hasMove && inp.sprint && !pBlocking && !pAttacking;
              const cap =
                (pBlocking
                  ? BLOCK_WALK_SPEED
                  : pAttacking
                    ? WALK_SPEED * 0.3
                    : isRun
                      ? RUN_SPEED
                      : WALK_SPEED) * pChar.stats.speedMultiplier;
              const targetVx = hasMove ? inp.moveX * cap : 0;
              ps.vx = damp(ps.vx, targetVx, hasMove ? (ps.grounded ? 15 : 8) : ps.grounded ? 17 : 5, dt);

              if (!pAttacking && !pBlocking) {
                ps.facing = Math.abs(inp.moveX) > 0.15 ? (inp.moveX > 0 ? 1 : -1) : bs.x >= ps.x ? 1 : -1;
              }
            }

            if (!ps.grounded) {
              ps.vy += (inp.crouch ? GRAVITY * 1.45 : GRAVITY) * dt;
            }

            let pNextX = ps.x + ps.vx * dt;
            let pNextY = ps.y + ps.vy * dt;
            if (pNextY <= 0) {
              if (!ps.grounded && ps.vy < -2.5) {
                pm.landingSquash = 1;
                soundEngine.playLand();
                spawnDust(pNextX - 0.25, 0.08, -1.6, 0.7, 0.24);
                spawnDust(pNextX + 0.25, 0.08, 1.6, 0.7, 0.24);
              }
              pNextY = 0;
              ps.vy = 0;
              ps.grounded = true;
            }
            pm.grounded = ps.grounded;
            pm.verticalVelocity = ps.vy;

            // 2. AI BOT UPDATE
            if (bs.punchCd > 0) bs.punchCd = Math.max(0, bs.punchCd - dt);
            if (bs.kickCd > 0) bs.kickCd = Math.max(0, bs.kickCd - dt);
            if (bs.dodgeCd > 0) bs.dodgeCd = Math.max(0, bs.dodgeCd - dt);
            if (bs.specialCd > 0) bs.specialCd = Math.max(0, bs.specialCd - dt);

            if (bs.stunTimer > 0) {
              bs.stunTimer = Math.max(0, bs.stunTimer - dt);
              bm.stunTime = bs.stunTimer;
              bm.action = bs.stunTimer > 0 ? 'stun' : 'none';
            }

            if (
              bm.action === 'punch' ||
              bm.action === 'kick' ||
              bm.action === 'special' ||
              bm.action === 'dodge'
            ) {
              bs.actionTimer += dt;
              bm.actionProgress = Math.min(1, bs.actionTimer / Math.max(0.01, bs.actionDuration));
              if (bm.action === 'punch' || bm.action === 'kick' || bm.action === 'special') {
                processAttack(bs, bm, ps, pm, true);
              }
              if (bs.actionTimer >= bs.actionDuration) {
                bm.action = 'none';
                bm.actionProgress = 0;
              }
            }

            const actObs = curArena.obstacles.filter(
              (o) => (sim.propVisuals[o.id]?.brokenTimer ?? 0) <= 0,
            );
            const actHaz = curArena.hazards.filter(
              (h) => h.damage > 0 && getHazardPhase(h, sim.arenaTime) !== 'calm',
            );

            const botCmd = sim.botAI.update({
              dt,
              difficulty: curSettings.difficulty,
              mode2D: true,
              botX: bs.x,
              botZ: 0,
              botGrounded: bs.grounded,
              botHealth: bs.health,
              botMaxHealth: bChar.stats.maxHealth,
              botCurrentAction: bm.action,
              botPunchCd: bs.punchCd,
              botKickCd: bs.kickCd,
              botDodgeCd: bs.dodgeCd,
              botSpecialCd: bs.specialCd,
              playerX: pNextX,
              playerZ: 0,
              playerHealth: ps.health,
              playerMaxHealth: pChar.stats.maxHealth,
              playerAction: pm.action,
              playerGrounded: ps.grounded,
              obstacles: actObs,
              activeHazards: actHaz,
            });

            if (botCmd.state !== sim.lastBotState) {
              sim.lastBotState = botCmd.state;
              propsRef.current.onBotStateUpdate?.(botCmd.state);
            }

            const bBusy =
              bm.action === 'punch' ||
              bm.action === 'kick' ||
              bm.action === 'special' ||
              bm.action === 'dodge' ||
              bm.action === 'stun';

            if (!bBusy) {
              bs.facing = pNextX >= bs.x ? 1 : -1;
              if (botCmd.wantDodge && bs.dodgeCd <= 0) {
                bm.action = 'dodge';
                bm.actionProgress = 0;
                bs.actionTimer = 0;
                bs.actionDuration = DODGE_DURATION;
                bs.dodgeCd = DODGE_COOLDOWN;
                bs.wasBlocking = false;
                const dSign = Math.abs(botCmd.dodgeDirX) > 0.05 ? Math.sign(botCmd.dodgeDirX) : -bs.facing;
                bs.dodgeVx = dSign * DODGE_SPEED;
                soundEngine.playDodge();
              } else if (botCmd.wantSpecial && bs.specialCd <= 0) {
                const spec = getCharacterAttackSpec('special', bChar);
                bm.action = 'special';
                bm.actionProgress = 0;
                bs.actionTimer = 0;
                bs.actionDuration = spec.duration;
                bs.specialCd = spec.cooldown;
                bs.hasConnected = false;
                bs.hasHitProp = false;
                bs.swingFxSpawned = false;
                bs.vx += bs.facing * 4.2;
                soundEngine.playSpecialWindup(bChar.special.animType);
                soundEngine.playCharacterReaction('special', bChar.animationStyle);
              } else if (botCmd.wantPunch && bs.punchCd <= 0) {
                const spec = getCharacterAttackSpec('punch', bChar);
                bm.action = 'punch';
                bm.actionProgress = 0;
                bs.actionTimer = 0;
                bs.actionDuration = spec.duration;
                bs.punchCd = spec.cooldown;
                bs.hasConnected = false;
                bs.hasHitProp = false;
                bs.swingFxSpawned = false;
                bs.comboStep = (bs.comboStep + 1) % 2;
                bm.comboStep = bs.comboStep;
                bs.vx += bs.facing * 2.4;
                soundEngine.playPunch(bs.comboStep);
              } else if (botCmd.wantKick && bs.kickCd <= 0) {
                const spec = getCharacterAttackSpec('kick', bChar);
                bm.action = 'kick';
                bm.actionProgress = 0;
                bs.actionTimer = 0;
                bs.actionDuration = spec.duration;
                bs.kickCd = spec.cooldown;
                bs.hasConnected = false;
                bs.hasHitProp = false;
                bs.swingFxSpawned = false;
                bs.vx += bs.facing * 3.0;
                soundEngine.playKick();
              } else if (botCmd.wantBlock) {
                if (!bs.wasBlocking) soundEngine.playBlockStart();
                bm.action = 'block';
                bs.wasBlocking = true;
              } else {
                if (bm.action === 'block') bm.action = 'none';
                bs.wasBlocking = false;
              }

              if (botCmd.wantJump && bs.grounded && bm.action !== 'dodge' && bm.action !== 'special') {
                bs.vy = JUMP_VELOCITY * bChar.stats.jumpMultiplier;
                bs.grounded = false;
                bm.grounded = false;
                soundEngine.playJump();
              }
            }

            if (bm.action === 'dodge') {
              bs.vx = bs.dodgeVx;
              bs.dodgeVx = damp(bs.dodgeVx, 0, 5.5, dt);
            } else if (bm.action === 'stun') {
              bs.vx = damp(bs.vx, 0, 9, dt);
            } else {
              const bMove = Math.abs(botCmd.moveX) > 0.08;
              const bSpeed =
                (bm.action === 'block'
                  ? BLOCK_WALK_SPEED
                  : bm.action === 'punch' || bm.action === 'kick' || bm.action === 'special'
                    ? WALK_SPEED * 0.25
                    : botCmd.sprint
                      ? RUN_SPEED * 0.94
                      : WALK_SPEED) * bChar.stats.speedMultiplier;
              bs.vx = damp(
                bs.vx,
                bMove ? botCmd.moveX * bSpeed : 0,
                bMove ? 12 : 14,
                dt,
              );
            }

            if (!bs.grounded) bs.vy += GRAVITY * dt;
            let bNextX = bs.x + bs.vx * dt;
            let bNextY = bs.y + bs.vy * dt;
            if (bNextY <= 0) {
              if (!bs.grounded && bs.vy < -2.5) bm.landingSquash = 1;
              bNextY = 0;
              bs.vy = 0;
              bs.grounded = true;
            }
            bm.grounded = bs.grounded;
            bm.verticalVelocity = bs.vy;

            // Fighter body separation
            const sepDx = bNextX - pNextX;
            const verticalOverlap = Math.abs(bNextY - pNextY) < 1.3;
            if (
              verticalOverlap &&
              Math.abs(sepDx) < FIGHTER_MIN_SEP &&
              pm.action !== 'dodge' &&
              bm.action !== 'dodge'
            ) {
              const push = (FIGHTER_MIN_SEP - Math.abs(sepDx)) * 0.5;
              const sign = sepDx >= 0 ? 1 : -1;
              pNextX -= sign * push;
              bNextX += sign * push;
            }

            // Stage Obstacles & Arena Bounds
            pNextX = resolveObstacles2D(pNextX, pNextY, ps);
            bNextX = resolveObstacles2D(bNextX, bNextY, bs);

            const maxBound = curArena.playableRadius - 0.55;
            ps.x = Math.max(-maxBound, Math.min(maxBound, pNextX));
            ps.y = pNextY;
            bs.x = Math.max(-maxBound, Math.min(maxBound, bNextX));
            bs.y = bNextY;

            evaluateHazards2D(ps, pm, 'p1', false);
            evaluateHazards2D(bs, bm, 'bot', true);

            // Locomotion state & footsteps
            const pSpd = Math.abs(ps.vx);
            const pLoc: LocomotionState = !ps.grounded
              ? 'jump'
              : pSpd > 5.4
                ? 'run'
                : pSpd > 0.4
                  ? 'walk'
                  : 'idle';
            pm.locomotion = pLoc;
            pm.speedRatio = Math.min(1, pSpd / RUN_SPEED);
            pm.facing = ps.facing;
            if (ps.grounded && (pLoc === 'walk' || pLoc === 'run') && pm.action === 'none') {
              soundEngine.playFootstep(pLoc === 'run');
              ps.dustTimer -= dt;
              if (ps.dustTimer <= 0) {
                ps.dustTimer = pLoc === 'run' ? 0.14 : 0.26;
                spawnDust(ps.x - ps.facing * 0.2, 0.08, -ps.facing * 1.1, 0.5, 0.18);
              }
            }

            const bSpd = Math.abs(bs.vx);
            bm.locomotion = !bs.grounded
              ? 'jump'
              : bSpd > 5.2
                ? 'run'
                : bSpd > 0.4
                  ? 'walk'
                  : 'idle';
            bm.speedRatio = Math.min(1, bSpd / RUN_SPEED);
            bm.facing = bs.facing;
          } else if (curScreen === 'menu') {
            // Attract mode idle & playful spar showcase on 2D stage
            ps.x = -2.2 + Math.sin(sim.arenaTime * 0.9) * 0.65;
            bs.x = 2.2 - Math.sin(sim.arenaTime * 0.9) * 0.65;
            ps.y = 0;
            bs.y = 0;
            ps.facing = 1;
            bs.facing = -1;
            pm.locomotion = 'walk';
            bm.locomotion = 'walk';
            pm.action = 'none';
            bm.action = 'none';
            pm.facing = 1;
            bm.facing = -1;
          } else if (curScreen === 'gameover') {
            sim.endTimer += dt;
            const endProgress = Math.min(1, sim.endTimer / 2.2);

            if (!sim.endReactionPlayed) {
              sim.endReactionPlayed = true;
              if (curWinner === 'player') {
                soundEngine.playCharacterReaction('victory', pChar.animationStyle);
                spawnConfetti(ps.x, 26);
              } else if (curWinner === 'bot') {
                soundEngine.playCharacterReaction('defeat', pChar.animationStyle);
                soundEngine.playCharacterReaction('victory', bChar.animationStyle);
                spawnConfetti(bs.x, 24);
              } else {
                soundEngine.playCharacterReaction('victory', pChar.animationStyle);
              }
            }

            // Smoothly settle residual knockback & airtime instead of snapping to y = 0
            const maxBound = curArena.playableRadius - 0.55;
            const settleFighter = (st: FighterRuntime2D, mo: FighterMotionData) => {
              st.vx = damp(st.vx, 0, 5.2, dt);
              st.x = Math.max(-maxBound, Math.min(maxBound, st.x + st.vx * dt));
              if (!st.grounded) {
                st.vy += GRAVITY * dt;
                st.y += st.vy * dt;
                if (st.y <= 0) {
                  st.y = 0;
                  st.vy = 0;
                  st.grounded = true;
                  mo.grounded = true;
                  mo.landingSquash = 0.8;
                  soundEngine.playLand();
                  spawnDust(st.x - 0.25, 0.08, -1.4, 0.6, 0.24);
                  spawnDust(st.x + 0.25, 0.08, 1.4, 0.6, 0.24);
                }
              }
              mo.verticalVelocity = st.vy;
              mo.grounded = st.grounded;
              mo.isCrouching = false;
              mo.stunTime = 0;
              mo.locomotion = 'idle';
            };
            settleFighter(ps, pm);
            settleFighter(bs, bm);

            // Keyframed victory burst & defeat floor-crash FX
            if (curWinner === 'player' || curWinner === 'bot') {
              const winSt = curWinner === 'player' ? ps : bs;
              const winCh = curWinner === 'player' ? pChar : bChar;
              const loseSt = curWinner === 'player' ? bs : ps;
              const loseCh = curWinner === 'player' ? bChar : pChar;

              if (!sim.endWinnerPopTriggered && endProgress >= 0.62) {
                sim.endWinnerPopTriggered = true;
                spawnSparkBurst(winSt.x, 1.6, winCh.palette.accent, 14, 1.25);
                if (
                  winCh.victoryStyle === 'heavy_chest_flex' ||
                  winCh.victoryStyle === 'martial_crane_bow' ||
                  winCh.victoryStyle === 'parkour_backflip'
                ) {
                  spawnShockwave(winSt.x, 0.15, winCh.palette.accent, 2.2);
                  spawnDust(winSt.x - 0.35, 0.08, -1.6, 0.7, 0.25);
                  spawnDust(winSt.x + 0.35, 0.08, 1.6, 0.7, 0.25);
                }
              }

              if (!sim.endDefeatImpactTriggered && endProgress >= 0.74) {
                sim.endDefeatImpactTriggered = true;
                if (
                  loseCh.defeatStyle === 'dizzy_faceplant' ||
                  loseCh.defeatStyle === 'timber_topple' ||
                  loseCh.defeatStyle === 'crispy_splat'
                ) {
                  soundEngine.playLand();
                  sim.cameraShake = Math.max(sim.cameraShake, 0.2);
                  spawnDust(loseSt.x - 0.45, 0.08, -2.0, 0.75, 0.3);
                  spawnDust(loseSt.x + 0.45, 0.08, 2.0, 0.75, 0.3);
                  spawnSparkBurst(
                    loseSt.x,
                    0.25,
                    loseCh.defeatStyle === 'crispy_splat' ? '#fb923c' : '#fde047',
                    8,
                    0.9,
                  );
                }
              }

              sim.confettiTimer += dt;
              if (sim.confettiTimer >= 0.95) {
                sim.confettiTimer = 0;
                spawnConfetti(winSt.x, 14);
              }
            }

            ps.facing = bs.x >= ps.x ? 1 : -1;
            bs.facing = ps.x >= bs.x ? 1 : -1;
            pm.facing = ps.facing;
            bm.facing = bs.facing;
            pm.action = curWinner === 'bot' ? 'defeat' : 'victory';
            bm.action = curWinner === 'player' ? 'defeat' : 'victory';
            pm.actionProgress = endProgress;
            bm.actionProgress = endProgress;
          }
        }

        // Update 2D Particle Pools
        for (let i = sim.dusts.length - 1; i >= 0; i--) {
          const d = sim.dusts[i];
          d.life += dt;
          if (d.life >= d.maxLife) sim.dusts.splice(i, 1);
          else {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy -= 1.5 * dt;
          }
        }
        for (let i = sim.sparks.length - 1; i >= 0; i--) {
          const sp = sim.sparks[i];
          sp.life += dt;
          if (sp.life >= sp.maxLife) sim.sparks.splice(i, 1);
          else {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vy -= 9.5 * dt;
          }
        }
        for (let i = sim.shockwaves.length - 1; i >= 0; i--) {
          const sw = sim.shockwaves[i];
          sw.life += dt;
          if (sw.life >= sw.maxLife) sim.shockwaves.splice(i, 1);
        }
        for (let i = sim.slashes.length - 1; i >= 0; i--) {
          const sl = sim.slashes[i];
          sl.life += dt;
          if (sl.life >= sl.maxLife) sim.slashes.splice(i, 1);
        }
        for (let i = sim.popups.length - 1; i >= 0; i--) {
          const pop = sim.popups[i];
          pop.life += dt;
          if (pop.life >= pop.maxLife) sim.popups.splice(i, 1);
          else pop.y += pop.vy * dt;
        }
        for (let i = sim.confetti.length - 1; i >= 0; i--) {
          const cf = sim.confetti[i];
          cf.life += dt;
          if (cf.life >= cf.maxLife) sim.confetti.splice(i, 1);
          else {
            cf.x += cf.vx * dt;
            cf.y += cf.vy * dt;
            cf.vy -= 5.5 * dt;
            cf.rot += cf.vRot * dt;
          }
        }
      }

      // Throttled HUD updates
      sim.hudTimer += dt;
      if (sim.hudTimer >= 0.05 && curScreen === 'playing') {
        sim.hudTimer = 0;
        const ps = sim.player;
        const pm = sim.playerMotion;
        const pSpec = getCharacterAttackSpec('punch', pChar);
        const kSpec = getCharacterAttackSpec('kick', pChar);
        const sSpec = getCharacterAttackSpec('special', pChar);
        const status: ActionCooldownStatus = {
          punch: Math.min(1, ps.punchCd / pSpec.cooldown),
          kick: Math.min(1, ps.kickCd / kSpec.cooldown),
          dodge: Math.min(1, ps.dodgeCd / DODGE_COOLDOWN),
          special: Math.min(1, ps.specialCd / sSpec.cooldown),
          isBlocking: pm.action === 'block',
          isCrouching: Boolean(pm.isCrouching),
          isStunned: pm.action === 'stun',
          isGrounded: ps.grounded,
          activeAction: pm.action,
          locomotion: pm.locomotion,
        };
        const sig = `${status.punch.toFixed(2)}|${status.kick.toFixed(2)}|${status.dodge.toFixed(2)}|${status.special.toFixed(2)}|${status.activeAction}|${status.locomotion}|${status.isCrouching}`;
        if (sig !== sim.lastHudSig) {
          sim.lastHudSig = sig;
          propsRef.current.onStatusUpdate?.(status);
        }
      }

      // Dynamic 2D Camera Framing
      const midX = (sim.player.x + sim.bot.x) * 0.5;
      const focusTargetX =
        curScreen === 'gameover' && (curWinner === 'player' || curWinner === 'bot')
          ? midX * 0.65 + (curWinner === 'player' ? sim.player.x : sim.bot.x) * 0.35
          : midX;
      const distX = Math.abs(sim.player.x - sim.bot.x);
      const maxFighterY = Math.max(sim.player.y, sim.bot.y);
      const zoomSense = Math.max(0.5, Math.min(1.8, curSettings.cameraSensitivity));
      const endZoomBoost = curScreen === 'gameover' ? 0.1 : 0;
      const targetZoom = Math.max(
        0.74,
        Math.min(1.24, 1.24 + endZoomBoost - distX * 0.042 * zoomSense - maxFighterY * 0.04),
      );
      sim.camX = damp(sim.camX, focusTargetX, 6.5, dt);
      sim.camZoom = damp(sim.camZoom, targetZoom, 5.5, dt);

      if (sim.cameraShake > 0) {
        sim.cameraShake = Math.max(0, sim.cameraShake - dt * 2.8);
      }
      const shakeAmp = sim.cameraShake * 24 * curSettings.cameraSensitivity;
      const shakeX = (Math.random() - 0.5) * shakeAmp;
      const shakeY = (Math.random() - 0.5) * shakeAmp;

      // ==========================================
      // RENDER 2D FRAME
      // ==========================================
      ctx.save();
      ctx.scale(dpr, dpr);

      const basePpm = Math.max(54, Math.min(92, displayW / 14.5));
      const ppm = basePpm * sim.camZoom;
      const floorY = Math.round(displayH * 0.78 + shakeY);
      const worldToScreenX = (wx: number) =>
        displayW * 0.5 + (wx - sim.camX) * ppm + shakeX;
      const worldToScreenY = (wy: number) => floorY - wy * ppm;

      drawArenaBackdrop2D(
        ctx,
        curArena,
        displayW,
        displayH,
        floorY,
        sim.camX,
        sim.arenaTime,
        curSettings.shadowsEnabled,
      );

      drawArenaStageFloorAndProps2D(
        ctx,
        curArena,
        worldToScreenX,
        floorY,
        ppm,
        displayW,
        displayH,
        sim.arenaTime,
        sim.propVisuals,
      );

      // Draw Dust Puffs behind fighters
      for (const d of sim.dusts) {
        const alpha = 1 - d.life / d.maxLife;
        ctx.fillStyle = `rgba(226, 232, 240, ${alpha * 0.55})`;
        ctx.beginPath();
        ctx.arc(worldToScreenX(d.x), worldToScreenY(d.y), d.size * ppm * (1 + d.life * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }

      const fighterScale = ppm / 84;
      // Draw AI Bot Human Fighter
      drawHumanFighter2D(ctx, {
        xPx: worldToScreenX(sim.bot.x),
        yPx: worldToScreenY(sim.bot.y),
        facing: sim.bot.facing,
        character: bChar,
        motion: sim.botMotion,
        time: sim.arenaTime,
        isPlayer: false,
        showShadow: curSettings.shadowsEnabled,
        worldScale: fighterScale,
      });

      // Draw Player Human Fighter
      drawHumanFighter2D(ctx, {
        xPx: worldToScreenX(sim.player.x),
        yPx: worldToScreenY(sim.player.y),
        facing: sim.player.facing,
        character: pChar,
        motion: sim.playerMotion,
        time: sim.arenaTime,
        isPlayer: true,
        showShadow: curSettings.shadowsEnabled,
        worldScale: fighterScale,
      });

      // Overhead P1 / BOT subtle nameplate tags in combat
      if (curScreen === 'playing') {
        const drawTag = (x: number, y: number, label: string, col: string) => {
          const sx = worldToScreenX(x);
          const sy = worldToScreenY(y + 2.15);
          ctx.save();
          ctx.fillStyle = col;
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 3;
          ctx.font = 'bold 11px "Russo One", sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeText(label, sx, sy);
          ctx.fillText(label, sx, sy);
          ctx.restore();
        };
        drawTag(sim.player.x, sim.player.y, 'P1', '#38bdf8');
        drawTag(sim.bot.x, sim.bot.y, 'BOT', '#fb7185');
      }

      // Draw Shockwaves
      for (const sw of sim.shockwaves) {
        const prog = sw.life / sw.maxLife;
        const r = prog * sw.maxRadius * ppm;
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = 1 - prog;
        ctx.lineWidth = 5 * (1 - prog) + 1;
        ctx.beginPath();
        ctx.ellipse(worldToScreenX(sw.x), worldToScreenY(sw.y), r, r * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Motion Slash Arcs
      for (const sl of sim.slashes) {
        const prog = sl.life / sl.maxLife;
        ctx.save();
        ctx.translate(worldToScreenX(sl.x), worldToScreenY(sl.y));
        ctx.scale(sl.facing, 1);
        ctx.rotate(sl.angle);
        ctx.globalAlpha = 1 - prog;
        ctx.strokeStyle = sl.color;
        ctx.lineWidth = 7 * (1 - prog) + 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, sl.radius * ppm * (0.65 + prog * 0.45), -0.95, 0.95);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Hit Sparks
      for (const sp of sim.sparks) {
        const alpha = 1 - sp.life / sp.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(worldToScreenX(sp.x), worldToScreenY(sp.y), sp.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Confetti
      for (const cf of sim.confetti) {
        ctx.save();
        ctx.translate(worldToScreenX(cf.x), worldToScreenY(cf.y));
        ctx.rotate(cf.rot);
        ctx.fillStyle = cf.color;
        ctx.globalAlpha = Math.max(0, 1 - cf.life / cf.maxLife);
        ctx.fillRect(-5, -3, 10, 6);
        ctx.restore();
      }

      // Draw Floating Comic Damage Popups
      for (const pop of sim.popups) {
        const alpha = Math.max(0, 1 - pop.life / pop.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 16px "Russo One", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 4;
        const px = worldToScreenX(pop.x);
        const py = worldToScreenY(pop.y);
        ctx.strokeText(pop.text, px, py);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, px, py);
        ctx.restore();
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full touch-none bg-slate-950">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
