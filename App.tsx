import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Menu, Search, Filter, Loader2, Wifi, WifiOff, CalendarDays, ChevronLeft, ChevronRight, X, User } from 'lucide-react';
import { AppSidebar } from './components/AppSidebar';
import { MobileNav } from './components/MobileNav';
import { LeagueHeader } from './components/LeagueHeader';
import { MatchRow } from './components/MatchRow';
import { MatchDetails } from './components/MatchDetails';
import { CalendarWidget } from './components/CalendarWidget';
import { StickyAdRail } from './components/StickyAdRail';
import { AdUnit } from './components/AdUnit';
import { SeoHead } from './components/SeoHead';
import { TeamLogo } from './components/TeamLogo';
import { MOCK_LEAGUES } from './constants';
import { Match, League, MatchStatus, TeamSearchResult } from './types';
import { getMatches, searchTeams, getTeamSchedule } from './services/basketballService';

type ViewMode = 'ALL' | 'LIVE' | 'FINISHED' | 'SCHEDULED' | 'FAVORITES';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Filter State
  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Search State
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<TeamSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<{ details: TeamSearchResult, matches: Match[] } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Favorites State
  const [favorites, setFavorites] = useState<Set<string>>(() => {
      try {
          const saved = localStorage.getItem('hoops_favorites');
          return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
          return new Set();
      }
  });

  // Data State
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealData, setIsRealData] = useState(false);

  // Debounce Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute Search
  useEffect(() => {
      if (debouncedSearch.length >= 3) {
          setIsSearching(true);
          setSelectedTeamProfile(null); // Clear profile if typing new search
          searchTeams(debouncedSearch).then(results => {
              setSearchResults(results);
              setIsSearching(false);
          });
      } else {
          setSearchResults([]);
      }
  }, [debouncedSearch]);

  // Fetch data on mount or date change
  const fetchData = async () => {
      // Don't show loading spinner on background refreshes, only initial load
      if (matches.length === 0) setLoading(true);
      
      try {
          const { matches: data, isLive } = await getMatches(currentDate);
          setMatches(data);
          setIsRealData(isLive);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    setSelectedLeagueId(null); // Reset filter on new date
    // setSearchQuery(''); // Don't reset search on date change if user is searching
    fetchData();

    // Smart Auto-Refresh: Only poll if tab is visible
    const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            fetchData();
        }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentDate]);

  const toggleFavorite = (e: React.MouseEvent, matchId: string) => {
      e.stopPropagation();
      const newFavs = new Set(favorites);
      if (newFavs.has(matchId)) {
          newFavs.delete(matchId);
      } else {
          newFavs.add(matchId);
      }
      setFavorites(newFavs);
      localStorage.setItem('hoops_favorites', JSON.stringify([...newFavs]));
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setShowCalendar(false);
    clearSearchMode();
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    clearSearchMode();
  };

  const clearSearchMode = () => {
      setSearchQuery('');
      setDebouncedSearch('');
      setSelectedTeamProfile(null);
  }

  const handleTeamSelect = async (team: TeamSearchResult) => {
      setLoadingProfile(true);
      const schedule = await getTeamSchedule(team.id);
      setSelectedTeamProfile({ details: team, matches: schedule });
      setLoadingProfile(false);
      // We keep search query active so user can go back to results, or we clear it? 
      // Better to clear results list view but keep profile active.
      setSearchResults([]); 
  }

  // Helper to determine league importance for sorting
  const getLeaguePriority = (name: string, country: string): number => {
      const n = name.toLowerCase();
      // Tier 1: The absolute top
      if (n === 'nba') return 1;
      
      // Tier 2: Major International
      if (n.includes('euroleague')) return 2;
      if (n.includes('world cup')) return 3;
      if (n.includes('olympics')) return 3;

      // Tier 3: Secondary International / Major Domestic
      if (n.includes('eurocup')) return 4;
      if (n.includes('champions league')) return 5; // BCL
      
      // Tier 4: Top Domestic Leagues (Spain, Turkey, France, Italy, Germany, Greece, Australia)
      if (country === 'Spain' && (n.includes('acb') || n.includes('liga endesa'))) return 6;
      if (country === 'Turkey' && (n.includes('super') || n.includes('bsl'))) return 7;
      if (country === 'France' && (n.includes('betclic') || n.includes('pro a'))) return 8;
      if (country === 'Italy' && (n.includes('a') || n.includes('lba'))) return 9;
      if (country === 'Germany' && n.includes('bbl')) return 10;
      if (country === 'Greece' && n.includes('a1')) return 11;
      if (country === 'Australia' && n.includes('nbl')) return 12;

      // Tier 5: NCAA / G-League
      if (n.includes('ncaa')) return 13;
      if (n.includes('g league')) return 14;

      // Default: Alphabetical sort for the rest
      return 100;
  };

  // Dynamically extract leagues from current matches for the sidebar
  const uniqueLeagues = useMemo(() => {
      const leaguesMap = new Map<string, League>();
      matches.forEach(m => {
          if (!leaguesMap.has(m.leagueId)) {
              leaguesMap.set(m.leagueId, {
                  id: m.leagueId,
                  name: m.leagueName,
                  country: m.country,
                  flag: getCountryFlag(m.country),
                  priority: getLeaguePriority(m.leagueName, m.country)
              });
          }
      });
      // Convert map values to array and sort by Priority first, then Name
      return Array.from(leaguesMap.values()).sort((a, b) => {
          if (a.priority !== b.priority) {
              return a.priority - b.priority; // Lower number = Higher priority
          }
          return a.name.localeCompare(b.name);
      });
  }, [matches]);

  // Main Filtering Logic (Only used when NOT searching)
  const filteredMatches = useMemo(() => {
      let result = matches;

      // 1. Filter by View Mode
      if (viewMode === 'FAVORITES') {
          result = result.filter(m => favorites.has(m.id));
      } else if (viewMode === 'LIVE') {
          result = result.filter(m => m.status === MatchStatus.LIVE || m.status === MatchStatus.HALFTIME);
      } else if (viewMode === 'FINISHED') {
          result = result.filter(m => m.status === MatchStatus.FINISHED);
      } else if (viewMode === 'SCHEDULED') {
          result = result.filter(m => m.status === MatchStatus.SCHEDULED);
      }

      // 2. Filter by League (if specific league selected)
      if (selectedLeagueId) {
          result = result.filter(m => m.leagueId === selectedLeagueId);
      }

      return result;
  }, [matches, selectedLeagueId, viewMode, favorites]);

  // Group filtered matches by league AND sort matches inside groups (Pin Favorites)
  const groupedMatches = useMemo(() => {
    const groups: { [key: string]: Match[] } = {};
    filteredMatches.forEach(match => {
      if (!groups[match.leagueId]) {
        groups[match.leagueId] = [];
      }
      groups[match.leagueId].push(match);
    });

    // Sort matches within each league: Favorites first, then Live, then Time
    Object.keys(groups).forEach(leagueId => {
        groups[leagueId].sort((a, b) => {
            // Priority 1: Favorites
            const aFav = favorites.has(a.id);
            const bFav = favorites.has(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;

            // Priority 2: Status
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
    });

    return groups;
  }, [filteredMatches, favorites]);

  // Sort the League Groups in the main view
  const sortedLeagueIds = useMemo(() => {
      return Object.keys(groupedMatches).sort((a, b) => {
          const leagueA = uniqueLeagues.find(l => l.id === a);
          const leagueB = uniqueLeagues.find(l => l.id === b);
          
          const pA = leagueA ? leagueA.priority : 100;
          const pB = leagueB ? leagueB.priority : 100;

          if (pA !== pB) return pA - pB;
          return (leagueA?.name || '').localeCompare(leagueB?.name || '');
      });
  }, [groupedMatches, uniqueLeagues]);


  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
  };

  // Helper to find league info for headers
  const getLeagueInfo = (leagueId: string, leagueName: string) => {
      const found = uniqueLeagues.find(l => l.id === leagueId);
      if (found) return found;
      return { id: leagueId, name: leagueName, country: 'World', flag: '🏀', priority: 99 };
  }

  // Format date for display
  const dateDisplay = currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const isFutureYear = currentDate.getFullYear() > new Date().getFullYear();

  // Helper for active button class (Desktop Toolbar)
  const getFilterButtonClass = (mode: ViewMode) => {
      const isActive = viewMode === mode && !selectedLeagueId;
      return `text-xs font-bold px-3 py-1.5 rounded transition-all ${isActive ? 'bg-hoops-orange text-white shadow-lg shadow-orange-900/20' : 'text-slate-400 hover:text-white'}`;
  };

  const activeLeagueName = selectedLeagueId 
    ? uniqueLeagues.find(l => l.id === selectedLeagueId)?.name || null 
    : null;

  // --- RENDER HELPERS ---
  const renderMainContent = () => {
      // 1. Team Profile Mode
      if (selectedTeamProfile) {
          const { details, matches } = selectedTeamProfile;
          const upcoming = matches.filter(m => new Date(m.startTime) > new Date()).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          const past = matches.filter(m => new Date(m.startTime) <= new Date()).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

          return (
              <div className="p-4">
                  <button onClick={clearSearchMode} className="flex items-center gap-1 text-hoops-orange mb-4 hover:underline">
                      <ChevronLeft size={16} /> Back to Live Scores
                  </button>
                  <div className="bg-slate-850 p-6 rounded-xl border border-slate-800 flex items-center gap-6 mb-6">
                      <TeamLogo 
                        src={details.logo} 
                        alt={details.name} 
                        className="w-24 h-24 object-contain bg-white/5 rounded-full p-2" 
                      />
                      <div>
                          <h2 className="text-2xl font-bold text-white">{details.name}</h2>
                          <div className="text-slate-400 flex items-center gap-2 mt-1">
                              <span>{getCountryFlag(details.country)} {details.country}</span>
                          </div>
                      </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Upcoming Games</h3>
                  <div className="space-y-2 mb-8">
                      {upcoming.length > 0 ? upcoming.map(m => (
                          <MatchRow key={m.id} match={m} onClick={handleMatchClick} isFavorite={favorites.has(m.id)} onToggleFavorite={toggleFavorite} />
                      )) : <p className="text-slate-500 italic">No upcoming games scheduled.</p>}
                  </div>

                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Results</h3>
                  <div className="space-y-2">
                      {past.length > 0 ? past.map(m => (
                          <MatchRow key={m.id} match={m} onClick={handleMatchClick} isFavorite={favorites.has(m.id)} onToggleFavorite={toggleFavorite} />
                      )) : <p className="text-slate-500 italic">No past results found.</p>}
                  </div>
              </div>
          )
      }

      // 2. Search Results Mode
      if (debouncedSearch.length >= 3 || searchResults.length > 0) {
          return (
              <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-white">Search Results</h2>
                      <button onClick={clearSearchMode} className="text-xs text-hoops-orange">Clear Search</button>
                  </div>
                  
                  {isSearching ? (
                      <div className="flex justify-center py-12"><Loader2 className="animate-spin text-hoops-orange" /></div>
                  ) : searchResults.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                          <Search size={32} className="mx-auto mb-2 opacity-50" />
                          No teams found for "{debouncedSearch}"
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {searchResults.map(team => (
                              <button 
                                key={team.id}
                                onClick={() => handleTeamSelect(team)}
                                className="flex items-center gap-4 p-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors text-left"
                              >
                                  <TeamLogo 
                                    src={team.logo} 
                                    alt={team.name} 
                                    className="w-10 h-10 object-contain" 
                                  />
                                  <div>
                                      <div className="font-bold text-white">{team.name}</div>
                                      <div className="text-xs text-slate-400">{team.country}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  )}
              </div>
          );
      }
      
      // 3. Loading Initial Data
      if (loading && matches.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Loader2 size={32} className="animate-spin mb-4 text-hoops-orange" />
                  <p>Loading scores...</p>
              </div>
          );
      }

      // 4. Default Live Scores Mode
      return (
        <>
            <div className="max-w-3xl mx-auto">
             <AdUnit slotId="DEMO_SLOT" format="horizontal" style={{ height: '90px' }} className="w-full h-[90px] my-4" />
            </div>

            {Object.keys(groupedMatches).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 text-slate-500 text-center px-4">
                    <CalendarDays size={48} className="mb-4 text-slate-700" />
                    <p className="font-bold text-white text-lg mb-2">No matches found</p>
                    <p className="text-sm max-w-xs mx-auto mb-4">
                        We couldn't find any games scheduled for <span className="text-hoops-orange">{dateDisplay}</span>.
                    </p>
                </div>
            ) : (
                sortedLeagueIds.map(leagueId => {
                    const firstMatch = groupedMatches[leagueId][0];
                    const leagueInfo = getLeagueInfo(leagueId, firstMatch.leagueName);

                    return (
                    <div key={leagueId} className="mb-2">
                        <LeagueHeader name={leagueInfo.name} country={leagueInfo.country} flag={leagueInfo.flag} />
                        <div className="flex flex-col">
                        {groupedMatches[leagueId].map(match => (
                            <MatchRow 
                                key={match.id} 
                                match={match} 
                                onClick={handleMatchClick}
                                isFavorite={favorites.has(match.id)}
                                onToggleFavorite={toggleFavorite}
                            />
                        ))}
                        </div>
                    </div>
                    );
                })
            )}

            {!loading && matches.length > 0 && (
                <footer className="p-8 text-center text-slate-600 text-xs">
                    <p>Data provided by {isRealData ? 'API-Basketball' : 'Demo Generator'}</p>
                </footer>
            )}
        </>
      );
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans relative">
      
      <SeoHead 
        viewMode={viewMode}
        leagueName={activeLeagueName}
        matchCount={filteredMatches.length}
        matches={filteredMatches}
      />

      {/* --- Sticky Ad Rails (Desktop Only - >1536px) --- */}
      <StickyAdRail position="left" />
      <StickyAdRail position="right" />

      {/* Calendar Backdrop */}
      {showCalendar && (
        <div 
            className="fixed inset-0 z-40 bg-black/50 md:bg-transparent" 
            onClick={() => setShowCalendar(false)}
        />
      )}

      {/* --- DESKTOP: Permanent Sidebar (md:block) --- */}
      <nav aria-label="Main Navigation" role="navigation" className="hidden md:block">
        <AppSidebar 
            leagues={uniqueLeagues} 
            isOpen={true} 
            toggleSidebar={() => {}} // No-op on desktop
            activeLeagueId={selectedLeagueId}
            onSelectLeague={setSelectedLeagueId}
            viewMode={viewMode}
            onViewChange={(mode) => {
                setViewMode(mode);
                clearSearchMode();
            }}
        />
      </nav>

      {/* --- MOBILE: Bottom Navigation (md:hidden) --- */}
      <MobileNav 
        currentView={viewMode} 
        onChangeView={(mode) => { 
            setViewMode(mode); 
            setSelectedLeagueId(null);
            clearSearchMode();
        }}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* --- MOBILE: Slide-out Sidebar Drawer (md:hidden) --- */}
      <div className={`md:hidden`}>
         <AppSidebar 
            leagues={uniqueLeagues} 
            isOpen={sidebarOpen} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            activeLeagueId={selectedLeagueId}
            onSelectLeague={(id) => {
                setSelectedLeagueId(id);
                setSidebarOpen(false);
                clearSearchMode();
            }}
            viewMode={viewMode}
            onViewChange={(mode) => {
                setViewMode(mode);
                setSidebarOpen(false);
                clearSearchMode();
            }}
        />
      </div>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 relative z-10 overflow-x-hidden" role="main">
        
        <h1 className="sr-only">
            {activeLeagueName 
                ? `${activeLeagueName} Scores & Results`
                : "Basketball Live Scores, Results & Schedules"
            }
        </h1>

        {/* --- MOBILE HEADER: Search Only (md:hidden) --- */}
        <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 md:hidden">
            <span className="font-bold text-lg">Hoops<span className="text-hoops-orange">Live</span></span>
             <div className="relative w-1/2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                    type="text" 
                    placeholder="Search teams..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-850 border border-slate-700 rounded-full pl-9 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-hoops-orange w-full"
                />
                {searchQuery && (
                    <button 
                        onClick={clearSearchMode}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </header>

        {/* --- DESKTOP TOOLBAR: Filters (hidden md:flex) --- */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-4">
                <button onClick={() => { setViewMode('ALL'); setSelectedLeagueId(null); clearSearchMode(); }} className={getFilterButtonClass('ALL')}>ALL GAMES</button>
                <button onClick={() => { setViewMode('LIVE'); setSelectedLeagueId(null); clearSearchMode(); }} className={getFilterButtonClass('LIVE')}>LIVE</button>
                <button onClick={() => { setViewMode('FINISHED'); setSelectedLeagueId(null); clearSearchMode(); }} className={getFilterButtonClass('FINISHED')}>FINISHED</button>
                <button onClick={() => { setViewMode('SCHEDULED'); setSelectedLeagueId(null); clearSearchMode(); }} className={getFilterButtonClass('SCHEDULED')}>SCHEDULED</button>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search teams..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-850 border border-slate-700 rounded-full pl-9 pr-8 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-hoops-orange w-64"
                    />
                    {searchQuery && (
                        <button 
                            onClick={clearSearchMode}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* --- SHARED: Calendar Navigation (Only show if NOT in profile/search mode) --- */}
        {!selectedTeamProfile && !searchQuery && (
            <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-slate-850 border-b border-slate-800 text-xs font-medium text-slate-400 relative z-30">
                <button 
                    className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    onClick={() => changeDate(-1)}
                >
                    <ChevronLeft size={16} />
                    <span>Yesterday</span>
                </button>
                
                <div className="relative">
                    <button 
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="text-white bg-slate-800 px-4 py-1.5 rounded flex items-center gap-2 border border-slate-700 hover:border-hoops-orange transition-colors min-w-[160px] justify-center"
                    >
                        <CalendarDays size={14} className="text-hoops-orange" />
                        <span className="font-semibold">{dateDisplay}</span>
                        {loading && <Loader2 size={12} className="animate-spin text-hoops-orange ml-1" />}
                    </button>
                    {showCalendar && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50">
                            <CalendarWidget 
                                selectedDate={currentDate} 
                                onSelectDate={handleDateSelect} 
                                onClose={() => setShowCalendar(false)} 
                            />
                        </div>
                    )}
                </div>

                <button 
                    className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    onClick={() => changeDate(1)}
                >
                    <span>Tomorrow</span>
                    <ChevronRight size={16} />
                </button>
            </div>
        )}

        {/* --- DYNAMIC MAIN CONTENT --- */}
        {/* pb-20 on mobile to clear bottom nav, pb-0 on desktop (md:pb-0) */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
           {renderMainContent()}
        </div>
      </main>

      {/* --- DESKTOP: Right Details Panel (xl:static) --- */}
      {/* Changed from md:static to xl:static so tablets (768-1280) treat it as drawer to avoid squeeze */}
      <aside className={`
        fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900 z-[60] shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-800
        ${selectedMatch ? 'translate-x-0' : 'translate-x-full'}
        xl:static xl:w-[400px] xl:translate-x-0 xl:block xl:shadow-none xl:z-0
      `} aria-label="Match Details">
         <MatchDetails match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </aside>

    </div>
  );
};

// Helper for dynamic flags based on country name
function getCountryFlag(country: string): string {
    const map: Record<string, string> = {
        'USA': '🇺🇸', 'Spain': '🇪🇸', 'Turkey': '🇹🇷', 'Europe': '🇪🇺', 'France': '🇫🇷',
        'Germany': '🇩🇪', 'Italy': '🇮🇹', 'Greece': '🇬🇷', 'Australia': '🇦🇺', 'Canada': '🇨🇦',
        'China': '🇨🇳', 'Serbia': '🇷🇸', 'Lithuania': '🇱🇹', 'Brazil': '🇧🇷', 'Argentina': '🇦🇷'
    };
    return map[country] || '🏀';
}

export default App;