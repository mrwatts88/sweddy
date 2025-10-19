import useSWR from "swr";
import { EnrichedBet } from "../types/player";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBetData() {
  const { data, error, isLoading } = useSWR<EnrichedBet[]>("http://localhost:3001/api/bets", fetcher, {
    refreshInterval: 15000, // Poll every 15 seconds
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    bets: data || [],
    isLoading,
    error,
  };
}
