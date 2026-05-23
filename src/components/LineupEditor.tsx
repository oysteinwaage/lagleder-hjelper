import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type UseSortableArguments,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, UserPlus, Shield } from 'lucide-react';
import type { Match, Team, Player } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildSubQueue, formatTime } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  index: number;
  name: string;
  isStarter: boolean;
  isKeeper?: boolean;
  extraInfo?: string;
  keeperRequired?: boolean;
  onRemove: (id: string) => void;
  onToggleKeeper?: (id: string) => void;
}

function SortableItem({ id, index, name, isStarter, isKeeper, extraInfo, keeperRequired, onRemove, onToggleKeeper }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id } as unknown as UseSortableArguments);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors cursor-grab active:cursor-grabbing touch-none select-none ${
        isKeeper
          ? 'bg-amber-900/30 border-amber-700/50'
          : isStarter
          ? 'bg-emerald-900/30 border-emerald-700/50'
          : 'bg-slate-700/50 border-slate-700/30'
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVertical size={18} className="text-slate-500 shrink-0" />
      <span className="text-slate-500 text-sm w-5 text-right shrink-0">{index + 1}.</span>

      <span className="flex-1 text-slate-100 truncate">{name}</span>
      {extraInfo && <span className="text-xs text-slate-400 font-mono shrink-0">{extraInfo}</span>}
      {isKeeper ? (
        <Badge variant="warning">Keeper</Badge>
      ) : isStarter ? (
        <Badge variant="success">Starter</Badge>
      ) : (
        <Badge variant="secondary">Reserve</Badge>
      )}
      {onToggleKeeper && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onToggleKeeper(id)}
          className={`transition-colors shrink-0 ${isKeeper ? 'text-amber-400 hover:text-amber-300' : keeperRequired ? 'text-amber-500 animate-pulse hover:text-amber-300' : 'text-slate-600 hover:text-amber-400'}`}
          title={isKeeper ? 'Fjern som keeper' : 'Sett som keeper'}
        >
          <Shield size={14} />
        </button>
      )}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(id)}
        className="text-slate-500 hover:text-red-400 transition-colors shrink-0 ml-1"
        title="Fjern fra kamp"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

interface Props {
  match: Match;
  team: Team;
  playerTimes?: Record<string, number>;
  keeperId?: string;
  onSetKeeper?: (id: string | undefined) => void;
  keeperRequired?: boolean;
  onUpdateOrder: (newMatchPlayers: Match['matchPlayers'], newSubQueue: Match['subQueue']) => void;
  onRemoveFromMatch: (playerId: string) => void;
  onAddToMatch: (player: Player) => void;
}

export function LineupEditor({ match, team, playerTimes, keeperId, onSetKeeper, keeperRequired, onUpdateOrder, onRemoveFromMatch, onAddToMatch }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedPlayers = [...match.matchPlayers].sort((a, b) => a.lineupOrder - b.lineupOrder);
  const ids = sortedPlayers.map((mp) => mp.playerId);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const reordered = arrayMove(ids, oldIndex, newIndex);
      const newMatchPlayers = match.matchPlayers.map((mp) => ({
        ...mp,
        lineupOrder: reordered.indexOf(mp.playerId),
        onField: reordered.indexOf(mp.playerId) < match.settings.playersOnField,
      }));
      const newSubQueue = buildSubQueue(
        newMatchPlayers,
        0,
        match.settings.subInterval * 60,
        (match.settings.firstSubTime ?? 0) * 60,
        keeperId
      );
      onUpdateOrder(newMatchPlayers, newSubQueue);
    },
    [ids, match.matchPlayers, match.settings.playersOnField, match.settings.subInterval, match.settings.firstSubTime, keeperId, onUpdateOrder]
  );

  const handleToggleKeeper = onSetKeeper
    ? (id: string) => onSetKeeper(id === keeperId ? undefined : id)
    : undefined;

  const matchPlayerIds = new Set(match.matchPlayers.map((mp) => mp.playerId));
  const availablePlayers = team.players.filter((p) => !matchPlayerIds.has(p.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oppstilling</CardTitle>
        <p className="text-sm text-slate-400">
          Dra i håndtaket for å endre rekkefølge. De {match.settings.playersOnField} øverste starter.
        </p>
        {keeperRequired && (
          <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5 mt-1">
            <Shield size={13} className="shrink-0" />
            Klikk skjold-ikonet på en spiller for å velge keeper
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {sortedPlayers.map((mp, i) => {
                const player = team.players.find((p) => p.id === mp.playerId);
                if (!player) return null;
                const secs = playerTimes?.[mp.playerId];
                return (
                  <SortableItem
                    key={mp.playerId}
                    id={mp.playerId}
                    index={i}
                    name={player.name}
                    isStarter={i < match.settings.playersOnField}
                    isKeeper={mp.playerId === keeperId}
                    extraInfo={secs !== undefined ? formatTime(Math.floor(secs)) : undefined}
                    keeperRequired={keeperRequired}
                    onRemove={onRemoveFromMatch}
                    onToggleKeeper={handleToggleKeeper}
                  />
                );
              })}
              {sortedPlayers.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-3">Ingen spillere i kampen</p>
              )}
            </ul>
          </SortableContext>
        </DndContext>

        {/* Add available players */}
        {availablePlayers.length > 0 && (
          <div className="pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
              <UserPlus size={13} /> Legg til fra laget
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availablePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onAddToMatch(p)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm bg-slate-700 hover:bg-emerald-800 text-slate-300 hover:text-white border border-slate-600 hover:border-emerald-600 transition-colors"
                >
                  <span>+</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
