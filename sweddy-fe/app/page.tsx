"use client";

import { useBetData } from "./hooks/useBetData";
import BetList from "./components/BetList";
import { useEffect, useState } from "react";
import { sortBets, sortByBetAmount, sortByPayoutAmount } from "./utils/betSorter";
import BetModal from "./components/BetModal";
import ConfirmDialog from "./components/ConfirmDialog";
import { deleteBet } from "./api/bets";
import { EnrichedBet } from "./types/player";
import { mutate } from "swr";

type SortMode = "completion" | "bet" | "payout" | "none";

export default function Dashboard() {
  const { bets, isLoading, error } = useBetData();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("completion");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBet, setEditingBet] = useState<EnrichedBet | null>(null);
  const [deletingBet, setDeletingBet] = useState<EnrichedBet | null>(null);

  // Load sort mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sortMode");
    if (saved !== null) {
      setSortMode(saved as SortMode);
    }
  }, []);

  // Save sort mode preference to localStorage
  useEffect(() => {
    localStorage.setItem("sortMode", sortMode);
  }, [sortMode]);

  useEffect(() => {
    if (!isLoading && bets.length > 0) {
      setLastUpdated(new Date());
    }
  }, [bets, isLoading]);

  // Apply sorting based on mode
  const displayBets = (() => {
    switch (sortMode) {
      case "completion":
        return sortBets(bets);
      case "bet":
        return sortByBetAmount(bets);
      case "payout":
        return sortByPayoutAmount(bets);
      case "none":
      default:
        return bets;
    }
  })();

  // Handlers
  const handleCreateBet = () => {
    setEditingBet(null);
    setIsModalOpen(true);
  };

  const handleEditBet = (bet: EnrichedBet) => {
    setEditingBet(bet);
    setIsModalOpen(true);
  };

  const handleDeleteBet = (bet: EnrichedBet) => {
    setDeletingBet(bet);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBet) return;

    try {
      await deleteBet(deletingBet.id);
      mutate("http://localhost:3001/api/bets"); // Refresh bet data
      setDeletingBet(null);
    } catch (err) {
      console.error("Failed to delete bet:", err);
      alert("Failed to delete bet");
    }
  };

  const handleModalSuccess = () => {
    mutate("http://localhost:3001/api/bets"); // Refresh bet data
  };

  const handleSortCycle = () => {
    const modes: SortMode[] = ["completion", "bet", "payout", "none"];
    const currentIndex = modes.indexOf(sortMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSortMode(modes[nextIndex]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <div className="flex flex-col items-center lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
            <div className="flex flex-col items-center lg:items-start">
              <h1 className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-orange-400 via-orange-500 to-red-600 text-transparent bg-clip-text whitespace-nowrap">
                SWEDDY
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 font-semibold tracking-wide text-center lg:text-left">
                Sweat your parlays in real-time
              </p>
            </div>
            <div className="flex flex-col items-center lg:items-end gap-2">
              <div className="flex items-center justify-center lg:justify-start gap-4 flex-shrink-0 flex-wrap sm:flex-nowrap">
                <button
                  onClick={handleCreateBet}
                  className="px-4 py-2 rounded-full backdrop-blur-sm border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-200 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200"
                >
                  <span className="text-sm font-medium">+ Create Bet</span>
                </button>
                <div className="relative group">
                  <button
                    onClick={handleSortCycle}
                    className="px-4 py-2 rounded-full backdrop-blur-sm border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-200 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200"
                  >
                    <span className="text-sm font-medium">
                      Sort: {sortMode === "completion" ? "Sweat" : sortMode === "bet" ? "Bet" : sortMode === "payout" ? "Payout" : "None"}
                    </span>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    Click to cycle through sorting options
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-slate-800"></div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <span className="text-sm font-medium text-slate-400">
                    {bets.length} {bets.length === 1 ? "Parlay" : "Parlays"}
                  </span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <span className={`text-sm font-medium ${error ? "text-red-400" : "text-slate-400"}`}>
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${error ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse"}`}
                    ></span>
                    {error ? "Disconnected" : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Connecting..."}
                  </span>
                </div>
              </div>
              <div className="relative group">
                <button
                  onClick={() => document.querySelector("main")?.scrollIntoView({ behavior: "smooth" })}
                  className="p-2 text-slate-400 hover:text-slate-200 transition-all duration-200"
                  title="Focus"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Focus
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-slate-800"></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="pt-6">
          <BetList bets={displayBets} isLoading={isLoading} error={error} onEditBet={handleEditBet} onDeleteBet={handleDeleteBet} />
        </main>
      </div>

      {/* Bet Modal */}
      <BetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleModalSuccess} editBet={editingBet} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingBet}
        title="Delete Bet"
        message={`Are you sure you want to delete this ${deletingBet?.legs.length}-leg parlay? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingBet(null)}
        isDestructive
      />
    </div>
  );
}
