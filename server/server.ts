// sweddy-server.ts
import express, { Request, Response } from "express";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import { Bet, Player, PlayerCache, PlayerStats, ScoreboardResponse, SummaryResponse, NBABoxscore, NFLBoxscore } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATE = undefined; // "20251012";
const LEAGUES = ["nfl", "nba"];
const app = express();

// Enable CORS for all routes
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

const cache: PlayerCache = {}; // { playerNameLower: { team, stats, updatedAt } }

type RoomBetMap = Record<string, Bet[]>;
const ROOM_ID_LENGTH = 6;

const leagueToSport: { [key: string]: string } = {
  nba: "basketball",
  nfl: "football",
};

const BETS_FILE_PATH = (() => {
  const envPath = process.env.BETS_FILE_PATH;
  if (envPath && envPath.trim().length > 0) {
    return path.resolve(envPath);
  }
  return path.join(__dirname, "bets.json");
})();

function ensureDirectoryForFile(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// --- Load/Save Bets to File ---
function loadRoomBetsFromFile(): RoomBetMap {
  try {
    if (fs.existsSync(BETS_FILE_PATH)) {
      const data = fs.readFileSync(BETS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);

      // Support legacy array structure by discarding it; new rooms will be created on demand
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as RoomBetMap;
      }

      console.warn("⚠️ Detected legacy bets.json format. Starting with empty room map.");
    }
  } catch (err: any) {
    console.error("Error loading bets from file:", err.message);
  }
  return {};
}

function saveRoomBetsToFile(betsToSave: RoomBetMap): void {
  try {
    ensureDirectoryForFile(BETS_FILE_PATH);
    fs.writeFileSync(BETS_FILE_PATH, JSON.stringify(betsToSave, null, 2), "utf-8");
  } catch (err: any) {
    console.error("Error saving bets to file:", err.message);
  }
}

// Load bets from file on startup
let roomBets: RoomBetMap = loadRoomBetsFromFile();
if (Object.keys(roomBets).length > 0) {
  console.log(`📁 Loaded bets map for ${Object.keys(roomBets).length} room(s) from file`);
} else {
  console.log("🆕 No existing rooms found. Bets file will be populated on room creation.");
  saveRoomBetsToFile(roomBets);
}

function generateRoomId(): string {
  return randomBytes(4).toString("hex").slice(0, ROOM_ID_LENGTH);
}

function assertRoomExists(roomId: string): Bet[] | null {
  if (!roomBets[roomId]) {
    return null;
  }
  return roomBets[roomId];
}

function createRoom(): string {
  let roomId = generateRoomId();

  while (roomBets[roomId]) {
    roomId = generateRoomId();
  }

  roomBets[roomId] = [];
  saveRoomBetsToFile(roomBets);
  return roomId;
}

// --- Process NBA Boxscore ---
function processNBABoxscore(box: NBABoxscore): Player[] {
  const players: Player[] = [];
  const teamA = box.players[0].team;
  const teamB = box.players[1].team;

  const teamAPlayers = box.players[0].statistics[0].athletes.map((player: any) => ({
    ...player,
    team: teamA,
  }));
  const teamBPlayers = box.players[1].statistics[0].athletes.map((player: any) => ({
    ...player,
    team: teamB,
  }));
  const descriptors = box.players[0].statistics[0].names;

  const allPlayers = [...teamAPlayers, ...teamBPlayers];

  for (const player of allPlayers) {
    const athlete = player?.athlete;
    if (!athlete?.displayName) continue;

    // Map each descriptor to its corresponding value by index
    const statsObj: PlayerStats = {};
    player.stats.forEach((val: string, i: number) => {
      const label = descriptors[i] || `col${i}`;
      statsObj[label] = val;
    });

    if (Object.keys(statsObj).length === 0) continue;

    players.push({
      id: athlete.id,
      name: athlete.displayName,
      position: athlete.position?.abbreviation,
      headshot: athlete.headshot?.href,
      stats: statsObj,
      team: player.team,
      updatedAt: Date.now(),
    });
  }

  return players;
}

