import { useState, useEffect, useRef } from "react";
import { BetLeg, EnrichedBet } from "../types/player";
import { getStatsForLeague, formatStatLabel } from "../utils/statHelpers";
import { createBet, updateBet } from "../api/bets";
import { searchPlayers, PlayerSearchResult } from "../api/players";

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editBet?: EnrichedBet | null;
  roomId: string;
}

export default function BetModal({ isOpen, onClose, onSuccess, editBet, roomId }: BetModalProps) {
  const [betAmount, setBetAmount] = useState<string>("");
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [legs, setLegs] = useState<BetLeg[]>([]);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Player search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const legsContainerRef = useRef<HTMLDivElement>(null);

  // Initialize form with edit data
  useEffect(() => {
    if (editBet) {
      setBetAmount(editBet.betAmount?.toString() || "");
      setPayoutAmount(editBet.payoutAmount?.toString() || "");
      setLegs(
        editBet.legs.map((leg) => ({
          player: leg.player,
          stat: leg.stat,
          goal: leg.goal,
          overOrUnder: leg.overOrUnder,
          league: leg.league,
        }))
      );
    } else {
      // Reset form for create mode
      setBetAmount("");
      setPayoutAmount("");
      setLegs([]);
    }
    setError("");
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }, [editBet, isOpen]);

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await searchPlayers({ query: searchQuery, limit: 10 });
        setSearchResults(response.players);
        setShowResults(true);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const addLeg = (playerName?: string, league?: "nba" | "nfl") => {
    const newLeg: BetLeg = {
      player: playerName || "",
      stat: "",
      goal: 0,
      overOrUnder: "over",
      league: league || "nfl",
    };

    setLegs([...legs, newLeg]);

    // Clear search after adding from search results
    if (playerName) {
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);

      // Scroll to the newly created leg
      setTimeout(() => {
        if (legsContainerRef.current) {
          legsContainerRef.current.scrollTop = legsContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const removeLeg = (index: number) => {
    setLegs(legs.filter((_, i) => i !== index));
  };

  const updateLeg = (index: number, field: keyof BetLeg, value: string | number) => {
    const newLegs = [...legs];
    newLegs[index] = { ...newLegs[index], [field]: value };

    // If league changes, reset stat selection
    if (field === "league") {
      newLegs[index].stat = "";
    }

    setLegs(newLegs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (legs.length === 0) {
      setError("At least one leg is required");
      return;
    }

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      if (!leg.player.trim()) {
        setError(`Leg ${i + 1}: Player name is required`);
        return;
      }
      if (!leg.stat) {
        setError(`Leg ${i + 1}: Stat is required`);
        return;
      }
      if (leg.goal <= 0) {
        setError(`Leg ${i + 1}: Goal must be greater than 0`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const betData = {
        legs,
        ...(betAmount && { betAmount: parseFloat(betAmount) }),
        ...(payoutAmount && { payoutAmount: parseFloat(payoutAmount) }),
      };

      if (editBet) {
        await updateBet(roomId, editBet.id, betData);
      } else {
        await createBet(roomId, betData);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save bet");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full my-4 border border-slate-700">
        {/* Form */}
        <form onSubmit={handleSubmit} className="px-0 py-4">
          {/* Bet/Payout Amounts */}
          <div className="grid grid-cols-2 gap-4 mx-4 my-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Bet Amount (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Payout Amount (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Player Search */}
          <div className="mx-4 my-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">Search Players</label>
            <div className="relative">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="Search for a player..."
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute z-10 w-full mt-2 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="py-1">
                      {searchResults.map((player, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-600 transition-colors cursor-pointer group"
                          onClick={() => addLeg(player.name, player.league)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-100 font-medium">{player.name}</span>
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded ${
                                player.league === "nba" ? "bg-orange-500/20 text-orange-400" : "bg-green-500/20 text-green-400"
                              }`}
                            >
                              {player.league.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-slate-400">No players found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Legs */}
          <div className="mx-4 my-4">
            <div ref={legsContainerRef} className="space-y-4 max-h-[300px] overflow-y-auto">
              {legs.map((leg, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-bold text-slate-300">Leg {index + 1}</span>
                    <button type="button" onClick={() => removeLeg(index)} className="text-red-400 hover:text-red-300 text-sm font-medium">
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Player */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Player Name</label>
                      <input
                        type="text"
                        value={leg.player}
                        onChange={(e) => updateLeg(index, "player", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="e.g., Patrick Mahomes"
                      />
                    </div>

                    {/* League */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">League</label>
                      <select
                        value={leg.league}
                        onChange={(e) => updateLeg(index, "league", e.target.value as "nfl" | "nba")}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="nfl">NFL</option>
                        <option value="nba">NBA</option>
                      </select>
                    </div>

                    {/* Stat */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Stat</label>
                      <select
                        value={leg.stat}
                        onChange={(e) => updateLeg(index, "stat", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select stat...</option>
                        {getStatsForLeague(leg.league).map((stat) => (
                          <option key={stat} value={stat}>
                            {formatStatLabel(stat)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Goal */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Goal</label>
                      <input
                        type="number"
                        value={leg.goal || ""}
                        onChange={(e) => updateLeg(index, "goal", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="0"
                        step="0.5"
                        min="0"
                      />
                    </div>

                    {/* Over/Under */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                      <select
                        value={leg.overOrUnder}
                        onChange={(e) => updateLeg(index, "overOrUnder", e.target.value as "over" | "under")}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="over">Over</option>
                        <option value="under">Under</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Leg Button */}
            <button
              type="button"
              onClick={() => addLeg()}
              className="mt-4 w-full px-4 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors border border-slate-600"
            >
              + Add Leg
            </button>
          </div>

          {/* Error Message */}
          {error && <div className="mb-4 mx-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">{error}</div>}

          {/* Footer Buttons */}
          <div className="flex gap-3 justify-end pt-4 px-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editBet ? "Update Bet" : "Create Bet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
