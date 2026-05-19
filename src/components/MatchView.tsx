import { useEffect, useRef, useCallback, useState } from 'react';
import { Play, Square, ArrowLeft, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FootballPitch } from '@/components/FootballPitch';
import { SubstitutionPanel } from '@/components/SubstitutionPanel';
import { LineupEditor } from '@/components/LineupEditor';
import { formatTime, applySubstitution, buildSubQueue } from '@/lib/utils';
import type { Match, MatchPlayer, Player, Team } from '@/types';

interface Props {
  match: Match;
  team: Team;
  onUpdateMatch: (updater: (m: Match) => Match) => void;
  onBack: () => void;
}

export function MatchView({ match, team, onUpdateMatch, onBack }: Props) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (match.status !== 'active') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      onUpdateMatch((m) => ({ ...m, elapsedSeconds: m.elapsedSeconds + 1 }));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [match.status, onUpdateMatch]);

  const startMatch = useCallback(() => {
    onUpdateMatch((m) => ({ ...m, status: 'active', startedAt: Date.now() }));
  }, [onUpdateMatch]);

  const endMatch = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onUpdateMatch((m) => ({ ...m, status: 'completed' }));
  }, [onUpdateMatch]);

  const handleSubstitute = useCallback(
    (outId: string, inId: string) => {
      const currentTime = match.elapsedSeconds;
      const { matchPlayers, subQueue } = applySubstitution(match, outId, inId, currentTime);
      setAnimatingIds(new Set([outId, inId]));
      setTimeout(() => setAnimatingIds(new Set()), 800);
      onUpdateMatch((m) => ({
        ...m,
        matchPlayers,
        subQueue,
        substitutions: [
          ...m.substitutions,
          { gameTime: currentTime, outPlayerId: outId, inPlayerId: inId },
        ],
      }));
    },
    [match, onUpdateMatch]
  );

  const handleUpdateLineup = useCallback(
    (newMatchPlayers: Match['matchPlayers'], newSubQueue: Match['subQueue']) => {
      onUpdateMatch((m) => ({ ...m, matchPlayers: newMatchPlayers, subQueue: newSubQueue }));
    },
    [onUpdateMatch]
  );

  const handleRemoveFromMatch = useCallback(
    (playerId: string) => {
      onUpdateMatch((m) => {
        const filtered = m.matchPlayers.filter((mp) => mp.playerId !== playerId);
        // Re-index lineupOrder sequentially
        const sorted = [...filtered].sort((a, b) => a.lineupOrder - b.lineupOrder);
        const reindexed = sorted.map((mp, i) => ({
          ...mp,
          lineupOrder: i,
          onField: i < m.settings.playersOnField,
        }));
        const newSubQueue = buildSubQueue(reindexed, m.elapsedSeconds, m.settings.playersOnField);
        return { ...m, matchPlayers: reindexed, subQueue: newSubQueue };
      });
    },
    [onUpdateMatch]
  );

  const handleAddToMatch = useCallback(
    (player: Player) => {
      onUpdateMatch((m) => {
        const maxOrder = m.matchPlayers.reduce((max, mp) => Math.max(max, mp.lineupOrder), -1);
        const newEntry: MatchPlayer = {
          playerId: player.id,
          fieldSeconds: 0,
          benchSeconds: 0,
          lastEventTime: m.elapsedSeconds,
          onField: false,
          lineupOrder: maxOrder + 1,
        };
        const newPlayers = [...m.matchPlayers, newEntry];
        const newSubQueue = buildSubQueue(newPlayers, m.elapsedSeconds, m.settings.playersOnField);
        return { ...m, matchPlayers: newPlayers, subQueue: newSubQueue };
      });
    },
    [onUpdateMatch]
  );

  const isActive = match.status === 'active';
  const isPending = match.status === 'pending';
  const isCompleted = match.status === 'completed';

  const sortedPlayers = [...match.matchPlayers].sort((a, b) => a.lineupOrder - b.lineupOrder);
  const fieldPlayers = sortedPlayers.filter((mp) => mp.onField);
  const benchPlayers = sortedPlayers.filter((mp) => !mp.onField);

  const matchPlayerIds = new Set(match.matchPlayers.map((mp) => mp.playerId));
  const availablePlayers = team.players.filter((p) => !matchPlayerIds.has(p.id));

  function getPlayerName(id: string) {
    return team.players.find((p) => p.id === id)?.name ?? '?';
  }

  function getTimeOnField(mp: typeof match.matchPlayers[0]) {
    if (mp.onField && isActive) return mp.fieldSeconds + (match.elapsedSeconds - mp.lastEventTime);
    return mp.fieldSeconds;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-100">
            {team.name} vs {match.opponent}
          </h1>
          <p className="text-sm text-slate-400">{match.date}</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-mono font-bold ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
            {formatTime(match.elapsedSeconds)}
          </div>
          <div className="text-xs text-slate-500">
            {isCompleted ? 'Avsluttet' : isActive ? 'Pågår' : 'Ikke startet'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {isPending && (
        <Button size="lg" className="w-full" onClick={startMatch}>
          <Play size={20} /> Start kamp
        </Button>
      )}
      {isActive && (
        <Button size="sm" variant="destructive" className="w-full" onClick={endMatch}>
          <Square size={16} /> Avslutt kamp
        </Button>
      )}

      {/* Pending: Lineup editor with add/remove */}
      {isPending && (
        <LineupEditor
          match={match}
          team={team}
          onUpdateOrder={handleUpdateLineup}
          onRemoveFromMatch={handleRemoveFromMatch}
          onAddToMatch={handleAddToMatch}
        />
      )}

      {/* Active/Completed */}
      {(isActive || isCompleted) && (
        <div className="space-y-4">
          <FootballPitch match={match} team={team} animatingPlayerIds={animatingIds} />

          {isActive && (
            <SubstitutionPanel
              match={match}
              team={team}
              currentTime={match.elapsedSeconds}
              onSubstitute={handleSubstitute}
            />
          )}

          {/* Bench */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-slate-400 mb-2">Benken</p>
              <div className="space-y-1.5">
                {benchPlayers.map((mp) => {
                  const name = getPlayerName(mp.playerId);
                  const benchTime = mp.benchSeconds + (isActive ? match.elapsedSeconds - mp.lastEventTime : 0);
                  return (
                    <div
                      key={mp.playerId}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-700/50 text-sm ${animatingIds.has(mp.playerId) ? 'player-swap' : ''}`}
                    >
                      <span className="text-slate-200">{name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-xs">
                          {formatTime(Math.floor(benchTime))}
                        </span>
                        {!isCompleted && (
                          <button
                            onClick={() => handleRemoveFromMatch(mp.playerId)}
                            className="text-slate-600 hover:text-red-400 transition-colors"
                            title="Fjern fra kamp"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {benchPlayers.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-2">Ingen på benken</p>
                )}
              </div>

              {/* Add player to bench */}
              {!isCompleted && availablePlayers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                    <UserPlus size={13} /> Legg til spiller
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availablePlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleAddToMatch(p)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm bg-slate-700 hover:bg-emerald-800 text-slate-300 hover:text-white border border-slate-600 hover:border-emerald-600 transition-colors"
                      >
                        <span>+</span>
                        {p.number !== undefined && (
                          <span className="text-emerald-400 font-mono">#{p.number}</span>
                        )}
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field player times */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-slate-400 mb-2">På banen</p>
              <div className="space-y-1.5">
                {fieldPlayers.map((mp) => {
                  const name = getPlayerName(mp.playerId);
                  const ft = Math.floor(getTimeOnField(mp));
                  return (
                    <div
                      key={mp.playerId}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-900/20 text-sm ${animatingIds.has(mp.playerId) ? 'player-swap' : ''}`}
                    >
                      <span className="text-slate-200">{name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono text-xs">{formatTime(ft)}</span>
                        {!isCompleted && (
                          <button
                            onClick={() => handleRemoveFromMatch(mp.playerId)}
                            className="text-slate-600 hover:text-red-400 transition-colors"
                            title="Fjern fra kamp"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Substitution history */}
          {match.substitutions.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-slate-400 mb-2">Byttelog</p>
                <div className="space-y-1.5">
                  {match.substitutions.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-slate-500">{formatTime(s.gameTime)}</span>
                      <span className="text-red-400">{getPlayerName(s.outPlayerId)}</span>
                      <span>→</span>
                      <span className="text-emerald-400">{getPlayerName(s.inPlayerId)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary on completion */}
      {isCompleted && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-slate-400 mb-3">Spilletid per spiller</p>
            <div className="space-y-2">
              {[...match.matchPlayers]
                .sort((a, b) => b.fieldSeconds - a.fieldSeconds)
                .map((mp) => {
                  const name = getPlayerName(mp.playerId);
                  const total = mp.fieldSeconds;
                  const pct = match.elapsedSeconds > 0 ? Math.round((total / match.elapsedSeconds) * 100) : 0;
                  return (
                    <div key={mp.playerId} className="flex items-center gap-2">
                      <span className="text-sm text-slate-300 w-32 truncate">{name}</span>
                      <div className="flex-1 bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-400 w-12 text-right">
                        {formatTime(total)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
