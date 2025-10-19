import { EnrichedBet } from "../types/player";
import BetCard from "./BetCard";
import { calculateSweatInfo } from "../utils/betSorter";

interface BetListProps {
  bets: EnrichedBet[];
  isLoading: boolean;
  error: string | null;
  onEditBet: (bet: EnrichedBet) => void;
  onDeleteBet: (bet: EnrichedBet) => void;
}

export default function BetList({ bets, isLoading, error, onEditBet, onDeleteBet }: BetListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-500/50 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center bg-red-950/40 backdrop-blur-sm border border-red-500/30 rounded-xl p-8">
          <div className="text-red-400 text-4xl mb-3">⚠️</div>
          <p className="text-red-200 font-semibold">Failed to load bet data</p>
          <p className="text-red-300/70 text-sm mt-2">Verify the Sweddy backend is reachable.</p>
        </div>
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center bg-slate-800/40 backdrop-blur-sm border border-blue-400/30 rounded-xl p-8">
          <div className="text-blue-300 text-4xl mb-3">🏈🏀</div>
          <p className="text-slate-200 font-semibold">No bets configured yet</p>
          <p className="text-slate-400 text-sm mt-2">Add some bets to get started!</p>
        </div>
      </div>
    );
  }

  // Dynamic grid layout based on bet count
  const getGridClass = () => {
    if (bets.length === 1) {
      return "flex justify-center";
    } else if (bets.length === 2) {
      return "grid grid-cols-1 md:grid-cols-2 gap-6";
    } else {
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    }
  };

  return (
    <div className={getGridClass()}>
      {bets.map((bet) => {
        const sweatInfo = calculateSweatInfo(bet);
        return (
          <BetCard
            key={bet.id}
            bet={bet}
            onEdit={() => onEditBet(bet)}
            onDelete={() => onDeleteBet(bet)}
            className={bets.length === 1 ? "max-w-2xl w-full" : ""}
            sweatDistance={sweatInfo.sortDistance}
            sweatType={sweatInfo.sortType}
          />
        );
      })}
    </div>
  );
}
