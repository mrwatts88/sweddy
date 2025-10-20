import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Player {
  name: string;
  league: string;
}

async function fetchNFLPlayers(): Promise<Player[]> {
  const players: Player[] = [];

  try {
    // Fetch all NFL teams
    console.log('Fetching NFL teams...');
    const teamsResponse = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams');
    const teamsData = await teamsResponse.json() as any;

    if (!teamsData.sports?.[0]?.leagues?.[0]?.teams) {
      throw new Error('Unexpected teams API response structure');
    }

    const teams = teamsData.sports[0].leagues[0].teams;
    console.log(`Found ${teams.length} NFL teams`);

    // Fetch roster for each team
    for (const teamWrapper of teams) {
      const team = teamWrapper.team;
      const teamId = team.id;
      const teamName = team.displayName;

      console.log(`Fetching roster for ${teamName} (ID: ${teamId})...`);

      try {
        const rosterResponse = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`
        );
        const rosterData = await rosterResponse.json() as any;

        if (rosterData.athletes && Array.isArray(rosterData.athletes)) {
          let teamPlayerCount = 0;

          // Iterate through position groups
          for (const positionGroup of rosterData.athletes) {
            // Skip practice squad players
            if (positionGroup.position === 'practiceSquad') {
              console.log(`  Skipping practice squad for ${teamName}`);
              continue;
            }

            // Add players from this position group
            if (positionGroup.items && Array.isArray(positionGroup.items)) {
              for (const athlete of positionGroup.items) {
                if (athlete.displayName) {
                  players.push({
                    name: athlete.displayName,
                    league: 'nfl'
                  });
                  teamPlayerCount++;
                }
              }
            }
          }

          console.log(`  Added ${teamPlayerCount} players from ${teamName}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching roster for team ${teamId}:`, error);
      }
    }

    console.log(`\nTotal NFL players fetched: ${players.length}`);
    return players;

  } catch (error) {
    console.error('Error fetching NFL players:', error);
    throw error;
  }
}

async function main() {
  try {
    const nflPlayers = await fetchNFLPlayers();

    // Read existing players.json
    const outputPath = path.join(__dirname, 'players.json');
    let existingPlayers: Player[] = [];

    if (fs.existsSync(outputPath)) {
      const existingData = fs.readFileSync(outputPath, 'utf-8');
      existingPlayers = JSON.parse(existingData);
      console.log(`\nFound ${existingPlayers.length} existing players in players.json`);
    }

    // Append NFL players to existing players
    const allPlayers = [...existingPlayers, ...nflPlayers];

    // Write combined data to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(allPlayers, null, 2));

    console.log(`\n✅ Successfully appended ${nflPlayers.length} NFL players to ${outputPath}`);
    console.log(`📊 Total players in file: ${allPlayers.length}`);

    // Print a few sample NFL players
    console.log('\nSample NFL players added:');
    nflPlayers.slice(0, 5).forEach(p => {
      console.log(`  - ${p.name} (${p.league})`);
    });

  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();
