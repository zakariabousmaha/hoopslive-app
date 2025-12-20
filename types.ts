export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED',
  HALFTIME = 'HALFTIME',
}

export interface Team {
  id: string;
  name: string;
  logo: string; // URL
  shortName: string;
}

export interface Score {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  ot?: number;
  total: number;
}

export interface MatchStats {
  fgPercentage: number;
  threePtPercentage: number;
  rebounds: number;
  assists: number;
  turnovers: number;
}

export interface Match {
  id: string;
  leagueId: string;
  leagueName: string;
  country: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: Score;
  awayScore: Score;
  homeStats?: MatchStats;
  awayStats?: MatchStats;
  status: MatchStatus;
  startTime: string; // ISO string
  currentTime?: string; // e.g., "Q4 04:23"
  isFavorite?: boolean;
  tv?: string; // TV Broadcast info
}

export interface League {
  id: string;
  name: string;
  country: string;
  flag: string;
  priority: number;
}

export interface TeamSearchResult {
  id: string;
  name: string;
  logo: string;
  country: string;
  national: boolean;
}