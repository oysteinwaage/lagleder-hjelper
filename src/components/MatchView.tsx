import { useEffect, useCallback, useState, useRef } from 'react';
import { Play, Square, Pause, ArrowLeft, Trash2, UserPlus, Shield, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FootballPitch } from '@/components/FootballPitch';
import { SubstitutionPanel } from '@/components/SubstitutionPanel';
import { LineupEditor } from '@/components/LineupEditor';
import { formatTime, formatDate, applySubstitution, buildSubQueue, applyKeeperChange } from '@/lib/utils';
import type { Match, MatchPlayer, Player, Team } from '@/types';

interface Props {
  match: Match;
  team: Team;
  onUpdateMatch: (updater: (m: Match) => Match) => void;
  onCompleteMatch: (frozenPlayers: MatchPlayer[], finalTime: number) => void;
  onBack: () => void;
}

function getLiveTime(match: Match): number {
  if (match.status === 'active' && match.startedAt) {
    return Math.floor((Date.now() - match.startedAt) / 1000);
  }
  return match.elapsedSeconds;
}

// Sorts the halftime lineup by fieldSeconds (least first) while guaranteeing the keeper
// always occupies the last starter slot so they can never end up on the bench.
function sortHalftimeLineup(
  matchPlayers: MatchPlayer[],
  playersOnField: number,
  keeperId: string | undefined
): MatchPlayer[] {
  if (!keeperId) {
    return [...matchPlayers]
      .sort((a, b) => a.fieldSeconds - b.fieldSeconds)
      .map((mp, i) => ({ ...mp, lineupOrder: i, onField: i < playersOnField }));
  }
  const keeper = matchPlayers.find((mp) => mp.playerId === keeperId);
  const nonKeepers = [...matchPlayers]
    .filter((mp) => mp.playerId !== keeperId)
    .sort((a, b) => a.fieldSeconds - b.fieldSeconds);
  // keeper always takes the last starter slot; non-keepers fill positions around them
  const ordered = [
    ...nonKeepers.slice(0, playersOnField - 1),
    ...(keeper ? [keeper] : []),
    ...nonKeepers.slice(playersOnField - 1),
  ];
  return ordered.map((mp, i) => ({ ...mp, lineupOrder: i, onField: i < playersOnField }));
}

