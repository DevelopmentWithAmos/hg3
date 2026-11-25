import { ArenaId, BotDifficulty, GameSettings, TouchControlsMode } from '../types/game';
import { getAllArenas } from '../game/arenas';
import { getDefaultOpponentFor, getPlayableCharacters } from '../game/characters';

const SETTINGS_STORAGE_KEY = 'meme_fight_arena_settings_v1';
const SELECTIONS_STORAGE_KEY = 'meme_fight_arena_selections_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  volume: 0.65,
  sfxVolume: 0.85,
  musicEnabled: true,
  musicVolume: 0.45,
  shadowsEnabled: true,
  cameraSensitivity: 1.0,
  touchControlsMode: 'auto',
  difficulty: 'medium',
};

export interface PersistedSelections {
  arenaId: ArenaId;
  playerCharacterId: string;
  botCharacterId: string;
}

export const DEFAULT_SELECTIONS: PersistedSelections = {
  arenaId: 'wrestling',
  playerCharacterId: 'carryminati',
  botCharacterId: 'ashish-chanchlani',
};

function clamp01(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function clampSensitivity(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0.5, Math.min(2.0, value));
}

function isValidDifficulty(v: unknown): v is BotDifficulty {
  return v === 'easy' || v === 'medium' || v === 'hard';
}

function isValidTouchMode(v: unknown): v is TouchControlsMode {
  return v === 'auto' || v === 'on' || v === 'off';
}

export function sanitizeSettings(raw: Partial<GameSettings> | null | undefined): GameSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }
  return {
    soundEnabled:
      typeof raw.soundEnabled === 'boolean'
        ? raw.soundEnabled
        : DEFAULT_SETTINGS.soundEnabled,
    volume: clamp01(raw.volume, DEFAULT_SETTINGS.volume),
    sfxVolume: clamp01(raw.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    musicEnabled:
      typeof raw.musicEnabled === 'boolean'
        ? raw.musicEnabled
        : DEFAULT_SETTINGS.musicEnabled,
    musicVolume: clamp01(raw.musicVolume, DEFAULT_SETTINGS.musicVolume),
    shadowsEnabled:
      typeof raw.shadowsEnabled === 'boolean'
        ? raw.shadowsEnabled
        : DEFAULT_SETTINGS.shadowsEnabled,
    cameraSensitivity: clampSensitivity(
      raw.cameraSensitivity,
      DEFAULT_SETTINGS.cameraSensitivity,
    ),
    touchControlsMode: isValidTouchMode(raw.touchControlsMode)
      ? raw.touchControlsMode
      : DEFAULT_SETTINGS.touchControlsMode,
    difficulty: isValidDifficulty(raw.difficulty)
      ? raw.difficulty
      : DEFAULT_SETTINGS.difficulty,
  };
}

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return sanitizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(sanitizeSettings(settings)),
    );
  } catch {
    // Ignore storage quota or sandboxed iframe restrictions gracefully
  }
}

export function sanitizeSelections(
  raw: Partial<PersistedSelections> | null | undefined,
): PersistedSelections {
  const validArenaIds = new Set(getAllArenas().map((a) => a.id));
  const playableIds = new Set(getPlayableCharacters().map((c) => c.id));

  const arenaId: ArenaId =
    raw?.arenaId && validArenaIds.has(raw.arenaId)
      ? raw.arenaId
      : DEFAULT_SELECTIONS.arenaId;

  const playerCharacterId =
    raw?.playerCharacterId && playableIds.has(raw.playerCharacterId)
      ? raw.playerCharacterId
      : DEFAULT_SELECTIONS.playerCharacterId;

  const botCharacterId =
    raw?.botCharacterId && playableIds.has(raw.botCharacterId)
      ? raw.botCharacterId
      : getDefaultOpponentFor(playerCharacterId);

  return { arenaId, playerCharacterId, botCharacterId };
}

export function loadSelections(): PersistedSelections {
  if (typeof window === 'undefined') return { ...DEFAULT_SELECTIONS };
  try {
    const raw = window.localStorage.getItem(SELECTIONS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SELECTIONS };
    const parsed = JSON.parse(raw) as Partial<PersistedSelections>;
    return sanitizeSelections(parsed);
  } catch {
    return { ...DEFAULT_SELECTIONS };
  }
}

export function saveSelections(selections: PersistedSelections): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SELECTIONS_STORAGE_KEY,
      JSON.stringify(sanitizeSelections(selections)),
    );
  } catch {
    // Ignore storage quota or sandboxed iframe restrictions gracefully
  }
}
