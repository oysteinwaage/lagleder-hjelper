import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatTime } from '@/lib/utils';
import type { Match, Team } from '@/types';

interface Props {
  matches: Match[];
  team: Team;
}

export function SeasonPlaytime({ matches, team }: Props) {
  const completed = matches.filter((m) => m.status === 'completed');
  if (completed.length === 0) return null;

  // Aggregate field- and keeper-time per player across all completed matches.
  const totals = new Map<string, { field: number; keeper: number }>();
  for (const m of completed) {
    for (const mp of m.matchPlayers) {
      const cur = totals.get(mp.playerId) ?? { field: 0, keeper: 0 };
      cur.field += mp.fieldSeconds;
      cur.keeper += mp.keeperSeconds ?? 0;
      totals.set(mp.playerId, cur);
    }
  }

  const rows = [...totals.entries()]
    .map(([playerId, t]) => ({ playerId, ...t, total: t.field + t.keeper }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) return null;

  const hasAnyKeeper = rows.some((r) => r.keeper > 0);
  // Common scale so field- and keeper-bars are comparable; longest bar fills the track.
  const ref = Math.max(1, ...rows.map((r) => Math.max(r.field, r.keeper)));

  function getPlayerName(id: string) {
    return team.players.find((p) => p.id === id)?.name ?? '?';
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
            <BarChart3 size={14} className="text-emerald-400" />
            Samlet spilletid
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {hasAnyKeeper && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2 rounded-sm bg-emerald-500 inline-block" />
                  Utespiller
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2 rounded-sm bg-amber-500 inline-block" />
                  Keeper
                </span>
              </>
            )}
            <span>{completed.length} {completed.length === 1 ? 'kamp' : 'kamper'}</span>
          </div>
        </div>
        <div className="space-y-2">
          {rows.map((r) => {
            const name = getPlayerName(r.playerId);
            const fieldPct = (r.field / ref) * 100;
            const keeperPct = (r.keeper / ref) * 100;

            if (hasAnyKeeper && r.keeper > 0) {
              return (
                <div key={r.playerId} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-300 w-28 truncate shrink-0">{name}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all" style={{ width: `${keeperPct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-amber-400 w-12 text-right shrink-0">{formatTime(r.keeper)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-28 shrink-0" />
                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${fieldPct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-emerald-400 w-12 text-right shrink-0">{formatTime(r.field)}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={r.playerId} className="flex items-center gap-2">
                <span className="text-sm text-slate-300 w-28 truncate shrink-0">{name}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${fieldPct}%` }} />
                </div>
                <span className="text-xs font-mono text-slate-400 w-12 text-right shrink-0">{formatTime(r.field)}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
