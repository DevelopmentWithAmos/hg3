import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Hand, Footprints, Trophy, Skull, ArrowLeftRight } from 'lucide-react';
import { FighterActionState, FighterMotionData } from '../../types/game';
import { getCharacterById } from '../../game/characters';
import { soundEngine } from '../../utils/audio';
import { drawHumanFighter2D } from './humanFighterRenderer';
import { HumanPortrait2D } from './HumanPortrait2D';

interface CharacterPreview2DProps {
  characterId: string;
}

type PreviewMove = 'idle' | 'punch' | 'kick' | 'special' | 'victory' | 'defeat';

export const CharacterPreview2D: React.FC<CharacterPreview2DProps> = ({
  characterId,
}) => {
  const char = useMemo(() => getCharacterById(characterId), [characterId]);
  const [previewMove, setPreviewMove] = useState<PreviewMove>('idle');
  const [facing, setFacing] = useState<1 | -1>(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moveRef = useRef<PreviewMove>('idle');
  const facingRef = useRef<1 | -1>(1);
  const moveTimerRef = useRef(0);
  const charRef = useRef(char);

  useEffect(() => {
    charRef.current = char;
    moveRef.current = 'idle';
    moveTimerRef.current = 0;
    setPreviewMove('idle');
  }, [char]);

  useEffect(() => {
    facingRef.current = facing;
  }, [facing]);

  const triggerPreviewMove = (move: PreviewMove) => {
    soundEngine.playUiClick();
    if (move === 'punch') soundEngine.playPunch(0);
    else if (move === 'kick') soundEngine.playKick();
    else if (move === 'special') {
      soundEngine.playSpecialWindup(char.special.animType);
      soundEngine.playCharacterReaction('special', char.animationStyle);
    } else if (move === 'victory') {
      soundEngine.playCharacterReaction('victory', char.animationStyle);
    } else if (move === 'defeat') {
      soundEngine.playCharacterReaction('defeat', char.animationStyle);
    }

    moveRef.current = move;
    moveTimerRef.current = 0;
    setPreviewMove(move);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();
    let elapsed = 0;

    const motion: FighterMotionData = {
      locomotion: 'idle',
      action: 'none',
      actionProgress: 0,
      comboStep: 0,
      speedRatio: 0,
      verticalVelocity: 0,
      grounded: true,
      facing: 1,
      landingSquash: 0,
      hitWobble: 0,
      stunTime: 0,
    };

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 260;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      const activeChar = charRef.current;
      const mv = moveRef.current;
      if (mv === 'punch' || mv === 'kick' || mv === 'special') {
        const dur =
          mv === 'punch' ? 0.38 : mv === 'kick' ? 0.46 : activeChar.special.duration;
        moveTimerRef.current += dt;
        const prog = Math.min(1, moveTimerRef.current / dur);
        motion.action = mv as FighterActionState;
        motion.actionProgress = prog;
        if (prog >= 1) {
          moveRef.current = 'idle';
          moveTimerRef.current = 0;
          setPreviewMove('idle');
        }
      } else if (mv === 'victory' || mv === 'defeat') {
        moveTimerRef.current += dt;
        motion.action = mv;
        motion.actionProgress = Math.min(1, moveTimerRef.current / 2.2);
      } else {
        motion.action = 'none';
        motion.actionProgress = 0;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clean radial dark spotlight stage
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const floorY = h - 38;
      // Glowing stage pedestal
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, floorY + 6, 95, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = activeChar.palette.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      drawHumanFighter2D(ctx, {
        xPx: w * 0.5,
        yPx: floorY,
        facing: facingRef.current,
        character: activeChar,
        motion,
        time: elapsed,
        isPlayer: true,
        showShadow: true,
        worldScale: Math.min(1.2, Math.max(0.92, h / 225)),
      });

      ctx.restore();
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const moveButtons: Array<{
    id: PreviewMove;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'punch', label: 'PUNCH', icon: Hand },
    { id: 'kick', label: 'KICK', icon: Footprints },
    { id: 'special', label: 'SPECIAL', icon: Flame },
    { id: 'victory', label: 'VICTORY', icon: Trophy },
    { id: 'defeat', label: 'DEFEAT', icon: Skull },
  ];

  return (
    <div className="relative flex flex-col gap-2.5 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-2.5 h-[290px] sm:h-[310px]">
        {/* Human Fighter Portrait */}
        <div className="relative h-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
          <HumanPortrait2D character={char} className="w-full h-full" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              HUMAN FIGHTER
            </div>
            <div className="font-arcade text-sm text-white truncate">
              {char.name}
            </div>
          </div>
        </div>

        {/* Live 2D Articulated Canvas Preview */}
        <div className="relative h-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
          <canvas ref={canvasRef} className="w-full h-full block" />

          <div className="pointer-events-none absolute top-2.5 left-3 rounded bg-slate-950/85 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">
            LIVE 2D STANCE PREVIEW
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setFacing((f) => (f === 1 ? -1 : 1));
            }}
            className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-600 px-2 py-1 text-[10px] font-bold text-slate-200 cursor-pointer"
          >
            <ArrowLeftRight className="w-3 h-3 text-sky-400" />
            FLIP
          </button>
        </div>
      </div>

      {/* Preview Action Triggers */}
      <div className="grid grid-cols-5 gap-1.5">
        {moveButtons.map((btn) => {
          const Icon = btn.icon;
          const active = previewMove === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => triggerPreviewMove(btn.id)}
              disabled={!char.unlocked && btn.id === 'special'}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 px-2 font-arcade text-[11px] cursor-pointer transition-colors disabled:opacity-40 ${
                active
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
