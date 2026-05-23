import { useState, useCallback } from 'react';
import type { AppState, Team, Match, MatchSettings, MatchPlayer, PresetKey } from '@/types';
import { generateId, buildSubQueue } from '@/lib/utils';

function sortMatchByPlaytime(match: Match, completedPlayers: MatchPlayer[]): Match {
  if (match.status !== 'pending') return match;
  const timeMap = new Map(completedPlayers.map((mp) => [mp.playerId, mp.fieldSeconds]));
  const sorted = [...match.matchPlayers].sort((a, b) => {
    const aTime = timeMap.has(a.playerId) ? timeMap.get(a.playerId)! : Infinity;
    const bTime = timeMap.has(b.playerId) ? timeMap.get(b.playerId)! : Infinity;
    return aTime - bTime;
  });
  const updatedPlayers = match.matchPlayers.map((mp) => {
    const newOrder = sorted.findIndex((s) => s.playerId === mp.playerId);
    return { ...mp, lineupOrder: newOrder, onField: newOrder < match.settings.playersOnField };
  });
  const subQueue = buildSubQueue(
    updatedPlayers,
    0,
    match.settings.subInterval * 60,
    (match.settings.firstSubTime ?? 0) * 60
  );
  return { ...match, matchPlayers: updatedPlayers, subQueue };
}

function matchSortKey(m: Match) {
  return m.date + (m.time ? 'T' + m.time : 'T00:00');
}

function applySettingsToPendingMatch(match: Match, settings: MatchSettings): Match {
  if (match.status !== 'pending') return match;
  const updatedPlayers = match.matchPlayers.map((mp, i) => ({
    ...mp,
    onField: i < settings.playersOnField,
  }));
  const subQueue = buildSubQueue(
    updatedPlayers,
    0,
    settings.subInterval * 60,
    (settings.firstSubTime ?? 0) * 60
  );
  return { ...match, settings: { ...settings }, matchPlayers: updatedPlayers, subQueue };
}

const STORAGE_KEY = 'lagleder_app_v1';

const DEFAULT_SETTINGS: MatchSettings = {
  playersOnField: 3,
  numberOfHalves: 1,
  halfDuration: 25,
  subInterval: 3,
  firstSubTime: 0,
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

  const updatePlayer = useCallback(
    (playerId: string, name: string) => {
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) =>
          t.id === s.activeTeamId
            ? { ...t, players: t.players.map((p) => (p.id === playerId ? { ...p, name } : p)) }
            : t
        ),
      }));
    },
    [setState]
  );

  const updateDefaultSettings = useCallback(
    (settings: Partial<MatchSettings>, preset?: PresetKey) => {
      setState((s) => {
        const merged = { ...s.defaultSettings, ...settings };
        return {
          ...s,
          defaultSettings: merged,
          selectedPreset: preset !== undefined ? preset : s.selectedPreset,
          matches: s.matches.map((m) => applySettingsToPendingMatch(m, merged)),
        };
      });
    },
    [setState]
  );

  const createMatch = useCallback(
    (opponent: string, date: string, time?: string, location?: string) => {
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
        const subQueue = buildSubQueue(matchPlayers, 0, settings.subInterval * 60, (settings.firstSubTime ?? 0) * 60);
        const match: Match = {
          id: generateId(),
          teamId: team.id,
          opponent,
          date,
          time,
          location,
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

  const completeMatch = useCallback(
    (matchId: string, frozenPlayers: MatchPlayer[], finalTime: number) => {
      setState((s) => {
        const match = s.matches.find((m) => m.id === matchId);
        if (!match) return s;

        const completedMatch: Match = {
          ...match,
          status: 'completed',
          elapsedSeconds: finalTime,
          matchPlayers: frozenPlayers,
        };

        // Find the next pending match for the same team, sorted by date/time
        const nextPending = s.matches
          .filter((m) => m.id !== matchId && m.teamId === match.teamId && m.status === 'pending')
          .sort((a, b) => matchSortKey(a).localeCompare(matchSortKey(b)))[0];

        return {
          ...s,
          matches: s.matches.map((m) => {
            if (m.id === matchId) return completedMatch;
            if (nextPending && m.id === nextPending.id) return sortMatchByPlaytime(m, frozenPlayers);
            return m;
          }),
        };
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
    updatePlayer,
    updateDefaultSettings,
    createMatch,
    completeMatch,
    updateMatch,
    deleteMatch,
    deleteTeam,
  };
}
