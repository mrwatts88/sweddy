import useSWR from "swr";
import { EnrichedBet } from "../types/player";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const message = res.status === 404 ? "Room not found" : "Failed to fetch bets";
    throw new Error(message);
  }

  return res.json();
};
export const buildRoomBetsKey = (roomId: string) => `http://localhost:3001/api/rooms/${roomId}/bets`;

export function useBetData(roomId: string) {
  const { data, error, isLoading } = useSWR<EnrichedBet[]>(buildRoomBetsKey(roomId), fetcher, {
    refreshInterval: 15000, // Poll every 15 seconds
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    bets: data || [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to load bets") : null,
  };
}
