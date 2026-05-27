import { useState } from 'react';
import { Plus, Trash2, ChevronRight, Trophy, Download, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Match, Team } from '@/types';
import type { IcalMatch } from '@/lib/ical';
import { fetchIcal, parseIcal } from '@/lib/ical';
import { formatDate } from '@/lib/utils';

interface Props {
  matches: Match[];
  team: Team;
  onCreateMatch: (opponent: string, date: string, time?: string, location?: string) => void;
  onDeleteMatch: (id: string) => void;
  onSelectMatch: (id: string) => void;
  onImportMatches: (matches: IcalMatch[]) => void;
}

const statusLabel: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'secondary' }> = {
  pending: { label: 'Ikke startet', variant: 'secondary' },
  active: { label: 'Pågår', variant: 'warning' },
  halftime: { label: 'Halvtid', variant: 'warning' },
  completed: { label: 'Avsluttet', variant: 'success' },
};

export function MatchList({ matches, team, onCreateMatch, onDeleteMatch, onSelectMatch, onImportMatches }: Props) {
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

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

  function openImport() {
    setImportUrl('');
    setImportError('');
    setImportSuccess('');
    setShowImport(true);
  }

  async function handleImport() {
    const url = importUrl.trim();
    if (!url) return;
    setImportError('');
    setImportSuccess('');
    setImporting(true);
    try {
      const text = await fetchIcal(url);
      const today = new Date().toISOString().slice(0, 10);
      const { teamName, matches: parsed } = parseIcal(text, today);

      if (parsed.length === 0) {
        setImportError('Ingen kommende kamper funnet i kalenderen');
        return;
      }

      onImportMatches(parsed);

      const label = teamName ? `«${teamName}»` : 'kalenderen';
      setImportSuccess(
        `Importerte ${parsed.length} kommende kamp${parsed.length !== 1 ? 'er' : ''} fra ${label}`
      );
      setImportUrl('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Noe gikk galt under import');
    } finally {
      setImporting(false);
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="text-emerald-400" size={20} />
              Kamper
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openImport}>
                <Download size={14} /> Importer
              </Button>
              <Button size="sm" onClick={() => { setShowForm((v) => !v); }}>
                <Plus size={14} /> Ny kamp
              </Button>
            </div>
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

      {/* Import modal */}
      {showImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowImport(false); }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Download size={18} className="text-emerald-400 shrink-0" />
              <h2 className="text-slate-100 font-semibold text-lg">Importer kamper fra fotball.no</h2>
            </div>

            {/* Instructions */}
            <div className="bg-slate-700/50 rounded-lg px-4 py-3 space-y-2 text-sm text-slate-400">
              <p className="font-medium text-slate-300">Slik finner du kalenderlenken:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                <li>Gå til <span className="text-slate-300">fotball.no</span> og finn laget ditt</li>
                <li>Åpne lagets side under <span className="text-slate-300">Kamper - Kamp laget ditt spiller - Klikk på ditt lag</span></li>
                <li>Klikk så på <span className="text-slate-300">Kamper - Alle Kamper - Abonner på kalender</span></li>
                <li>Kopier lenken til <span className="text-slate-300">kalender-abonnementet</span></li>
              </ol>
              <a
                href="https://www.fotball.no/turneringer/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors text-xs mt-1"
              >
                Åpne fotball.no <ExternalLink size={11} />
              </a>
            </div>

            {/* URL input */}
            <div className="space-y-2">
              <Input
                placeholder="https://www.fotball.no/footballapi/Calendar/GetCalendar?teamId=..."
                value={importUrl}
                onChange={(e) => { setImportUrl(e.target.value); setImportError(''); setImportSuccess(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && importUrl.trim() && !importing) handleImport(); }}
                className="font-mono text-sm"
                autoFocus
              />
            </div>

            {/* Feedback */}
            {importError && (
              <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}
            {importSuccess && (
              <div className="flex items-start gap-2 text-emerald-400 text-sm bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-3 py-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1"
                onClick={handleImport}
                disabled={!importUrl.trim() || importing}
              >
                <Loader2 size={15} className={importing ? 'animate-spin' : 'hidden'} />
                <Download size={15} className={importing ? 'hidden' : ''} />
                {importing ? 'Henter...' : 'Importer kamper'}
              </Button>
              <Button variant="outline" onClick={() => setShowImport(false)} disabled={importing}>
                {importSuccess ? 'Lukk' : 'Avbryt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
