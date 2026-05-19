import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Team } from '@/types';

interface Props {
  team: Team;
  onAddPlayer: (name: string, number?: number) => void;
  onRemovePlayer: (id: string) => void;
  onUpdateTeam: (name: string) => void;
}

export function TeamSetup({ team, onAddPlayer, onRemovePlayer, onUpdateTeam }: Props) {
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [editName, setEditName] = useState('');

  function submitPlayer() {
    if (!playerName.trim()) return;
    onAddPlayer(playerName.trim(), playerNumber ? parseInt(playerNumber) : undefined);
    setPlayerName('');
    setPlayerNumber('');
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
          <Input
            placeholder="#"
            value={playerNumber}
            onChange={(e) => setPlayerNumber(e.target.value)}
            type="number"
            className="w-16"
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
                <span className="text-slate-500 text-sm w-5 text-right">{i + 1}.</span>
                {p.number !== undefined && (
                  <span className="text-emerald-400 font-mono text-sm w-6">#{p.number}</span>
                )}
                <span className="flex-1 text-slate-100">{p.name}</span>
                <button
                  onClick={() => onRemovePlayer(p.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
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
