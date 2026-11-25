export type GameScreen = 'menu' | 'playing' | 'paused' | 'gameover';

export type ModalView = 'none' | 'characters' | 'arenas' | 'settings';

export type ArenaId =
  | 'wrestling'
  | 'street'
  | 'rooftop'
  | 'wedding'
  | 'cricket_stadium'
  | 'studio_set'
  | 'dhaba_highway'
  | 'parliament_hall';

export type ArenaObstacleKind =
  | 'crate'
  | 'hydrant'
  | 'cone'
  | 'ac_unit'
  | 'antenna'
  | 'cake'
  | 'table'
  | 'turnbuckle'
  | 'wickets'
  | 'podium';

export interface ArenaObstacleSpec {
  id: string;
  kind: ArenaObstacleKind;
  x: number;
  z: number;
  radius: number;
  height: number;
  breakable?: boolean;
  bouncy?: boolean;
  label: string;
}

export type ArenaHazardKind =
  | 'bounce_pad'
  | 'steam_geyser'
  | 'zapper'
  | 'slip'
  | 'confetti_cannon';

export interface ArenaHazardSpec {
  id: string;
  kind: ArenaHazardKind;
  x: number;
  z: number;
  radius: number;
  /** 0 = always active, >0 = periodic cycle in seconds */
  cyclePeriod: number;
  /** Fraction of cycle (0..1) when telegraph warning starts */
  warnStart: number;
  /** Fraction of cycle (0..1) when hazard erupts/activates */
  activeStart: number;
  /** Fraction of cycle (0..1) when hazard ends */
  activeEnd: number;
  phaseOffset: number;
  damage: number;
  launchY: number;
  knockback: number;
  stunDuration: number;
  calloutText: string;
  color: string;
}

export interface ArenaDefinition {
  id: ArenaId;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  backdropUrl?: string;
  badgeColor: string;
  accentColor: string;
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  hemiSky: string;
  hemiGround: string;
  keyColor: string;
  rimColor: string;
  playableRadius: number;
  hazardSummary: string[];
  propSummary: string[];
  vfxSummary: string;
  obstacles: ArenaObstacleSpec[];
  hazards: ArenaHazardSpec[];
}

export type LocomotionState = 'idle' | 'walk' | 'run' | 'jump';

export type FighterActionState =
  | 'none'
  | 'punch'
  | 'kick'
  | 'special'
  | 'block'
  | 'dodge'
  | 'stun'
  | 'victory'
  | 'defeat';

export type FighterVariant = 'player' | 'bot';

export type TouchControlsMode = 'auto' | 'on' | 'off';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export type BotAIState =
  | 'idle'
  | 'approach'
  | 'circle'
  | 'attack'
  | 'block'
  | 'dodge'
  | 'retreat'
  | 'stun';

export type MatchWinner = 'player' | 'bot' | 'draw' | null;

export type CharacterCategory = 'original' | 'licensed_guest';

export type AnimationStyle = 'brawler' | 'heavy' | 'martial' | 'bouncy';

export type SpecialAnimType = 'slam' | 'helicopter' | 'hurricane' | 'popup';

export type VictoryStyle =
  | 'boxer_shuffle_pump'
  | 'heavy_chest_flex'
  | 'martial_crane_bow'
  | 'parkour_backflip'
  | 'guest_salute';

export type DefeatStyle =
  | 'dizzy_faceplant'
  | 'timber_topple'
  | 'dramatic_slump'
  | 'crispy_splat'
  | 'guest_kneel';

export type HeadgearStyle =
  | 'headband_spikes'
  | 'propeller_cap'
  | 'bamboo_hat'
  | 'butter_toast'
  | 'guest_mystery';

export type OutfitStyle =
  | 'hero_suit'
  | 'knight_armor'
  | 'dojo_gi'
  | 'toaster_bot'
  | 'guest_silhouette';

export type HairStyle =
  | 'afro_curls'
  | 'swept_heavy'
  | 'topknot'
  | 'messy_waves'
  | 'spiky_dark'
  | 'bald_clean'
  | 'classic_bun'
  | 'mystery';

export type FacialHairStyle = 'stubble' | 'full_beard' | 'goatee' | 'mustache' | 'none';

