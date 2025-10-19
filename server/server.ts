// sweddy-server.ts
import express, { Request, Response } from "express";
import fetch from "node-fetch";
import cors from "cors";
import { Bet, Player, PlayerCache, PlayerStats, ScoreboardResponse, SummaryResponse, NBABoxscore, NFLBoxscore } from "./types.js";

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

const cache: PlayerCache = {}; // { playerNameLower: { team, stats, updatedAt } }

// Bets structure: each bet is a parlay with multiple legs
// NFL stats use format: "category_LABEL" (e.g., passing_YDS, rushing_YDS, receiving_REC)
const bets: Bet[] = [
  {
    id: "bet-1",
    name: "Cross-League Monster",
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
    name: "Rushing Attack",
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
    name: "Receiving Stars",
    legs: [
      { player: "Ja'Marr Chase", stat: "receiving_REC", goal: 11, overOrUnder: "over", league: "nfl" },
      { player: "Ja'Marr Chase", stat: "receiving_YDS", goal: 90, overOrUnder: "over", league: "nfl" },
    ],
  },
  {
    id: "bet-4",
    name: "Defensive Play",
    betAmount: 5,
    legs: [
      { player: "Rashan Gary", stat: "defensive_TOT", goal: 5, overOrUnder: "over", league: "nfl" },
      { player: "Trey Hendrickson", stat: "defensive_SACKS", goal: 1, overOrUnder: "over", league: "nfl" },
    ],
  },
  {
    id: "bet-5",
    name: "Low Volume Unders",
    payoutAmount: 100,
    legs: [
      { player: "Tucker Kraft", stat: "receiving_REC", goal: 4, overOrUnder: "under", league: "nfl" },
      { player: "Chase Brown", stat: "receiving_YDS", goal: 30, overOrUnder: "under", league: "nfl" },
      { player: "Andrei Iosivas", stat: "receiving_REC", goal: 3, overOrUnder: "under", league: "nfl" },
    ],
  },
  {
    id: "bet-6",
    name: "Mixed Bag",
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

// --- Start Server ---
app.listen(3001, () => console.log("Sweddy backend live on http://localhost:3001"));
