// sweddy-server.ts
import express, { Request, Response } from "express";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Bet, Player, PlayerCache, PlayerStats, ScoreboardResponse, SummaryResponse, NBABoxscore, NFLBoxscore } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATE = "20251012";
const LEAGUES = ["nfl", "nba"];
const app = express();

// Enable CORS for all routes
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

const cache: PlayerCache = {}; // { playerNameLower: { team, stats, updatedAt } }

// Bets structure: each bet is a parlay with multiple legs
// NFL stats use format: "category_LABEL" (e.g., passing_YDS, rushing_YDS, receiving_REC)
let bets: Bet[] = [
  {
    id: "bet-1",
    betAmount: 10,
    payoutAmount: 60,
    legs: [
      { player: "Giannis Antetokounmpo", stat: "REB", goal: 10, overOrUnder: "over", league: "nba" },
      { player: "Myles Turner", stat: "BLK", goal: 1, overOrUnder: "over", league: "nba" },
      { player: "Jordan Love", stat: "passing_YDS", goal: 250, overOrUnder: "over", league: "nfl" },
    ],
  },
  {
    id: "bet-2",
    betAmount: 25,
    payoutAmount: 150,
    legs: [
      { player: "Josh Jacobs", stat: "rushing_YDS", goal: 80, overOrUnder: "under", league: "nfl" },
      { player: "Josh Jacobs", stat: "rushing_TD", goal: 1, overOrUnder: "over", league: "nfl" },
      { player: "Chase Brown", stat: "rushing_YDS", goal: 50, overOrUnder: "over", league: "nfl" },
    ],
  },
  {
    id: "bet-3",
    legs: [
      { player: "Ja'Marr Chase", stat: "receiving_REC", goal: 11, overOrUnder: "over", league: "nfl" },
      { player: "Ja'Marr Chase", stat: "receiving_YDS", goal: 90, overOrUnder: "over", league: "nfl" },
    ],
  },
  {
    id: "bet-4",
    betAmount: 5,
    legs: [
      { player: "Rashan Gary", stat: "defensive_TOT", goal: 5, overOrUnder: "over", league: "nfl" },
      { player: "Trey Hendrickson", stat: "defensive_SACKS", goal: 1, overOrUnder: "over", league: "nfl" },
    ],
  },
  {
    id: "bet-5",
    payoutAmount: 100,
    legs: [
      { player: "Tucker Kraft", stat: "receiving_REC", goal: 4, overOrUnder: "under", league: "nfl" },
      { player: "Chase Brown", stat: "receiving_YDS", goal: 30, overOrUnder: "under", league: "nfl" },
      { player: "Andrei Iosivas", stat: "receiving_REC", goal: 3, overOrUnder: "under", league: "nfl" },
    ],
  },
  {
    id: "bet-6",
    legs: [
      { player: "Josh Jacobs", stat: "receiving_REC", goal: 3, overOrUnder: "over", league: "nfl" },
      { player: "Joe Flacco", stat: "passing_INT", goal: 1, overOrUnder: "under", league: "nfl" },
      { player: "Jordan Love", stat: "rushing_YDS", goal: 15, overOrUnder: "under", league: "nfl" },
      { player: "Tee Higgins", stat: "receiving_YDS", goal: 70, overOrUnder: "over", league: "nfl" },
    ],
  },
];

const leagueToSport: { [key: string]: string } = {
  nba: "basketball",
  nfl: "football",
};

const BETS_FILE_PATH = path.join(__dirname, "bets.json");

