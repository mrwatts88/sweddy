import { EnrichedBet } from "../types/player";
import StatProgressBar from "./StatProgressBar";

interface BetCardProps {
  bet: EnrichedBet;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
  sweatDistance?: number;
  sweatType?: "over" | "under" | "none";
}

// Helper function to get color based on over/under and current vs goal
function getBarColor(current: number, goal: number, overOrUnder: string): string {
  if (overOrUnder === "over") {
    // Over bet: green if current >= goal, blue otherwise
    return current >= goal ? "bg-green-500" : "bg-blue-500";
  } else {
    // Under bet: red if current >= goal (lost), blue if current < goal (still good)
    return current >= goal ? "bg-red-500" : "bg-blue-500";
  }
}

export default function BetCard({ bet, onEdit, onDelete, className = "", sweatDistance, sweatType }: BetCardProps) {
  // Calculate if all legs are hitting (only applies to all-over parlays, since unders are never "safe" until game ends)
  const hasUnders = bet.legs.some((leg) => leg.overOrUnder === "under");
  const allLegsHitting =
    !hasUnders &&
    bet.legs.every((leg) => {
      return leg.current >= leg.goal;
    });

  // Calculate if bet is already lost (any under bet went over)
  const betLost = bet.legs.some((leg) => {
    if (leg.overOrUnder === "under") {
      return leg.current >= leg.goal;
    }
    return false;
  });

  // Helper function to determine if a bet type gets the "sweddy" treatment
  const isSweddy = (overOrUnder: string) => {
    return sweatDistance !== undefined && sweatDistance < 3 && sweatType === overOrUnder && !betLost && !allLegsHitting;
  };

  // Determine border color based on bet status and sweat level
  const showSweddyBorder = isSweddy("over");
  const showCautionBorder = isSweddy("under");
  const borderColor = betLost
    ? "border-gray-500/60"
    : allLegsHitting
    ? "border-green-500/60"
    : showSweddyBorder
    ? "border-orange-400/80"
    : showCautionBorder
    ? "border-red-500/80"
    : "border-blue-400/30";

  return (
    <div
      className={`bg-transparent backdrop-blur-sm rounded-xl shadow-2xl p-6 border-2 ${borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/20 ${className}`}
    >
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {betLost && <span className="text-gray-400 text-2xl">✗</span>}
            {!betLost && allLegsHitting && <span className="text-green-400 text-2xl animate-pulse">✓</span>}
            {(isSweddy("over") || isSweddy("under")) && (
              <div className="relative group">
                <span className={`text-xl animate-pulse ${sweatType === "over" ? "text-orange-400" : "text-red-400"}`}>
                  {sweatType === "over" ? "🔥" : "🚨"}
                </span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {sweatType === "over" ? "Sweddy! Close to hitting!" : "Danger! Close to losing!"}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>
            )}
            <h3 className="text-lg font-bold bg-gradient-to-r from-blue-200 to-cyan-200 text-transparent bg-clip-text">
              {bet.legs.length} Leg{bet.legs.length > 1 ? "s" : ""}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onEdit} className="text-slate-400 hover:text-blue-400 transition-colors p-1" title="Edit bet">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button onClick={onDelete} className="text-slate-400 hover:text-red-400 transition-colors p-1" title="Delete bet">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
        {(bet.betAmount !== undefined || bet.payoutAmount !== undefined) && (
          <div>
            <span className="text-sm font-semibold text-slate-300">
              {bet.betAmount !== undefined && `Bet: $${bet.betAmount}`}
              {bet.betAmount !== undefined && bet.payoutAmount !== undefined && " "}
              {bet.payoutAmount !== undefined && `Payout: $${bet.payoutAmount}`}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {bet.legs.map((leg, idx) => (
          <div key={idx} className="pb-4 border-b border-white/10 last:border-b-0 last:pb-0">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-slate-100">{leg.player}</span>
                  <div className="flex items-center -space-x-2">
                    <div className="relative w-7 h-7 z-0">
                      <div className="absolute inset-0 rounded-full bg-slate-200"></div>
                      <img
                        src={`https://a.espncdn.com/i/teamlogos/leagues/500/${leg.league}.png`}
                        alt={`${leg.league.toUpperCase()} logo`}
                        className="relative w-7 h-7 rounded-full object-cover ring-2 ring-blue-400"
                      />
                    </div>
                    {leg.teamLogo && (
                      <div className="relative w-7 h-7 z-10">
                        <div className="absolute inset-0 rounded-full bg-slate-200"></div>
                        <img src={leg.teamLogo} alt="Team logo" className="relative w-7 h-7 rounded-full object-cover ring-2 ring-blue-400" />
                      </div>
                    )}
                    {leg.headshot && (
                      <div className="relative w-7 h-7 z-20">
                        <div className="absolute inset-0 rounded-full bg-slate-200"></div>
                        <img src={leg.headshot} alt={leg.player} className="relative w-7 h-7 rounded-full object-cover ring-2 ring-blue-400" />
                      </div>
                    )}
                  </div>
                </div>
                {!leg.playerActive && <span className="text-xs text-orange-400 italic font-medium">Inactive</span>}
              </div>
            </div>
            <StatProgressBar
              label={`${leg.stat.replace(/_/g, " ")} - ${leg.overOrUnder.toUpperCase()}`}
              current={leg.current}
              target={leg.goal}
              color={getBarColor(leg.current, leg.goal, leg.overOrUnder)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
