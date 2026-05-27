import { useState } from 'react';
import { Plus, Trash2, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Match, Team } from '@/types';
import { formatDate } from '@/lib/utils';

interface Props {
  matches: Match[];
  team: Team;
  onCreateMatch: (opponent: string, date: string, time?: string, location?: string) => void;
  onDeleteMatch: (id: string) => void;
  onSelectMatch: (id: string) => void;
}

const statusLabel: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'secondary' }> = {
  pending: { label: 'Ikke startet', variant: 'secondary' },
  active: { label: 'Pågår', variant: 'warning' },
  halftime: { label: 'Halvtid', variant: 'warning' },
  completed: { label: 'Avsluttet', variant: 'success' },
};

export function MatchList({ matches, team, onCreateMatch, onDeleteMatch, onSelectMatch }: Props) {
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function submit() {
    if (!opponent.trim()) return;
    onCreateMatch(opponent.trim(), date, time || undefined, location.trim() || undefined);
    setOpponent('');
    setTime('');
    setLocation('');
    setShowForm(false);
  }

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteMatch(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  function sortMatches(list: Match[], descending = false) {
    return [...list].sort((a, b) => {
      const aKey = a.date + (a.time ? 'T' + a.time : 'T00:00');
      const bKey = b.date + (b.time ? 'T' + b.time : 'T00:00');
      return descending ? bKey.localeCompare(aKey) : aKey.localeCompare(bKey);
    });
  }

  function renderMatchList(list: Match[], descending = false) {
    return (
      <ul className="space-y-2">
        {sortMatches(list, descending).map((m) => {
          const st = statusLabel[m.status];
          const playerCount = m.matchPlayers.filter((mp) =>
            team.players.some((p) => p.id === mp.playerId)
          ).length;
          const when = [formatDate(m.date), m.time].filter(Boolean).join(' kl. ');
          const where = m.location;
          const isConfirming = confirmDeleteId === m.id;
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg px-3 py-3 cursor-pointer transition-colors group"
              onClick={() => { setConfirmDeleteId(null); onSelectMatch(m.id); }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-100 truncate">
                  {team.name} vs {m.opponent}
                </div>
                <div className="text-xs text-slate-500">
                  {when} · {playerCount} spillere
                  {where && <span> · {where}</span>}
                </div>
              </div>
              {m.result && m.status === 'completed' && (
                <div className="flex items-center gap-1 font-mono text-sm font-bold shrink-0">
                  <span className={m.result.homeScore > m.result.awayScore ? 'text-emerald-400' : m.result.homeScore < m.result.awayScore ? 'text-red-400' : 'text-slate-300'}>
                    {m.result.homeScore}
                  </span>
                  <span className="text-slate-600">–</span>
                  <span className={m.result.awayScore > m.result.homeScore ? 'text-emerald-400' : m.result.awayScore < m.result.homeScore ? 'text-red-400' : 'text-slate-300'}>
                    {m.result.awayScore}
                  </span>
                </div>
              )}
              <Badge variant={st.variant}>{st.label}</Badge>
              {isConfirming ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-red-400">Slett?</span>
                  <button
                    onClick={(e) => handleDeleteClick(e, m.id)}
                    className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded transition-colors"
                  >
                    Ja
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                    className="text-xs text-slate-400 hover:text-slate-200 px-1"
                  >
                    Nei
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => handleDeleteClick(e, m.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                  title="Slett kamp"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="text-emerald-400" size={20} />
            Kamper
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} /> Ny kamp
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg space-y-2 slide-down">
            <Input
              placeholder="Motstander..."
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoFocus
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-28"
              />
            </div>
            <Input
              placeholder="Sted / banenummer..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={submit} disabled={!opponent.trim()} className="flex-1">
                Opprett
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {matches.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Ingen kamper opprettet ennå</p>
        ) : (
          <>
            {renderMatchList(matches.filter((m) => m.status !== 'completed'))}
            {matches.some((m) => m.status === 'completed') && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Avsluttede kamper</p>
                {renderMatchList(matches.filter((m) => m.status === 'completed'), true)}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
