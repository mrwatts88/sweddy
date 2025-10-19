import { NFL_STAT_BLOCKS, NBA_STAT_BLOCKS } from "./statBlocks";

/**
 * Get all NFL stat keys
 */
export function getNFLStats(): string[] {
  return Object.keys(NFL_STAT_BLOCKS).sort();
}

/**
 * Get all NBA stat keys
 */
export function getNBAStats(): string[] {
  return Object.keys(NBA_STAT_BLOCKS).sort();
}

/**
 * Format stat label for display
 * Examples:
 * - "passing_YDS" → "passing YDS"
 * - "PTS" → "PTS"
 * - "3PT" → "3PT"
 */
export function formatStatLabel(stat: string): string {
  const label = stat.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Get stats for a specific league
 */
export function getStatsForLeague(league: "nfl" | "nba"): string[] {
  return league === "nfl" ? getNFLStats() : getNBAStats();
}
