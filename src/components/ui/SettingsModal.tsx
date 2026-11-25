import React from 'react';
import { X, Volume2, VolumeX, Music, Smartphone, Sun, Cpu } from 'lucide-react';
import { BotDifficulty, GameSettings, TouchControlsMode } from '../../types/game';
import { soundEngine } from '../../utils/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (patch: Partial<GameSettings>) => void;
  onResetDefaults?: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdate,
  onResetDefaults,
  onClose,
}) => {
  const touchModes: Array<{ id: TouchControlsMode; label: string }> = [
    { id: 'auto', label: 'AUTO' },
    { id: 'on', label: 'ALWAYS ON' },
    { id: 'off', label: 'OFF' },
  ];

  const difficulties: Array<{
    id: BotDifficulty;
    label: string;
    hint: string;
  }> = [
    { id: 'easy', label: 'EASY', hint: 'Chill pacing & light defense' },
    { id: 'medium', label: 'MEDIUM', hint: 'Balanced spacing & reactions' },
    { id: 'hard', label: 'HARD', hint: 'Fast combos, blocks & dodges' },
  ];

  const activeDiff = difficulties.find((d) => d.id === settings.difficulty);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border-2 border-sky-400/60 p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-arcade text-2xl text-white tracking-wide">
            SETTINGS
          </h2>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Close settings"
            className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Bot Difficulty */}
        <div className="flex flex-col gap-2.5 rounded-xl bg-slate-950/70 border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-rose-400" />
              <span className="font-bold text-sm text-slate-100">
                AI Bot Difficulty
              </span>
            </div>
            <span className="text-[11px] font-bold text-rose-300">
              {activeDiff?.hint}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {difficulties.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onUpdate({ difficulty: d.id });
                }}
                className={`py-2 rounded-lg font-arcade text-xs cursor-pointer border transition-colors ${
                  settings.difficulty === d.id
                    ? d.id === 'hard'
                      ? 'bg-rose-500 text-white border-rose-300'
                      : d.id === 'medium'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-emerald-400 text-slate-950 border-emerald-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Master Audio, SFX & Background Music Settings */}
        <div className="flex flex-col gap-3 rounded-xl bg-slate-950/70 border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-amber-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-rose-400" />
              )}
              <span className="font-bold text-sm text-slate-100">
                Master Audio
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdate({ soundEnabled: !settings.soundEnabled });
                soundEngine.playUiClick();
              }}
              className={`px-3.5 py-1.5 rounded-lg font-arcade text-xs cursor-pointer transition-colors ${
                settings.soundEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              }`}
            >
              {settings.soundEnabled ? 'UNMUTED' : 'MUTED'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-20">Master</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              disabled={!settings.soundEnabled}
              onChange={(e) => onUpdate({ volume: Number(e.target.value) })}
              className="flex-1 accent-amber-400 cursor-pointer disabled:opacity-40"
            />
            <span className="text-xs font-bold text-slate-200 tabular-nums w-10 text-right">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-20">Sound FX</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              disabled={!settings.soundEnabled}
              onChange={(e) => onUpdate({ sfxVolume: Number(e.target.value) })}
              className="flex-1 accent-sky-400 cursor-pointer disabled:opacity-40"
            />
            <span className="text-xs font-bold text-slate-200 tabular-nums w-10 text-right">
              {Math.round(settings.sfxVolume * 100)}%
            </span>
          </div>

          <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Music className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-slate-100">
                Arena Music
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdate({ musicEnabled: !settings.musicEnabled });
              }}
              className={`px-3 py-1 rounded-lg font-arcade text-xs cursor-pointer transition-colors ${
                settings.musicEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {settings.musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-20">Music Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              disabled={!settings.soundEnabled || !settings.musicEnabled}
              onChange={(e) => onUpdate({ musicVolume: Number(e.target.value) })}
              className="flex-1 accent-emerald-400 cursor-pointer disabled:opacity-40"
            />
            <span className="text-xs font-bold text-slate-200 tabular-nums w-10 text-right">
              {Math.round(settings.musicVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Stage Visuals & Camera */}
        <div className="flex flex-col gap-3 rounded-xl bg-slate-950/70 border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sun className="w-5 h-5 text-sky-400" />
              <span className="font-bold text-sm text-slate-100">
                Stage FX &amp; Shadows
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdate({ shadowsEnabled: !settings.shadowsEnabled });
              }}
              className={`px-3.5 py-1.5 rounded-lg font-arcade text-xs cursor-pointer ${
                settings.shadowsEnabled
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {settings.shadowsEnabled ? 'HIGH' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-24">2D Cam &amp; Shake</span>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={settings.cameraSensitivity}
              onChange={(e) =>
                onUpdate({ cameraSensitivity: Number(e.target.value) })
              }
              className="flex-1 accent-sky-400 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-200 tabular-nums w-10 text-right">
              {settings.cameraSensitivity.toFixed(1)}x
            </span>
          </div>
        </div>

        {/* Mobile Touch Joystick Mode */}
        <div className="flex flex-col gap-2.5 rounded-xl bg-slate-950/70 border border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm text-slate-100">
              Virtual Joystick & Touch Controls
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {touchModes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onUpdate({ touchControlsMode: m.id });
                }}
                className={`py-2 rounded-lg font-arcade text-xs cursor-pointer border transition-colors ${
                  settings.touchControlsMode === m.id
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onResetDefaults && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onResetDefaults();
              }}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-arcade text-xs sm:text-sm px-4 py-3 cursor-pointer"
            >
              RESET
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-arcade text-base py-3 cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
