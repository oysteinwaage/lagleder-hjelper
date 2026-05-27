import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Users, Trophy, Settings, Plus, Trash2, Download } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { TeamSetup } from '@/components/TeamSetup';
import { MatchList } from '@/components/MatchList';
import { MatchView } from '@/components/MatchView';
import { AdminSettings } from '@/components/AdminSettings';
import { ImportMatchesModal } from '@/components/ImportMatchesModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PRESETS } from '@/components/AdminSettings';
import type { IcalMatch } from '@/lib/ical';
import type { PresetKey } from '@/types';
import './index.css';

type Tab = 'team' | 'matches' | 'admin';

export default function App() {
  const {
    state,
    activeTeam,
    createTeam,
    selectTeam,
    updateTeam,
    addPlayer,
    removePlayer,
    updatePlayer,
    updateDefaultSettings,
    createMatch,
    completeMatch,
    updateMatch,
    deleteMatch,
    deleteTeam,
    importCalendar,
    importMatchesForTeam,
  } = useAppStore();

  const [tab, setTab] = useState<Tab>('team');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [createPreset, setCreatePreset] = useState<PresetKey>('3er');
  const [importPreset, setImportPreset] = useState<PresetKey>('5er');
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);

  const activeMatch = activeMatchId
    ? state.matches.find((m) => m.id === activeMatchId) ?? null
    : null;

  function handleOnboardingCreate() {
    if (!newTeamName.trim()) return;
    createTeam(newTeamName.trim());
    const preset = PRESETS.find((p) => p.key === createPreset);
    if (preset) updateDefaultSettings(preset.values, preset.key);
    setNewTeamName('');
  }

  function handleCalendarImport(matches: IcalMatch[], teamName: string) {
    if (!teamName || matches.length === 0) return;
    importCalendar(teamName, matches);
    const preset = PRESETS.find((p) => p.key === importPreset);
    if (preset) updateDefaultSettings(preset.values, preset.key);
  }

  // No teams yet — onboarding screen
  if (state.teams.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">⚽</div>
            <h1 className="text-3xl font-bold text-slate-100">Lagleder</h1>
            <p className="text-slate-400 mt-1">Bytte-hjelper for barnefotball</p>
          </div>

          <a
            href="/kampoppsett-obos-miniliga-roa"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-[#003087] hover:bg-[#002070] text-white text-sm font-medium transition-colors"
          >
            <span>🏆</span> OBOS Miniliga – kampoppsett Ready 2026
          </a>

          {/* Manual team creation */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-400 mb-3">Opprett ditt første lag</p>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Lagnavn..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleOnboardingCreate(); }}
                autoFocus
              />
              <Button onClick={handleOnboardingCreate} disabled={!newTeamName.trim()}>
                Opprett
              </Button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type oppsett</label>
              <select
                value={createPreset}
                onChange={(e) => setCreatePreset(e.target.value as PresetKey)}
                className="w-full rounded-md border border-slate-600 bg-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                {PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-700" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">eller</span>
            <div className="flex-1 border-t border-slate-700" />
          </div>

          {/* Calendar import */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-emerald-400 shrink-0" />
              <p className="text-sm font-medium text-slate-200">Importer fra fotball.no</p>
            </div>
            <p className="text-xs text-slate-500">
              Hent lag og kommende kamper automatisk fra fotball.no-kalenderen din.
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type oppsett</label>
              <select
                value={importPreset}
                onChange={(e) => setImportPreset(e.target.value as PresetKey)}
                className="w-full rounded-md border border-slate-600 bg-slate-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                {PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
            <Button className="w-full" onClick={() => setShowImportModal(true)}>
              <Download size={15} /> Importer fra fotball.no
            </Button>
          </div>

          {showImportModal && (
            <ImportMatchesModal
              onClose={() => setShowImportModal(false)}
              onImport={(matches, teamName) => {
                handleCalendarImport(matches, teamName);
                setShowImportModal(false);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Match view
  if (activeMatch && activeTeam) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 max-w-2xl mx-auto">
        <MatchView
          match={activeMatch}
          team={activeTeam}
          onUpdateMatch={(updater) => updateMatch(activeMatch.id, updater)}
          onCompleteMatch={(frozenPlayers, finalTime, result) => completeMatch(activeMatch.id, frozenPlayers, finalTime, result)}
          onBack={() => setActiveMatchId(null)}
        />
      </div>
    );
  }

  const teamMatches = state.matches.filter((m) => m.teamId === state.activeTeamId);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-4 pt-3 pb-2 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-semibold text-slate-100 text-lg">{activeTeam?.name ?? '–'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab('team')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tab === 'team' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={16} /> Lag
          </button>
          <button
            onClick={() => setTab('matches')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tab === 'matches' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy size={16} /> Kamper
          </button>
          <button
            onClick={() => setTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tab === 'admin' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings size={16} /> Admin
          </button>
          <a
            href="/kampoppsett-obos-miniliga-roa"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#5b8fd4] hover:text-white hover:bg-[#003087] transition-colors"
          >
            🏆 OBOS
          </a>
        </div>
      </nav>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {tab === 'team' && (
          <>
            {/* Team switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              {state.teams.map((t) => {
                const isActive = t.id === state.activeTeamId;
                const isConfirming = confirmDeleteTeamId === t.id;
                return (
                  <div key={t.id} className="flex items-center">
                    <button
                      onClick={() => { selectTeam(t.id); setConfirmDeleteTeamId(null); }}
                      className={`px-3 py-1.5 rounded-l-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {t.name}
                    </button>
                    {isConfirming ? (
                      <div className="flex items-center bg-slate-700 rounded-r-lg overflow-hidden">
                        <span className="text-xs text-red-400 px-2">Slett?</span>
                        <button
                          onClick={() => { deleteTeam(t.id); setConfirmDeleteTeamId(null); }}
                          className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1.5 transition-colors"
                        >
                          Ja
                        </button>
                        <button
                          onClick={() => setConfirmDeleteTeamId(null)}
                          className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 transition-colors"
                        >
                          Nei
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteTeamId(t.id)}
                        className={`py-1.5 px-2 rounded-r-lg border-l transition-colors ${
                          isActive
                            ? 'bg-emerald-800 border-emerald-600 text-emerald-300 hover:bg-red-800 hover:text-red-300 hover:border-red-600'
                            : 'bg-slate-700 border-slate-600 text-slate-500 hover:bg-slate-600 hover:text-red-400'
                        }`}
                        title={`Slett ${t.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}

              {showNewTeam ? (
                <div className="flex gap-1.5 items-center slide-down">
                  <Input
                    placeholder="Nytt lagnavn..."
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTeamName.trim()) {
                        createTeam(newTeamName.trim());
                        setNewTeamName('');
                        setShowNewTeam(false);
                      }
                      if (e.key === 'Escape') {
                        setShowNewTeam(false);
                        setNewTeamName('');
                      }
                    }}
                    className="w-40"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newTeamName.trim()) {
                        createTeam(newTeamName.trim());
                        setNewTeamName('');
                        setShowNewTeam(false);
                      }
                    }}
                    disabled={!newTeamName.trim()}
                  >
                    OK
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewTeam(false); setNewTeamName(''); }}>
                    ✕
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewTeam(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 border border-dashed border-slate-600 hover:border-slate-400 transition-colors"
                >
                  <Plus size={14} /> Nytt lag
                </button>
              )}
            </div>

            {activeTeam && (
              <TeamSetup
                team={activeTeam}
                onAddPlayer={addPlayer}
                onRemovePlayer={removePlayer}
                onUpdateTeam={updateTeam}
                onUpdatePlayer={updatePlayer}
              />
            )}
          </>
        )}

        {tab === 'matches' && activeTeam && (
          <>
            {activeTeam.players.length < state.defaultSettings.playersOnField && (
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-3 text-sm text-amber-300">
                Du har færre spillere ({activeTeam.players.length}) enn antall som skal være på banen ({state.defaultSettings.playersOnField}). Legg til flere spillere under «Lag»-fanen.
              </div>
            )}
            <MatchList
              matches={teamMatches}
              team={activeTeam}
              onCreateMatch={createMatch}
              onDeleteMatch={deleteMatch}
              onSelectMatch={setActiveMatchId}
              onImportMatches={importMatchesForTeam}
            />
          </>
        )}

        {tab === 'admin' && (
          <AdminSettings
            settings={state.defaultSettings}
            selectedPreset={state.selectedPreset}
            onSave={updateDefaultSettings}
          />
        )}
      </main>
    <Analytics />
    </div>
  );
}
