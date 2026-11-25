/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionCooldownStatus,
  ArenaId,
  BotAIState,
  BotDifficulty,
  CombatCallout,
  FighterHUDData,
  GameScreen,
  GameSettings,
  MatchStats,
  MatchWinner,
  ModalView,
} from './types/game';
import { getArenaById } from './game/arenas';
import { getCharacterById } from './game/characters';
import { inputManager } from './game/inputManager';
import { soundEngine } from './utils/audio';
import {
  DEFAULT_SETTINGS,
  loadSelections,
  loadSettings,
  saveSelections,
  saveSettings,
} from './utils/storage';
import { GameStage2D } from './components/game2d/GameStage2D';
import { MainMenu } from './components/ui/MainMenu';
import { GameHUD } from './components/ui/GameHUD';
import { PauseModal } from './components/ui/PauseModal';
import { SettingsModal } from './components/ui/SettingsModal';
import { CharacterSelectModal } from './components/ui/CharacterSelectModal';
import { ArenaSelectModal } from './components/ui/ArenaSelectModal';
import { MobileControls } from './components/ui/MobileControls';
import { MatchEndModal } from './components/ui/MatchEndModal';

const INITIAL_MATCH_TIME = 99;

const DEFAULT_COOLDOWN_STATUS: ActionCooldownStatus = {
  punch: 0,
  kick: 0,
  dodge: 0,
  special: 0,
  isBlocking: false,
  isStunned: false,
  isGrounded: true,
  activeAction: 'none',
  locomotion: 'idle',
};

