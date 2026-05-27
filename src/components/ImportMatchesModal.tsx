import { useState } from 'react';
import { Download, Loader2, AlertCircle, CheckCircle2, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { IcalMatch } from '@/lib/ical';
import { fetchIcal, parseIcal } from '@/lib/ical';

interface Props {
  onClose: () => void;
  /** Called with the parsed matches and the calendar team name on successful import */
  onImport: (matches: IcalMatch[], teamName: string) => void;
}

export function ImportMatchesModal({ onClose, onImport }: Props) {
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  async function handleImport() {
    const url = importUrl.trim();
    if (!url) return;
    setImportError('');
    setImportSuccess('');
    setImporting(true);
    try {
      const text = await fetchIcal(url);
      const today = new Date().toISOString().slice(0, 10);
      const { teamName, matches } = parseIcal(text, today);

      if (matches.length === 0) {
        setImportError('Ingen kommende kamper funnet i kalenderen');
        return;
      }

      onImport(matches, teamName);

      const label = teamName ? `«${teamName}»` : 'kalenderen';
      setImportSuccess(
        `Importerte ${matches.length} kommende kamp${matches.length !== 1 ? 'er' : ''} fra ${label}`
      );
      setImportUrl('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Noe gikk galt under import');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
            <li>Gå til <span className="text-slate-300">fotball.no/turneringer</span> og finn laget ditt</li>
            <li>Åpne lagets side under <span className="text-slate-300 inline-flex items-center gap-1">Kamper <ArrowRight size={11} /> Kamp laget ditt spiller <ArrowRight size={11} /> Klikk på ditt lag</span></li>
            <li>Klikk så på <span className="text-slate-300 inline-flex items-center gap-1">Kamper <ArrowRight size={11} /> Alle Kamper <ArrowRight size={11} /> Abonner på kalender</span></li>
            <li>Kopier lenken til <span className="text-slate-300">kalender-abonnementet</span> (Ikke "Trykk på iPhone", kopier fra teksten)</li>
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
        <Input
          placeholder="https://www.fotball.no/footballapi/Calendar/GetCalendar?teamId=..."
          value={importUrl}
          onChange={(e) => { setImportUrl(e.target.value); setImportError(''); setImportSuccess(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && importUrl.trim() && !importing) handleImport(); }}
          className="font-mono text-sm"
          autoFocus
        />

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
          <Button variant="outline" onClick={onClose} disabled={importing}>
            {importSuccess ? 'Lukk' : 'Avbryt'}
          </Button>
        </div>

      </div>
    </div>
  );
}
