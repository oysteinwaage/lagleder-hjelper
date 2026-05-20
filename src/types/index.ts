export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface MatchSettings {
  playersOnField: number;
  numberOfHalves: number;
  halfDuration: number; // minutes
  subInterval: number; // minutes
}

export interface MatchPlayer {
  playerId: string;
  fieldSeconds: number;
  benchSeconds: number;
  lastEventTime: number;
  onField: boolean;
  lineupOrder: number;
}

export type MatchStatus = 'pending' | 'active' | 'completed';

export interface SubstitutionEvent {
  gameTime: number;
  outPlayerId: string;
  inPlayerId: string;
}

export interface Match {
  id: string;
  teamId: string;
  opponent: string;
  date: string;
  time?: string;
  location?: string;
  status: MatchStatus;
  settings: MatchSettings;
  matchPlayers: MatchPlayer[];
  elapsedSeconds: number;
  startedAt?: number;
  substitutions: SubstitutionEvent[];
  subQueue: { outId: string; inId: string }[];
}

export interface AppState {
  teams: Team[];
  activeTeamId: string | null;
  matches: Match[];
  defaultSettings: MatchSettings;
}
