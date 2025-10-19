import { EnrichedBet } from "../types/player";
import { getStatBlockSize } from "./statBlocks";

export interface SweatInfo {
  overDistance: number;
  underDistance: number;
  sortDistance: number;
  sortType: "over" | "under" | "none";
}

// Threshold for determining if a bet has realistic winning potential
const OVER_POTENTIAL_THRESHOLD = 5;

/**
 * Calculate smart sweat-based sorting distances
 *
 * Psychology: Only worry about under legs failing if the bet actually has
 * a realistic chance of winning (over distance < threshold)
 *
 * @param bet - The enriched bet to calculate distances for
 * @returns SweatInfo object with separate distances and smart sort information
 */
export function calculateSweatInfo(bet: EnrichedBet): SweatInfo {
  let overWinningDistance = Infinity;
  let underLosingDistance = Infinity;

  // Calculate over winning distance (total blocks needed for all over legs to hit)
  let overTotal = 0;
  let hasOvers = false;

  // Calculate under losing distance (minimum blocks to safety for any under leg)
  let minUnderDistance = Infinity;
  let hasUnders = false;

  for (const leg of bet.legs) {
    const blockSize = getStatBlockSize(leg.stat);

    if (leg.overOrUnder === "over") {
      hasOvers = true;
      const blocksNeeded = Math.max(0, leg.goal - leg.current) / blockSize;
      overTotal += blocksNeeded;
    } else {
      hasUnders = true;
      if (leg.current >= leg.goal) {
        // Already failed - bet is lost
        minUnderDistance = 0;
      } else {
        const safetyMargin = leg.goal - leg.current;
        const blocksToSafety = safetyMargin / blockSize;
        minUnderDistance = Math.min(minUnderDistance, blocksToSafety);
      }
    }
  }

  // Set final distances
  if (hasOvers) {
    overWinningDistance = overTotal;
  }
  if (hasUnders) {
    underLosingDistance = minUnderDistance;
  }

  // Smart sorting logic: Only consider under danger if bet has winning potential
  let sortDistance: number;
  let sortType: "over" | "under" | "none";

  if (overWinningDistance === Infinity && underLosingDistance === Infinity) {
    sortDistance = Infinity;
    sortType = "none";
  } else if (overWinningDistance === Infinity) {
    // Only unders exist - use under losing distance
    sortDistance = underLosingDistance;
    sortType = "under";
  } else if (underLosingDistance === Infinity) {
    // Only overs exist - use over winning distance
    sortDistance = overWinningDistance;
    sortType = "over";
  } else {
    // Both exist - apply smart logic
    const hasOverPotential = overWinningDistance < OVER_POTENTIAL_THRESHOLD;

    if (overWinningDistance <= underLosingDistance) {
      // Over is closer to hitting - focus on winning
      sortDistance = overWinningDistance;
      sortType = "over";
    } else {
      // Under is closer to failing - but only care if bet has potential
      if (hasOverPotential) {
        // Bet has potential to win, so under danger matters
        sortDistance = underLosingDistance;
        sortType = "under";
      } else {
        // Bet has no realistic chance anyway, ignore under danger
        sortDistance = overWinningDistance;
        sortType = "over";
      }
    }
  }

  return {
    overDistance: overWinningDistance,
    underDistance: underLosingDistance,
    sortDistance,
    sortType,
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateSweatInfo instead
 */
export function calculateBetDistance(bet: EnrichedBet): number {
  return calculateSweatInfo(bet).sortDistance;
}

/**
 * Check if a bet is a guaranteed win
 * A bet is a guaranteed win if:
 * - It has no under bets (unders are never safe until game ends)
 * - All over bets have already hit their goals
 */
export function isBetGuaranteedWin(bet: EnrichedBet): boolean {
  const hasUnders = bet.legs.some((leg) => leg.overOrUnder === "under");
  if (hasUnders) return false;

  return bet.legs.every((leg) => leg.current >= leg.goal);
}

/**
 * Check if a bet is a guaranteed loss
 * A bet is lost if any under bet has gone over its goal
 */
export function isBetGuaranteedLoss(bet: EnrichedBet): boolean {
  return bet.legs.some((leg) => {
    if (leg.overOrUnder === "under") {
      return leg.current >= leg.goal;
    }
    return false;
  });
}

/**
 * Sort bets by completion probability
 * Order:
 * 1. Active bets (sorted by distance, closest first)
 * 2. Guaranteed wins
 * 3. Guaranteed losses
 *
 * @param bets - Array of enriched bets
 * @returns Sorted array of bets
 */
export function sortBets(bets: EnrichedBet[]): EnrichedBet[] {
  const active: EnrichedBet[] = [];
  const wins: EnrichedBet[] = [];
  const losses: EnrichedBet[] = [];

  // Categorize all bets
  for (const bet of bets) {
    if (isBetGuaranteedLoss(bet)) {
      losses.push(bet);
    } else if (isBetGuaranteedWin(bet)) {
      wins.push(bet);
    } else {
      active.push(bet);
    }
  }

  // Sort active bets by sweat distance (ascending - closest first)
  active.sort((a, b) => {
    const sweatA = calculateSweatInfo(a);
    const sweatB = calculateSweatInfo(b);
    return sweatA.sortDistance - sweatB.sortDistance;
  });

  // Return in order: active, wins, losses
  return [...active, ...wins, ...losses];
}

/**
 * Sort bets by bet amount (high to low)
 * Bets without bet amounts go to the end in their original order
 *
 * @param bets - Array of enriched bets
 * @returns Sorted array of bets
 */
export function sortByBetAmount(bets: EnrichedBet[]): EnrichedBet[] {
  const withAmounts: Array<{ bet: EnrichedBet; originalIndex: number }> = [];
  const withoutAmounts: Array<{ bet: EnrichedBet; originalIndex: number }> = [];

  // Separate bets with and without bet amounts, preserving original indices
  bets.forEach((bet, index) => {
    if (bet.betAmount !== undefined) {
      withAmounts.push({ bet, originalIndex: index });
    } else {
      withoutAmounts.push({ bet, originalIndex: index });
    }
  });

  // Sort bets with amounts by bet amount (high to low)
  withAmounts.sort((a, b) => (b.bet.betAmount || 0) - (a.bet.betAmount || 0));

  // Sort bets without amounts by original position (stable)
  withoutAmounts.sort((a, b) => a.originalIndex - b.originalIndex);

  // Combine: bets with amounts first, then bets without amounts
  return [...withAmounts.map((item) => item.bet), ...withoutAmounts.map((item) => item.bet)];
}

/**
 * Sort bets by payout amount (high to low)
 * Bets without payout amounts go to the end in their original order
 *
 * @param bets - Array of enriched bets
 * @returns Sorted array of bets
 */
export function sortByPayoutAmount(bets: EnrichedBet[]): EnrichedBet[] {
  const withAmounts: Array<{ bet: EnrichedBet; originalIndex: number }> = [];
  const withoutAmounts: Array<{ bet: EnrichedBet; originalIndex: number }> = [];

  // Separate bets with and without payout amounts, preserving original indices
  bets.forEach((bet, index) => {
    if (bet.payoutAmount !== undefined) {
      withAmounts.push({ bet, originalIndex: index });
    } else {
      withoutAmounts.push({ bet, originalIndex: index });
    }
  });

  // Sort bets with amounts by payout amount (high to low)
  withAmounts.sort((a, b) => (b.bet.payoutAmount || 0) - (a.bet.payoutAmount || 0));

  // Sort bets without amounts by original position (stable)
  withoutAmounts.sort((a, b) => a.originalIndex - b.originalIndex);

  // Combine: bets with amounts first, then bets without amounts
  return [...withAmounts.map((item) => item.bet), ...withoutAmounts.map((item) => item.bet)];
}
