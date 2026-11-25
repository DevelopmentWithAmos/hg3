import React, { useMemo, useState } from 'react';
import {
  X,
  Check,
  Lock,
  Flame,
  Shield,
  Zap,
  Swords,
  Heart,
  Sparkles,
  User,
  Bot,
  Search,
} from 'lucide-react';
import {
  getAllCharacters,
  getCharacterById,
} from '../../game/characters';
import { soundEngine } from '../../utils/audio';
import { CharacterPreview2D } from '../game2d/CharacterPreview2D';
import { HumanPortrait2D } from '../game2d/HumanPortrait2D';

interface CharacterSelectModalProps {
  playerCharacterId: string;
  botCharacterId: string;
  onSelectPlayerCharacter: (id: string) => void;
  onSelectBotCharacter: (id: string) => void;
  onClose: () => void;
  onStartPlay: () => void;
}

type PickerTarget = 'player' | 'bot';
type RosterFilter = 'all' | 'creators' | 'politicians' | 'bollywood' | 'originals';

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  playerCharacterId,
  botCharacterId,
  onSelectPlayerCharacter,
  onSelectBotCharacter,
  onClose,
  onStartPlay,
}) => {
  const roster = useMemo(() => getAllCharacters(), []);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>('player');
  const [inspectedId, setInspectedId] = useState<string>(playerCharacterId);
  const [filterGroup, setFilterGroup] = useState<RosterFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roster.filter((c) => {
      if (filterGroup !== 'all') {
        if (filterGroup === 'originals') {
          if (c.rosterGroup !== 'originals' && c.category !== 'licensed_guest') return false;
        } else if (c.rosterGroup !== filterGroup) {
          return false;
        }
      }
      if (q) {
        return (
          c.name.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.archetype.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [roster, filterGroup, searchQuery]);

  const inspected = useMemo(
    () => getCharacterById(inspectedId),
    [inspectedId],
  );
  const playerChar = useMemo(
    () => getCharacterById(playerCharacterId),
    [playerCharacterId],
  );
  const botChar = useMemo(
    () => getCharacterById(botCharacterId),
    [botCharacterId],
  );

  const handleCardClick = (charId: string, unlocked: boolean) => {
    soundEngine.playUiClick();
    setInspectedId(charId);
    if (!unlocked) return;
    if (pickerTarget === 'player') {
      onSelectPlayerCharacter(charId);
    } else {
      onSelectBotCharacter(charId);
    }
  };

  const handleTargetSwitch = (target: PickerTarget) => {
    soundEngine.playUiClick();
    setPickerTarget(target);
    setInspectedId(target === 'player' ? playerCharacterId : botCharacterId);
  };

  const statRows = [
    {
      label: 'HEALTH',
      icon: Heart,
      pct: Math.round((inspected.stats.maxHealth / 125) * 100),
      value: `${inspected.stats.maxHealth} HP`,
      barColor: 'bg-emerald-400',
      textColor: 'text-emerald-300',
    },
    {
      label: 'POWER',
      icon: Swords,
      pct: inspected.stats.displayPower,
      value: `${Math.round(inspected.stats.powerMultiplier * 100)}%`,
      barColor: 'bg-rose-400',
      textColor: 'text-rose-300',
    },
    {
      label: 'SPEED',
      icon: Zap,
      pct: inspected.stats.displaySpeed,
      value: `${Math.round(inspected.stats.speedMultiplier * 100)}%`,
      barColor: 'bg-sky-400',
      textColor: 'text-sky-300',
    },
    {
      label: 'DEFENSE',
      icon: Shield,
      pct: inspected.stats.displayDefense,
      value: `${Math.round(inspected.stats.defenseMultiplier * 100)}%`,
      barColor: 'bg-amber-400',
      textColor: 'text-amber-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-2xl bg-slate-900 border-2 border-amber-400/80 p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-arcade text-xl sm:text-2xl text-amber-300 tracking-wide">
              FIGHTER SELECT
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose your human brawler, preview 2D moves &amp; customize your AI rival
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs font-bold">
              <span className="text-sky-400">{playerChar.name}</span>
              <span className="text-amber-400 font-arcade">VS</span>
              <span className="text-rose-400">{botChar.name}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
              }}
              aria-label="Close character selection"
              className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Picker Slot Selector */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleTargetSwitch('player')}
            className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-2 cursor-pointer transition-colors ${
              pickerTarget === 'player'
                ? 'bg-sky-950/70 border-sky-400 text-white'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2 font-arcade text-xs sm:text-sm">
              <User className="w-4 h-4 text-sky-400" />
              PLAYER 1 PICK
            </span>
            <span className="font-arcade text-xs text-sky-300 truncate max-w-[120px] sm:max-w-none">
              {playerChar.name}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTargetSwitch('bot')}
            className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-2 cursor-pointer transition-colors ${
              pickerTarget === 'bot'
                ? 'bg-rose-950/65 border-rose-400 text-white'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2 font-arcade text-xs sm:text-sm">
              <Bot className="w-4 h-4 text-rose-400" />
              AI OPPONENT PICK
            </span>
            <span className="font-arcade text-xs text-rose-300 truncate max-w-[120px] sm:max-w-none">
              {botChar.name}
            </span>
          </button>
        </div>

        {/* Main Inspector: 2D Portrait & Live Stance Preview + Stats & Special */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.95fr] gap-4">
          <CharacterPreview2D characterId={inspected.id} />

          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span
                    className="inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase mb-1"
                    style={{
                      backgroundColor: `${inspected.palette.accent}22`,
                      color: inspected.palette.accent,
                      border: `1px solid ${inspected.palette.accent}66`,
                    }}
                  >
                    {inspected.archetype}
                  </span>
                  <h3 className="font-arcade text-2xl text-white leading-tight">
                    {inspected.name}
                  </h3>
                  <div className="text-xs font-bold text-amber-300">
                    {inspected.title}
                  </div>
                </div>

                {!inspected.unlocked && (
                  <div className="inline-flex items-center gap-1 rounded-lg bg-purple-950/80 border border-purple-400/60 px-2.5 py-1 text-[11px] font-arcade text-purple-200">
                    <Lock className="w-3.5 h-3.5" />
                    GUEST SLOT
                  </div>
                )}
              </div>

              <p className="text-xs italic text-slate-400 mt-1.5">
                &ldquo;{inspected.tagline}&rdquo;
              </p>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {inspected.bio}
              </p>
            </div>

            {/* Stat Bars */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-slate-800 py-2.5">
              {statRows.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Icon className={`w-3.5 h-3.5 ${stat.textColor}`} />
                        {stat.label}
                      </span>
                      <span className={`font-arcade tabular-nums ${stat.textColor}`}>
                        {stat.value}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full ${stat.barColor} transition-[width] duration-300`}
                        style={{ width: `${Math.min(100, Math.max(10, stat.pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {inspected.category === 'licensed_guest' && inspected.guestMeta ? (
              <div className="rounded-xl bg-purple-950/40 border border-purple-400/50 p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-arcade text-xs text-purple-200">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    LICENSED GUEST PIPELINE
                  </span>
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-900/70 px-2 py-0.5 rounded">
                    {inspected.guestMeta.releaseWindow}
                  </span>
                </div>
                <div className="text-[11px] text-slate-200">
                  <span className="text-purple-300 font-bold">Hook:</span>{' '}
                  {inspected.guestMeta.externalRigHook}
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {inspected.guestMeta.notes}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-900/90 border border-amber-400/50 p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 font-arcade text-xs sm:text-sm text-amber-300">
                    <Flame className="w-4 h-4" />
                    SPECIAL: {inspected.special.name}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="rounded bg-rose-500/20 border border-rose-400/50 px-1.5 py-0.5 text-rose-300">
                      {inspected.special.damage} DMG
                    </span>
                    <span className="rounded bg-sky-500/20 border border-sky-400/50 px-1.5 py-0.5 text-sky-300">
                      {inspected.special.cooldown.toFixed(1)}s CD
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  {inspected.special.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Roster Grid + Search & Category Tabs */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'all', label: `ALL (${roster.filter((c) => c.unlocked).length})` },
                  { id: 'creators', label: 'CREATORS' },
                  { id: 'politicians', label: 'LEADERS' },
                  { id: 'bollywood', label: 'BOLLYWOOD' },
                  { id: 'originals', label: 'ORIGINALS & DLC' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setFilterGroup(tab.id);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-arcade cursor-pointer transition-colors ${
                    filterGroup === tab.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-950 text-slate-300 border border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fighter..."
                className="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-amber-400 pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          <div className="max-h-[250px] overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {filteredRoster.map((char) => {
              const isInspected = inspected.id === char.id;
              const isP1 = playerCharacterId === char.id;
              const isBot = botCharacterId === char.id;

              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleCardClick(char.id, char.unlocked)}
                  className={`relative text-left rounded-xl border-2 p-2 flex flex-col justify-between gap-1.5 cursor-pointer transition-all ${
                    isInspected
                      ? 'bg-slate-800 border-amber-400 shadow-lg'
                      : char.unlocked
                        ? 'bg-slate-950/75 border-slate-700 hover:border-slate-500'
                        : 'bg-slate-950/55 border-purple-500/35 hover:border-purple-400/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 min-h-[16px]">
                    <div className="flex items-center gap-1">
                      {isP1 && (
                        <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[9px] font-arcade text-slate-950">
                          P1
                        </span>
                      )}
                      {isBot && (
                        <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-arcade text-white">
                          BOT
                        </span>
                      )}
                      {!char.unlocked && (
                        <span className="rounded bg-purple-500/25 border border-purple-400/50 px-1.5 py-0.5 text-[9px] font-bold text-purple-200">
                          GUEST
                        </span>
                      )}
                    </div>

                    {char.unlocked ? (
                      (pickerTarget === 'player' && isP1) ||
                      (pickerTarget === 'bot' && isBot) ? (
                        <Check className="w-3.5 h-3.5 text-amber-300" />
                      ) : null
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-purple-300" />
                    )}
                  </div>

                  {/* Portrait Thumbnail */}
                  <div
                    className="relative h-14 rounded-lg overflow-hidden flex items-center justify-center border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${char.palette.suitPrimary}, ${char.palette.suitSecondary})`,
                    }}
                  >
                    {char.unlocked ? (
                      <HumanPortrait2D character={char} className="w-full h-full" />
                    ) : (
                      <span className="font-arcade text-xs text-white">SEASON 2</span>
                    )}
                    <span className="absolute bottom-1 right-1 rounded bg-slate-950/85 px-1.5 py-0.5 font-arcade text-[9px] text-white">
                      {char.unlocked ? char.stats.maxHealth + ' HP' : 'DLC'}
                    </span>
                  </div>

                  <div>
                    <div className="font-arcade text-[11px] text-white truncate">
                      {char.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {char.archetype}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredRoster.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-slate-400">
                No fighters match &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-800 pt-3">
          <div className="text-xs text-slate-300">
            Matchup:{' '}
            <span className="font-arcade text-sky-300">{playerChar.name}</span>
            <span className="mx-1.5 text-amber-400 font-arcade">VS</span>
            <span className="font-arcade text-rose-300">{botChar.name}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
              }}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 font-arcade text-sm text-slate-200 cursor-pointer"
            >
              BACK
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onStartPlay();
              }}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-2.5 font-arcade text-sm text-slate-950 shadow-[0_3px_0_#b45309] cursor-pointer"
            >
              ENTER ARENA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
