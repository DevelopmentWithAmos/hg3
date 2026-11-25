import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { CharacterDefinition, FighterMotionData, VictoryStyle } from '../../types/game';
import { soundEngine } from '../../utils/audio';
import { drawHumanFighter2D, preloadFighterAssets } from './humanFighterRenderer';

interface VictoryPoseCanvasProps {
  character: CharacterDefinition;
}

interface CelebrationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'confetti' | 'spark';
}

export function getVictoryPoseLabel(style: VictoryStyle): string {
  switch (style) {
    case 'boxer_shuffle_pump':
      return 'CHAMPION SHUFFLE';
    case 'heavy_chest_flex':
      return 'POWER FLEX ROAR';
    case 'martial_crane_bow':
      return 'CRANE MASTER BOW';
    case 'parkour_backflip':
      return 'PARKOUR BACKFLIP';
    default:
      return 'CHAMPION SALUTE';
  }
}

export const VictoryPoseCanvas: React.FC<VictoryPoseCanvasProps> = ({ character }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseElapsedRef = useRef(0);
  const burstTriggeredRef = useRef(false);
  const [replayCount, setReplayCount] = useState(0);

  const poseLabel = useMemo(
    () => getVictoryPoseLabel(character.victoryStyle),
    [character.victoryStyle],
  );

  useEffect(() => {
    preloadFighterAssets(character);
    poseElapsedRef.current = 0;
    burstTriggeredRef.current = false;
  }, [character, replayCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();
    let totalTime = 0;
    let confettiCooldown = 0.2;
    const particles: CelebrationParticle[] = [];

    const motion: FighterMotionData = {
      locomotion: 'idle',
      action: 'victory',
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

    const confettiColors = ['#fde047', '#38bdf8', '#fb7185', '#34d399', character.palette.accent];

    const spawnBurst = (cx: number, cy: number, count: number, kind: 'confetti' | 'spark') => {
      for (let i = 0; i < count; i++) {
        const angle =
          kind === 'spark'
            ? (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35
            : -Math.PI * 0.5 + (Math.random() - 0.5) * 1.45;
        const speed = kind === 'spark' ? 55 + Math.random() * 95 : 85 + Math.random() * 120;
        particles.push({
          x: cx + (Math.random() - 0.5) * 26,
          y: cy + (Math.random() - 0.5) * 18,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (kind === 'confetti' ? 35 : 15),
          size: kind === 'spark' ? 2.6 + Math.random() * 2.5 : 4 + Math.random() * 3.5,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 10,
          life: 0,
          maxLife: kind === 'spark' ? 0.55 + Math.random() * 0.35 : 1.4 + Math.random() * 0.85,
          color: confettiColors[i % confettiColors.length],
          kind,
        });
      }
    };

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      totalTime += dt;
      poseElapsedRef.current += dt;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 360;
      const h = canvas.clientHeight || 200;
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const progress = Math.min(1, poseElapsedRef.current / 2.2);
      motion.action = 'victory';
      motion.actionProgress = progress;

      const floorY = h - 24;
      const centerX = w * 0.5;

      if (!burstTriggeredRef.current && progress >= 0.62) {
        burstTriggeredRef.current = true;
        spawnBurst(centerX, floorY - 76, 16, 'spark');
        spawnBurst(centerX, floorY - 96, 18, 'confetti');
      }

      confettiCooldown -= dt;
      if (confettiCooldown <= 0) {
        confettiCooldown = 1.15;
        spawnBurst(centerX + (Math.random() - 0.5) * 80, floorY - 120, 6, 'confetti');
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          particles.splice(i, 1);
        } else {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy += (pt.kind === 'confetti' ? 145 : 70) * dt;
          pt.vx *= 0.985;
          pt.rot += pt.vRot * dt;
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep arcade victory stage backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.68, '#111827');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Sweeping golden + character-accent champion spotlight cone
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const sway = Math.sin(totalTime * 2.1) * 18;
      const pulse = 0.5 + 0.5 * Math.sin(totalTime * 5.2);
      const beamGrad = ctx.createLinearGradient(centerX, 0, centerX + sway, floorY);
      beamGrad.addColorStop(0, `rgba(253, 224, 71, ${(0.34 + pulse * 0.1).toFixed(3)})`);
      beamGrad.addColorStop(0.55, `${character.palette.accent}33`);
      beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(centerX - 28, 0);
      ctx.lineTo(centerX + 28, 0);
      ctx.lineTo(centerX + 108 + sway, floorY);
      ctx.lineTo(centerX - 108 + sway, floorY);
      ctx.closePath();
      ctx.fill();

      // Radial golden rim behind winner
      const haloGrad = ctx.createRadialGradient(
        centerX,
        floorY - 68,
        8,
        centerX,
        floorY - 68,
        92 + pulse * 14,
      );
      haloGrad.addColorStop(0, 'rgba(250, 204, 21, 0.34)');
      haloGrad.addColorStop(0.55, `${character.palette.accent}24`);
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Glowing champion stage pedestal
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(centerX, floorY + 3, 86, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10 + pulse * 6;
      ctx.stroke();

      // Inner accent ring on pedestal
      ctx.shadowBlur = 0;
      ctx.strokeStyle = character.palette.accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(centerX, floorY + 3, 62, 8.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw Player Fighter performing their signature Victory Pose animation
      const worldScale = Math.min(1.02, Math.max(0.76, h / 210));
      drawHumanFighter2D(ctx, {
        xPx: centerX,
        yPx: floorY,
        facing: 1,
        character,
        motion,
        time: totalTime,
        isPlayer: true,
        showShadow: true,
        worldScale,
      });

      // Foreground celebratory sparks & confetti
      for (const pt of particles) {
        const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillStyle = pt.color;
        if (pt.kind === 'spark') {
          ctx.beginPath();
          ctx.arc(0, 0, pt.size * alpha, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-pt.size, -pt.size * 0.45, pt.size * 2, pt.size * 0.9);
        }
        ctx.restore();
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [character, replayCount]);

  return (
    <div className="relative w-full h-48 sm:h-52 rounded-xl overflow-hidden border-2 border-amber-400/75 bg-slate-950 shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" />

      <div className="pointer-events-none absolute top-2 left-2.5 inline-flex items-center gap-1 rounded-md bg-slate-950/85 border border-amber-400/50 px-2 py-0.5 text-[10px] font-arcade text-amber-300 tracking-wide">
        <Sparkles className="w-3 h-3 text-amber-300" />
        {poseLabel}
      </div>

      <button
        type="button"
        onClick={() => {
          soundEngine.playUiClick();
          soundEngine.playCharacterReaction('victory', character.animationStyle);
          setReplayCount((c) => c + 1);
        }}
        title="Replay victory pose animation"
        className="absolute bottom-2 right-2.5 inline-flex items-center gap-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-600 hover:border-amber-400 px-2 py-1 text-[10px] font-bold text-slate-200 hover:text-amber-300 cursor-pointer transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        REPLAY POSE
      </button>
    </div>
  );
};
