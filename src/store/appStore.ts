import { useState, useCallback } from 'react';
import type { AppState, Team, Match, MatchSettings, MatchPlayer } from '@/types';
import { generateId, buildSubQueue } from '@/lib/utils';

const STORAGE_KEY = 'lagleder_app_v1';

const DEFAULT_SETTINGS: MatchSettings = {
  playersOnField: 3,
  numberOfHalves: 1,
  halfDuration: 25,
  subInterval: 3,
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState & { team?: Team };
      // Migrate old single-team format
      if (parsed.team && !parsed.teams) {
        return {
          teams: [parsed.team],
          activeTeamId: parsed.team.id,
          matches: parsed.matches ?? [],
          defaultSettings: parsed.defaultSettings ?? DEFAULT_SETTINGS,
        };
      }
      return parsed;
    }
  } catch {}
  return { teams: [], activeTeamId: null, matches: [], defaultSettings: DEFAULT_SETTINGS };
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useAppStore() {
  const [state, setStateRaw] = useState<AppState>(loadState);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const activeTeam = state.teams.find((t) => t.id === state.activeTeamId) ?? null;

  const createTeam = useCallback(
    (name: string) => {
      const team: Team = { id: generateId(), name, players: [] };
      setState((s) => ({ ...s, teams: [...s.teams, team], activeTeamId: team.id }));
    },
    [setState]
  );

  const selectTeam = useCallback(
    (teamId: string) => {
      setState((s) => ({ ...s, activeTeamId: teamId }));
    },
    [setState]
  );

  const updateTeam = useCallback(
    (name: string) => {
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) => (t.id === s.activeTeamId ? { ...t, name } : t)),
      }));
    },
    [setState]
  );

  const addPlayer = useCallback(
    (name: string) => {
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) =>
          t.id === s.activeTeamId
            ? { ...t, players: [...t.players, { id: generateId(), name }] }
            : t
        ),
      }));
    },
    [setState]
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) =>
          t.id === s.activeTeamId
            ? { ...t, players: t.players.filter((p) => p.id !== playerId) }
            : t
        ),
      }));
    },
    [setState]
  );

  const updateDefaultSettings = useCallback(
    (settings: Partial<MatchSettings>) => {
      setState((s) => ({ ...s, defaultSettings: { ...s.defaultSettings, ...settings } }));
    },
    [setState]
  );

  const createMatch = useCallback(
    (opponent: string, date: string, time?: string) => {
      setState((s) => {
        const team = s.teams.find((t) => t.id === s.activeTeamId);
        if (!team) return s;
        const settings = { ...s.defaultSettings };
        const matchPlayers: MatchPlayer[] = team.players.map((p, i) => ({
          playerId: p.id,
          fieldSeconds: 0,
          benchSeconds: 0,
          lastEventTime: 0,
          onField: i < settings.playersOnField,
          lineupOrder: i,
        }));
        const subQueue = buildSubQueue(matchPlayers, 0, settings.playersOnField);
        const match: Match = {
          id: generateId(),
          teamId: team.id,
          opponent,
          date,
          time,
          status: 'pending',
          settings,
          matchPlayers,
          elapsedSeconds: 0,
          substitutions: [],
          subQueue,
        };
        return { ...s, matches: [...s.matches, match] };
      });
    },
    [setState]
  );

  const updateMatch = useCallback(
    (matchId: string, updater: (m: Match) => Match) => {
      setState((s) => ({
        ...s,
        matches: s.matches.map((m) => (m.id === matchId ? updater(m) : m)),
      }));
    },
    [setState]
  );

  const deleteMatch = useCallback(
    (matchId: string) => {
      setState((s) => ({ ...s, matches: s.matches.filter((m) => m.id !== matchId) }));
    },
    [setState]
  );

  const deleteTeam = useCallback(
    (teamId: string) => {
      setState((s) => {
        const remaining = s.teams.filter((t) => t.id !== teamId);
        const newActiveId = s.activeTeamId === teamId
          ? (remaining[0]?.id ?? null)
          : s.activeTeamId;
        return {
          ...s,
          teams: remaining,
          activeTeamId: newActiveId,
          matches: s.matches.filter((m) => m.teamId !== teamId),
        };
      });
    },
    [setState]
  );

  return {
    state,
    activeTeam,
    createTeam,
    selectTeam,
    updateTeam,
    addPlayer,
    removePlayer,
    updateDefaultSettings,
    createMatch,
    updateMatch,
    deleteMatch,
    deleteTeam,
  };
}
