import { Bet, BetLeg } from "../types/player";
import { getApiBaseUrl } from "../config/api";

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

export async function requestRoomId(): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/rooms`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to create room");
  }

  const data = await response.json();
  return data.roomId as string;
}

/**
 * Create a new bet
 */
export async function createBet(roomId: string, bet: CreateBetRequest): Promise<Bet> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/rooms/${roomId}/bets`, {
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
export async function updateBet(roomId: string, id: string, bet: UpdateBetRequest): Promise<Bet> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/rooms/${roomId}/bets/${id}`, {
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
export async function deleteBet(roomId: string, id: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/rooms/${roomId}/bets/${id}`, {
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
export async function deleteBetLeg(roomId: string, betId: string, legIndex: number): Promise<Bet> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/rooms/${roomId}/bets/${betId}/legs/${legIndex}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete leg");
  }

  return response.json();
}
