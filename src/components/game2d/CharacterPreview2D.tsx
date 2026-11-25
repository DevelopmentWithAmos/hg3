import React, { useMemo } from 'react';
import { getCharacterById } from '../../game/characters';
import { StaticCharacterArtwork } from './StaticCharacterArtwork';

interface CharacterPreview2DProps {
  characterId: string;
}

export const CharacterPreview2D: React.FC<CharacterPreview2DProps> = ({
  characterId,
}) => {
  const character = useMemo(() => getCharacterById(characterId), [characterId]);

  return (
    <div
      className="relative h-[290px] w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 sm:h-[310px]"
      style={{
        background: `radial-gradient(circle at 50% 35%, ${character.palette.accent}22, #0f172a 55%, #020617 100%)`,
      }}
    >
      <div
        className="absolute bottom-5 left-1/2 h-8 w-64 -translate-x-1/2 rounded-[50%] border-2 opacity-70"
        style={{ borderColor: character.palette.accent }}
        aria-hidden="true"
      />
      <StaticCharacterArtwork
        character={character}
        alt={`${character.name} 2D character illustration`}
        className="absolute inset-0"
        imageClassName="h-full w-full object-contain px-8 pb-8 pt-1"
      />
      <div className="pointer-events-none absolute left-3 top-2.5 rounded border border-slate-700 bg-slate-950/85 px-2 py-0.5 text-[10px] font-bold text-slate-300">
        STATIC 2D CHARACTER ART
      </div>
    </div>
  );
};
