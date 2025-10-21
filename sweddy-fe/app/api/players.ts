import { getApiBaseUrl } from "../config/api";

export interface PlayerSearchResult {
  name: string;
  league: "nba" | "nfl";
  score?: number;
}

export interface SearchPlayersResponse {
  players: PlayerSearchResult[];
  total: number;
}

export interface SearchPlayersParams {
  query: string;
  league?: "nba" | "nfl";
  limit?: number;
}

/**
 * Search for players with fuzzy matching
 */
export async function searchPlayers({ query, league, limit = 10 }: SearchPlayersParams): Promise<SearchPlayersResponse> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams({ q: query, limit: limit.toString() });

  if (league) {
    params.append("league", league);
  }

  const response = await fetch(`${baseUrl}/players/search?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to search players");
  }

  return response.json();
}
