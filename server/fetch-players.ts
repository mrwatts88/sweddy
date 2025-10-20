import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Player {
  name: string;
  league: string;
}

async function fetchNBAPlayers(): Promise<Player[]> {
  const players: Player[] = [];

  try {
    // Fetch all NBA teams
    console.log("Fetching NBA teams...");
    const teamsResponse = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams");
    const teamsData = (await teamsResponse.json()) as any;

    if (!teamsData.sports?.[0]?.leagues?.[0]?.teams) {
      throw new Error("Unexpected teams API response structure");
    }

    const teams = teamsData.sports[0].leagues[0].teams;
    console.log(`Found ${teams.length} NBA teams`);

    // Fetch roster for each team
    for (const teamWrapper of teams) {
      const team = teamWrapper.team;
      const teamId = team.id;
      const teamName = team.displayName;

      console.log(`Fetching roster for ${teamName} (ID: ${teamId})...`);

      try {
        const rosterResponse = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/roster`);
        const rosterData = (await rosterResponse.json()) as any;

        if (rosterData.athletes) {
          for (const athlete of rosterData.athletes) {
            if (athlete.displayName) {
              players.push({
                name: athlete.displayName,
                league: "nba",
              });
            }
          }
          console.log(`  Added ${rosterData.athletes.length} players from ${teamName}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching roster for team ${teamId}:`, error);
      }
    }

    console.log(`\nTotal NBA players fetched: ${players.length}`);
    return players;
  } catch (error) {
    console.error("Error fetching NBA players:", error);
    throw error;
  }
}

async function main() {
  try {
    const players = await fetchNBAPlayers();

    // Write to JSON file
    const outputPath = path.join(__dirname, "players.json");
    fs.writeFileSync(outputPath, JSON.stringify(players, null, 2));

    console.log(`\n✅ Successfully wrote ${players.length} players to ${outputPath}`);

    // Print a few sample players
    console.log("\nSample players:");
    players.slice(0, 5).forEach((p) => {
      console.log(`  - ${p.name} (${p.league})`);
    });
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

main();
