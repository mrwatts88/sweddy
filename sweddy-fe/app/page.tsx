"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestRoomId } from "./api/bets";
import { getStoredRooms, recordRoomVisit, removeStoredRoom, ROOM_STORAGE_KEY, StoredRoom } from "./utils/roomStorage";

export default function Home() {
  const router = useRouter();
  const [rooms, setRooms] = useState<StoredRoom[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRooms = () => {
    setRooms(getStoredRooms());
  };

  useEffect(() => {
    refreshRooms();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ROOM_STORAGE_KEY) {
        refreshRooms();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const roomId = await requestRoomId();
      const updatedRooms = recordRoomVisit(roomId);
      setRooms(updatedRooms);
      router.push(`/room/${roomId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create room";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  const formattedRooms = useMemo(() => {
    return rooms.map((room) => ({
      ...room,
      relative: new Date(room.lastVisited).toLocaleString(),
    }));
  }, [rooms]);

  const handleRemoveRoom = (roomId: string) => {
    setRooms(removeStoredRoom(roomId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-700 rounded-2xl shadow-2xl p-8 backdrop-blur">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-orange-400 via-orange-500 to-red-600 text-transparent bg-clip-text mb-2">
              SWEDDY
            </h1>
            <p className="text-slate-400 font-medium">
              Jump into a room you&apos;ve been to before or create a new one to sweat your parlays together.
            </p>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold tracking-wide shadow-lg hover:from-blue-400 hover:to-cyan-400 transition-all duration-200 disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </button>

          <div className="mt-6 mb-4 text-center">
            <span className="text-slate-500 text-sm uppercase tracking-widest">or choose room</span>
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

          {formattedRooms.length === 0 ? (
            <div className="text-center text-slate-500 text-sm bg-slate-800/70 border border-slate-700 rounded-xl py-6">
              No recent rooms. Create one to get started!
            </div>
          ) : (
            <div className="space-y-3">
              {formattedRooms.map((room) => (
                <div key={room.id} className="flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-xl p-2 hover:border-blue-500/60 transition-colors">
                  <button
                    type="button"
                    onClick={() => handleSelectRoom(room.id)}
                    className="flex-1 text-left px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold tracking-wide text-slate-200">Room {room.id}</span>
                      <span className="text-xs text-slate-500">Last visited {room.relative}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveRoom(room.id);
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors text-lg leading-none"
                    aria-label={`Remove room ${room.id}`}
                    title="Remove room"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