// --- Process NFL Boxscore ---
function processNFLBoxscore(box: NFLBoxscore): Player[] {
  const players: { [key: string]: Player } = {};

  // Process both teams
  for (const teamData of box.players) {
    const team = teamData.team;

    // Loop through all stat categories (passing, rushing, receiving, etc.)
    for (const statCategory of teamData.statistics) {
      const categoryName = statCategory.name;
      const labels = statCategory.labels;

      // Process each athlete in this category
      for (const playerData of statCategory.athletes || []) {
        const athlete = playerData.athlete;
        if (!athlete?.displayName) continue;

        const playerKey = athlete.displayName.toLowerCase();

        // Initialize player if not exists
        if (!players[playerKey]) {
          players[playerKey] = {
            id: athlete.id,
            name: athlete.displayName,
            position: athlete.position?.abbreviation,
            headshot: athlete.headshot?.href,
            stats: {},
            team: team,
            updatedAt: Date.now(),
          };
        }

        // Map stats with category prefix (e.g., passing_YDS, rushing_YDS)
        playerData.stats.forEach((val: string, i: number) => {
          const label = labels[i];
          if (label) {
            const statKey = `${categoryName}_${label}`;
            players[playerKey].stats[statKey] = val;
          }
        });
      }
    }
  }

  return Object.values(players);
}

