"use client";

import { useBetData } from "./hooks/useBetData";
import BetList from "./components/BetList";
import { useEffect, useState } from "react";
import { sortBets } from "./utils/betSorter";
import BetModal from "./components/BetModal";
import ConfirmDialog from "./components/ConfirmDialog";
import { deleteBet } from "./api/bets";
import { EnrichedBet } from "./types/player";
import { mutate } from "swr";

export default function Dashboard() {
  const { bets, isLoading, error } = useBetData();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoSortEnabled, setAutoSortEnabled] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBet, setEditingBet] = useState<EnrichedBet | null>(null);
  const [deletingBet, setDeletingBet] = useState<EnrichedBet | null>(null);

  // Load autosort preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("autoSortEnabled");
    if (saved !== null) {
      setAutoSortEnabled(JSON.parse(saved));
    }
  }, []);

  // Save autosort preference to localStorage
  useEffect(() => {
    localStorage.setItem("autoSortEnabled", JSON.stringify(autoSortEnabled));
  }, [autoSortEnabled]);

  useEffect(() => {
    if (!isLoading && bets.length > 0) {
      setLastUpdated(new Date());
    }
  }, [bets, isLoading]);

  // Apply sorting if enabled
  const displayBets = autoSortEnabled ? sortBets(bets) : bets;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <div className="flex items-end justify-between gap-2">
            <h1 className="text-6xl font-black bg-gradient-to-r from-orange-400 via-orange-500 to-red-600 text-transparent bg-clip-text whitespace-nowrap">
              SWEDDY
            </h1>
            <p className="text-xl text-slate-300 font-semibold tracking-wide flex-grow">Sweat your parlays in real-time</p>
            <div className="flex items-center gap-4 flex-shrink-0">
              <button
                onClick={handleCreateBet}
                className="px-4 py-2 rounded-full backdrop-blur-sm border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-200 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-200 font-bold text-sm"
              >
                + Create Bet
              </button>
              <div className="relative group">
                <button
                  onClick={() => setAutoSortEnabled(!autoSortEnabled)}
                  className={`px-4 py-2 rounded-full backdrop-blur-sm border transition-all duration-200 ${
                    autoSortEnabled
                      ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30 text-blue-200"
                      : "bg-white/10 border-white/20 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="text-sm font-bold">Autosort {autoSortEnabled ? "✓" : ""}</span>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Sorts bets by completion probability (closest first)
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <span className="text-xs text-slate-400">
                  {bets.length} {bets.length === 1 ? "Parlay" : "Parlays"}
                </span>
              </div>
              {lastUpdated && (
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <span className="text-xs text-slate-400">Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <div className={`w-2.5 h-2.5 rounded-full ${error ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse"}`}></div>
                <span className="text-sm font-medium text-slate-100">{error ? "Disconnected" : "Live"}</span>
              </div>
            </div>
          </div>
        </header>

        <main>
          <BetList
            bets={displayBets}
            isLoading={isLoading}
            error={error}
            onEditBet={handleEditBet}
            onDeleteBet={handleDeleteBet}
          />
        </main>
      </div>

      {/* Bet Modal */}
      <BetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        editBet={editingBet}
      />

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
