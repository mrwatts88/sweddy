import { EnrichedBet } from "../types/player";
import StatProgressBar from "./StatProgressBar";

interface BetCardProps {
  bet: EnrichedBet;
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

export default function BetCard({ bet }: BetCardProps) {
  // Calculate if all legs are hitting (only applies to all-over parlays, since unders are never "safe" until game ends)
  const hasUnders = bet.legs.some((leg) => leg.overOrUnder === "under");
  const allLegsHitting = !hasUnders && bet.legs.every((leg) => {
    return leg.current >= leg.goal;
  });

  // Calculate if bet is already lost (any under bet went over)
  const betLost = bet.legs.some((leg) => {
    if (leg.overOrUnder === "under") {
      return leg.current >= leg.goal;
    }
    return false;
  });

  const borderColor = betLost ? "border-red-500/60" : allLegsHitting ? "border-green-500/60" : "border-blue-400/30";

  return (
    <div
      className={`bg-transparent backdrop-blur-sm rounded-xl shadow-2xl p-6 border-2 ${borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/20`}
    >
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold bg-gradient-to-r from-blue-200 to-cyan-200 text-transparent bg-clip-text">{bet.legs.length} Leg Parlay</h3>
            {(bet.betAmount !== undefined || bet.payoutAmount !== undefined) && (
              <span className="text-sm font-semibold text-slate-300">
                {bet.betAmount !== undefined && `$${bet.betAmount}`}
                {bet.betAmount !== undefined && bet.payoutAmount !== undefined && " → "}
                {bet.payoutAmount !== undefined && `$${bet.payoutAmount}`}
              </span>
            )}
          </div>
          {betLost && <span className="text-red-400 text-2xl animate-pulse">✗</span>}
          {!betLost && allLegsHitting && <span className="text-green-400 text-2xl animate-pulse">✓</span>}
        </div>
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
              label={`${leg.stat.replace(/_/g, ' ')} - ${leg.overOrUnder.toUpperCase()}`}
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
