/**
 * Stat Block Sizes
 *
 * Defines the "unit size" for each stat to normalize probability of achievement.
 * Lower block size = easier to achieve one unit
 * Higher block size = harder to achieve one unit
 *
 * This allows us to compare stats across different categories when calculating
 * how close a bet is to completion.
 */

// NFL stat block sizes (prefixed with category_)
const NFL_STAT_BLOCKS: { [key: string]: number } = {
  // Passing
  passing_YDS: 25,
  passing_TD: 1,
  passing_INT: 1,
  passing_SACKS: 1,

  // Rushing
  rushing_YDS: 10,
  rushing_TD: 1,
  rushing_CAR: 5,

  // Receiving
  receiving_YDS: 15,
  receiving_REC: 1,
  receiving_TD: 1,
  receiving_TGTS: 2,

  // Defensive
  defensive_SACKS: 1,
  "defensive_QB HTS": 1,
  defensive_TD: 1,

  // Interceptions
  interceptions_INT: 1,
  interceptions_YDS: 15,
  interceptions_TD: 1,

  // Fumbles
  fumbles_FUM: 1,
  fumbles_LOST: 1,
  fumbles_REC: 1,

  // Kick Returns
  kickReturns_NO: 1,
  kickReturns_YDS: 20,
  kickReturns_TD: 1,

  // Punt Returns
  puntReturns_NO: 1,
  puntReturns_YDS: 15,
  puntReturns_TD: 1,

  // Kicking
  kicking_FG: 1,
  kicking_XP: 1,
  kicking_PTS: 3,

  // Punting
  punting_NO: 2,
  punting_YDS: 30,
  punting_TB: 1,
  "punting_In 20": 1,
};

// NBA stat block sizes (no prefix)
const NBA_STAT_BLOCKS: { [key: string]: number } = {
  PTS: 7,
  REB: 3,
  AST: 2,
  STL: 1,
  BLK: 1,
  "3PT": 1,
  FG: 2,
  FT: 3,
  TO: 1,
  OREB: 1,
  DREB: 2,
  MIN: 5,
};

// Combined lookup
const STAT_BLOCKS = {
  ...NFL_STAT_BLOCKS,
  ...NBA_STAT_BLOCKS,
};

/**
 * Get the block size for a given stat
 * @param stat - The stat key (e.g., "passing_YDS", "PTS", "receiving_REC")
 * @returns The block size for normalization (defaults to 1 if unknown)
 */
export function getStatBlockSize(stat: string): number {
  return STAT_BLOCKS[stat] ?? 1;
}

/**
 * Export the full config for reference if needed
 */
export { NFL_STAT_BLOCKS, NBA_STAT_BLOCKS, STAT_BLOCKS };