// --- Load/Save Bets to File ---
function loadBetsFromFile(): Bet[] {
  try {
    if (fs.existsSync(BETS_FILE_PATH)) {
      const data = fs.readFileSync(BETS_FILE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err: any) {
    console.error("Error loading bets from file:", err.message);
  }
  return [];
}

function saveBetsToFile(betsToSave: Bet[]): void {
  try {
    fs.writeFileSync(BETS_FILE_PATH, JSON.stringify(betsToSave, null, 2), "utf-8");
    console.log("✅ Saved bets to file");
  } catch (err: any) {
    console.error("Error saving bets to file:", err.message);
  }
}

// Load bets from file on startup (or use hardcoded bets if file doesn't exist)
const loadedBets = loadBetsFromFile();
if (loadedBets.length > 0) {
  bets = loadedBets;
  console.log(`📁 Loaded ${bets.length} bets from file`);
} else {
  console.log(`📝 Using hardcoded bets, will save to file on first update`);
  saveBetsToFile(bets); // Save initial hardcoded bets to file
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

      console.log(`✅ Fetching summary for game ${ev.shortName}`);
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

      console.log("✅ Updated Sweddy cache for", ev.shortName, "\n");
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
    setInterval(() => pollESPN(league, DATE), 10000);
  }
}

// --- Express Routes ---
app.get("/api/bets", (req: Request, res: Response) => {
  // Enrich each bet with current stat values from cache
  const enrichedBets = bets.map((bet) => {
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

// POST /api/bets - Create new bet
app.post("/api/bets", (req: Request, res: Response) => {
  try {
    const { betAmount, payoutAmount, legs } = req.body;

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

    bets.push(newBet);
    saveBetsToFile(bets);

    res.status(201).json(newBet);
  } catch (err: any) {
    console.error("Error creating bet:", err.message);
    res.status(500).json({ error: "Failed to create bet" });
  }
});

// PUT /api/bets/:id - Update existing bet
app.put("/api/bets/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { betAmount, payoutAmount, legs } = req.body;

    // Find bet by ID
    const betIndex = bets.findIndex((b) => b.id === id);
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

    // Update bet
    bets[betIndex] = {
      id,
      legs,
      ...(betAmount !== undefined && { betAmount }),
      ...(payoutAmount !== undefined && { payoutAmount }),
    };

    saveBetsToFile(bets);

    res.json(bets[betIndex]);
  } catch (err: any) {
    console.error("Error updating bet:", err.message);
    res.status(500).json({ error: "Failed to update bet" });
  }
});

// DELETE /api/bets/:id - Delete entire bet
app.delete("/api/bets/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find bet by ID
    const betIndex = bets.findIndex((b) => b.id === id);
    if (betIndex === -1) {
      return res.status(404).json({ error: "Bet not found" });
    }

    // Remove bet from array
    bets.splice(betIndex, 1);
    saveBetsToFile(bets);

    res.json({ success: true, message: "Bet deleted" });
  } catch (err: any) {
    console.error("Error deleting bet:", err.message);
    res.status(500).json({ error: "Failed to delete bet" });
  }
});

// DELETE /api/bets/:id/legs/:legIndex - Delete specific leg from bet
app.delete("/api/bets/:id/legs/:legIndex", (req: Request, res: Response) => {
  try {
    const { id, legIndex } = req.params;
    const index = parseInt(legIndex, 10);

    // Find bet by ID
    const betIndexInArray = bets.findIndex((b) => b.id === id);
    if (betIndexInArray === -1) {
      return res.status(404).json({ error: "Bet not found" });
    }

    const bet = bets[betIndexInArray];

    // Validate leg index
    if (isNaN(index) || index < 0 || index >= bet.legs.length) {
      return res.status(400).json({ error: "Invalid leg index" });
    }

    // Don't allow deleting the last leg
    if (bet.legs.length === 1) {
      return res.status(400).json({ error: "Cannot delete the last leg. Delete the entire bet instead." });
    }

    // Remove leg
    bet.legs.splice(index, 1);
    saveBetsToFile(bets);

    res.json(bet);
  } catch (err: any) {
    console.error("Error deleting leg:", err.message);
    res.status(500).json({ error: "Failed to delete leg" });
  }
});

// --- Start Server ---
app.listen(3001, () => console.log("Sweddy backend live on http://localhost:3001"));
