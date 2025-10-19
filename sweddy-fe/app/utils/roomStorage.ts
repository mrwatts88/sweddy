export interface StoredRoom {
  id: string;
  lastVisited: number;
}

export const ROOM_STORAGE_KEY = "sweddy.rooms";
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

function saveRooms(rooms: StoredRoom[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(rooms));
}

function parseRooms(raw: unknown): StoredRoom[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((room) => {
      if (!room || typeof room !== "object") return null;
      const { id, lastVisited } = room as { id?: unknown; lastVisited?: unknown };
      if (typeof id !== "string" || typeof lastVisited !== "number") return null;
      return { id, lastVisited };
    })
    .filter((room): room is StoredRoom => room !== null);
}

export function getStoredRooms(): StoredRoom[] {
  if (typeof window === "undefined") return [];

  const rawValue = window.localStorage.getItem(ROOM_STORAGE_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    const rooms = parseRooms(parsed);
    const now = Date.now();
    const filtered = rooms.filter((room) => now - room.lastVisited <= ROOM_TTL_MS);

    if (filtered.length !== rooms.length) {
      saveRooms(filtered);
    }

    return filtered.sort((a, b) => b.lastVisited - a.lastVisited);
  } catch (error) {
    console.error("Failed to parse stored rooms:", error);
    return [];
  }
}

export function recordRoomVisit(roomId: string): StoredRoom[] {
  if (typeof window === "undefined") return [];

  const now = Date.now();
  const rooms = getStoredRooms();

  const dedupedMap = new Map<string, StoredRoom>();
  for (const room of rooms) {
    dedupedMap.set(room.id, room);
  }

  dedupedMap.set(roomId, { id: roomId, lastVisited: now });

  const nextRooms = Array.from(dedupedMap.values()).sort((a, b) => b.lastVisited - a.lastVisited);
  saveRooms(nextRooms);

  return nextRooms;
}

export function removeStoredRoom(roomId: string): StoredRoom[] {
  if (typeof window === "undefined") return [];

  const rooms = getStoredRooms();
  const filtered = rooms.filter((room) => room.id !== roomId);
  saveRooms(filtered);
  return filtered;
}
