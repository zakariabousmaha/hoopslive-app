import { Match, MatchStatus, TeamSearchResult } from '../types';
import { MOCK_MATCHES } from '../constants';

// WE USE THE KEY YOU PROVIDED DIRECTLY HERE TO ENSURE IT WORKS IN THE PREVIEW
const FALLBACK_KEY = '1ddf639462570bb282677f5730d87998';
const API_URL = 'https://v1.basketball.api-sports.io'; 

const getApiKey = () => {
  // 1. Check Vite env safely
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BASKETBALL_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_BASKETBALL_API_KEY;
  }
  // 2. Check Process env safely
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.BASKETBALL_API_KEY) return process.env.BASKETBALL_API_KEY;
    if (process.env.REACT_APP_BASKETBALL_API_KEY) return process.env.REACT_APP_BASKETBALL_API_KEY;
  }
  // 3. Fallback to the hardcoded key
  return FALLBACK_KEY;
};

const API_KEY = getApiKey();

// Helper to dynamically adjust mock matches to the requested date
// This ensures that if the API fails, the user still sees "data" for Yesterday/Tomorrow instead of empty screen
const getMockMatchesForDate = (date: Date): Match[] => {
    return MOCK_MATCHES.map(m => {
        const d = new Date(date);
        const original = new Date(m.startTime);
        
        // If the match is LIVE or SCHEDULED, keep the time but change the date
        // If it's FINISHED, maybe we should keep it in the past? 
        // For simplicity in this demo, we just move all mocks to the selected date
        d.setHours(original.getHours(), original.getMinutes(), 0, 0);
        
        return {
            ...m,
            startTime: d.toISOString()
        };
    });
};

