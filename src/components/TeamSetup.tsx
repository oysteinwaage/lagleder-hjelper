import { useState } from 'react';
import { Plus, Trash2, Pencil, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Team } from '@/types';

interface Props {
  team: Team;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onUpdateTeam: (name: string) => void;
  onUpdateTeamDetails: (location: string, date: string) => void;
  onUpdatePlayer: (id: string, name: string) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function TeamSetup({ team, onAddPlayer, onRemovePlayer, onUpdateTeam, onUpdateTeamDetails, onUpdatePlayer }: Props) {
  const [playerName, setPlayerName] = useState('');
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editingDetails, setEditingDetails] = useState(false);
  const [editLocation, setEditLocation] = useState('');
  const [editDate, setEditDate] = useState('');

  function startEditDetails() {
    setEditLocation(team.location ?? '');
    setEditDate(team.date ?? '');
    setEditingDetails(true);
  }

  function submitDetails() {
    onUpdateTeamDetails(editLocation.trim(), editDate);
    setEditingDetails(false);
  }

  function submitPlayer() {
    if (!playerName.trim()) return;
    onAddPlayer(playerName.trim());
    setPlayerName('');
  }

  function submitEditPlayer(id: string) {
    if (editPlayerName.trim()) onUpdatePlayer(id, editPlayerName.trim());
    setEditingPlayerId(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {editingTeamName ? (
            <div className="flex gap-2 flex-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim()) {
                    onUpdateTeam(editName.trim());
                    setEditingTeamName(false);
                  }
                  if (e.key === 'Escape') setEditingTeamName(false);
                }}
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => {
                  if (editName.trim()) onUpdateTeam(editName.trim());
                  setEditingTeamName(false);
                }}
              >
                Lagre
              </Button>
            </div>
          ) : (
            <CardTitle
              className="cursor-pointer hover:text-emerald-400 transition-colors"
              title="Klikk for å endre navn"
              onClick={() => {
                setEditName(team.name);
                setEditingTeamName(true);
              }}
            >
              {team.name}
            </CardTitle>
          )}
          <span className="text-slate-400 text-sm ml-2 shrink-0">{team.players.length} spillere</span>
        </div>
        {editingDetails ? (
          <div className="flex flex-wrap gap-2 mt-2">
            <Input
              placeholder="Sted..."
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDetails();
                if (e.key === 'Escape') setEditingDetails(false);
              }}
              autoFocus
              className="flex-1 min-w-40 h-8 text-sm"
            />
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDetails();
                if (e.key === 'Escape') setEditingDetails(false);
              }}
              className="w-40 h-8 text-sm"
            />
            <Button size="sm" className="h-8" onClick={submitDetails}>
              Lagre
            </Button>
          </div>
        ) : team.location || team.date ? (
          <button
            onClick={startEditDetails}
            title="Klikk for å endre sted og dato"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors text-left"
          >
            {team.location && (
              <span className="flex items-center gap-1"><MapPin size={12} />{team.location}</span>
            )}
            {team.date && (
              <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(team.date)}</span>
            )}
          </button>
        ) : (
          <button
            onClick={startEditDetails}
            className="mt-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors text-left"
          >
            + Legg til sted og dato
          </button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Navn på spiller..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitPlayer()}
            className="flex-1"
          />
          <Button onClick={submitPlayer} disabled={!playerName.trim()} size="icon">
            <Plus size={18} />
          </Button>
        </div>

        {team.players.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Ingen spillere lagt til ennå</p>
        ) : (
          <ul className="space-y-2">
            {team.players.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-slate-500 text-sm w-5 text-right shrink-0">{i + 1}.</span>
                {editingPlayerId === p.id ? (
                  <div className="flex gap-2 flex-1">
                    <Input
                      value={editPlayerName}
                      onChange={(e) => setEditPlayerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitEditPlayer(p.id);
                        if (e.key === 'Escape') setEditingPlayerId(null);
                      }}
                      autoFocus
                      className="h-7 py-0 text-sm"
                    />
                    <Button size="sm" className="h-7 text-xs px-2" onClick={() => submitEditPlayer(p.id)}>
                      Lagre
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-slate-100">{p.name}</span>
                    <button
                      onClick={() => { setEditPlayerName(p.name); setEditingPlayerId(p.id); }}
                      className="text-slate-500 hover:text-emerald-400 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onRemovePlayer(p.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
