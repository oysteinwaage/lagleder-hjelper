import { useState } from 'react';
import { ArrowLeftRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatTime } from '@/lib/utils';
import type { Match, Team } from '@/types';

interface Props {
  match: Match;
  team: Team;
  currentTime: number;
  onSubstitute: (outId: string, inId: string) => void;
}

export function SubstitutionPanel({ match, team, currentTime, onSubstitute }: Props) {
  const [customOut, setCustomOut] = useState<string>('');
  const [customIn, setCustomIn] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);

  // Calculate when the next subs are due
  const fieldPlayers = match.matchPlayers.filter((mp) => mp.onField);
  const benchPlayers = match.matchPlayers.filter((mp) => !mp.onField);

  function getPlayerName(id: string) {
    return team.players.find((p) => p.id === id)?.name ?? '?';
  }

  function getTimeOnField(mp: { playerId: string; onField: boolean; lastEventTime: number }) {
    if (mp.onField) return currentTime - mp.lastEventTime;
    return 0;
  }

  function getTimeOnBench(mp: { playerId: string; onField: boolean; benchSeconds: number; lastEventTime: number }) {
    if (!mp.onField) return mp.benchSeconds + (currentTime - mp.lastEventTime);
    return mp.benchSeconds;
  }

  // Next scheduled subs from the queue
  const queue = match.subQueue.slice(0, 3);

  function getSubCountdown(sub: { dueTime: number }) {
    return Math.max(0, sub.dueTime - currentTime);
  }

  function handleCustomSub() {
    if (!customOut || !customIn) return;
    onSubstitute(customOut, customIn);
    setCustomOut('');
    setCustomIn('');
    setShowCustom(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="text-emerald-400" size={20} />
          Bytteplan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Planned subs */}
        {queue.length === 0 && (
          <p className="text-sm text-slate-500">Ingen planlagte bytter</p>
        )}
        {queue.map((sub) => {
          const countdown = getSubCountdown(sub);
          const isDue = countdown === 0;
          const outMp = match.matchPlayers.find((mp) => mp.playerId === sub.outId);
          const inMp = match.matchPlayers.find((mp) => mp.playerId === sub.inId);
          return (
            <div
              key={`${sub.outId}-${sub.inId}`}
              className={`flex items-center gap-3 rounded-lg p-3 border transition-all ${
                isDue
                  ? 'bg-amber-900/30 border-amber-600/50 pulse-green'
                  : 'bg-slate-700/40 border-slate-700/30'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-red-400 font-medium truncate">
                    ↓ {getPlayerName(sub.outId)}
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="text-emerald-400 font-medium truncate">
                    ↑ {getPlayerName(sub.inId)}
                  </span>
                </div>
                {outMp && inMp && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    På banen: {formatTime(Math.floor(getTimeOnField(outMp)))} ·
                    På benken: {formatTime(Math.floor(getTimeOnBench(inMp)))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {countdown > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={12} />
                    <span>{formatTime(countdown)}</span>
                  </div>
                )}
                {countdown === 0 && (
                  <span className="text-xs text-amber-400 font-medium">Nå!</span>
                )}
                <Button
                  size="sm"
                  variant={isDue ? 'success' : 'secondary'}
                  onClick={() => onSubstitute(sub.outId, sub.inId)}
                >
                  Bytt
                </Button>
              </div>
            </div>
          );
        })}

        {/* Custom substitution */}
        <div className="pt-2 border-t border-slate-700">
          {!showCustom ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCustom(true)}
            >
              <ArrowLeftRight size={14} /> Manuelt bytte
            </Button>
          ) : (
            <div className="space-y-2 slide-down">
              <p className="text-xs text-slate-400">Velg spiller ut og spiller inn:</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-red-400 mb-1">Ut (på banen)</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {fieldPlayers
                      .sort((a, b) => getTimeOnField(b) - getTimeOnField(a))
                      .map((mp) => (
                        <button
                          key={mp.playerId}
                          onClick={() => setCustomOut(mp.playerId)}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                            customOut === mp.playerId
                              ? 'bg-red-700 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                        >
                          {getPlayerName(mp.playerId)}
                          <span className="text-xs text-slate-400 ml-1">
                            ({formatTime(Math.floor(getTimeOnField(mp)))})
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-emerald-400 mb-1">Inn (på benken)</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {benchPlayers
                      .sort((a, b) => getTimeOnBench(b) - getTimeOnBench(a))
                      .map((mp) => (
                        <button
                          key={mp.playerId}
                          onClick={() => setCustomIn(mp.playerId)}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                            customIn === mp.playerId
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                        >
                          {getPlayerName(mp.playerId)}
                          <span className="text-xs text-slate-400 ml-1">
                            ({formatTime(Math.floor(getTimeOnBench(mp)))})
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleCustomSub}
                  disabled={!customOut || !customIn}
                  className="flex-1"
                >
                  Gjennomfør bytte
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCustom(false);
                    setCustomOut('');
                    setCustomIn('');
                  }}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
