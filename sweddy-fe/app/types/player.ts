export interface PlayerStats {
  [key: string]: string;
}

export interface Player {
  id: string;
  name: string;
  position?: string;
  stats: PlayerStats;
  updatedAt: number;
}

export interface PlayersCache {
  [playerKey: string]: Player;
}

// Betting types
export type OverOrUnder = "over" | "under";

export interface BetLeg {
  player: string;
  stat: string;
  goal: number;
  overOrUnder: OverOrUnder;
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
