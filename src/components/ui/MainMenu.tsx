import React from 'react';
import {
  Play,
  Users,
  MapPin,
  Settings,
  Volume2,
  VolumeX,
  Cpu,
} from 'lucide-react';
import { BotDifficulty } from '../../types/game';
import { soundEngine } from '../../utils/audio';

interface MainMenuProps {
  soundEnabled: boolean;
  difficulty: BotDifficulty;
  selectedPlayerName: string;
  selectedArenaName: string;
  onChangeDifficulty: (difficulty: BotDifficulty) => void;
  onPlay: () => void;
  onOpenCharacters: () => void;
  onOpenArenas: () => void;
  onOpenSettings: () => void;
  onToggleSound: () => void;
}

const DIFFICULTY_OPTIONS: Array<{ id: BotDifficulty; label: string }> = [
  { id: 'easy', label: 'EASY' },
  { id: 'medium', label: 'MEDIUM' },
  { id: 'hard', label: 'HARD' },
];

export const MainMenu: React.FC<MainMenuProps> = ({
  soundEnabled,
  difficulty,
  selectedPlayerName,
  selectedArenaName,
  onChangeDifficulty,
  onPlay,
  onOpenCharacters,
  onOpenArenas,
  onOpenSettings,
  onToggleSound,
}) => {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar: Sound Toggle & Edition Tag */}
      <div className="flex items-start justify-between w-full">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-slate-950/85 border border-sky-400/40 px-3 py-1.5 shadow-lg">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
          <span className="font-arcade text-xs tracking-wider text-sky-300">
            SEASON 1 · {selectedArenaName}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            onToggleSound();
            soundEngine.playUiClick();
          }}
          onMouseEnter={() => soundEngine.playUiHover()}
          aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-700 hover:border-amber-400 px-3.5 py-2.5 text-sm font-bold text-slate-100 shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-5 h-5 text-amber-400" />
              <span className="hidden sm:inline">SOUND ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-5 h-5 text-rose-400" />
              <span className="hidden sm:inline">SOUND OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Left-Aligned Title Lockup & Action Stack */}
      <div className="my-auto max-w-md w-full flex flex-col gap-4 sm:gap-5">
        <div className="select-none drop-shadow-[0_6px_20px_rgba(0,0,0,0.85)]">
          <svg
            viewBox="0 0 460 155"
            className="w-full max-w-[400px] h-auto overflow-visible"
            role="img"
            aria-label="MEME FIGHT ARENA"
          >
            <defs>
              <linearGradient id="memeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="55%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>

            <polygon
              points="16,14 446,6 434,94 6,102"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="4"
            />
            <polygon
              points="115,96 365,92 355,144 105,148"
              fill="#e11d48"
              stroke="#fde047"
              strokeWidth="3.5"
            />

            <text
              x="226"
              y="70"
              textAnchor="middle"
              fontFamily="'Russo One', sans-serif"
              fontSize="54"
              fontWeight="900"
              fill="url(#memeGrad)"
              stroke="#020617"
              strokeWidth="6"
              paintOrder="stroke"
              letterSpacing="2"
            >
              MEME FIGHT
            </text>

            <text
              x="235"
              y="132"
              textAnchor="middle"
              fontFamily="'Russo One', sans-serif"
              fontSize="34"
              fontWeight="900"
              fill="#ffffff"
              stroke="#020617"
              strokeWidth="5"
              paintOrder="stroke"
              letterSpacing="6"
            >
              ARENA
            </text>
          </svg>
        </div>

        {/* Primary Menu Buttons */}
        <div className="pointer-events-auto flex flex-col gap-2.5 max-w-xs w-full">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onPlay();
            }}
            onMouseEnter={() => soundEngine.playUiHover()}
            className="group relative flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 px-6 py-3.5 text-slate-950 font-arcade text-xl shadow-[0_6px_0_#9a3412] active:translate-y-1 active:shadow-[0_2px_0_#9a3412] transition-all cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Play className="w-6 h-6 fill-slate-950" />
              PLAY FIGHT
            </span>
            <span className="rounded bg-slate-950/20 px-2 py-0.5 text-xs font-sans font-bold">
              ENTER
            </span>
          </button>

          {/* Quick AI Difficulty Selector */}
          <div className="rounded-xl bg-slate-950/90 border border-slate-700 p-2 flex flex-col gap-1.5 shadow-lg">
            <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-rose-400" />
              AI BOT DIFFICULTY
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onChangeDifficulty(opt.id);
                  }}
                  className={`py-1.5 rounded-lg font-arcade text-xs cursor-pointer transition-colors ${
                    difficulty === opt.id
                      ? opt.id === 'hard'
                        ? 'bg-rose-500 text-white'
                        : opt.id === 'medium'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenCharacters();
            }}
            onMouseEnter={() => soundEngine.playUiHover()}
            className="flex items-center justify-between rounded-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-sky-500/60 hover:border-sky-400 px-5 py-2.5 text-white font-arcade text-base shadow-[0_4px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Users className="w-5 h-5 text-sky-400" />
              CHARACTERS
            </span>
            <span className="rounded bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 text-[10px] font-sans font-bold text-sky-300 truncate max-w-[115px]">
              {selectedPlayerName}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenArenas();
            }}
            onMouseEnter={() => soundEngine.playUiHover()}
            className="flex items-center justify-between rounded-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-emerald-500/60 hover:border-emerald-400 px-5 py-2.5 text-white font-arcade text-base shadow-[0_4px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-emerald-400" />
              ARENA
            </span>
            <span className="rounded bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-sans font-bold text-emerald-300 truncate max-w-[125px]">
              {selectedArenaName}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenSettings();
            }}
            onMouseEnter={() => soundEngine.playUiHover()}
            className="flex items-center justify-between rounded-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-600 hover:border-slate-400 px-5 py-2.5 text-white font-arcade text-base shadow-[0_4px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-300" />
              SETTINGS
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="rounded-lg bg-slate-950/85 border border-slate-800 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-300 tracking-wide">
          A/D or ←/→ Move · Shift Run · W/↑/Space Jump · S/↓ Crouch · J/Z Punch · K/X Kick · R/H Special · L/C Block · E/V Dodge
        </div>
      </div>
    </div>
  );
};