export function MatchView({ match, team, onUpdateMatch, onCompleteMatch, onBack }: Props) {
  const [enterFieldId, setEnterFieldId] = useState<string | null>(null);
  const [enterBenchId, setEnterBenchId] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showKeeperModal, setShowKeeperModal] = useState(false);
  const [keeperRequiredError, setKeeperRequiredError] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const halftimeUserDraggedRef = useRef(false);
  const [, forceUpdate] = useState(0);

  // Tick every second to keep live timers updated — nothing written to store.
  useEffect(() => {
    if (match.status !== 'active') return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [match.status]);

  const isHalftime = match.status === 'halftime';
  if (!isHalftime) halftimeUserDraggedRef.current = false;

  // All time-dependent UI reads from this value.
  const currentTime = getLiveTime(match);

  const startMatch = useCallback(() => {
    onUpdateMatch((m) => ({ ...m, status: 'active', startedAt: Date.now() }));
  }, [onUpdateMatch]);

  const pauseForHalftime = useCallback(() => {
    const now = getLiveTime(match);
    onUpdateMatch((m) => {
      const frozen = m.matchPlayers.map((mp): MatchPlayer => ({
        ...mp,
        fieldSeconds: mp.onField && mp.playerId !== m.keeperId ? mp.fieldSeconds + (now - mp.lastEventTime) : mp.fieldSeconds,
        benchSeconds: !mp.onField ? mp.benchSeconds + (now - mp.lastEventTime) : mp.benchSeconds,
        keeperSeconds: mp.playerId === m.keeperId
          ? (mp.keeperSeconds ?? 0) + (now - (m.keeperSince ?? 0))
          : mp.keeperSeconds,
        lastEventTime: 0,
      }));
      return { ...m, status: 'halftime', elapsedSeconds: now, matchPlayers: frozen, keeperSince: 0 };
    });
  }, [match, onUpdateMatch]);

  const startSecondHalf = useCallback(() => {
    onUpdateMatch((m) => {
      // If the user didn't drag to customise the lineup, apply the fieldSeconds sort now.
      const finalPlayers: MatchPlayer[] = halftimeUserDraggedRef.current
        ? m.matchPlayers
        : sortHalftimeLineup(m.matchPlayers, m.settings.playersOnField, m.keeperId);

      // Build queue treating all bench players as virgins so firstSubTime always applies,
      // exactly like the start of the 1st half.
      const playersForQueue = finalPlayers.map((mp): MatchPlayer => ({
        ...mp,
        fieldSeconds: mp.onField ? mp.fieldSeconds : 0,
      }));
      const newSubQueue = buildSubQueue(
        playersForQueue,
        0,
        m.settings.subInterval * 60,
        (m.settings.firstSubTime ?? 0) * 60,
        m.keeperId
      );
      return {
        ...m,
        status: 'active',
        startedAt: Date.now(),
        currentHalf: 2,
        keeperSince: 0,
        matchPlayers: finalPlayers,
        subQueue: newSubQueue,
      };
    });
  }, [onUpdateMatch]);

  const endMatch = useCallback(() => {
    const finalTime = getLiveTime(match);
    const frozenPlayers = match.matchPlayers.map((mp): MatchPlayer => ({
      ...mp,
      fieldSeconds: mp.onField && mp.playerId !== match.keeperId
        ? mp.fieldSeconds + (finalTime - mp.lastEventTime)
        : mp.fieldSeconds,
      benchSeconds: !mp.onField
        ? mp.benchSeconds + (finalTime - mp.lastEventTime)
        : mp.benchSeconds,
      keeperSeconds: mp.playerId === match.keeperId
        ? (mp.keeperSeconds ?? 0) + (finalTime - (match.keeperSince ?? 0))
        : mp.keeperSeconds,
      lastEventTime: finalTime,
    }));
    onCompleteMatch(frozenPlayers, finalTime);
  }, [match, onCompleteMatch]);

  const handleSubstitute = useCallback(
    (outId: string, inId: string) => {
      const now = getLiveTime(match);
      const { matchPlayers, subQueue } = applySubstitution(match, outId, inId, now);
      setEnterFieldId(inId);
      setEnterBenchId(outId);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => { setEnterFieldId(null); setEnterBenchId(null); }, 800);
      onUpdateMatch((m) => ({
        ...m,
        matchPlayers,
        subQueue,
        substitutions: [
          ...m.substitutions,
          { gameTime: now, outPlayerId: outId, inPlayerId: inId },
        ],
      }));
    },
    [match, onUpdateMatch]
  );

  const handleSetKeeper = useCallback(
    (playerId: string | undefined) => {
      if (playerId !== undefined) setKeeperRequiredError(false);
      onUpdateMatch((m) => {
        let updatedPlayers = m.matchPlayers;

        if (playerId !== undefined) {
          const newKeeperEntry = m.matchPlayers.find((mp) => mp.playerId === playerId);
          if (newKeeperEntry && !newKeeperEntry.onField) {
            // Keeper is on bench — swap with the last starter so field count stays correct
            const lastStarter = [...m.matchPlayers]
              .filter((mp) => mp.onField)
              .sort((a, b) => b.lineupOrder - a.lineupOrder)[0];
            if (lastStarter) {
              const keeperOrder = newKeeperEntry.lineupOrder;
              const starterOrder = lastStarter.lineupOrder;
              updatedPlayers = m.matchPlayers.map((mp) => {
                if (mp.playerId === playerId) return { ...mp, lineupOrder: starterOrder, onField: true };
                if (mp.playerId === lastStarter.playerId) return { ...mp, lineupOrder: keeperOrder, onField: false };
                return mp;
              });
            }
          }
        }

        const newSubQueue = buildSubQueue(
          updatedPlayers,
          0,
          m.settings.subInterval * 60,
          (m.settings.firstSubTime ?? 0) * 60,
          playerId
        );
        return { ...m, keeperId: playerId, keeperSince: playerId !== undefined ? 0 : undefined, matchPlayers: updatedPlayers, subQueue: newSubQueue };
      });
    },
    [onUpdateMatch]
  );

  const handleKeeperChange = useCallback(
    (newKeeperId: string) => {
      const now = getLiveTime(match);
      const result = applyKeeperChange(match, newKeeperId, now);
      onUpdateMatch((m) => ({
        ...m,
        matchPlayers: result.matchPlayers,
        subQueue: result.subQueue,
        keeperId: result.keeperId,
        keeperSince: result.keeperSince,
      }));
    },
    [match, onUpdateMatch]
  );

  const handleHalftimeUpdateLineup = useCallback(
    (newMatchPlayers: Match['matchPlayers'], newSubQueue: Match['subQueue']) => {
      halftimeUserDraggedRef.current = true;
      onUpdateMatch((m) => {
        let players = newMatchPlayers;
        // If user dragged keeper to bench, silently swap them back with the last starter
        if (m.keeperId) {
          const keeperEntry = players.find((mp) => mp.playerId === m.keeperId);
          if (keeperEntry && !keeperEntry.onField) {
            const lastStarter = [...players]
              .filter((mp) => mp.onField)
              .sort((a, b) => b.lineupOrder - a.lineupOrder)[0];
            if (lastStarter) {
              const ko = keeperEntry.lineupOrder;
              const so = lastStarter.lineupOrder;
              players = players.map((mp) => {
                if (mp.playerId === m.keeperId) return { ...mp, lineupOrder: so, onField: true };
                if (mp.playerId === lastStarter.playerId) return { ...mp, lineupOrder: ko, onField: false };
                return mp;
              });
            }
          }
        }
        return { ...m, matchPlayers: players, subQueue: newSubQueue };
      });
    },
    [onUpdateMatch]
  );

  const handleUpdateLineup = useCallback(
    (newMatchPlayers: Match['matchPlayers'], newSubQueue: Match['subQueue']) => {
      onUpdateMatch((m) => ({ ...m, matchPlayers: newMatchPlayers, subQueue: newSubQueue }));
    },
    [onUpdateMatch]
  );

  const handleRemoveFromMatch = useCallback(
    (playerId: string) => {
      const now = getLiveTime(match);
      onUpdateMatch((m) => {
        const filtered = m.matchPlayers.filter((mp) => mp.playerId !== playerId);
        const sorted = [...filtered].sort((a, b) => a.lineupOrder - b.lineupOrder);
        const reindexed = sorted.map((mp, i) => ({
          ...mp,
          lineupOrder: i,
          onField: i < m.settings.playersOnField,
        }));
        const newSubQueue = buildSubQueue(
          reindexed,
          now,
          m.settings.subInterval * 60,
          (m.settings.firstSubTime ?? 0) * 60,
          m.keeperId
        );
        return { ...m, matchPlayers: reindexed, subQueue: newSubQueue };
      });
    },
    [match, onUpdateMatch]
  );

  const handleAddToMatch = useCallback(
    (player: Player) => {
      const now = getLiveTime(match);
      onUpdateMatch((m) => {
        const maxOrder = m.matchPlayers.reduce((max, mp) => Math.max(max, mp.lineupOrder), -1);
        const newEntry: MatchPlayer = {
          playerId: player.id,
          fieldSeconds: 0,
          benchSeconds: 0,
          lastEventTime: now,
          onField: false,
          lineupOrder: maxOrder + 1,
        };
        const newPlayers = [...m.matchPlayers, newEntry];
        const newSubQueue = buildSubQueue(
          newPlayers,
          now,
          m.settings.subInterval * 60,
          (m.settings.firstSubTime ?? 0) * 60,
          m.keeperId
        );
        return { ...m, matchPlayers: newPlayers, subQueue: newSubQueue };
      });
    },
    [match, onUpdateMatch]
  );

  const isActive = match.status === 'active';
  const isPending = match.status === 'pending';
  const isCompleted = match.status === 'completed';
  const canPause = isActive && match.settings.numberOfHalves >= 2 && (match.currentHalf ?? 1) < match.settings.numberOfHalves;

  // During halftime: show players sorted by fieldSeconds ascending until the user drags to reorder.
  const halftimeLineupMatch: Match = (() => {
    if (!isHalftime || halftimeUserDraggedRef.current) return match;
    return {
      ...match,
      matchPlayers: sortHalftimeLineup(
        match.matchPlayers,
        match.settings.playersOnField,
        match.keeperId
      ),
    };
  })();

  const sortedPlayers = [...match.matchPlayers].sort((a, b) => a.lineupOrder - b.lineupOrder);
  const fieldPlayers = sortedPlayers.filter((mp) => mp.onField);
  const benchPlayers = sortedPlayers.filter((mp) => !mp.onField);

  const matchPlayerIds = new Set(match.matchPlayers.map((mp) => mp.playerId));
  const availablePlayers = team.players.filter((p) => !matchPlayerIds.has(p.id));

  function getPlayerName(id: string) {
    return team.players.find((p) => p.id === id)?.name ?? '?';
  }

  function getTimeOnField(mp: typeof match.matchPlayers[0]) {
    if (mp.onField && isActive) return mp.fieldSeconds + (currentTime - mp.lastEventTime);
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
          <p className="text-sm text-slate-400">
            {formatDate(match.date)}{match.time && ` kl. ${match.time}`}{match.location && ` · ${match.location}`}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-mono font-bold ${isActive ? 'text-emerald-400' : isHalftime ? 'text-amber-400' : 'text-slate-500'}`}>
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-slate-500">
            {isCompleted ? 'Avsluttet' : isActive ? `${match.currentHalf ?? 1}. omgang` : isHalftime ? 'Halvtid' : 'Ikke startet'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {isPending && (
        <>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              if (match.preset === '5er' && !match.keeperId) {
                setKeeperRequiredError(true);
                return;
              }
              startMatch();
            }}
          >
            <Play size={20} /> Start kamp
          </Button>
          {keeperRequiredError && (
            <div className="flex flex-col items-center gap-1 text-amber-400 text-sm text-center">
              <span className="font-medium">Du må velge keeper før kampen kan starte</span>
              <ArrowDown size={18} className="animate-bounce mt-0.5" />
            </div>
          )}
        </>
      )}
      {isActive && (
        <div className="flex gap-2">
          {canPause && (
            <Button size="sm" variant="secondary" className="flex-1" onClick={pauseForHalftime}>
              <Pause size={16} /> Pause
            </Button>
          )}
          <Button size="sm" variant="destructive" className={canPause ? 'flex-1' : 'w-full'} onClick={() => setShowEndConfirm(true)}>
            <Square size={16} /> Avslutt kamp
          </Button>
        </div>
      )}

      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <p className="text-slate-100 font-semibold text-lg">Avslutt kamp?</p>
            <p className="text-slate-400 text-sm">Er du sikker på at du vil avslutte kampen? Dette kan ikke angres.</p>
            <div className="flex gap-3 pt-1">
              <Button variant="destructive" className="flex-1" onClick={() => { setShowEndConfirm(false); endMatch(); }}>
                Ja, avslutt
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowEndConfirm(false)}>
                Avbryt
              </Button>
            </div>
          </div>
        </div>
      )}

      {showKeeperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <p className="text-slate-100 font-semibold text-lg flex items-center gap-2">
              <Shield size={18} className="text-amber-400" /> Bytt keeper
            </p>
            <p className="text-slate-400 text-sm">Velg ny keeper:</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {match.matchPlayers
                .filter((mp) => mp.playerId !== match.keeperId)
                .sort((a, b) => {
                  if (a.onField !== b.onField) return a.onField ? -1 : 1;
                  return a.lineupOrder - b.lineupOrder;
                })
                .map((mp) => (
                  <button
                    key={mp.playerId}
                    onClick={() => { handleKeeperChange(mp.playerId); setShowKeeperModal(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-700 hover:bg-amber-900/50 text-slate-200 hover:text-white border border-slate-600 hover:border-amber-600 transition-colors text-sm flex items-center justify-between"
                  >
                    <span>{getPlayerName(mp.playerId)}</span>
                    <span className="text-slate-500 text-xs">{mp.onField ? 'Banen' : 'Benken'}</span>
                  </button>
                ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowKeeperModal(false)}>
              Avbryt
            </Button>
          </div>
        </div>
      )}

      {/* Halftime modal */}
      {isHalftime && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-y-auto">
          <div className="flex-1 px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
            <div className="text-center space-y-1">
              <p className="text-amber-400 font-semibold text-lg">Halvtid</p>
              <p className="text-slate-400 text-sm">Velg oppstilling til 2. omgang</p>
            </div>
            <LineupEditor
              match={halftimeLineupMatch}
              team={team}
              playerTimes={Object.fromEntries(match.matchPlayers.map((mp): [string, number] => [mp.playerId, mp.fieldSeconds]))}
              keeperId={match.keeperId}
              onSetKeeper={handleSetKeeper}
              keeperRequired={keeperRequiredError && !match.keeperId}
              onUpdateOrder={handleHalftimeUpdateLineup}
              onRemoveFromMatch={handleRemoveFromMatch}
              onAddToMatch={handleAddToMatch}
            />
            {keeperRequiredError && (
              <div className="flex flex-col items-center gap-1 text-amber-400 text-sm text-center">
                <ArrowUp size={18} className="animate-bounce mb-0.5" />
                <span className="font-medium">Du må velge keeper før 2. omgang kan starte</span>
              </div>
            )}
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                if (match.preset === '5er' && !match.keeperId) {
                  setKeeperRequiredError(true);
                  return;
                }
                startSecondHalf();
              }}
            >
              <Play size={20} /> Start 2. omgang
            </Button>
          </div>
        </div>
      )}

      {/* Pending: Lineup editor with add/remove */}
      {isPending && (
        <LineupEditor
          match={match}
          team={team}
          keeperId={match.keeperId}
          onSetKeeper={match.preset === '5er' ? handleSetKeeper : undefined}
          keeperRequired={match.preset === '5er' ? keeperRequiredError && !match.keeperId : false}
          onUpdateOrder={handleUpdateLineup}
          onRemoveFromMatch={handleRemoveFromMatch}
          onAddToMatch={handleAddToMatch}
        />
      )}

      {/* Active/Completed */}
      {(isActive || isCompleted) && (
        <div className="space-y-4">
          {isActive && <FootballPitch match={match} team={team} enterFieldId={enterFieldId} enterBenchId={enterBenchId} currentTime={currentTime} keeperId={match.keeperId} />}

          {/* Completed: summary first, then substitution history */}
          {isCompleted && (
            <Card>
              <CardContent className="pt-4">
                {(() => {
                  const is5er = match.preset === '5er';
                  const hasAnyKeeper = is5er && match.matchPlayers.some((mp) => (mp.keeperSeconds ?? 0) > 0);
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-400">Spilletid per spiller</p>
                        {hasAnyKeeper && (
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="w-2.5 h-2 rounded-sm bg-emerald-500 inline-block" />
                              Utespiller
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2.5 h-2 rounded-sm bg-amber-500 inline-block" />
                              Keeper
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {[...match.matchPlayers]
                          .sort((a, b) => {
                            const aTotal = a.fieldSeconds + (a.keeperSeconds ?? 0);
                            const bTotal = b.fieldSeconds + (b.keeperSeconds ?? 0);
                            return bTotal - aTotal;
                          })
                          .map((mp) => {
                            const name = getPlayerName(mp.playerId);
                            const fieldSecs = mp.fieldSeconds;
                            const keeperSecs = is5er ? (mp.keeperSeconds ?? 0) : 0;
                            const ref = match.elapsedSeconds > 0 ? match.elapsedSeconds : 1;
                            const fieldPct = (fieldSecs / ref) * 100;
                            const keeperPct = (keeperSecs / ref) * 100;
                            const hasBeenKeeper = keeperSecs > 0;

                            if (hasBeenKeeper) {
                              return (
                                <div key={mp.playerId} className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-amber-300 w-28 truncate shrink-0">{name}</span>
                                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                                      <div className="bg-amber-500 h-full transition-all" style={{ width: `${keeperPct}%` }} />
                                    </div>
                                    <span className="text-xs font-mono text-amber-400 w-12 text-right shrink-0">{formatTime(keeperSecs)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-28 shrink-0" />
                                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${fieldPct}%` }} />
                                    </div>
                                    <span className="text-xs font-mono text-emerald-400 w-12 text-right shrink-0">{formatTime(fieldSecs)}</span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={mp.playerId} className="flex items-center gap-2">
                                <span className="text-sm text-slate-300 w-28 truncate shrink-0">{name}</span>
                                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${fieldPct}%` }} />
                                </div>
                                <span className="text-xs font-mono text-slate-400 w-12 text-right shrink-0">{formatTime(fieldSecs)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {isCompleted && match.substitutions.length > 0 && (
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

          {isActive && (
            <SubstitutionPanel
              match={match}
              team={team}
              currentTime={currentTime}
              keeperId={match.keeperId}
              onSubstitute={handleSubstitute}
            />
          )}

          {/* Keeper module — only for 5er matches */}
          {isActive && match.preset === '5er' && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                    <Shield size={14} className="text-amber-400" />
                    Keepertid
                  </p>
                  {match.keeperId && (
                    <button
                      onClick={() => setShowKeeperModal(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Bytt keeper
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {match.matchPlayers
                    .filter((mp) => (mp.keeperSeconds ?? 0) > 0 || mp.playerId === match.keeperId)
                    .sort((a, b) => {
                      if (a.playerId === match.keeperId) return -1;
                      if (b.playerId === match.keeperId) return 1;
                      return (b.keeperSeconds ?? 0) - (a.keeperSeconds ?? 0);
                    })
                    .map((mp) => {
                      const name = getPlayerName(mp.playerId);
                      const isCurrentKeeper = mp.playerId === match.keeperId;
                      const liveKeeperSecs = isCurrentKeeper
                        ? (mp.keeperSeconds ?? 0) + (currentTime - (match.keeperSince ?? 0))
                        : (mp.keeperSeconds ?? 0);
                      return (
                        <div key={mp.playerId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-900/20 text-sm">
                          <div className="flex items-center gap-2">
                            {isCurrentKeeper && <Shield size={12} className="text-amber-400 shrink-0" />}
                            <span className="text-slate-200">{name}</span>
                          </div>
                          <span className="text-amber-400 font-mono text-xs">{formatTime(Math.floor(liveKeeperSecs))}</span>
                        </div>
                      );
                    })}
                  {!match.keeperId && match.matchPlayers.every((mp) => !(mp.keeperSeconds ?? 0)) && (
                    <p className="text-xs text-slate-500 text-center py-1">Ingen keeper valgt</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bench */}
          {isActive && <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-slate-400 mb-2">Benken</p>
              <div className="space-y-1.5">
                {benchPlayers.map((mp) => {
                  const name = getPlayerName(mp.playerId);
                  const benchTime = mp.benchSeconds + (isActive ? currentTime - mp.lastEventTime : 0);
                  return (
                    <div
                      key={mp.playerId}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-700/50 text-sm ${mp.playerId === enterBenchId ? 'player-enter-bench' : ''}`}
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
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>}

          {/* Field player times */}
          {isActive && <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-slate-400 mb-2">På banen</p>
              <div className="space-y-1.5">
                {fieldPlayers.map((mp) => {
                  const name = getPlayerName(mp.playerId);
                  const ft = Math.floor(getTimeOnField(mp));
                  return (
                    <div
                      key={mp.playerId}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-900/20 text-sm ${mp.playerId === enterFieldId ? 'player-enter-field' : ''}`}
                    >
                      <span className="text-slate-200">{name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono text-xs">{formatTime(ft)}</span>
                        <button
                          onClick={() => handleRemoveFromMatch(mp.playerId)}
                          className="text-slate-600 hover:text-red-400 transition-colors"
                          title="Fjern fra kamp"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>}

          {/* Active: substitution history */}
          {isActive && match.substitutions.length > 0 && (
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
    </div>
  );
}
