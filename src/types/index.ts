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
  firstSubTime: number; // minutes — 0 = disabled, use subInterval from start
}

export interface MatchPlayer {
  playerId: string;
  fieldSeconds: number;
  benchSeconds: number;
  keeperSeconds?: number;
  lastEventTime: number;
  onField: boolean;
  lineupOrder: number;
}

export type MatchStatus = 'pending' | 'active' | 'halftime' | 'completed';

export interface SubstitutionEvent {
  gameTime: number;
  outPlayerId: string;
  inPlayerId: string;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
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
  currentHalf?: number;
  keeperId?: string;
  keeperSince?: number;
  preset?: PresetKey;
  substitutions: SubstitutionEvent[];
  subQueue: { outId: string; inId: string; dueTime: number }[];
  result?: MatchResult;
}

export type PresetKey = '3er' | '5er';

export interface AppState {
  teams: Team[];
  activeTeamId: string | null;
  matches: Match[];
  defaultSettings: MatchSettings;
  selectedPreset?: PresetKey;
}