const DEFAULT_STATS: MatchStats = {
  playerHitsLanded: 0,
  botHitsLanded: 0,
  playerBlocked: 0,
  specialsUsed: 0,
};

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [modal, setModal] = useState<ModalView>('none');
  const [matchSeed, setMatchSeed] = useState(1);

  const initialSelections = useMemo(() => loadSelections(), []);
  const [arenaId, setArenaId] = useState<ArenaId>(initialSelections.arenaId);
  const [playerCharacterId, setPlayerCharacterId] = useState(
    initialSelections.playerCharacterId,
  );
  const [botCharacterId, setBotCharacterId] = useState(
    initialSelections.botCharacterId,
  );

  const activeArena = useMemo(() => getArenaById(arenaId), [arenaId]);
  const playerChar = useMemo(
    () => getCharacterById(playerCharacterId),
    [playerCharacterId],
  );
  const botChar = useMemo(
    () => getCharacterById(botCharacterId),
    [botCharacterId],
  );

  const [timeRemaining, setTimeRemaining] = useState(INITIAL_MATCH_TIME);
  const [playerHealth, setPlayerHealth] = useState(playerChar.stats.maxHealth);
  const [botHealth, setBotHealth] = useState(botChar.stats.maxHealth);
  const [botState, setBotState] = useState<BotAIState>('idle');
  const [winner, setWinner] = useState<MatchWinner>(null);
  const [showResultCard, setShowResultCard] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats>(DEFAULT_STATS);
  const [callout, setCallout] = useState<CombatCallout | null>(null);
  const calloutTimerRef = useRef<number | null>(null);

  const [actionStatus, setActionStatus] = useState<ActionCooldownStatus>(
    DEFAULT_COOLDOWN_STATUS,
  );

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveSelections({ arenaId, playerCharacterId, botCharacterId });
  }, [arenaId, playerCharacterId, botCharacterId]);

  useEffect(() => {
    const cleanup = inputManager.init();
    return cleanup;
  }, []);

  useEffect(() => {
    const unlockOnce = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', unlockOnce, { once: true });
    window.addEventListener('keydown', unlockOnce, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
  }, []);

  useEffect(() => {
    inputManager.setGameplayActive(screen === 'playing' && modal === 'none');
  }, [screen, modal]);

  useEffect(() => {
    soundEngine.setEnabled(settings.soundEnabled);
    soundEngine.setVolume(settings.volume);
    soundEngine.setSfxVolume(settings.sfxVolume);
    soundEngine.setMusicEnabled(settings.musicEnabled);
    soundEngine.setMusicVolume(settings.musicVolume);
  }, [
    settings.soundEnabled,
    settings.volume,
    settings.sfxVolume,
    settings.musicEnabled,
    settings.musicVolume,
  ]);

  useEffect(() => {
    soundEngine.setMusicDucked(screen === 'paused');
    if (screen === 'menu') {
      soundEngine.setMusicState('menu', arenaId);
    } else if (screen === 'playing' || screen === 'paused') {
      soundEngine.setMusicState('battle', arenaId);
    } else if (screen === 'gameover') {
      soundEngine.setMusicState('victory', arenaId);
    }
  }, [screen, arenaId]);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const handleDifficultyChange = useCallback((difficulty: BotDifficulty) => {
    setSettings((prev) => ({ ...prev, difficulty }));
  }, []);

  const handleCallout = useCallback((nextCallout: CombatCallout) => {
    setCallout(nextCallout);
    if (calloutTimerRef.current !== null) {
      window.clearTimeout(calloutTimerRef.current);
    }
    calloutTimerRef.current = window.setTimeout(() => {
      setCallout(null);
    }, 950);
  }, []);

  useEffect(() => {
    return () => {
      if (calloutTimerRef.current !== null) {
        window.clearTimeout(calloutTimerRef.current);
      }
    };
  }, []);

  const startFight = useCallback(() => {
    soundEngine.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    inputManager.clearAll();
    setModal('none');
    setWinner(null);
    setCallout(null);
    setPlayerHealth(playerChar.stats.maxHealth);
    setBotHealth(botChar.stats.maxHealth);
    setBotState('idle');
    setMatchStats(DEFAULT_STATS);
    setTimeRemaining(INITIAL_MATCH_TIME);
    setActionStatus(DEFAULT_COOLDOWN_STATUS);
    setMatchSeed((s) => s + 1);
    setScreen('playing');
    soundEngine.playMatchStartBell();
  }, [playerChar.stats.maxHealth, botChar.stats.maxHealth]);

  const pauseFight = useCallback(() => {
    inputManager.clearAll();
    setScreen('paused');
    soundEngine.playPauseToggle(true);
  }, []);

  const resumeFight = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    inputManager.clearAll();
    setModal('none');
    setScreen('playing');
    soundEngine.playPauseToggle(false);
  }, []);

  const exitToMenu = useCallback(() => {
    inputManager.clearAll();
    setModal('none');
    setWinner(null);
    setCallout(null);
    setPlayerHealth(playerChar.stats.maxHealth);
    setBotHealth(botChar.stats.maxHealth);
    setBotState('idle');
    setMatchStats(DEFAULT_STATS);
    setMatchSeed((s) => s + 1);
    setScreen('menu');
  }, [playerChar.stats.maxHealth, botChar.stats.maxHealth]);

  const toggleSound = useCallback(() => {
    soundEngine.unlock();
    setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const handleHealthUpdate = useCallback((pHp: number, bHp: number) => {
    setPlayerHealth(pHp);
    setBotHealth(bHp);
  }, []);

  const handleMatchEnd = useCallback((matchWinner: MatchWinner) => {
    inputManager.clearAll();
    setShowResultCard(false);
    setWinner(matchWinner);
    setScreen('gameover');
  }, []);

  useEffect(() => {
    if (screen !== 'gameover') {
      setShowResultCard(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowResultCard(true);
    }, 2150);
    return () => window.clearTimeout(timer);
  }, [screen, matchSeed]);

  useEffect(() => {
    if (screen !== 'playing') return;
    const interval = window.setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    if (screen === 'playing' && timeRemaining === 0 && winner === null) {
      const playerRatio = playerHealth / Math.max(1, playerChar.stats.maxHealth);
      const botRatio = botHealth / Math.max(1, botChar.stats.maxHealth);
      const timeWinner: MatchWinner =
        playerRatio > botRatio
          ? 'player'
          : botRatio > playerRatio
            ? 'bot'
            : 'draw';
      soundEngine.playKO();
      handleMatchEnd(timeWinner);
    }
  }, [
    screen,
    timeRemaining,
    winner,
    playerHealth,
    botHealth,
    playerChar.stats.maxHealth,
    botChar.stats.maxHealth,
    handleMatchEnd,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'KeyM') {
        setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
        return;
      }

      if (modal !== 'none') {
        if (e.code === 'Escape') {
          soundEngine.playUiClick();
          setModal('none');
        }
        return;
      }

      if (screen === 'menu') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startFight();
        }
      } else if (screen === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          pauseFight();
        }
      } else if (screen === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          resumeFight();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, modal, startFight, pauseFight, resumeFight]);

  const playerHUD: FighterHUDData = {
    characterId: playerChar.id,
    name: playerChar.name,
    title: playerChar.title,
    specialName: playerChar.special.name,
    accentColor: playerChar.palette.accent,
    portraitUrl: playerChar.portraitUrl,
    health: playerHealth,
    maxHealth: playerChar.stats.maxHealth,
  };

  const opponentHUD: FighterHUDData = {
    characterId: botChar.id,
    name: `AI BOT · ${botChar.name}`,
    title: botChar.title,
    specialName: botChar.special.name,
    accentColor: botChar.palette.accent,
    portraitUrl: botChar.portraitUrl,
    health: botHealth,
    maxHealth: botChar.stats.maxHealth,
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <GameStage2D
        screen={screen}
        winner={winner}
        settings={settings}
        matchSeed={matchSeed}
        arenaId={arenaId}
        playerCharacterId={playerCharacterId}
        botCharacterId={botCharacterId}
        pauseBackgroundRender={modal === 'characters'}
        onStatusUpdate={setActionStatus}
        onHealthUpdate={handleHealthUpdate}
        onBotStateUpdate={setBotState}
        onCallout={handleCallout}
        onStatsUpdate={setMatchStats}
        onMatchEnd={handleMatchEnd}
      />

      {screen === 'menu' && (
        <MainMenu
          soundEnabled={settings.soundEnabled}
          difficulty={settings.difficulty}
          selectedPlayerName={playerChar.name}
          selectedArenaName={activeArena.name}
          onChangeDifficulty={handleDifficultyChange}
          onPlay={startFight}
          onOpenCharacters={() => setModal('characters')}
          onOpenArenas={() => setModal('arenas')}
          onOpenSettings={() => setModal('settings')}
          onToggleSound={toggleSound}
        />
      )}

      {(screen === 'playing' || screen === 'paused' || screen === 'gameover') && (
        <GameHUD
          player={playerHUD}
          opponent={opponentHUD}
          arenaName={activeArena.name}
          timeRemaining={timeRemaining}
          status={actionStatus}
          difficulty={settings.difficulty}
          botState={botState}
          callout={callout}
          soundEnabled={settings.soundEnabled}
          onToggleSound={toggleSound}
          onPause={pauseFight}
        />
      )}

      {screen === 'playing' && modal === 'none' && (
        <MobileControls
          mode={settings.touchControlsMode}
          status={actionStatus}
        />
      )}

      {screen === 'paused' && modal === 'none' && (
        <PauseModal
          soundEnabled={settings.soundEnabled}
          onResume={resumeFight}
          onRestart={startFight}
          onOpenSettings={() => setModal('settings')}
          onToggleSound={toggleSound}
          onExitToMenu={exitToMenu}
        />
      )}

      {screen === 'gameover' && !showResultCard && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-30 flex flex-col items-center gap-2 px-4">
          <div
            className={`rounded-2xl border-2 bg-slate-950/90 px-6 py-2.5 text-center shadow-2xl ${
              winner === 'player'
                ? 'border-amber-400'
                : winner === 'draw'
                  ? 'border-sky-400'
                  : 'border-rose-500'
            }`}
          >
            <div
              className={`font-arcade text-2xl sm:text-3xl tracking-wider ${
                winner === 'player'
                  ? 'text-amber-300'
                  : winner === 'draw'
                    ? 'text-sky-300'
                    : 'text-rose-400'
              }`}
            >
              {winner === 'player'
                ? `K.O.! ${playerChar.name} WINS!`
                : winner === 'draw'
                  ? 'TIME OVER · DRAW!'
                  : `K.O.! ${botChar.name} WINS!`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setShowResultCard(true);
            }}
            className="pointer-events-auto rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-600 px-3 py-1 text-[11px] font-bold text-slate-200 cursor-pointer"
          >
            SHOW RESULTS
          </button>
        </div>
      )}

      {screen === 'gameover' && showResultCard && (
        <MatchEndModal
          winner={winner}
          playerName={playerChar.name}
          botCharacterName={botChar.name}
          arenaName={activeArena.name}
          playerHealth={playerHealth}
          botHealth={botHealth}
          timeRemaining={timeRemaining}
          stats={matchStats}
          difficulty={settings.difficulty}
          onRematch={startFight}
          onExitToMenu={exitToMenu}
        />
      )}

      {modal === 'characters' && (
        <CharacterSelectModal
          playerCharacterId={playerCharacterId}
          botCharacterId={botCharacterId}
          onSelectPlayerCharacter={setPlayerCharacterId}
          onSelectBotCharacter={setBotCharacterId}
          onClose={() => setModal('none')}
          onStartPlay={startFight}
        />
      )}

      {modal === 'arenas' && (
        <ArenaSelectModal
          selectedArenaId={arenaId}
          onSelectArena={setArenaId}
          onClose={() => setModal('none')}
          onStartPlay={startFight}
        />
      )}

      {modal === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdate={updateSettings}
          onResetDefaults={resetSettings}
          onClose={() => setModal('none')}
        />
      )}
    </main>
  );
}