export interface FighterPalette {
  suitPrimary: string;
  suitSecondary: string;
  shorts: string;
  glove: string;
  gloveCuff: string;
  belt: string;
  buckle: string;
  shoe: string;
  skin: string;
  cheek: string;
  iris: string;
  hair: string;
  accent: string;
}

export interface FighterStats {
  maxHealth: number;
  speedMultiplier: number;
  powerMultiplier: number;
  defenseMultiplier: number;
  jumpMultiplier: number;
  attackSpeedMultiplier: number;
  /** 1..100 display ratings for Character Select UI */
  displayPower: number;
  displaySpeed: number;
  displayDefense: number;
}

export interface SpecialAbilitySpec {
  name: string;
  description: string;
  animType: SpecialAnimType;
  shockwaveColor: string;
  calloutText: string;
  damage: number;
  cooldown: number;
  duration: number;
  activeStart: number;
  activeEnd: number;
  hitboxRadius: number;
  knockback: number;
  stunDuration: number;
}

export interface GuestLicenseMetadata {
  franchise: string;
  licensor: string;
  contractStatus: 'slot_reserved' | 'licensed';
  releaseWindow: string;
  externalRigHook: string;
  notes: string;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  title: string;
  tagline: string;
  bio: string;
  portraitUrl?: string;
  category: CharacterCategory;
  unlocked: boolean;
  archetype: string;
  animationStyle: AnimationStyle;
  victoryStyle: VictoryStyle;
  defeatStyle: DefeatStyle;
  headgear: HeadgearStyle;
  outfitStyle: OutfitStyle;
  hairStyle: HairStyle;
  facialHair: FacialHairStyle;
  glasses?: boolean;
  mufflerColor?: string;
  rosterGroup?: 'creators' | 'politicians' | 'bollywood' | 'originals';
  bodyScale: [number, number, number];
  palette: FighterPalette;
  stats: FighterStats;
  special: SpecialAbilitySpec;
  guestMeta?: GuestLicenseMetadata;
}

export interface MatchStats {
  playerHitsLanded: number;
  botHitsLanded: number;
  playerBlocked: number;
  specialsUsed: number;
}

export interface CombatCallout {
  id: number;
  text: string;
  tone: 'info' | 'hit' | 'special' | 'block' | 'dodge';
}

export interface GameSettings {
  soundEnabled: boolean;
  volume: number; // Master volume 0 to 1
  sfxVolume: number; // SFX volume 0 to 1
  musicEnabled: boolean;
  musicVolume: number; // BGM volume 0 to 1
  shadowsEnabled: boolean; // Toggles stage floor shadows & spotlights in 2D
  cameraSensitivity: number; // 0.5 to 2.0 (2D dynamic camera shake & zoom response)
  touchControlsMode: TouchControlsMode;
  difficulty: BotDifficulty;
}

export interface FighterHUDData {
  characterId?: string;
  name: string;
  title: string;
  specialName: string;
  accentColor: string;
  portraitUrl?: string;
  health: number;
  maxHealth: number;
}

export interface ActionCooldownStatus {
  punch: number; // 0 = ready, 0..1 = remaining fraction
  kick: number;
  dodge: number;
  special: number;
  isBlocking: boolean;
  isCrouching?: boolean;
  isStunned: boolean;
  isGrounded: boolean;
  activeAction: FighterActionState;
  locomotion: LocomotionState;
}

export interface FighterMotionData {
  locomotion: LocomotionState;
  action: FighterActionState;
  actionProgress: number; // 0..1 within current punch/kick/special/dodge
  comboStep: number;
  speedRatio: number;
  verticalVelocity: number;
  grounded: boolean;
  isCrouching?: boolean;
  facing?: 1 | -1;
  landingSquash: number;
  hitWobble: number;
  stunTime: number; // remaining seconds of stun for dizzy stars
}

export interface InputState {
  moveX: number;
  moveZ: number;
  magnitude: number;
  sprint: boolean;
  block: boolean;
  crouch: boolean;
  jumpBufferUntil: number;
  punchBufferUntil: number;
  kickBufferUntil: number;
  dodgeBufferUntil: number;
  specialBufferUntil: number;
  joystickActive: boolean;
  joystickX: number;
  joystickY: number;
  cameraYawOffset: number;
}

export interface ArenaBounds {
  ringRadius: number;
  playableRadius: number;
}