export const getMatches = async (date: Date): Promise<{ matches: Match[], isLive: boolean }> => {
  // Format date as YYYY-MM-DD using local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // If we don't have a key, return mock data immediately
  if (!API_KEY) {
    console.warn("No API_KEY found. Returning mock data.");
    return new Promise(resolve => setTimeout(() => resolve({ matches: getMockMatchesForDate(date), isLive: false }), 500));
  }

  console.log(`Fetching matches for: ${dateStr}`);

  try {
    const response = await fetch(`${API_URL}/games?date=${dateStr}`, {
      method: 'GET',
      headers: {
        'x-apisports-key': API_KEY
      }
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
        console.warn("API Returned Errors (Falling back to mock):", data.errors);
        return { matches: getMockMatchesForDate(date), isLive: false };
    }

    if (!data.response || !Array.isArray(data.response)) {
        return { matches: [], isLive: true };
    }

    const transformedMatches = data.response.map(transformApiMatch);
    
    console.log(`Found ${transformedMatches.length} matches from API.`);

    // If API returns 0 matches (e.g. far future date), just return empty list, don't mock.
    // Unless it's today and empty, which might be weird. 
    // But usually we trust the API if it returns empty list.
    return { matches: transformedMatches, isLive: true };

  } catch (error) {
    console.warn("Network or API Error fetching matches (Using Demo Data):", error);
    // On network error (Failed to fetch), fallback to mocks so the app looks functional
    return { matches: getMockMatchesForDate(date), isLive: false };
  }
};

export const getHeadToHead = async (teamAId: string, teamBId: string): Promise<Match[]> => {
    if (!API_KEY) {
        return new Promise(resolve => setTimeout(() => resolve([]), 500));
    }

    try {
        const response = await fetch(`${API_URL}/games?h2h=${teamAId}-${teamBId}`, {
            method: 'GET',
            headers: {
                'x-apisports-key': API_KEY
            }
        });

        if (!response.ok) return [];

        const data = await response.json();

        if (data.response && Array.isArray(data.response)) {
            // Sort by date descending (newest first) and take last 10
            return data.response
                .map(transformApiMatch)
                .sort((a: Match, b: Match) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .slice(0, 10);
        }
        return [];
    } catch (error) {
        console.error("Error fetching H2H:", error);
        return [];
    }
}

// --- GLOBAL TEAM SEARCH ---
export const searchTeams = async (query: string): Promise<TeamSearchResult[]> => {
    if (!query || query.length < 3) return [];
    
    // Mock fallback
    if (!API_KEY) {
        return [
            { id: '1', name: 'Los Angeles Lakers', logo: 'https://media.api-sports.io/basketball/teams/145.png', country: 'USA', national: false },
            { id: '2', name: 'Golden State Warriors', logo: 'https://media.api-sports.io/basketball/teams/146.png', country: 'USA', national: false }
        ].filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
    }

    try {
        const response = await fetch(`${API_URL}/teams?search=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: { 'x-apisports-key': API_KEY }
        });

        if (!response.ok) return [];
        const data = await response.json();

        if (data.response && Array.isArray(data.response)) {
            return data.response.map((team: any) => ({
                id: String(team.id),
                name: team.name,
                logo: team.logo,
                country: team.country.name,
                national: team.national
            }));
        }
        return [];
    } catch (error) {
        console.error("Error searching teams:", error);
        return [];
    }
};

// --- TEAM SCHEDULE (Current Season) ---
export const getTeamSchedule = async (teamId: string): Promise<Match[]> => {
     if (!API_KEY) return [];

     // Assuming current season is "2024-2025" - API-Basketball requires a season string
     const season = "2024-2025"; 

     try {
        const response = await fetch(`${API_URL}/games?team=${teamId}&season=${season}`, {
            method: 'GET',
            headers: { 'x-apisports-key': API_KEY }
        });

        if (!response.ok) return [];
        const data = await response.json();

        if (data.response && Array.isArray(data.response)) {
            // Transform and Sort: 
            return data.response.map(transformApiMatch);
        }
        return [];
     } catch (error) {
         console.error("Error fetching team schedule", error);
         return [];
     }
}

const transformApiMatch = (game: any): Match => {
    const homeScore = game.scores.home.total || 0;
    const awayScore = game.scores.away.total || 0;
    
    // Determine Time Display to avoid "Qundefined"
    let timeDisplay = game.status.long;
    if (game.status.timer) {
        if (game.status.period) {
            timeDisplay = `Q${game.status.period} ${game.status.timer}`;
        } else {
            timeDisplay = `${game.status.timer}'`;
        }
    } else if (game.status.short === 'HT') {
        timeDisplay = 'Halftime';
    } else if (game.status.short === 'FT') {
        timeDisplay = 'Ended';
    }

    // Try to extract TV broadcasters (API dependent)
    const tvBroadcast = game.tv_stations ? game.tv_stations.join(', ') : (game.tv || undefined);

    return {
        id: String(game.id),
        leagueId: String(game.league.id),
        leagueName: game.league.name,
        country: game.country.name,
        status: mapStatus(game.status.short),
        startTime: game.date,
        currentTime: timeDisplay,
        tv: tvBroadcast,
        homeTeam: {
            id: String(game.teams.home.id),
            name: game.teams.home.name,
            shortName: game.teams.home.code || game.teams.home.name.substring(0,3).toUpperCase(),
            logo: game.teams.home.logo
        },
        awayTeam: {
            id: String(game.teams.away.id),
            name: game.teams.away.name,
            shortName: game.teams.away.code || game.teams.away.name.substring(0,3).toUpperCase(),
            logo: game.teams.away.logo
        },
        homeScore: {
            q1: game.scores.home.quarter_1 || 0,
            q2: game.scores.home.quarter_2 || 0,
            q3: game.scores.home.quarter_3 || 0,
            q4: game.scores.home.quarter_4 || 0,
            total: homeScore
        },
        awayScore: {
            q1: game.scores.away.quarter_1 || 0,
            q2: game.scores.away.quarter_2 || 0,
            q3: game.scores.away.quarter_3 || 0,
            q4: game.scores.away.quarter_4 || 0,
            total: awayScore
        },
        homeStats: { 
            fgPercentage: 0, 
            threePtPercentage: 0, 
            rebounds: 0, 
            assists: 0, 
            turnovers: 0 
        },
        awayStats: { 
            fgPercentage: 0, 
            threePtPercentage: 0, 
            rebounds: 0, 
            assists: 0, 
            turnovers: 0 
        },
    };
}

const mapStatus = (status: string): MatchStatus => {
    switch(status) {
        case 'NS': return MatchStatus.SCHEDULED;
        case 'Q1': 
        case 'Q2': 
        case 'Q3': 
        case 'Q4': 
        case 'OT': 
        case 'BT': return MatchStatus.LIVE;
        case 'HT': return MatchStatus.HALFTIME;
        case 'FT': 
        case 'AOT': return MatchStatus.FINISHED;
        default: return MatchStatus.SCHEDULED;
    }
}