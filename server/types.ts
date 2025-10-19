// ESPN API Response Types

export interface Team {
  id: string;
  uid: string;
  slug: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color: string;
  alternateColor: string;
  logo: string;
}

export interface Headshot {
  href: string;
  alt: string;
}

export interface Position {
  abbreviation: string;
}

export interface Athlete {
  id: string;
  uid: string;
  guid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  links: any[];
  headshot?: Headshot;
  jersey: string;
  position?: Position;
}

// NBA-specific types
export interface NBAPlayerData {
  athlete: Athlete;
  stats: string[];
  team?: Team;
}

export interface NBAStatistics {
  names: string[];
  labels: string[];
  descriptions: string[];
  athletes: NBAPlayerData[];
}

export interface NBATeamBoxscore {
  team: Team;
  statistics: NBAStatistics[];
}

export interface NBABoxscore {
  players: NBATeamBoxscore[];
}

// NFL-specific types
export interface NFLPlayerData {
  athlete: Athlete;
  stats: string[];
}

export interface NFLStatCategory {
  name: string;
  keys: string[];
  text: string;
  labels: string[];
  descriptions: string[];
  athletes: NFLPlayerData[];
  totals: string[];
}

export interface NFLTeamBoxscore {
  team: Team;
  statistics: NFLStatCategory[];
}

export interface NFLBoxscore {
  players: NFLTeamBoxscore[];
}

// Generic event/game types
export interface Event {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  competitions: any[];
  status: any;
}

export interface ScoreboardResponse {
  events: Event[];
  leagues: any[];
  season: any;
}

export interface SummaryResponse {
  boxscore: NBABoxscore | NFLBoxscore;
  header: any;
  plays: any[];
  winprobability: any[];
  leaders: any[];
}

// Internal app types
export interface PlayerStats {
  [key: string]: string;
}

export interface Player {
  id: string;
  name: string;
  position?: string;
  headshot?: string;
  stats: PlayerStats;
  team: Team;
  updatedAt: number;
}

export interface PlayerCache {
  [playerNameLower: string]: Player;
}

export interface BetLeg {
  player: string;
  stat: string;
  goal: number;
  overOrUnder: "over" | "under";
  league: "nfl" | "nba";
}

export interface Bet {
  id: string;
  legs: BetLeg[];
  betAmount?: number;
  payoutAmount?: number;
}

export interface EnrichedBetLeg extends BetLeg {
  current: number;
  playerActive: boolean;
  headshot?: string;
  teamLogo?: string;
}

export interface EnrichedBet {
  id: string;
  legs: EnrichedBetLeg[];
  betAmount?: number;
  payoutAmount?: number;
}
