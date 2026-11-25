import React, { useEffect, useState } from 'react';
import type { CharacterDefinition, FighterMotionData } from '../../types/game';
import { drawHumanFighter2D } from './humanFighterRenderer';
import { getStaticSpriteCharacterImageUrl } from './spriteFighterRenderer';

interface StaticCharacterArtworkProps {
  character: CharacterDefinition;
  alt: string;
  className?: string;
  imageClassName?: string;
}

const fallbackArtworkCache = new Map<string, string>();

function createFallbackArtwork(character: CharacterDefinition): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a canvas for static character artwork');

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

  drawHumanFighter2D(ctx, {
    xPx: canvas.width / 2,
    yPx: canvas.height - 18,
    facing: 1,
    character: {
      ...character,
      portraitUrl: undefined,
      faceCrop: undefined,
      spriteCharacterId: undefined,
    },
    motion,
    time: 0,
    isPlayer: true,
    showShadow: true,
    worldScale: 1.55,
  });

  return canvas.toDataURL('image/png');
}

export const StaticCharacterArtwork: React.FC<StaticCharacterArtworkProps> = ({
  character,
  alt,
  className = 'relative block h-full w-full',
  imageClassName = 'h-full w-full object-contain',
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageUrl(null);
    setImageFailed(false);
    const spriteImageUrl = getStaticSpriteCharacterImageUrl(character.spriteCharacterId);
    if (spriteImageUrl) {
      setImageUrl(spriteImageUrl);
      return;
    }

    const cachedImageUrl = fallbackArtworkCache.get(character.id);
    if (cachedImageUrl) {
      setImageUrl(cachedImageUrl);
      return;
    }

    try {
      const generatedImageUrl = createFallbackArtwork(character);
      fallbackArtworkCache.set(character.id, generatedImageUrl);
      setImageUrl(generatedImageUrl);
    } catch (error) {
      console.error(`Failed to render static artwork for "${character.name}"`, error);
      setImageFailed(true);
    }
  }, [character]);

  return (
    <div className={`relative ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          draggable={false}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className={`block select-none ${imageClassName}`}
        />
      ) : imageFailed ? (
        <div className="flex h-full items-center justify-center px-1 text-center text-[9px] font-bold text-rose-300">
          Art unavailable
        </div>
      ) : (
        <div className="h-full w-full animate-pulse bg-slate-900/40" aria-hidden="true" />
      )}
    </div>
  );
};
