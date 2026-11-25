import React, { useState } from 'react';
import { Pause, Volume2, VolumeX } from 'lucide-react';
import {
  ActionCooldownStatus,
  BotAIState,
  BotDifficulty,
  CombatCallout,
  FighterHUDData,
} from '../../types/game';
import { soundEngine } from '../../utils/audio';
import { getCharacterById } from '../../game/characters';
import { HumanPortrait2D } from '../game2d/HumanPortrait2D';

interface GameHUDProps {
  player: FighterHUDData;
  opponent: FighterHUDData;
  arenaName: string;
  timeRemaining: number;
  status: ActionCooldownStatus;
  difficulty: BotDifficulty;
  botState: BotAIState;
  callout: CombatCallout | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPause: () => void;
}

const PortraitAvatar: React.FC<{
  characterId?: string;
  url?: string;
  name: string;
  borderColor: string;
}> = ({ characterId, url, name, borderColor }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-900 flex items-center justify-center shadow-md"
      style={{ borderColor }}
    >
      {characterId ? (
        <HumanPortrait2D character={getCharacterById(characterId)} />
      ) : url && !failed ? (
        <img
          src={url}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <span className="font-arcade text-xs text-white">
          {name.slice(0, 2)}
        </span>
      )}
    </div>
  );
};

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  opponent,
  arenaName,
  timeRemaining,
  status,
  difficulty,
  botState,
  callout,
  soundEnabled,
  onToggleSound,
  onPause,
}) => {
  const playerPct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  const oppPct = Math.max(0, Math.min(100, (opponent.health / opponent.maxHealth) * 100));

  const formatTimer = (sec: number) => {
    const clamped = Math.max(0, Math.ceil(sec));
    return String(clamped).padStart(2, '0');
  };

  const getStanceBadge = () => {
    if (status.isStunned || status.activeAction === 'stun') {
      return { label: 'STUNNED!', color: 'text-amber-400' };
    }
    if (status.activeAction === 'special') {
      return { label: `${player.specialName}!`, color: 'text-amber-300' };
    }
    if (status.activeAction === 'punch') return { label: 'PUNCH!', color: 'text-sky-300' };
    if (status.activeAction === 'kick') return { label: 'KICK!', color: 'text-rose-300' };
    if (status.activeAction === 'dodge') return { label: 'DODGE!', color: 'text-purple-300' };
    if (status.activeAction === 'block') return { label: 'BLOCKING', color: 'text-cyan-300' };
    if (status.isCrouching) return { label: 'CROUCHING', color: 'text-emerald-300' };
    if (status.locomotion === 'jump') return { label: 'AIRBORNE', color: 'text-emerald-300' };
    if (status.locomotion === 'run') return { label: 'RUNNING', color: 'text-amber-300' };
    if (status.locomotion === 'walk') return { label: 'WALKING', color: 'text-white' };
    return { label: 'READY', color: 'text-slate-200' };
  };

  const stance = getStanceBadge();

  const diffBadgeColor =
    difficulty === 'hard'
      ? 'text-rose-300 border-rose-500/60'
      : difficulty === 'medium'
        ? 'text-amber-300 border-amber-500/60'
        : 'text-emerald-300 border-emerald-500/60';

  const calloutStyle =
    callout?.tone === 'special'
      ? 'bg-amber-400 text-slate-950 border-white'
      : callout?.tone === 'hit'
        ? 'bg-rose-600 text-white border-amber-300'
        : callout?.tone === 'block'
          ? 'bg-cyan-500 text-slate-950 border-white'
          : callout?.tone === 'dodge'
            ? 'bg-purple-500 text-white border-purple-200'
            : 'bg-slate-900 text-amber-300 border-rose-400';

  const actionSlots = [
    {
      label: 'PUNCH',
      keyHint: 'J / Z',
      cooldown: status.punch,
      active: status.activeAction === 'punch',
      accent: 'border-sky-400',
      fill: 'bg-sky-400/35',
    },
    {
      label: 'KICK',
      keyHint: 'K / X',
      cooldown: status.kick,
      active: status.activeAction === 'kick',
      accent: 'border-rose-400',
      fill: 'bg-rose-400/35',
    },
    {
      label: 'SPECIAL',
      keyHint: 'R / H',
      cooldown: status.special,
      active: status.activeAction === 'special',
      accent: 'border-amber-400',
      fill: 'bg-amber-400/35',
    },
    {
      label: 'BLOCK',
      keyHint: 'L / C',
      cooldown: 0,
      active: status.isBlocking,
      accent: 'border-cyan-400',
      fill: 'bg-cyan-400/35',
    },
    {
      label: 'DODGE',
      keyHint: 'E / V',
      cooldown: status.dodge,
      active: status.activeAction === 'dodge',
      accent: 'border-purple-400',
      fill: 'bg-purple-400/35',
    },
    {
      label: 'JUMP',
      keyHint: 'SPACE / W',
      cooldown: status.isGrounded ? 0 : 1,
      active: !status.isGrounded,
      accent: 'border-emerald-400',
      fill: 'bg-emerald-400/35',
    },
  ];

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top 2D Fighting Header with Human Portraits */}
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
          {/* Player 1 Portrait + Health */}
          <div className="flex items-center gap-2.5">
            <PortraitAvatar
              characterId={player.characterId}
              url={player.portraitUrl}
              name={player.name}
              borderColor="#38bdf8"
            />
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-baseline justify-between px-1 gap-2">
                <span className="font-arcade text-xs sm:text-base text-white drop-shadow truncate">
                  {player.name}
                </span>
                <span className="font-arcade text-xs sm:text-sm text-sky-300 tabular-nums shrink-0">
                  {player.health}/{player.maxHealth}
                </span>
              </div>
              <div className="h-5 sm:h-6 w-full rounded-lg bg-slate-950/90 border-2 border-sky-400/70 p-0.5 shadow-lg overflow-hidden">
                <div className="relative w-full h-full">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-amber-300/70 transition-[width] duration-700"
                    style={{ width: `${playerPct}%` }}
                  />
                  <div
                    className="relative h-full rounded bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-300 transition-[width] duration-150"
                    style={{ width: `${playerPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center Match Timer */}
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center min-w-[56px] sm:min-w-[74px] h-11 sm:h-14 rounded-xl bg-slate-950/95 border-2 px-2.5 shadow-lg ${
                timeRemaining <= 10 ? 'border-rose-500' : 'border-amber-400'
              }`}
            >
              <span
                className={`font-arcade text-2xl sm:text-3xl tabular-nums leading-none ${
                  timeRemaining <= 10 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {formatTimer(timeRemaining)}
              </span>
            </div>
          </div>

          {/* Opponent Health + Portrait */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-baseline justify-between px-1 gap-2">
                <span className="font-arcade text-xs sm:text-sm text-rose-300 tabular-nums shrink-0">
                  {opponent.health}/{opponent.maxHealth}
                </span>
                <span className="font-arcade text-xs sm:text-base text-white drop-shadow truncate">
                  {opponent.name}
                </span>
              </div>
              <div className="h-5 sm:h-6 w-full rounded-lg bg-slate-950/90 border-2 border-rose-500/70 p-0.5 shadow-lg overflow-hidden">
                <div className="relative w-full h-full flex justify-end">
                  <div
                    className="absolute inset-y-0 right-0 rounded bg-amber-300/70 transition-[width] duration-700"
                    style={{ width: `${oppPct}%` }}
                  />
                  <div
                    className="relative h-full rounded bg-gradient-to-l from-red-600 via-rose-500 to-orange-400 transition-[width] duration-150"
                    style={{ width: `${oppPct}%` }}
                  />
                </div>
              </div>
            </div>
            <PortraitAvatar
              characterId={opponent.characterId}
              url={opponent.portraitUrl}
              name={opponent.name}
              borderColor="#fb7185"
            />
          </div>
        </div>

        {/* Sub-row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md bg-slate-950/85 border border-slate-800 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span className="text-sky-400">STANCE:</span>
              <span className={stance.color}>{stance.label}</span>
            </div>
            <div className="hidden lg:inline-flex items-center rounded-md bg-slate-950/85 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              {arenaName}
            </div>
          </div>

          {callout && (
            <div
              className={`rounded-md border px-3 py-0.5 font-arcade text-xs sm:text-sm tracking-wide shadow-md ${calloutStyle}`}
            >
              {callout.text}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-md bg-slate-950/85 border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${diffBadgeColor}`}
            >
              <span>BOT: {difficulty}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">{botState}</span>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onToggleSound();
                  soundEngine.playUiClick();
                }}
                aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
                title={soundEnabled ? 'Mute audio (M)' : 'Unmute audio (M)'}
                className="inline-flex items-center justify-center rounded-lg bg-slate-950/85 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 p-1.5 text-slate-200 shadow cursor-pointer active:scale-95 transition-transform"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-amber-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                )}
              </button>

              <button
                type="button"
                onClick={onPause}
                aria-label="Pause game"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-800 border-2 border-slate-600 hover:border-amber-400 px-3 py-1.5 text-xs sm:text-sm font-arcade text-white shadow cursor-pointer active:scale-95 transition-transform"
              >
                <Pause className="w-4 h-4 text-amber-400" />
                PAUSE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Desktop Action Cooldown & Controls Strip */}
      <div className="hidden md:flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {actionSlots.map((slot) => {
            const onCd = slot.cooldown > 0.02;
            const readyHighlight =
              slot.label === 'SPECIAL' && !onCd ? 'border-amber-400/90' : 'border-slate-700';
            return (
              <div
                key={slot.label}
                className={`relative overflow-hidden rounded-lg bg-slate-950/85 border px-3 py-1.5 min-w-[78px] text-center transition-transform ${
                  slot.active
                    ? `${slot.accent} scale-105`
                    : onCd
                      ? 'border-slate-700 opacity-75'
                      : readyHighlight
                }`}
              >
                {onCd && (
                  <div
                    className={`absolute inset-y-0 left-0 ${slot.fill}`}
                    style={{ width: `${Math.round(slot.cooldown * 100)}%` }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center leading-tight">
                  <span className="font-arcade text-[11px] text-white">
                    {slot.label}
                  </span>
                  <span className="text-[10px] font-bold text-amber-300">
                    {slot.keyHint}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg bg-slate-950/80 border border-slate-800 px-3.5 py-1 text-[11px] font-medium text-slate-300">
          A/D or ←/→ Move · Shift Run · W/↑/Space Jump · S/↓ Crouch · Esc Pause
        </div>
      </div>
    </div>
  );
};
