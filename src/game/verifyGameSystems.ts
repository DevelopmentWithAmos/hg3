import assert from 'node:assert/strict';
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
  const playableNames = new Set(playable.map((c) => c.name));
  for (const name of expectedFeaturedNames) {
    assert.ok(playableNames.has(name), `Expected character "${name}" in playable roster`);
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

console.log(`\nALL ${passed} GAME SYSTEM TESTS PASSED`);
