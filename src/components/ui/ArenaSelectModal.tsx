import React, { useMemo } from 'react';
import {
  X,
  Check,
  MapPin,
  Zap,
  Boxes,
  Sparkles,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { ArenaId } from '../../types/game';
import { getAllArenas, getArenaById } from '../../game/arenas';
import { soundEngine } from '../../utils/audio';

interface ArenaSelectModalProps {
  selectedArenaId: ArenaId;
  onSelectArena: (arenaId: ArenaId) => void;
  onClose: () => void;
  onStartPlay: () => void;
}

export const ArenaSelectModal: React.FC<ArenaSelectModalProps> = ({
  selectedArenaId,
  onSelectArena,
  onClose,
  onStartPlay,
}) => {
  const arenas = useMemo(() => getAllArenas(), []);
  const selectedArena = useMemo(
    () => getArenaById(selectedArenaId),
    [selectedArenaId],
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-2xl bg-slate-900 border-2 border-amber-400/80 p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-arcade text-xl sm:text-2xl text-amber-300 tracking-wide">
              ARENA SELECT · 8 STAGES
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pick a 2D battle stage — selecting updates the live background arena immediately
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Close arena select"
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8 Arena Cards Grid (2 tidy rows of 4 on desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {arenas.map((arena) => {
            const isSelected = arena.id === selectedArenaId;
            return (
              <button
                key={arena.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onSelectArena(arena.id);
                }}
                onMouseEnter={() => soundEngine.playUiHover()}
                className={`relative text-left rounded-xl p-2.5 border-2 transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-slate-800/95 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.22)] -translate-y-0.5'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                }`}
              >
                {/* Stage Preview Thumbnail */}
                <div
                  className="relative h-16 w-full rounded-lg overflow-hidden border border-white/10"
                  style={{
                    background: `linear-gradient(120deg, ${arena.skyColor}, ${arena.accentColor}44)`,
                  }}
                >
                  {arena.backdropUrl && (
                    <img
                      src={arena.backdropUrl}
                      alt={arena.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div>
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-arcade tracking-wider ${arena.badgeColor}`}
                  >
                    {arena.subtitle}
                  </span>
                  <h3 className="font-arcade text-sm sm:text-base text-white mt-1 leading-tight truncate">
                    {arena.name}
                  </h3>
                </div>

                <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                  {arena.tagline}
                </p>

                <div className="mt-auto pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-400 tabular-nums">
                  <span>{arena.hazards.length} HAZARDS</span>
                  <span>{arena.obstacles.length} PROPS</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Arena Inspector */}
        <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/20 shrink-0"
                style={{ backgroundColor: `${selectedArena.accentColor}22` }}
              >
                <MapPin
                  className="w-6 h-6"
                  style={{ color: selectedArena.accentColor }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-arcade text-xl text-white">
                    {selectedArena.name}
                  </h3>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-arcade ${selectedArena.badgeColor}`}
                  >
                    {selectedArena.subtitle}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedArena.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-arcade text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                ARENA HAZARDS &amp; TRAPS
              </div>
              <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
                {selectedArena.hazardSummary.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-arcade text-sky-300">
                <Boxes className="w-4 h-4 text-sky-400" />
                INTERACTIVE PROPS
              </div>
              <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
                {selectedArena.propSummary.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-arcade text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                ATMOSPHERE &amp; VFX
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedArena.vfxSummary}
              </p>
              <div className="mt-auto pt-2 text-[11px] font-bold text-slate-400">
                STAGE WIDTH: {(selectedArena.playableRadius * 2).toFixed(1)}m · HIT PROPS TO SMASH!
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 px-5 py-2.5 font-arcade text-sm text-white cursor-pointer"
          >
            DONE &amp; BACK
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onStartPlay();
            }}
            className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-2.5 font-arcade text-base text-slate-950 shadow-[0_4px_0_#b45309] active:translate-y-0.5 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            FIGHT IN {selectedArena.name}
          </button>
        </div>
      </div>
    </div>
  );
};
