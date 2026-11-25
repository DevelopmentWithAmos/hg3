import React from 'react';
import { Play, RotateCcw, Settings, Home, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface PauseModalProps {
  soundEnabled: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onToggleSound: () => void;
  onExitToMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  soundEnabled,
  onResume,
  onRestart,
  onOpenSettings,
  onToggleSound,
  onExitToMenu,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border-2 border-amber-400/70 p-6 shadow-2xl flex flex-col gap-4">
        <div className="text-center border-b border-slate-800 pb-3">
          <h2 className="font-arcade text-3xl text-amber-300 tracking-wide">
            PAUSED
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catch your breath, fighter!
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onResume();
            }}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-arcade text-lg py-3 shadow-[0_4px_0_#b45309] active:translate-y-0.5 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            RESUME FIGHT
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onRestart();
            }}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-arcade text-base py-2.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            RESET POSITIONS
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleSound();
              soundEngine.playUiClick();
            }}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-arcade text-base py-2.5 cursor-pointer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                SOUND: ON
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                SOUND: OFF
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenSettings();
            }}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-arcade text-base py-2.5 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            SETTINGS
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onExitToMenu();
            }}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 font-arcade text-base py-2.5 mt-1 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
};
