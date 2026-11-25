import React, { useState } from 'react';
import { RotateCcw, Home, Trophy, Skull, Scale, Eye, EyeOff } from 'lucide-react';
import { BotDifficulty, MatchStats, MatchWinner } from '../../types/game';
import { soundEngine } from '../../utils/audio';

interface MatchEndModalProps {
  winner: MatchWinner;
  playerName: string;
  botCharacterName: string;
  arenaName: string;
  playerHealth: number;
  botHealth: number;
  timeRemaining: number;
  stats: MatchStats;
  difficulty: BotDifficulty;
  onRematch: () => void;
  onExitToMenu: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  winner,
  playerName,
  botCharacterName,
  arenaName,
  playerHealth,
  botHealth,
  timeRemaining,
  stats,
  difficulty,
  onRematch,
  onExitToMenu,
}) => {
  const [inspectScene, setInspectScene] = useState(false);

  const isPlayerWin = winner === 'player';
  const isDraw = winner === 'draw';

  const title = isPlayerWin
    ? 'VICTORY!'
    : isDraw
      ? 'DRAW MATCH!'
      : 'DEFEAT!';

  const subtitle = isPlayerWin
    ? `${playerName} knocked out AI Bot (${botCharacterName}) at ${arenaName} on ${difficulty.toUpperCase()}!`
    : isDraw
      ? `Deadlock at ${arenaName} (${playerHealth} HP vs ${botHealth} HP)!`
      : `AI Bot (${botCharacterName} · ${difficulty.toUpperCase()}) won at ${arenaName}.`;

  if (inspectScene) {
    return (
      <div className="fixed inset-x-0 bottom-5 z-30 flex items-center justify-center gap-3 px-4 pointer-events-none">
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            setInspectScene(false);
          }}
          className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border-2 border-amber-400 px-5 py-2.5 font-arcade text-sm text-amber-300 shadow-xl cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          SHOW RESULTS
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onRematch();
          }}
          className="pointer-events-auto flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 font-arcade text-sm text-slate-950 shadow-xl cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          REMATCH
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        className={`relative w-full max-w-md rounded-2xl bg-slate-900 border-2 p-6 shadow-2xl flex flex-col gap-5 text-center ${
          isPlayerWin
            ? 'border-amber-400'
            : isDraw
              ? 'border-sky-400'
              : 'border-rose-500'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            setInspectScene(true);
          }}
          title="Hide results card to watch victory dance"
          className="absolute top-3.5 right-3.5 inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
        >
          <EyeOff className="w-3.5 h-3.5 text-amber-300" />
          WATCH DANCE
        </button>
        <div className="flex flex-col items-center gap-2 border-b border-slate-800 pb-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
              isPlayerWin
                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                : isDraw
                  ? 'bg-sky-400/20 border-sky-400 text-sky-300'
                  : 'bg-rose-500/20 border-rose-500 text-rose-400'
            }`}
          >
            {isPlayerWin ? (
              <Trophy className="w-8 h-8" />
            ) : isDraw ? (
              <Scale className="w-8 h-8" />
            ) : (
              <Skull className="w-8 h-8" />
            )}
          </div>
          <h2
            className={`font-arcade text-3xl tracking-wide ${
              isPlayerWin
                ? 'text-amber-300'
                : isDraw
                  ? 'text-sky-300'
                  : 'text-rose-400'
            }`}
          >
            {title}
          </h2>
          <p className="text-xs text-slate-300">{subtitle}</p>
        </div>

        {/* Health Comparison */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-950/75 border border-slate-800 p-3">
          <div>
            <div className="text-[10px] font-bold text-sky-400 uppercase truncate">
              {playerName}
            </div>
            <div className="font-arcade text-xl text-white tabular-nums">
              {playerHealth} HP
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-rose-400 uppercase truncate">
              AI BOT · {botCharacterName}
            </div>
            <div className="font-arcade text-xl text-white tabular-nums">
              {botHealth} HP
            </div>
          </div>
        </div>

        {/* Combat Match Summary */}
        <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-950/55 border border-slate-800/80 p-2.5 text-center">
          <div>
            <div className="text-[10px] text-slate-400">HITS</div>
            <div className="font-arcade text-sm text-sky-300 tabular-nums">
              {stats.playerHitsLanded}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">BLOCKS</div>
            <div className="font-arcade text-sm text-cyan-300 tabular-nums">
              {stats.playerBlocked}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">SPECIALS</div>
            <div className="font-arcade text-sm text-amber-300 tabular-nums">
              {stats.specialsUsed}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">TIME LEFT</div>
            <div className="font-arcade text-sm text-white tabular-nums">
              {Math.max(0, Math.ceil(timeRemaining))}s
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onRematch();
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-arcade text-lg py-3 shadow-[0_4px_0_#b45309] active:translate-y-0.5 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            REMATCH
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onExitToMenu();
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-arcade text-base py-2.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
};
