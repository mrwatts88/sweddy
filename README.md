# Sweddy

**Sweat your parlays in real-time** - A live sports betting tracker for NBA and NFL games.

Sweddy is a full-stack TypeScript application that tracks player statistics from live NBA and NFL games and displays real-time progress on your parlay bets. Watch your bets unfold with dynamic progress bars, auto-sorting by completion probability, and live stat updates.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Flow](#data-flow)
- [Key Concepts](#key-concepts)
- [Backend Details](#backend-details)
- [Frontend Details](#frontend-details)
- [API Reference](#api-reference)
- [Running the Application](#running-the-application)
- [Configuration](#configuration)
- [Development Workflow](#development-workflow)

---

## Overview

Sweddy fetches live game data from ESPN's public APIs, caches player statistics, and enriches user-defined bets with current stat values. The frontend displays each bet as a card with progress bars showing how close each leg is to hitting.

**Core Features:**
- Real-time stat tracking from ESPN APIs (NBA & NFL)
- Create/edit/delete bets through a modal UI
- Auto-sort bets by completion probability using normalized stat units
- Visual indicators for winning/losing bets
- Pulse animations when stats update
- Cross-league parlays (mix NBA and NFL in same bet)
- Persistent bet storage (JSON file)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard (page.tsx)                                │  │
│  │  - Auto-sort toggle                                  │  │
│  │  - Create Bet button → BetModal                      │  │
│  │  - BetList → BetCard (edit/delete)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SWR Hook (15s polling)                              │  │
│  │  GET /api/bets → EnrichedBet[]                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP (3001)
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  REST API                                            │  │
│  │  - GET /api/bets (enriches with cache data)         │  │
│  │  - POST /api/bets (create)                          │  │
│  │  - PUT /api/bets/:id (update)                       │  │
│  │  - DELETE /api/bets/:id (delete bet)                │  │
│  │  - DELETE /api/bets/:id/legs/:legIndex (delete leg) │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Polling Service (10s interval)                     │  │
│  │  - Fetches ESPN scoreboard → game IDs               │  │
│  │  - Fetches boxscores for each game                  │  │
│  │  - Processes stats → updates cache                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Player Cache (in-memory)                           │  │
│  │  { "giannis antetokounmpo": { stats, team, ... } } │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Bet Storage (bets.json)                            │  │
│  │  [ { id, legs[], betAmount?, payoutAmount? } ]      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                       ESPN API                               │
│  - Scoreboard: lists today's games                          │
│  - Summary: game details + boxscore data                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
- **Node.js** with **Express** (REST API)
- **TypeScript** (strict typing)
- **node-fetch** (ESPN API calls)
- **cors** (allow frontend on port 3000)
- **tsx** (TypeScript execution, hot reload)

### Frontend
- **Next.js 14** (App Router, React Server Components)
- **TypeScript**
- **Tailwind CSS** (styling)
- **SWR** (data fetching with polling)

### Data Sources
- **ESPN API** (public, no auth required)
  - Scoreboard: `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard`
  - Summary: `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/summary?event={eventId}`

---

## Project Structure

```
sweddy/
├── server/                      # Backend (Express API)
│   ├── server.ts                # Main server file
│   ├── types.ts                 # TypeScript interfaces
│   ├── bets.json                # Persistent bet storage
│   ├── nfl-stats-map.json       # NFL stat category reference
│   ├── package.json
│   ├── tsconfig.json
│   └── .gitignore
│
└── sweddy-fe/                   # Frontend (Next.js)
    ├── app/
    │   ├── page.tsx             # Main dashboard
    │   ├── layout.tsx           # Root layout
    │   ├── globals.css          # Global styles
    │   ├── favicon.ico
    │   ├── components/
    │   │   ├── BetCard.tsx      # Individual bet card
    │   │   ├── BetList.tsx      # Grid of bet cards
    │   │   ├── BetModal.tsx     # Create/edit bet modal
    │   │   ├── ConfirmDialog.tsx # Delete confirmation
    │   │   ├── PlayerCard.tsx   # (legacy, not used)
    │   │   ├── PlayerList.tsx   # (legacy, not used)
    │   │   └── StatProgressBar.tsx # Progress bar with pulse
    │   ├── hooks/
    │   │   ├── useBetData.ts    # SWR hook for fetching bets
    │   │   └── usePlayerData.ts # (legacy, not used)
    │   ├── types/
    │   │   └── player.ts        # Frontend TypeScript types
    │   ├── utils/
    │   │   ├── statBlocks.ts    # Stat normalization config
    │   │   ├── betSorter.ts     # Auto-sort logic
    │   │   └── statHelpers.ts   # Stat dropdown helpers
    │   └── api/
    │       └── bets.ts          # API client functions
    ├── public/                  # Static assets
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── next.config.ts
    └── eslint.config.mjs
```

---

## Data Flow

### 1. Backend Polling (Every 10 seconds)

```typescript
// server/server.ts
async function pollESPN(league: "nba" | "nfl", date: string | null) {
  // 1. Fetch scoreboard
  const scoreboard = await fetch(`https://site.api.espn.com/.../scoreboard`)
  const events = scoreboard.events // List of games

  // 2. For each game, fetch detailed summary (includes boxscore)
  for (const event of events) {
    const summary = await fetch(`https://site.api.espn.com/.../summary?event=${event.id}`)
    const boxscore = summary.boxscore

    // 3. Process boxscore → extract player stats
    const players = league === "nba"
      ? processNBABoxscore(boxscore)
      : processNFLBoxscore(boxscore)

    // 4. Update cache
    for (const player of players) {
      cache[player.name.toLowerCase()] = player
    }
  }
}
```

**Key Differences:**
- **NBA:** Flat stat structure (`stats: ["15", "8", "3"]`, `names: ["PTS", "REB", "AST"]`)
- **NFL:** Categorized stats (`passing: {...}, rushing: {...}`)
  - NFL stats are namespaced: `passing_YDS`, `rushing_YDS`, `receiving_REC`

### 2. API Request (Frontend → Backend)

```typescript
// Frontend makes request
GET /api/bets

// Backend enriches bets with cache data
app.get("/api/bets", (req, res) => {
  const enrichedBets = bets.map(bet => {
    const enrichedLegs = bet.legs.map(leg => {
      const playerData = cache[leg.player.toLowerCase()]
      const current = parseFloat(playerData?.stats[leg.stat]) || 0

      return {
        ...leg,
        current,
        playerActive: !!playerData,
        headshot: playerData?.headshot,
        teamLogo: playerData?.team?.logo,
      }
    })

    return { ...bet, legs: enrichedLegs }
  })

  res.json(enrichedBets)
})
```

### 3. Frontend Display

```typescript
// Frontend receives enriched bets
const { bets } = useBetData() // SWR polls every 15s

// Auto-sort if enabled
const displayBets = autoSortEnabled ? sortBets(bets) : bets

// Render
<BetList bets={displayBets} />
  → <BetCard bet={bet} />
    → <StatProgressBar current={leg.current} target={leg.goal} />
```

---

## Key Concepts

### Bet Structure

```typescript
interface Bet {
  id: string                    // "bet-1" or "bet-{timestamp}"
  legs: BetLeg[]                // Array of player stat bets
  betAmount?: number            // Optional wager amount
  payoutAmount?: number         // Optional payout amount
}

interface BetLeg {
  player: string                // "Patrick Mahomes"
  stat: string                  // "passing_YDS" or "PTS"
  goal: number                  // Threshold (e.g., 250)
  overOrUnder: "over" | "under" // Bet direction
  league: "nfl" | "nba"         // Each leg can be different league
}
```

**Important:** Bets do NOT have a `name` field. They are displayed as "X Leg Parlay".

### Stat Namespacing (NFL)

NFL stats use format `{category}_{STAT}`:
- `passing_YDS`, `passing_TD`, `passing_INT`
- `rushing_YDS`, `rushing_TD`
- `receiving_REC`, `receiving_YDS`, `receiving_TD`
- `defensive_TOT`, `defensive_SACKS`

NBA stats are flat:
- `PTS`, `REB`, `AST`, `STL`, `BLK`, `3PT`

### Stat Block Sizes (Normalization)

For auto-sorting, stats are normalized using "block sizes" - the typical difficulty of earning one unit:

```typescript
// sweddy-fe/app/utils/statBlocks.ts
const NFL_STAT_BLOCKS = {
  passing_YDS: 25,    // 25 yards = 1 block
  passing_TD: 1,      // 1 TD = 1 block
  rushing_YDS: 10,
  receiving_REC: 1,
  // ...
}

const NBA_STAT_BLOCKS = {
  PTS: 5,             // 5 points = 1 block
  REB: 2,
  AST: 2,
  STL: 1,
  BLK: 1,
  // ...
}
```

**Auto-Sort Formula:**
```typescript
// For each leg
const blockSize = getStatBlockSize(leg.stat)
const distance = (leg.goal - leg.current) / blockSize

// Total bet distance = sum of all leg distances
// Lower distance = closer to completion = sorted higher
```

### Bet States

1. **Active** - Still in play, not all legs hit
2. **Guaranteed Win** - All legs are OVER bets AND all have hit goals
3. **Guaranteed Loss** - Any UNDER bet has gone over its goal

**Note:** Under bets are never "safe" until the game ends, so a bet with any under legs cannot be a guaranteed win.

### Visual Indicators

**Border Colors:**
- Blue (default) - Active bet
- Green - Guaranteed win (all over bets hit)
- Red - Guaranteed loss (under bet went over)

**Progress Bar Colors:**
- Blue - Tracking (not yet hit)
- Green - Over bet hit goal
- Red - Under bet exceeded goal (lost)

**Animations:**
- Pulse effect (1200ms) when stat value changes
- Badge lights up with `bg-blue-400/40`
- Progress bar brightens with `brightness-125`

---

## Backend Details

### Main File: `server/server.ts`

**Key Variables:**
```typescript
const DATE = "20251012"               // For dev: lock to specific date
const LEAGUES = ["nfl", "nba"]        // Leagues to poll
let bets: Bet[] = []                  // Loaded from bets.json
const cache: PlayerCache = {}         // In-memory player stats
```

**Core Functions:**

1. **`processNBABoxscore(box: NBABoxscore): Player[]`**
   - Extracts player stats from NBA boxscore
   - Maps stat names to values using parallel arrays
   - Returns array of Player objects

2. **`processNFLBoxscore(box: NFLBoxscore): Player[]`**
   - Processes categorized NFL stats
   - Namespaces stats with category prefix
   - Handles multiple stat categories per player

3. **`pollESPN(league: string, date: string | null): Promise<void>`**
   - Fetches scoreboard → games
   - Fetches summary/boxscore for each game
   - Processes stats → updates cache
   - Runs every 10 seconds (configurable)

4. **`loadBetsFromFile(): Bet[]`**
   - Reads `bets.json`
   - Returns parsed bet array

5. **`saveBetsToFile(bets: Bet[]): void`**
   - Writes bets array to `bets.json`
   - Pretty-prints with 2-space indent

### ESPN API Structure

**Scoreboard Response:**
```typescript
{
  events: [
    {
      id: "401671748",
      shortName: "MIL @ IND",
      status: { type: { state: "in" } }, // pre, in, post
      // ...
    }
  ]
}
```

**Summary Response (includes boxscore):**
```typescript
{
  boxscore: {
    players: [
      {
        team: { id, abbreviation, logo },
        statistics: [
          {
            name: "passing",  // NFL category
            labels: ["C/ATT", "YDS", "TD"],
            athletes: [
              {
                athlete: { id, displayName, headshot, position },
                stats: ["20/30", "250", "2"]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### File Structure: `bets.json`

```json
[
  {
    "id": "bet-1",
    "betAmount": 10,
    "payoutAmount": 60,
    "legs": [
      {
        "player": "Giannis Antetokounmpo",
        "stat": "REB",
        "goal": 10,
        "overOrUnder": "over",
        "league": "nba"
      }
    ]
  }
]
```

---

## Frontend Details

### Main Page: `app/page.tsx`

**State Management:**
```typescript
const [autoSortEnabled, setAutoSortEnabled] = useState(true)
const [isModalOpen, setIsModalOpen] = useState(false)
const [editingBet, setEditingBet] = useState<EnrichedBet | null>(null)
const [deletingBet, setDeletingBet] = useState<EnrichedBet | null>(null)
```

**Data Fetching:**
```typescript
const { bets, isLoading, error } = useBetData() // SWR with 15s polling
```

**Auto-Sort:**
```typescript
const displayBets = autoSortEnabled ? sortBets(bets) : bets
```

### Components

#### `BetCard.tsx`
Displays a single bet with:
- Header: "X Leg Parlay", bet/payout amounts, edit/delete buttons
- Status indicators: ✓ (win), ✗ (loss)
- Legs: Player name, league/team/player logos, stat progress bar

**Props:**
```typescript
{
  bet: EnrichedBet,
  onEdit: () => void,
  onDelete: () => void
}
```

#### `BetModal.tsx`
Modal for creating/editing bets:
- Optional bet/payout amount fields
- Dynamic leg management (add/remove)
- League dropdown → filters stat dropdown
- Form validation (min 1 leg, required fields)

**Props:**
```typescript
{
  isOpen: boolean,
  onClose: () => void,
  onSuccess: () => void,
  editBet?: EnrichedBet | null  // null = create mode
}
```

#### `StatProgressBar.tsx`
Animated progress bar:
- Shows current/goal values
- Color-coded by over/under logic
- Pulse animation on stat changes (using `useRef` to track previous value)

**Props:**
```typescript
{
  label: string,
  current: number,
  target: number,
  color: string  // "bg-blue-500" | "bg-green-500" | "bg-red-500"
}
```

### Utilities

#### `statBlocks.ts`
Defines normalization factors for all stats:
```typescript
export function getStatBlockSize(stat: string): number
export { NFL_STAT_BLOCKS, NBA_STAT_BLOCKS, STAT_BLOCKS }
```

#### `betSorter.ts`
Auto-sort logic:
```typescript
export function calculateBetDistance(bet: EnrichedBet): number
export function isBetGuaranteedWin(bet: EnrichedBet): boolean
export function isBetGuaranteedLoss(bet: EnrichedBet): boolean
export function sortBets(bets: EnrichedBet[]): EnrichedBet[]
```

Sort order: `[active (by distance), wins, losses]`

#### `statHelpers.ts`
Stat dropdown helpers:
```typescript
export function getNFLStats(): string[]
export function getNBAStats(): string[]
export function formatStatLabel(stat: string): string
export function getStatsForLeague(league: "nfl" | "nba"): string[]
```

---

## API Reference

### `GET /api/bets`
Returns all bets with enriched leg data (current stats, headshots, team logos).

**Response:**
```json
[
  {
    "id": "bet-1",
    "betAmount": 10,
    "payoutAmount": 60,
    "legs": [
      {
        "player": "Giannis Antetokounmpo",
        "stat": "REB",
        "goal": 10,
        "overOrUnder": "over",
        "league": "nba",
        "current": 8,
        "playerActive": true,
        "headshot": "https://...",
        "teamLogo": "https://..."
      }
    ]
  }
]
```

### `POST /api/bets`
Create a new bet.

**Request Body:**
```json
{
  "legs": [
    {
      "player": "Patrick Mahomes",
      "stat": "passing_YDS",
      "goal": 300,
      "overOrUnder": "over",
      "league": "nfl"
    }
  ],
  "betAmount": 20,
  "payoutAmount": 100
}
```

**Validation:**
- At least 1 leg required
- Each leg must have all required fields

**Response:** Created bet object (201)

### `PUT /api/bets/:id`
Update an existing bet.

**Request Body:** Same as POST

**Response:** Updated bet object (200)

### `DELETE /api/bets/:id`
Delete an entire bet.

**Response:** `{ "success": true, "message": "Bet deleted" }` (200)

### `DELETE /api/bets/:id/legs/:legIndex`
Delete a specific leg from a bet.

**Validation:**
- Cannot delete last leg (must delete entire bet instead)

**Response:** Updated bet object (200)

---

## Running the Application

### Prerequisites
- Node.js 18+
- npm

### Backend Setup

```bash
cd server
npm install
npm run dev        # Development with hot reload
# or
npm start          # Production mode
```

Server runs on: `http://localhost:3001`

**Environment Variables:**
- `DATE` - Hardcoded in `server.ts` (set to specific date for dev, comment out for live games)
- `LEAGUES` - Array of leagues to poll (default: `["nfl", "nba"]`)

### Frontend Setup

```bash
cd sweddy-fe
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

**Configuration:**
- API base URL is hardcoded: `http://localhost:3001/api`

### Full Stack

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd sweddy-fe && npm run dev
```

Open browser to: `http://localhost:3000`

---

## Configuration

### Change Polling Date (Dev Mode)

In `server/server.ts`:
```typescript
const DATE = "20251012"  // Lock to this date
// const DATE = null     // Use today's date (live games)
```

### Change Polling Interval

In `server/server.ts`:
```typescript
setInterval(() => pollESPN(LEAGUE, DATE), 10000) // 10 seconds
```

In `sweddy-fe/app/hooks/useBetData.ts`:
```typescript
const { data, error, isLoading } = useSWR<EnrichedBet[]>(
  "http://localhost:3001/api/bets",
  fetcher,
  { refreshInterval: 15000 } // 15 seconds
)
```

### Add New Stats

1. Add to `server/nfl-stats-map.json` or identify NBA stat key
2. Add block size to `sweddy-fe/app/utils/statBlocks.ts`:
```typescript
const NFL_STAT_BLOCKS = {
  // ...
  newCategory_NEWSTAT: 5,  // NFL
}

const NBA_STAT_BLOCKS = {
  // ...
  NEWSTAT: 3,              // NBA
}
```

### Customize Colors

All colors are in Tailwind classes. Key locations:
- **Bet card borders:** `BetCard.tsx` - `borderColor` variable
- **Progress bars:** `BetCard.tsx` - `getBarColor()` function
- **Header gradient:** `page.tsx` - SWEDDY title
- **Modal theme:** `BetModal.tsx` - `bg-slate-800`, etc.

---

## Development Workflow

### Adding a New Feature

1. **Backend changes** (if needed):
   - Update types in `server/types.ts`
   - Add/modify API endpoint in `server/server.ts`
   - Update `bets.json` structure if needed
   - Test with `npm run type-check`

2. **Frontend changes**:
   - Update types in `sweddy-fe/app/types/player.ts`
   - Create/modify components in `app/components/`
   - Update API client in `app/api/bets.ts`
   - Wire up in `page.tsx`

3. **Testing**:
   - Backend: Check logs for ESPN API calls
   - Frontend: Check Network tab for `/api/bets` calls
   - Test create/edit/delete flows
   - Verify JSON persistence in `bets.json`

### Common Tasks

**Add new stat to dropdown:**
1. Ensure stat appears in ESPN API response
2. Add to appropriate stat block in `statBlocks.ts`
3. It will automatically appear in dropdowns

**Change bet display logic:**
1. Modify `BetCard.tsx` - `allLegsHitting` and `betLost` logic
2. Update `getBarColor()` for progress bar colors
3. Update border color calculation

**Modify auto-sort algorithm:**
1. Edit `betSorter.ts` - `calculateBetDistance()` function
2. Adjust stat block sizes in `statBlocks.ts`

**Add new league:**
1. Add to `leagueToSport` mapping in `server/server.ts`
2. Create `process{League}Boxscore()` function
3. Add league option to frontend dropdown
4. Add stat blocks to `statBlocks.ts`

### Debugging

**Backend issues:**
- Check server logs for API errors
- Verify ESPN API responses: `curl https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- Inspect cache: `console.log(cache)`
- Check `bets.json` for persistence

**Frontend issues:**
- Check browser console for errors
- Inspect Network tab for API calls
- Verify SWR is polling: check `/api/bets` calls every 15s
- Check component props with React DevTools

**Common issues:**
- **No stats showing:** Check if games are live (`status.type.state === "in"`)
- **Player not found:** Check exact spelling in bet vs ESPN API
- **Stats not updating:** Verify polling interval, check backend logs
- **Modal not appearing:** Check `isModalOpen` state, z-index issues

---

## Notes for Coding Agents

### Important Patterns

1. **Player names are case-insensitive**
   - Cache uses lowercase keys: `cache[player.name.toLowerCase()]`
   - Bet lookups: `cache[leg.player.toLowerCase()]`

2. **NFL stat namespacing**
   - Always use format: `{category}_{STAT}`
   - Example: `passing_YDS` not `YDS`
   - This prevents collisions (rushing vs receiving yards)

3. **Under bet logic**
   - Under bets are LOST when `current >= goal` (not `>`)
   - Under bets can never be "safe" until game ends
   - A bet with ANY under legs cannot be a guaranteed win

4. **Bet enrichment happens server-side**
   - Backend adds `current`, `playerActive`, `headshot`, `teamLogo` to each leg
   - Frontend receives `EnrichedBet[]` not `Bet[]`

5. **SWR mutation for data refresh**
   - After create/edit/delete: `mutate("http://localhost:3001/api/bets")`
   - This triggers immediate refetch

6. **File persistence**
   - Always call `saveBetsToFile(bets)` after modifying bets array
   - File operations are synchronous (blocking)

### Type Definitions

All TypeScript interfaces are documented in:
- Backend: `server/types.ts`
- Frontend: `sweddy-fe/app/types/player.ts`

Key difference:
- `Bet` vs `EnrichedBet`
- `BetLeg` vs `EnrichedBetLeg` (has `current`, `playerActive`, etc.)

### Testing Tips

1. **Create test bet:**
```bash
curl -X POST http://localhost:3001/api/bets \
  -H "Content-Type: application/json" \
  -d '{
    "legs": [{
      "player": "Giannis Antetokounmpo",
      "stat": "PTS",
      "goal": 30,
      "overOrUnder": "over",
      "league": "nba"
    }]
  }'
```

2. **Check cache:**
```typescript
// Add to server.ts temporarily
console.log('Cache:', Object.keys(cache))
console.log('Giannis stats:', cache['giannis antetokounmpo'])
```

3. **Force stat update:**
Manually edit `bets.json` goals to test different bet states

### Future Enhancement Ideas

- [ ] Delete individual legs from UI (API exists)
- [ ] Search/autocomplete for player names
- [ ] Historical bet tracking (won/lost archive)
- [ ] Live odds integration
- [ ] Push notifications for bet state changes
- [ ] Multi-day game tracking
- [ ] Bet templates/favorites
- [ ] Export bet history to CSV
- [ ] Dark mode toggle
- [ ] Mobile responsive improvements
- [ ] Unit tests (Jest)
- [ ] E2E tests (Playwright)

---

## License

MIT

---

**Built for sweating parlays and tracking degeneracy in real-time. Good luck! 🎲**