// --- ESPN Poller ---
async function pollESPN(league: string = "nba", date: string | null = null): Promise<void> {
  try {
    // 1. Get today's scoreboard
    let sbUrl = `https://site.api.espn.com/apis/site/v2/sports/${leagueToSport[league]}/${league}/scoreboard`;
    if (date) {
      sbUrl += `?dates=${date}`;
    }

    const sb = (await fetch(sbUrl).then((r) => r.json())) as ScoreboardResponse;
    const events = sb.events || [];

    // 2. Loop through each game and get its summary (contains boxscore)
    for (const ev of events) {
      const gameId = ev.id;
      if (!gameId) {
        console.log("No gameId found for event", ev);
        continue;
      }

      const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/${leagueToSport[league]}/${league}/summary?event=${gameId}`;
      const summary = (await fetch(summaryUrl).then((r) => r.json())) as SummaryResponse;
      const box = summary.boxscore;
      if (!box?.players) {
        console.log("No boxscore found for game", ev.shortName);
        continue;
      }

      // Process boxscore based on sport type
      const players = league === "nfl" ? processNFLBoxscore(box as NFLBoxscore) : processNBABoxscore(box as NBABoxscore);

      // Update cache with processed players
      for (const player of players) {
        const key = player.name.toLowerCase();
        cache[key] = player;
      }
      console.log("✅ Updated Sweddy cache for", league, ev.shortName);
    }

    console.log("Cache size:", Object.keys(cache).length);
  } catch (err: any) {
    console.error("Poll error:", err.message);
  }
}

for (const league of LEAGUES) {
  pollESPN(league, DATE); // run immediately on startup
}

if (!DATE) {
  // Only run once if no date is provided, because providing a date is for dev purposes
  for (const league of LEAGUES) {
    setInterval(() => pollESPN(league, DATE), 15000);
  }
}

// --- Express Routes ---
app.post("/api/rooms", (_req: Request, res: Response) => {
  try {
    const roomId = createRoom();
    res.status(201).json({ roomId });
  } catch (err: any) {
    console.error("Error creating room:", err.message);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.get("/api/rooms/:roomId/bets", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const betsForRoom = assertRoomExists(roomId);

  if (!betsForRoom) {
    return res.status(404).json({ error: "Room not found" });
  }

  const enrichedBets = betsForRoom.map((bet) => {
    const enrichedLegs = bet.legs.map((leg) => {
      const playerKey = leg.player.toLowerCase();
      const playerData = cache[playerKey];

      let current = 0;
      if (playerData && playerData.stats && playerData.stats[leg.stat]) {
        current = parseFloat(playerData.stats[leg.stat]) || 0;
      }

      return {
        ...leg,
        current,
        playerActive: !!playerData,
        headshot: playerData?.headshot,
        teamLogo: playerData?.team?.logo,
      };
    });

    return {
      ...bet,
      legs: enrichedLegs,
    };
  });

  res.json(enrichedBets);
});

// POST /api/rooms/:roomId/bets - Create new bet
app.post("/api/rooms/:roomId/bets", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { betAmount, payoutAmount, legs } = req.body;

    const betsForRoom = assertRoomExists(roomId);
    if (!betsForRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Validation
    if (!legs || !Array.isArray(legs) || legs.length === 0) {
      return res.status(400).json({ error: "At least one leg is required" });
    }

    // Validate each leg
    for (const leg of legs) {
      if (!leg.player || !leg.stat || leg.goal === undefined || !leg.overOrUnder || !leg.league) {
        return res.status(400).json({ error: "Each leg must have player, stat, goal, overOrUnder, and league" });
      }
    }

    // Generate new bet ID
    const newBet: Bet = {
      id: `bet-${Date.now()}`,
      legs,
      ...(betAmount !== undefined && { betAmount }),
      ...(payoutAmount !== undefined && { payoutAmount }),
    };

    betsForRoom.push(newBet);
    saveRoomBetsToFile(roomBets);

    res.status(201).json(newBet);
  } catch (err: any) {
    console.error("Error creating bet:", err.message);
    res.status(500).json({ error: "Failed to create bet" });
  }
});

// PUT /api/rooms/:roomId/bets/:id - Update existing bet
app.put("/api/rooms/:roomId/bets/:id", (req: Request, res: Response) => {
  try {
    const { roomId, id } = req.params;
    const { betAmount, payoutAmount, legs } = req.body;

    const betsForRoom = assertRoomExists(roomId);
    if (!betsForRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    const betIndex = betsForRoom.findIndex((b) => b.id === id);
    if (betIndex === -1) {
      return res.status(404).json({ error: "Bet not found" });
    }

    // Validation
    if (!legs || !Array.isArray(legs) || legs.length === 0) {
      return res.status(400).json({ error: "At least one leg is required" });
    }

    // Validate each leg
    for (const leg of legs) {
      if (!leg.player || !leg.stat || leg.goal === undefined || !leg.overOrUnder || !leg.league) {
        return res.status(400).json({ error: "Each leg must have player, stat, goal, overOrUnder, and league" });
      }
    }

    betsForRoom[betIndex] = {
      id,
      legs,
      ...(betAmount !== undefined && { betAmount }),
      ...(payoutAmount !== undefined && { payoutAmount }),
    };

    saveRoomBetsToFile(roomBets);

    res.json(betsForRoom[betIndex]);
  } catch (err: any) {
    console.error("Error updating bet:", err.message);
    res.status(500).json({ error: "Failed to update bet" });
  }
});

// DELETE /api/rooms/:roomId/bets/:id - Delete entire bet
app.delete("/api/rooms/:roomId/bets/:id", (req: Request, res: Response) => {
  try {
    const { roomId, id } = req.params;

    const betsForRoom = assertRoomExists(roomId);
    if (!betsForRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    const betIndex = betsForRoom.findIndex((b) => b.id === id);
    if (betIndex === -1) {
      return res.status(404).json({ error: "Bet not found" });
    }

    betsForRoom.splice(betIndex, 1);
    saveRoomBetsToFile(roomBets);

    res.json({ success: true, message: "Bet deleted" });
  } catch (err: any) {
    console.error("Error deleting bet:", err.message);
    res.status(500).json({ error: "Failed to delete bet" });
  }
});

// DELETE /api/rooms/:roomId/bets/:id/legs/:legIndex - Delete specific leg from bet
app.delete("/api/rooms/:roomId/bets/:id/legs/:legIndex", (req: Request, res: Response) => {
  try {
    const { roomId, id, legIndex } = req.params;
    const index = parseInt(legIndex, 10);

    const betsForRoom = assertRoomExists(roomId);
    if (!betsForRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    const betIndexInArray = betsForRoom.findIndex((b) => b.id === id);
    if (betIndexInArray === -1) {
      return res.status(404).json({ error: "Bet not found" });
    }

    const bet = betsForRoom[betIndexInArray];

    if (isNaN(index) || index < 0 || index >= bet.legs.length) {
      return res.status(400).json({ error: "Invalid leg index" });
    }

    if (bet.legs.length === 1) {
      return res.status(400).json({ error: "Cannot delete the last leg. Delete the entire bet instead." });
    }

    bet.legs.splice(index, 1);
    saveRoomBetsToFile(roomBets);

    res.json(bet);
  } catch (err: any) {
    console.error("Error deleting leg:", err.message);
    res.status(500).json({ error: "Failed to delete leg" });
  }
});

// --- Start Server ---
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(process.env.PORT || 3001, () => console.log(`Sweddy backend live on http://localhost:${process.env.PORT || 3001}`));
