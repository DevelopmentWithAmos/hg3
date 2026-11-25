import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllArenas, getArenaById, getHazardPhase } from './arenas';
import {
  getAllCharacters,
  getCharacterById,
  getDefaultOpponentFor,
  getPlayableCharacters,
  registerGuestCharacter,
} from './characters';
import {
  HURTBOX_HEIGHT,
  HURTBOX_RADIUS,
  evaluateAttackCollision,
  getCharacterAttackSpec,
} from './combatSystem';
import { BotAIController } from './botAI';
import { inputManager } from './inputManager';
import {
  DEFAULT_SELECTIONS,
  DEFAULT_SETTINGS,
  sanitizeSelections,
  sanitizeSettings,
} from '../utils/storage';
import { computeArenaLightingState } from '../components/game2d/arena2DRenderer';
import { drawHumanFighter2D } from '../components/game2d/humanFighterRenderer';
import {
  CARRYMINATI_SPRITE_SHEET,
  getSpriteCharacterSheet,
  getStaticSpriteCharacterImageUrl,
  selectSpriteFighterFrame,
} from '../components/game2d/spriteFighterRenderer';
import { FighterMotionData } from '../types/game';

let passed = 0;

function runTest(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`PASS: ${name}`);
}

// 1. Character Roster & Guest Slot Extensibility
runTest('Character selection roster & licensed guest slots', () => {
  const all = getAllCharacters();
  const playable = getPlayableCharacters();
  assert.equal(playable.length, 40, 'Expected 36 featured fighters + 4 original brawlers');
  assert.ok(all.length >= 42, 'Expected 40 playable fighters + 2 reserved guest slots');

  const expectedFeaturedNames = [
    'CarryMinati',
    'Ashish Chanchlani',
    'Round2hell',
    'Total Gaming',
    'Samay Raina',
    'Zakir Khan',
    'Narendra Modi',
    'Rahul Gandhi',
    'Arvind Kejriwal',
    'Yogi Adityanath',
    'Lalu Prasad Yadav',
    'Nitish Kumar',
    'Tejashwi Yadav',
    'Ravi Kishan',
    'Mamata Banerjee',
    'Akhilesh Yadav',
    'Manoj Tiwari',
    'Akshay Kumar',
    'Ajay Devgn',
    'Salman Khan',
    'Shah Rukh Khan',
    'Aamir Khan',
    'Govinda',
    'Rajpal Yadav',
    'Tiger Shroff',
    'Ranveer Singh',
    'Arjun Kapoor',
    'Hrithik Roshan',
    'Sanjay Dutt',
    'Nana Patekar',
    'Anupam Kher',
    'Kartik Aaryan',
    'Jackie Shroff',
    'Sanjay Mishra',
    'Arshad Warsi',
    'Amitabh Bachchan',
  ];
  const playableByName = new Map(playable.map((c) => [c.name, c]));
  for (const name of expectedFeaturedNames) {
    const fighter = playableByName.get(name);
    assert.ok(fighter, `Expected character "${name}" in playable roster`);
    assert.ok(
      fighter.portraitUrl &&
        (fighter.portraitUrl.startsWith('/src/assets/images/') ||
          fighter.portraitUrl.startsWith('/assets/characters/')),
      `Expected "${name}" to use a saved character portrait asset`,
    );
    const decodedRelPath = decodeURI(fighter.portraitUrl.replace(/^\//, ''));
    const fullDiskPath = fighter.portraitUrl.startsWith('/assets/characters/')
      ? path.resolve(process.cwd(), 'public', decodedRelPath)
      : path.resolve(process.cwd(), decodedRelPath);
    assert.ok(
      existsSync(fullDiskPath),
      `Expected image asset for "${name}" to exist on disk at ${fullDiskPath}`,
    );
    assert.ok(
      fighter.faceCrop &&
        fighter.faceCrop.x >= 0 &&
        fighter.faceCrop.x <= 1 &&
        fighter.faceCrop.y >= 0 &&
        fighter.faceCrop.y <= 1 &&
        fighter.faceCrop.zoom >= 1,
      `Expected valid faceCrop metadata for "${name}"`,
    );
  }

  const spriteFighters = playable.filter((fighter) => fighter.spriteCharacterId);
  assert.equal(spriteFighters.length, 33, 'Expected 33 fighters with validated sprite atlases');
  let staticSpriteArtworkCount = 0;
  for (const fighter of spriteFighters) {
    const sheet = getSpriteCharacterSheet(fighter.spriteCharacterId);
    assert.ok(sheet, `Expected an animation sheet for "${fighter.name}"`);
    for (const frame of Object.values(sheet.frames)) {
      if (!frame.url.includes('/roster-sprites/')) continue;
      const atlasPath = path.resolve(process.cwd(), 'public', frame.url.replace(/^\//, ''));
      assert.ok(existsSync(atlasPath), `Expected generated animation atlas for "${fighter.name}"`);
      assert.ok(
        frame.sourceRect &&
          frame.sourceRect.x >= 0 &&
          frame.sourceRect.y >= 0 &&
          frame.sourceRect.w > 0 &&
          frame.sourceRect.h > 0,
        `Expected a valid atlas crop for "${fighter.name}"`,
      );
    }

    const artworkUrl = getStaticSpriteCharacterImageUrl(fighter.spriteCharacterId);
    if (artworkUrl) {
      const artworkPath = path.resolve(process.cwd(), 'public', artworkUrl.replace(/^\//, ''));
      assert.ok(existsSync(artworkPath), `Expected static illustrated art for "${fighter.name}"`);
      staticSpriteArtworkCount += 1;
    }
  }
  assert.equal(staticSpriteArtworkCount, 32, 'Expected 32 static sprite artworks and one procedural fallback');

  const uniqueBios = new Set<string>();
  for (const c of all) {
    const trimmedBio = c.bio.trim();
    assert.ok(trimmedBio.length >= 40, `${c.id} should have a meaningful backstory bio`);
    assert.ok(!uniqueBios.has(trimmedBio), `${c.id} must have a unique backstory bio`);
    uniqueBios.add(trimmedBio);
  }

  for (const c of playable) {
    assert.ok(c.stats.maxHealth >= 80 && c.stats.maxHealth <= 150);
    assert.ok(c.special.damage > 0 && c.special.cooldown > 0);
    assert.ok(c.palette.hair && c.hairStyle && c.facialHair, `${c.id} has human facial & hair styling`);
    assert.ok(c.victoryStyle && c.defeatStyle, `${c.id} has victory & defeat animation styles`);
    const punchSpec = getCharacterAttackSpec('punch', c);
    const specialSpec = getCharacterAttackSpec('special', c);
    assert.ok(punchSpec.activeStart < punchSpec.activeEnd);
    assert.equal(specialSpec.baseDamage, c.special.damage);
  }
  assert.ok(
    new Set(playable.map((c) => c.victoryStyle)).size >= 4,
    'Playable roster must span multiple victory animation styles',
  );
  assert.ok(
    new Set(playable.map((c) => c.defeatStyle)).size >= 4,
    'Playable roster must span multiple defeat animation styles',
  );

  const defaultOpp = getDefaultOpponentFor('carryminati');
  assert.notEqual(defaultOpp, 'carryminati');

  // Verify guest registration hook without breaking base roster
  const baseTemplate = getCharacterById('guest-slot-alpha');
  registerGuestCharacter({
    ...baseTemplate,
    id: 'guest-test-runtime',
    name: 'TEST GUEST',
    unlocked: true,
  });
  assert.equal(getCharacterById('guest-test-runtime').name, 'TEST GUEST');
});

// 2. Arena Definitions, Obstacles & Hazard Phasing
runTest('8 Arenas, obstacle bounds & hazard cycle phases', () => {
  const arenas = getAllArenas();
  assert.equal(arenas.length, 8);
  const expectedIds = [
    'wrestling',
    'street',
    'rooftop',
    'wedding',
    'cricket_stadium',
    'studio_set',
    'dhaba_highway',
    'parliament_hall',
  ];
  for (const id of expectedIds) {
    const arena = getArenaById(id as 'wrestling');
    assert.equal(arena.id, id);
    assert.ok(arena.backdropUrl && arena.backdropUrl.startsWith('/src/assets/images/'), `${id} has 2D backdrop asset`);
    assert.ok(arena.obstacles.length >= 3, `${id} should have interactive props`);
    assert.ok(arena.hazards.length >= 3, `${id} should have arena hazards`);
    for (const obs of arena.obstacles) {
      assert.equal(obs.z, 0, `${obs.id} aligned on 2D X-plane`);
      assert.ok(
        Math.abs(obs.x) < arena.playableRadius,
        `${obs.id} inside 2D stage width`,
      );
    }
  }

  // Periodic zapper phase transitions
  const wrestling = getArenaById('wrestling');
  const zapper = wrestling.hazards.find((h) => h.kind === 'zapper');
  assert.ok(zapper);
  const calmPhase = getHazardPhase(zapper, 0);
  const activeTime = zapper.cyclePeriod * ((zapper.activeStart + zapper.activeEnd) * 0.5) - zapper.phaseOffset;
  const warnTime = zapper.cyclePeriod * ((zapper.warnStart + zapper.activeStart) * 0.5) - zapper.phaseOffset;
  assert.equal(calmPhase, 'calm');
  assert.equal(getHazardPhase(zapper, warnTime + zapper.cyclePeriod), 'warning');
  assert.equal(getHazardPhase(zapper, activeTime + zapper.cyclePeriod), 'active');
});

// 3. 2D Stage Combat Collision, Dodge i-frames, Block Chip & Counter-Hits
runTest('Combat hitbox connection, miss, jump evasion, block & counter-hit', () => {
  const bonk = getCharacterById('captain-bonk');
  const derp = getCharacterById('sir-derp');
  const punch = getCharacterAttackSpec('punch', bonk);
  const hurtbox = { x: 1.3, y: 0, z: 0, radius: HURTBOX_RADIUS, height: HURTBOX_HEIGHT };

  // Direct facing hit (+X = rotY PI/2)
  const hit = evaluateAttackCollision(
    0,
    0,
    0,
    Math.PI / 2,
    punch,
    hurtbox,
    'none',
    0,
    false,
    bonk.stats.powerMultiplier,
    derp.stats.defenseMultiplier,
  );
  assert.ok(hit && hit.connected && !hit.blocked && hit.damage > 0);

  // Out of range miss
  const farMiss = evaluateAttackCollision(
    0,
    0,
    0,
    Math.PI / 2,
    punch,
    { ...hurtbox, x: 5.0 },
    'none',
    0,
    false,
  );
  assert.equal(farMiss, null);

  // Facing wrong way miss
  const backMiss = evaluateAttackCollision(
    0,
    0,
    0,
    -Math.PI / 2,
    punch,
    hurtbox,
    'none',
    0,
    false,
  );
  assert.equal(backMiss, null);

  // Vertical jump evasion
  const jumpMiss = evaluateAttackCollision(
    0,
    0,
    0,
    Math.PI / 2,
    punch,
    { ...hurtbox, y: 2.6 },
    'none',
    0,
    false,
  );
  assert.equal(jumpMiss, null);

  // Dodge i-frames
  const dodged = evaluateAttackCollision(
    0,
    0,
    0,
    Math.PI / 2,
    punch,
    hurtbox,
    'dodge',
    0.4,
    false,
  );
  assert.ok(dodged && dodged.evaded && !dodged.connected && dodged.damage === 0);

  // Block chip damage
  const blocked = evaluateAttackCollision(
    0,
    0,
    0,
    Math.PI / 2,
    punch,
    hurtbox,
    'block',
    0,
    false,
  );
  assert.ok(blocked && blocked.connected && blocked.blocked && blocked.stunDuration === 0);
  assert.ok(blocked.damage < hit.damage);

  // Counter-hit bonus during early windup
  const counter = evaluateAttackCollision(
    0,
    0,
    0,
    Math.PI / 2,
    punch,
    hurtbox,
    'kick',
    0.1,
    false,
  );
  assert.ok(counter && counter.counterHit && counter.damage > punch.baseDamage);
});

// 4. AI Bot FSM across Easy, Medium & Hard + Obstacle/Hazard Steering
runTest('AI Bot FSM spacing, attacking, difficulty scaling & obstacle steering', () => {
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    const bot = new BotAIController();
    bot.reset();

    // Far away -> should approach
    const approachCmd = bot.update({
      dt: 0.3,
      difficulty: diff,
      botX: 5,
      botZ: 0,
      botHealth: 100,
      botMaxHealth: 100,
      botCurrentAction: 'none',
      botPunchCd: 0,
      botKickCd: 0,
      botDodgeCd: 0,
      botSpecialCd: 0,
      playerX: -3,
      playerZ: 0,
      playerHealth: 100,
      playerMaxHealth: 100,
      playerAction: 'none',
      playerGrounded: true,
    });
    assert.equal(approachCmd.state, 'approach');
    assert.ok(approachCmd.moveX < -0.5, `${diff} bot moves toward player`);

    // Stunned -> stun state & zero movement
    const stunCmd = bot.update({
      dt: 0.016,
      difficulty: diff,
      botX: 0,
      botZ: 0,
      botHealth: 80,
      botMaxHealth: 100,
      botCurrentAction: 'stun',
      botPunchCd: 0,
      botKickCd: 0,
      botDodgeCd: 0,
      botSpecialCd: 0,
      playerX: -2,
      playerZ: 0,
      playerHealth: 100,
      playerMaxHealth: 100,
      playerAction: 'none',
      playerGrounded: true,
    });
    assert.equal(stunCmd.state, 'stun');
    assert.equal(stunCmd.moveX, 0);
  }

  // 2D mode: approaching bot jumps over blocking obstacle cleanly
  const jumpBot = new BotAIController();
  jumpBot.reset();
  const jumpCmd = jumpBot.update({
    dt: 0.3,
    difficulty: 'medium',
    mode2D: true,
    botX: 4.5,
    botZ: 0,
    botGrounded: true,
    botHealth: 100,
    botMaxHealth: 100,
    botCurrentAction: 'none',
    botPunchCd: 0,
    botKickCd: 0,
    botDodgeCd: 0,
    botSpecialCd: 0,
    playerX: -4.0,
    playerZ: 0,
    playerHealth: 100,
    playerMaxHealth: 100,
    playerAction: 'none',
    playerGrounded: true,
    obstacles: [{ x: 3.4, z: 0, radius: 0.7 }],
  });
  assert.equal(jumpCmd.wantJump, true, '2D bot jumps over obstacle in its path');
});

// 5. Input Manager Buffering, Joystick & Touch Overrides
runTest('InputManager buffers, virtual joystick & touch overrides', () => {
  inputManager.clearAll();
  inputManager.triggerPunch();
  inputManager.triggerKick();
  inputManager.triggerJump();
  inputManager.triggerDodge();
  inputManager.triggerSpecial();

  assert.equal(inputManager.consumePunch(), true);
  assert.equal(inputManager.consumePunch(), false, 'Buffer must consume once');
  assert.equal(inputManager.consumeKick(), true);
  assert.equal(inputManager.consumeJump(), true);
  assert.equal(inputManager.consumeDodge(), true);
  assert.equal(inputManager.consumeSpecial(), true);

  inputManager.setJoystick(true, 0.9, 0);
  assert.equal(inputManager.state.joystickActive, true);
  assert.equal(inputManager.state.sprint, true, 'Rim push activates sprint');

  inputManager.setJoystick(true, 0, 0.85);
  assert.equal(inputManager.state.crouch, true, 'Downward joystick triggers crouch');

  inputManager.setTouchBlock(true);
  assert.equal(inputManager.state.block, true);

  inputManager.clearAll();
  assert.equal(inputManager.state.block, false);
  assert.equal(inputManager.state.crouch, false);
  assert.equal(inputManager.state.sprint, false);
  assert.equal(inputManager.state.magnitude, 0);
});

// 6. Persistent Storage Sanitization & Validation
runTest('Persistent settings & selection sanitization', () => {
  const cleanSettings = sanitizeSettings({
    volume: 99,
    sfxVolume: -5,
    cameraSensitivity: 10,
    difficulty: 'invalid' as 'medium',
    touchControlsMode: 'broken' as 'auto',
    soundEnabled: false,
  });
  assert.equal(cleanSettings.volume, 1);
  assert.equal(cleanSettings.sfxVolume, 0);
  assert.equal(cleanSettings.cameraSensitivity, 2);
  assert.equal(cleanSettings.difficulty, DEFAULT_SETTINGS.difficulty);
  assert.equal(cleanSettings.touchControlsMode, DEFAULT_SETTINGS.touchControlsMode);
  assert.equal(cleanSettings.soundEnabled, false);

  const cleanSel = sanitizeSelections({
    arenaId: 'fake-arena' as 'wrestling',
    playerCharacterId: 'guest-slot-alpha', // locked guest should fall back to playable
    botCharacterId: 'noodle-sensei',
  });
  assert.equal(cleanSel.arenaId, DEFAULT_SELECTIONS.arenaId);
  assert.equal(cleanSel.playerCharacterId, DEFAULT_SELECTIONS.playerCharacterId);
  assert.equal(cleanSel.botCharacterId, 'noodle-sensei');
});

// 7. Dynamic Health-Reactive Arena Lighting
runTest('Dynamic arena lighting escalates intensity, color & pulse with fighter health', () => {
  const calm = computeArenaLightingState({
    playerHealthPct: 1,
    botHealthPct: 1,
    arenaTime: 1.0,
    arenaAccentColor: '#38bdf8',
    arenaRimColor: '#f43f5e',
  });
  const heated = computeArenaLightingState({
    playerHealthPct: 0.55,
    botHealthPct: 0.72,
    arenaTime: 1.0,
    arenaAccentColor: '#38bdf8',
    arenaRimColor: '#f43f5e',
  });
  const criticalPlayer = computeArenaLightingState({
    playerHealthPct: 0.22,
    botHealthPct: 0.8,
    arenaTime: 1.0,
    arenaAccentColor: '#38bdf8',
    arenaRimColor: '#f43f5e',
  });
  const climax = computeArenaLightingState({
    playerHealthPct: 0.18,
    botHealthPct: 0.15,
    arenaTime: 1.0,
    arenaAccentColor: '#38bdf8',
    arenaRimColor: '#f43f5e',
  });

  assert.equal(calm.tier, 'calm');
  assert.equal(heated.tier, 'heated');
  assert.equal(criticalPlayer.tier, 'critical');
  assert.equal(climax.tier, 'climax');

  assert.ok(calm.intensity < heated.intensity, 'Heated fight increases lighting intensity');
  assert.ok(heated.intensity < criticalPlayer.intensity, 'Critical health increases lighting intensity');
  assert.ok(criticalPlayer.intensity < climax.intensity, 'Double-critical climax peaks intensity');

  assert.ok(calm.pulseSpeed < heated.pulseSpeed && heated.pulseSpeed < criticalPlayer.pulseSpeed);
  assert.ok(criticalPlayer.pulseSpeed < climax.pulseSpeed, 'Pulse cadence accelerates toward climax');

  assert.ok(criticalPlayer.playerDanger > 0.5 && criticalPlayer.botDanger === 0);
  assert.notEqual(calm.horizonColor, criticalPlayer.horizonColor, 'Horizon light shifts color with low health');
});

// 8. Player Character Animations, Left/Right Facing, Collision Symmetry & Canvas State Hygiene
runTest('Player animations (idle/run/jump/land/attack/stun/victory), facing & collision', () => {
  const playerChar = getCharacterById('carryminati');
  const botChar = getCharacterById('salman-khan');
  const punchSpec = getCharacterAttackSpec('punch', playerChar);

  // Symmetric left-facing (-PI/2) and right-facing (+PI/2) attack hits
  const hitRight = evaluateAttackCollision(
    0,
    0,
    0,
    Math.PI / 2,
    punchSpec,
    { x: 1.25, y: 0, z: 0, radius: HURTBOX_RADIUS, height: HURTBOX_HEIGHT },
    'none',
    0,
    false,
    playerChar.stats.powerMultiplier,
    botChar.stats.defenseMultiplier,
  );
  const hitLeft = evaluateAttackCollision(
    0,
    0,
    0,
    -Math.PI / 2,
    punchSpec,
    { x: -1.25, y: 0, z: 0, radius: HURTBOX_RADIUS, height: HURTBOX_HEIGHT },
    'none',
    0,
    false,
    playerChar.stats.powerMultiplier,
    botChar.stats.defenseMultiplier,
  );
  assert.ok(hitRight && hitRight.connected && hitRight.dirX > 0, 'Right-facing attack connects');
  assert.ok(hitLeft && hitLeft.connected && hitLeft.dirX < 0, 'Left-facing attack connects');
  assert.equal(hitRight.damage, hitLeft.damage, 'Left and right attack damage must be symmetric');

  // Verify drawHumanFighter2D executes cleanly across all states & both directions with balanced save/restore and no leaked composite mode
  const createMockCtx = () => {
    let depth = 0;
    const ops: string[] = ['source-over'];
    const grad = { addColorStop: () => {} };
    const ctx = {
      globalAlpha: 1,
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      shadowColor: 'transparent',
      shadowBlur: 0,
      get globalCompositeOperation() {
        return ops[ops.length - 1];
      },
      set globalCompositeOperation(val: string) {
        ops[ops.length - 1] = val;
      },
      save() {
        depth += 1;
        ops.push(ops[ops.length - 1]);
      },
      restore() {
        depth -= 1;
        assert.ok(depth >= 0, 'ctx.restore() called without matching ctx.save()');
        ops.pop();
      },
      translate(x: number, y: number) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y), 'translate must receive finite coords');
      },
      scale(x: number, y: number) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y), 'scale must receive finite values');
      },
      rotate(r: number) {
        assert.ok(Number.isFinite(r), 'rotate must receive finite angle');
      },
      beginPath() {},
      closePath() {},
      moveTo(x: number, y: number) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y));
      },
      lineTo(x: number, y: number) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y));
      },
      quadraticCurveTo() {},
      bezierCurveTo() {},
      arc() {},
      ellipse(x: number, y: number, rx: number, ry: number) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y) && rx >= 0 && ry >= 0);
      },
      rect() {},
      roundRect() {},
      fillRect() {},
      strokeRect() {},
      fill() {},
      stroke() {},
      clip() {},
      createLinearGradient: () => grad,
      createRadialGradient: () => grad,
      getDepth: () => depth,
    };
    return ctx;
  };

  const baseMotion: FighterMotionData = {
    locomotion: 'idle',
    action: 'none',
    actionProgress: 0,
    comboStep: 0,
    speedRatio: 0,
    verticalVelocity: 0,
    grounded: true,
    isCrouching: false,
    facing: 1,
    landingSquash: 0,
    hitWobble: 0,
    stunTime: 0,
  };

  const states: FighterMotionData[] = [
    { ...baseMotion, locomotion: 'idle' },
    { ...baseMotion, locomotion: 'walk', speedRatio: 0.5 },
    { ...baseMotion, locomotion: 'run', speedRatio: 1 },
    { ...baseMotion, locomotion: 'jump', grounded: false, verticalVelocity: 6 },
    { ...baseMotion, locomotion: 'idle', grounded: true, landingSquash: 0.9 },
    { ...baseMotion, isCrouching: true },
    { ...baseMotion, action: 'punch', actionProgress: 0.45, comboStep: 0 },
    { ...baseMotion, action: 'punch', actionProgress: 0.45, comboStep: 1 },
    { ...baseMotion, action: 'kick', actionProgress: 0.5 },
    { ...baseMotion, action: 'special', actionProgress: 0.55 },
    { ...baseMotion, action: 'block', hitWobble: 0.7 },
    { ...baseMotion, action: 'dodge', actionProgress: 0.4 },
    { ...baseMotion, action: 'stun', hitWobble: 0.9, stunTime: 0.3 },
    { ...baseMotion, action: 'victory', actionProgress: 0.85 },
    { ...baseMotion, action: 'defeat', actionProgress: 0.85 },
  ];

  for (const facing of [1, -1] as const) {
    for (const mo of states) {
      const mockCtx = createMockCtx();
      drawHumanFighter2D(mockCtx as unknown as CanvasRenderingContext2D, {
        xPx: 320,
        yPx: mo.grounded ? 420 : 310,
        groundYPx: 420,
        facing,
        character: playerChar,
        motion: { ...mo, facing },
        time: 1.25,
        isPlayer: true,
        showShadow: true,
        worldScale: 1,
      });
      assert.equal(mockCtx.getDepth(), 0, `Balanced canvas save/restore for ${mo.action}/${mo.locomotion}`);
      assert.equal(
        mockCtx.globalCompositeOperation,
        'source-over',
        `No leaked composite mode for ${mo.action}/${mo.locomotion}`,
      );
    }
  }
});

