import { EnrichedBet, EnrichedBetLeg } from "../types/player";
import { getStatBlockSize } from "./statBlocks";

/**
 * Calculate how many normalized "blocks" away a bet is from completion
 * Lower distance = closer to winning
 *
 * For each leg:
 * - Over bet: distance = max(0, goal - current) / blockSize
 * - Under bet: distance = max(0, current - goal) / blockSize (distance grows if approaching/over goal)
 *
 * @param bet - The enriched bet to calculate distance for
 * @returns Total normalized distance (sum of all leg distances)
 */
export function calculateBetDistance(bet: EnrichedBet): number {
  let totalDistance = 0;

  for (const leg of bet.legs) {
    const blockSize = getStatBlockSize(leg.stat);
    let legDistance = 0;

    if (leg.overOrUnder === "over") {
      // For over bets: distance is how much more we need
      legDistance = Math.max(0, leg.goal - leg.current) / blockSize;
    } else {
      // For under bets: distance is 0 if we're under goal, increases as we approach/exceed
      // This ensures under bets that are "safe" (far from goal) have low distance
      if (leg.current < leg.goal) {
        // Still safe - calculate how close we are to the danger zone
        // The closer to goal, the higher the distance (more risky)
        const safetyMargin = leg.goal - leg.current;
        legDistance = 1 / (safetyMargin / blockSize + 1); // Asymptotic approach
      } else {
        // Already failed - treat as infinite distance (bet is lost)
        legDistance = Infinity;
      }
    }

    totalDistance += legDistance;
  }

  return totalDistance;
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

  // Sort active bets by distance (ascending - closest first)
  active.sort((a, b) => {
    const distA = calculateBetDistance(a);
    const distB = calculateBetDistance(b);
    return distA - distB;
  });

  // Return in order: active, wins, losses
  return [...active, ...wins, ...losses];
}
