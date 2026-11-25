import React, { useEffect, useRef, useState } from 'react';
import {
  Zap,
  Shield,
  ArrowUp,
  Wind,
  Hand,
  Footprints,
  Flame,
} from 'lucide-react';
import { ActionCooldownStatus, TouchControlsMode } from '../../types/game';
import { inputManager } from '../../game/inputManager';
import { soundEngine } from '../../utils/audio';

interface MobileControlsProps {
  mode: TouchControlsMode;
  status: ActionCooldownStatus;
}

const JOYSTICK_RADIUS = 46;

export const MobileControls: React.FC<MobileControlsProps> = ({
  mode,
  status,
}) => {
  const [visible, setVisible] = useState(false);
  const [sprintHeld, setSprintHeld] = useState(false);
  const [blockHeld, setBlockHeld] = useState(false);
  const [rimSprint, setRimSprint] = useState(false);

  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const stickPointerRef = useRef<number | null>(null);
  const sprintPointerRef = useRef<number | null>(null);
  const blockPointerRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const computeVisibility = () => {
      if (mode === 'on') {
        setVisible(true);
        return;
      }
      if (mode === 'off') {
        setVisible(false);
        return;
      }
      const isTouch =
        'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
      const isNarrow = window.innerWidth < 900;
      setVisible(isTouch || isNarrow);
    };

    computeVisibility();
    window.addEventListener('resize', computeVisibility);
    return () => window.removeEventListener('resize', computeVisibility);
  }, [mode]);

  useEffect(() => {
    if (!visible) {
      stickPointerRef.current = null;
      sprintPointerRef.current = null;
      blockPointerRef.current = null;
      setSprintHeld(false);
      setBlockHeld(false);
      setRimSprint(false);
      inputManager.setJoystick(false, 0, 0);
      inputManager.setTouchSprint(false);
      inputManager.setTouchBlock(false);
    }
  }, [visible]);

  if (!visible) return null;

  const updateKnob = (clientX: number, clientY: number) => {
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${knobX}px, ${knobY}px, 0)`;
    }

    const normX = knobX / JOYSTICK_RADIUS;
    const normY = knobY / JOYSTICK_RADIUS;
    const mag = Math.hypot(normX, normY);
    setRimSprint(mag > 0.78);
    inputManager.setJoystick(true, normX, normY);
  };

  const resetStick = () => {
    stickPointerRef.current = null;
    setRimSprint(false);
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
    inputManager.setJoystick(false, 0, 0);
  };

  const handleStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    soundEngine.unlock();
    if (stickPointerRef.current !== null) return;
    stickPointerRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors in synthetic test environments
    }

    const rect = e.currentTarget.getBoundingClientRect();
    originRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateKnob(e.clientX, e.clientY);
  };

  const handleStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (stickPointerRef.current !== e.pointerId) return;
    updateKnob(e.clientX, e.clientY);
  };

  const handleStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (stickPointerRef.current !== e.pointerId) return;
    resetStick();
  };

  const releaseSprint = (pointerId?: number) => {
    if (pointerId !== undefined && sprintPointerRef.current !== pointerId) return;
    sprintPointerRef.current = null;
    setSprintHeld(false);
    inputManager.setTouchSprint(false);
  };

  const releaseBlock = (pointerId?: number) => {
    if (pointerId !== undefined && blockPointerRef.current !== pointerId) return;
    blockPointerRef.current = null;
    setBlockHeld(false);
    inputManager.setTouchBlock(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none flex items-end justify-between p-2.5 sm:p-5">
      {/* Left: Virtual Analog Joystick + Run Hold (stacked on narrow portrait screens) */}
      <div className="pointer-events-auto flex flex-col-reverse items-start sm:flex-row sm:items-end gap-2 touch-none select-none">
        <div
          ref={stickRef}
          onPointerDown={handleStickDown}
          onPointerMove={handleStickMove}
          onPointerUp={handleStickUp}
          onPointerCancel={handleStickUp}
          onLostPointerCapture={handleStickUp}
          className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-950/70 border-2 flex items-center justify-center shadow-xl transition-colors ${
            rimSprint ? 'border-amber-400' : 'border-sky-400/65'
          }`}
          aria-label="Virtual movement joystick"
        >
          <div
            className={`absolute inset-2.5 sm:inset-3 rounded-full border border-dashed pointer-events-none ${
              rimSprint ? 'border-amber-400/70' : 'border-sky-400/25'
            }`}
          />
          <div
            ref={knobRef}
            className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-white/85 shadow-lg pointer-events-none ${
              rimSprint
                ? 'bg-gradient-to-b from-amber-300 to-orange-500'
                : 'bg-gradient-to-b from-sky-400 to-blue-600'
            }`}
          />
        </div>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            soundEngine.unlock();
            sprintPointerRef.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore synthetic events
            }
            setSprintHeld(true);
            inputManager.setTouchSprint(true);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            releaseSprint(e.pointerId);
          }}
          onPointerCancel={(e) => releaseSprint(e.pointerId)}
          onLostPointerCapture={(e) => releaseSprint(e.pointerId)}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[9px] sm:text-[10px] shadow-lg transition-transform ${
            sprintHeld || rimSprint
              ? 'bg-amber-400 border-white text-slate-950 scale-95'
              : 'bg-slate-950/80 border-amber-400/75 text-amber-300'
          }`}
          aria-label="Hold to run"
        >
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          RUN
        </button>
      </div>

      {/* Right: Complete Arcade Action Cluster + Special */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5 sm:gap-2 touch-none select-none">
        {/* Top row: Special, Dodge, Jump */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              soundEngine.unlock();
              inputManager.triggerSpecial();
            }}
            className={`relative overflow-hidden w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[8px] sm:text-[9px] shadow-lg active:scale-95 transition-transform ${
              status.activeAction === 'special'
                ? 'bg-amber-400 border-white text-slate-950'
                : status.special > 0.02
                  ? 'bg-slate-950/75 border-slate-600 text-slate-400'
                  : 'bg-slate-950/85 border-amber-400 text-amber-300'
            }`}
            aria-label="Special Attack"
          >
            {status.special > 0.02 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-amber-400/35 pointer-events-none"
                style={{ height: `${Math.round(status.special * 100)}%` }}
              />
            )}
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
            <span className="relative z-10">SPECIAL</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              soundEngine.unlock();
              inputManager.triggerDodge();
            }}
            className={`relative overflow-hidden w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[9px] sm:text-[10px] shadow-lg active:scale-95 transition-transform ${
              status.activeAction === 'dodge'
                ? 'bg-purple-500 border-white text-white'
                : 'bg-slate-950/80 border-purple-400 text-purple-200'
            }`}
            aria-label="Dodge"
          >
            {status.dodge > 0.02 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-purple-400/35 pointer-events-none"
                style={{ height: `${Math.round(status.dodge * 100)}%` }}
              />
            )}
            <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
            <span className="relative z-10">DODGE</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              soundEngine.unlock();
              inputManager.triggerJump();
            }}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[9px] sm:text-[10px] shadow-lg active:scale-95 transition-transform ${
              !status.isGrounded
                ? 'bg-emerald-500 border-white text-slate-950'
                : 'bg-slate-950/80 border-emerald-400 text-emerald-200'
            }`}
            aria-label="Jump"
          >
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>JUMP</span>
          </button>
        </div>

        {/* Bottom row: Block, Kick, Punch */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              soundEngine.unlock();
              blockPointerRef.current = e.pointerId;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Ignore synthetic events
              }
              setBlockHeld(true);
              inputManager.setTouchBlock(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              releaseBlock(e.pointerId);
            }}
            onPointerCancel={(e) => releaseBlock(e.pointerId)}
            onLostPointerCapture={(e) => releaseBlock(e.pointerId)}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[9px] sm:text-[10px] shadow-lg transition-transform ${
              blockHeld || status.isBlocking
                ? 'bg-cyan-400 border-white text-slate-950 scale-95'
                : 'bg-slate-950/80 border-cyan-400 text-cyan-200'
            }`}
            aria-label="Hold to block"
          >
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>BLOCK</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              soundEngine.unlock();
              inputManager.triggerKick();
            }}
            className={`relative overflow-hidden w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[10px] sm:text-[11px] shadow-xl active:scale-95 transition-transform ${
              status.activeAction === 'kick'
                ? 'bg-rose-500 border-white text-white'
                : 'bg-slate-950/85 border-rose-400 text-rose-200'
            }`}
            aria-label="Kick"
          >
            {status.kick > 0.02 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-rose-400/40 pointer-events-none"
                style={{ height: `${Math.round(status.kick * 100)}%` }}
              />
            )}
            <Footprints className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
            <span className="relative z-10">KICK</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              soundEngine.unlock();
              inputManager.triggerPunch();
            }}
            className={`relative overflow-hidden w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center font-arcade text-[10px] sm:text-[11px] shadow-xl active:scale-95 transition-transform ${
              status.activeAction === 'punch'
                ? 'bg-sky-400 border-white text-slate-950'
                : 'bg-slate-950/85 border-sky-400 text-sky-200'
            }`}
            aria-label="Punch"
          >
            {status.punch > 0.02 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-sky-400/40 pointer-events-none"
                style={{ height: `${Math.round(status.punch * 100)}%` }}
              />
            )}
            <Hand className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
            <span className="relative z-10">PUNCH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
