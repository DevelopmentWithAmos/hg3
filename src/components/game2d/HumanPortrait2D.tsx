import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CharacterDefinition } from '../../types/game';
import { drawHumanPortrait2D } from './humanFighterRenderer';

interface HumanPortrait2DProps {
  character: CharacterDefinition;
  className?: string;
}

/**
 * Displays a character's photo portrait framed precisely around their face
 * (preserving GIF animation and transparent PNG cutouts), or draws a matching
 * 2D human bust portrait on Canvas when no photo asset is available.
 */
export const HumanPortrait2D: React.FC<HumanPortrait2DProps> = ({
  character,
  className = 'w-full h-full',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [natSize, setNatSize] = useState<{ w: number; h: number } | null>(null);
  const [boxSize, setBoxSize] = useState<{ w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setImgFailed(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatSize({ w: img.naturalWidth, h: img.naturalHeight });
    } else {
      setNatSize(null);
    }
  }, [character.id, character.portraitUrl]);

  const useCanvasPortrait = !character.portraitUrl || imgFailed;

  useLayoutEffect(() => {
    if (useCanvasPortrait) return;
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBoxSize((prev) =>
          prev &&
          Math.abs(prev.w - rect.width) < 0.5 &&
          Math.abs(prev.h - rect.height) < 0.5
            ? prev
            : { w: rect.width, h: rect.height },
        );
      }
    };

    update();
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }
    return undefined;
  }, [useCanvasPortrait, character.id, character.portraitUrl]);

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
    const crop = character.faceCrop;
    let imgStyle: React.CSSProperties | undefined;

    if (crop && natSize && boxSize && natSize.w > 0 && natSize.h > 0) {
      const cw = boxSize.w;
      const ch = boxSize.h;
      const nw = natSize.w;
      const nh = natSize.h;
      const zoom = Math.max(1, crop.avatarZoom ?? crop.zoom * 0.78);
      const coverScale = Math.max(cw / nw, ch / nh);
      const scale = coverScale * zoom;
      const rw = nw * scale;
      const rh = nh * scale;
      const rawLeft = cw * 0.5 - crop.x * rw;
      const rawTop = ch * 0.48 - crop.y * rh;
      const left = Math.min(0, Math.max(cw - rw, rawLeft));
      const top = Math.min(0, Math.max(ch - rh, rawTop));
      imgStyle = {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${rw}px`,
        height: `${rh}px`,
        maxWidth: 'none',
      };
    }

    return (
      <div
        ref={containerRef}
        className={`${className} relative overflow-hidden`}
        style={{
          background: `radial-gradient(circle at 50% 36%, ${character.palette.accent}55, ${character.palette.suitPrimary} 55%, #090d16 100%)`,
        }}
      >
        <img
          ref={imgRef}
          src={character.portraitUrl}
          alt={`${character.name} fighter avatar`}
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setNatSize({ w: img.naturalWidth, h: img.naturalHeight });
            }
          }}
          onError={() => setImgFailed(true)}
          style={imgStyle}
          className={
            imgStyle
              ? 'block select-none pointer-events-none'
              : 'w-full h-full object-cover object-top select-none pointer-events-none'
          }
        />
      </div>
    );
  }

  return <canvas ref={canvasRef} className={`${className} block`} />;
};