// 9. CarryMinati 2D Sprite Sheet Assets & Full Animation State Mapping
runTest('CarryMinati 2D sprite assets & animation state machine (all 11 move sets)', () => {
  const carry = getCharacterById('carryminati');
  assert.equal(carry.spriteCharacterId, 'carryminati');
  assert.equal(carry.portraitUrl, '/assets/characters/carryminati/portrait.png');

  const sheet = getSpriteCharacterSheet(carry.spriteCharacterId);
  assert.ok(sheet && sheet === CARRYMINATI_SPRITE_SHEET);

  // Verify portrait + all 33 extracted transparent sprite frames exist on disk
  const portraitDiskPath = path.resolve(
    process.cwd(),
    'public',
    carry.portraitUrl.replace(/^\//, ''),
  );
  assert.ok(existsSync(portraitDiskPath), 'CarryMinati transparent portrait.png exists');

  const frameEntries = Object.entries(sheet.frames);
  assert.equal(frameEntries.length, 33, 'Expected 33 CarryMinati combat/locomotion sprite frames');
  for (const [key, spec] of frameEntries) {
    const diskPath = path.resolve(process.cwd(), 'public', spec.url.replace(/^\//, ''));
    assert.ok(existsSync(diskPath), `CarryMinati frame ${key} exists at ${diskPath}`);
    assert.ok(spec.w > 20 && spec.h > 40, `CarryMinati frame ${key} has valid dimensions`);
    assert.ok(spec.anchorX > 0 && spec.anchorX < 1 && spec.footY > 0.9 && spec.footY <= 1);
  }

  const base: FighterMotionData = {
    locomotion: 'idle',
    action: 'none',
    actionProgress: 0,
    comboStep: 0,
    speedRatio: 0,
    verticalVelocity: 0,
    grounded: true,
    isCrouching: false,
    facing: 1,
    landingSquash: 0,
    hitWobble: 0,
    stunTime: 0,
  };

  assert.equal(selectSpriteFighterFrame(sheet, base, 0.0).frameKey, 'idle_0');
  assert.equal(selectSpriteFighterFrame(sheet, { ...base, locomotion: 'walk' }, 0.25).anim, 'walk');
  assert.equal(selectSpriteFighterFrame(sheet, { ...base, locomotion: 'run' }, 0.1).anim, 'run');
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, grounded: false, verticalVelocity: 6 }, 0.1).frameKey,
    'jump_1',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, grounded: false, verticalVelocity: 0 }, 0.1).frameKey,
    'jump_2',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, grounded: true, landingSquash: 0.7 }, 0.1).frameKey,
    'jump_3',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, isCrouching: true }, 0.1).frameKey,
    'jump_0',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, action: 'punch', actionProgress: 0.5 }, 0.1).frameKey,
    'punch_2',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, action: 'kick', actionProgress: 0.5 }, 0.1).frameKey,
    'kick_1',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, action: 'block' }, 0.1).anim,
    'block',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, action: 'stun' }, 0.1).anim,
    'hurt',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, action: 'special', actionProgress: 0.55 }, 0.1).frameKey,
    'special_0',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, action: 'victory', actionProgress: 0.8 }, 0.1).anim,
    'victory',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, action: 'defeat', actionProgress: 0.2 }, 0.1).frameKey,
    'defeat_0',
  );
  assert.equal(
    selectSpriteFighterFrame(sheet, { ...base, action: 'defeat', actionProgress: 0.8 }, 0.1).frameKey,
    'defeat_1',
  );
});

console.log(`\nALL ${passed} GAME SYSTEM TESTS PASSED`);
