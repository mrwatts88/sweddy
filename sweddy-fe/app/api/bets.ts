import { Bet, BetLeg } from "../types/player";

const API_BASE_URL = "http://localhost:3001/api";

export interface CreateBetRequest {
  legs: BetLeg[];
  betAmount?: number;
  payoutAmount?: number;
}

export interface UpdateBetRequest {
  legs: BetLeg[];
  betAmount?: number;
  payoutAmount?: number;
}

/**
 * Create a new bet
 */
export async function createBet(bet: CreateBetRequest): Promise<Bet> {
  const response = await fetch(`${API_BASE_URL}/bets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bet),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create bet");
  }

  return response.json();
}

/**
 * Update an existing bet
 */
export async function updateBet(id: string, bet: UpdateBetRequest): Promise<Bet> {
  const response = await fetch(`${API_BASE_URL}/bets/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bet),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update bet");
  }

  return response.json();
}

/**
 * Delete a bet
 */
export async function deleteBet(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bets/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete bet");
  }
}

/**
 * Delete a specific leg from a bet
 */
export async function deleteBetLeg(betId: string, legIndex: number): Promise<Bet> {
  const response = await fetch(`${API_BASE_URL}/bets/${betId}/legs/${legIndex}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete leg");
  }

  return response.json();
}
