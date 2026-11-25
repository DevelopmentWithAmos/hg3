import React, { useEffect, useRef, useState } from 'react';
import { CharacterDefinition } from '../../types/game';
import { drawHumanPortrait2D } from './humanFighterRenderer';

interface HumanPortrait2DProps {
  character: CharacterDefinition;
  className?: string;
}

/**
 * Displays a character's photo portrait when available, or draws a crisp
 * matching 2D human bust portrait on Canvas with zero broken-image risk.
 */
export const HumanPortrait2D: React.FC<HumanPortrait2DProps> = ({
  character,
  className = 'w-full h-full',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [character.id, character.portraitUrl]);

  const useCanvasPortrait = !character.portraitUrl || imgFailed;

  useEffect(() => {
    if (!useCanvasPortrait) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 160;
    const h = canvas.clientHeight || 160;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    drawHumanPortrait2D(ctx, character, w, h);
    ctx.restore();
  }, [useCanvasPortrait, character]);

  if (!useCanvasPortrait && character.portraitUrl) {
    return (
      <img
        src={character.portraitUrl}
        alt={`${character.name} human fighter portrait`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${className} object-cover object-top`}
      />
    );
  }

  return <canvas ref={canvasRef} className={`${className} block`} />;
};
