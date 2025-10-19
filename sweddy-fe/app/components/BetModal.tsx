import { useState, useEffect } from "react";
import { BetLeg, EnrichedBet } from "../types/player";
import { getStatsForLeague, formatStatLabel } from "../utils/statHelpers";
import { createBet, updateBet } from "../api/bets";

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
  }, [editBet, isOpen]);

  const addLeg = () => {
    setLegs([
      ...legs,
      {
        player: "",
        stat: "",
        goal: 0,
        overOrUnder: "over",
        league: "nfl",
      },
    ]);
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
      <div className="relative bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full my-8 border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-slate-100">{editBet ? "Edit Bet" : "Create New Bet"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Bet/Payout Amounts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bet Amount (optional)</label>
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Payout Amount (optional)</label>
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

          {/* Legs */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Legs</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
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
              onClick={addLeg}
              className="mt-4 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors border border-slate-600"
            >
              + Add Leg
            </button>
          </div>

          {/* Error Message */}
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">{error}</div>}

          {/* Footer Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
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
