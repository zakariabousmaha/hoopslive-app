
import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Search, Loader2, CalendarDays, ChevronLeft, ChevronRight, X, Trophy, Calendar, Star, CircleDot, Zap } from 'lucide-react';
import { MatchRow } from './components/MatchRow';
import { MatchDetails } from './components/MatchDetails';
import { SharedTeamLogo } from './components/SharedTeamLogo';
import { Match, League, MatchStatus, TeamSearchResult } from './types';
import { getMatches, searchTeams, getTeamSchedule } from './services/basketballService';
import { generateSportsEventSchema, generateBreadcrumbSchema } from './services/seoService';

// --- INTERNAL COMPONENTS ---
// We define these here to prevent file resolution issues on deployment

const LeagueHeader: React.FC<{ name: string; country: string; flag: string }> = ({ name, country, flag }) => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider sticky top-0 z-10">
      <h2 className="flex items-center gap-2 m-0 text-xs font-bold">
        <span className="text-lg" aria-hidden="true">{flag}</span>
        <span className="text-slate-400">{country}:</span>
        <span className="text-white">{name}</span>
      </h2>
      <a href="#" className="text-hoops-orange hover:text-white transition-colors text-xs" aria-label={`View ${name} standings`}>
        Standings
      </a>
    </header>
  );
};

const AdUnit: React.FC<{ slotId: string; format?: string; className?: string; style?: any; label?: string }> = ({ 
  slotId, format = 'auto', className = '', style = {}, label = 'Advertisement' 
}) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) { /* Ignore AdSense errors in dev */ }
  }, []);

  if (slotId === 'DEMO_SLOT') {
    return (
      <div className={`bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center text-slate-600 overflow-hidden ${className}`} style={style}>
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{label}</span>
        <span className="text-xs">Google Ad Space</span>
      </div>
    );
  }
  return <div className={className} />;
};

const StickyAdRail: React.FC<{ position: 'left' | 'right' }> = ({ position }) => {
  return (
    <div className={`fixed top-24 bottom-0 w-[160px] hidden 2xl:flex flex-col gap-4 z-0 ${position === 'left' ? 'left-4' : 'right-4'}`}>
      <AdUnit slotId="DEMO_SLOT" format="vertical" style={{ height: '600px', width: '160px' }} className="w-full h-[600px]" />
      <AdUnit slotId="DEMO_SLOT" format="rectangle" style={{ height: '250px', width: '160px' }} className="w-full h-[250px] mt-4" />
    </div>
  );
};

const CalendarWidget: React.FC<{ selectedDate: Date; onSelectDate: (d: Date) => void; onClose: () => void }> = ({ selectedDate, onSelectDate, onClose }) => {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    useEffect(() => { setViewDate(new Date(selectedDate)); }, [selectedDate]);

    const changeMonth = (offset: number) => {
        const d = new Date(viewDate); d.setMonth(viewDate.getMonth() + offset); setViewDate(d);
    };
    
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const days = Array(startDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1)));

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 w-72 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)}><ChevronLeft size={20} className="text-slate-400 hover:text-white" /></button>
                <div className="font-bold text-slate-200">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                <button onClick={() => changeMonth(1)}><ChevronRight size={20} className="text-slate-400 hover:text-white" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-center text-xs font-bold text-slate-500">{d}</div>)}
                {days.map((date, i) => {
                    if (!date) return <div key={`e-${i}`} />;
                    const isSel = date.toDateString() === selectedDate.toDateString();
                    return (
                        <button key={i} onClick={() => { onSelectDate(date); onClose(); }} 
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${isSel ? 'bg-hoops-orange text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                            {date.getDate()}
                        </button>
                    )
                })}
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-800">
                <button onClick={() => { onSelectDate(new Date()); onClose(); }} className="text-xs font-bold text-hoops-orange">Today</button>
                <button onClick={onClose} className="text-xs text-slate-500">Close</button>
            </div>
        </div>
    );
};

const SeoHead: React.FC<{ viewMode: string; leagueName: string | null; matchCount: number; matches: Match[] }> = ({ viewMode, leagueName, matchCount, matches }) => {
  useEffect(() => {
    let title = 'NBA Live Scores, NCAA Basketball Results & Stats | HoopsLive';
    if (leagueName) title = `${leagueName} Live Scores & Results | HoopsLive`;
    else if (viewMode === 'LIVE') title = `Live Basketball Scores (${matchCount} Games) | HoopsLive`;
    document.title = title;
  }, [viewMode, leagueName, matchCount]);

  const eventSchema = generateSportsEventSchema(matches.slice(0, 20)); 
  const breadcrumbSchema = generateBreadcrumbSchema(leagueName || 'All Games');

  return (
    <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
};

// --- MAIN SIDEBAR (Internal) ---
const InternalSidebar: React.FC<{
  leagues: League[]; isOpen: boolean; toggleSidebar: () => void; activeLeagueId: string | null; onSelectLeague: (id: string | null) => void; viewMode: any; onViewChange: (m: any) => void;
}> = ({ leagues, isOpen, toggleSidebar, activeLeagueId, onSelectLeague, viewMode, onViewChange }) => {
  
  const handleSelect = (id: string | null) => { onSelectLeague(id); onViewChange('ALL'); if (window.innerWidth < 768) toggleSidebar(); };
  const handleView = (mode: any) => { onViewChange(mode); onSelectLeague(null); if (window.innerWidth < 768) toggleSidebar(); };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleSidebar} />}
      <div className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:block`}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
          <div className="w-8 h-8 bg-gradient-to-tr from-hoops-orange to-red-500 rounded flex items-center justify-center text-white font-black italic">H</div>
          <span className="text-xl font-bold tracking-tight text-white">Hoops<span className="text-hoops-orange">Live</span></span>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
          <div className="mb-6">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Menu</h3>
             <ul className="space-y-1">
               {[{id:'ALL', l:'All Games', i:Trophy}, {id:'SCHEDULED', l:'Schedule', i:Calendar}, {id:'FAVORITES', l:'Favorites', i:Star}].map(item => (
                 <li key={item.id}>
                   <button onClick={() => handleView(item.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded ${viewMode === item.id && !activeLeagueId ? 'bg-hoops-orange/10 text-hoops-orange' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <item.i size={16} /> {item.l}
                   </button>
                 </li>
               ))}
             </ul>
          </div>
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Today's Leagues</h3>
            <ul className="space-y-1">
                {leagues.map(l => (
                    <li key={l.id}>
                    <button onClick={() => handleSelect(l.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded group ${activeLeagueId === l.id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                        <span className="opacity-70 w-4 text-center">{l.flag || '🏀'}</span>
                        <span className="truncate">{l.name}</span>
                        {activeLeagueId === l.id && <CircleDot size={8} className="ml-auto text-hoops-orange fill-current" />}
                    </button>
                    </li>
                ))}
            </ul>
          </div>
          <div className="mt-auto px-2">
             <AdUnit slotId="DEMO_SLOT" format="rectangle" style={{ height: '250px', width: '100%' }} className="w-full h-[250px] bg-slate-850 rounded" />
             <p className="text-[10px] text-center text-slate-600 mt-2">Sponsored Partner</p>
          </div>
        </div>
      </div>
    </>
  );
};

const BottomNav: React.FC<{ currentView: string; onChangeView: (v: any) => void; onMenuClick: () => void; }> = ({ currentView, onChangeView, onMenuClick }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {[{id:'ALL', i:Trophy, l:'Games'}, {id:'LIVE', i:Zap, l:'Live'}, {id:'SCHEDULED', i:Calendar, l:'Schedule'}, {id:'FAVORITES', i:Star, l:'Favorites'}].map(item => (
            <button key={item.id} onClick={() => onChangeView(item.id)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === item.id ? 'text-hoops-orange' : 'text-slate-500'}`}>
              <item.i size={22} className={currentView === item.id ? 'fill-current' : ''} />
              <span className="text-[10px] font-medium">{item.l}</span>
            </button>
        ))}
        <button onClick={onMenuClick} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500">
          <Menu size={22} />
          <span className="text-[10px] font-medium">Leagues</span>
        </button>
      </div>
    </div>
  );
};

// --- APP COMPONENT ---

type ViewMode = 'ALL' | 'LIVE' | 'FINISHED' | 'SCHEDULED' | 'FAVORITES';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeamSearchResult[]>([]);
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<{ details: TeamSearchResult, matches: Match[] } | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
      try { return new Set(JSON.parse(localStorage.getItem('hoops_favorites') || '[]')); } catch { return new Set(); }
  });
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      if (searchQuery.length >= 3) {
          searchTeams(searchQuery).then(setSearchResults);
      } else setSearchResults([]);
  }, [searchQuery]);

  useEffect(() => {
      setLoading(true);
      getMatches(currentDate).then(res => { setMatches(res.matches); setLoading(false); });
      const i = setInterval(() => document.visibilityState === 'visible' && getMatches(currentDate).then(res => setMatches(res.matches)), 60000);
      return () => clearInterval(i);
  }, [currentDate]);

  const toggleFavorite = (e: React.MouseEvent, matchId: string) => {
      e.stopPropagation();
      const newFavs = new Set(favorites);
      newFavs.has(matchId) ? newFavs.delete(matchId) : newFavs.add(matchId);
      setFavorites(newFavs);
      localStorage.setItem('hoops_favorites', JSON.stringify([...newFavs]));
  };

  const getLeaguePriority = (name: string, country: string): number => {
      const n = name.toLowerCase();
      if (n === 'nba') return 1;
      if (n.includes('euroleague')) return 2;
      if (n.includes('ncaa')) return 3;
      return 100;
  };

  const uniqueLeagues = useMemo(() => {
      const m = new Map<string, League>();
      matches.forEach(match => {
          if (!m.has(match.leagueId)) {
              m.set(match.leagueId, {
                  id: match.leagueId, name: match.leagueName, country: match.country, 
                  flag: '🏀', priority: getLeaguePriority(match.leagueName, match.country)
              });
          }
      });
      return Array.from(m.values()).sort((a,b) => a.priority - b.priority);
  }, [matches]);

  const filteredMatches = useMemo(() => {
      let r = matches;
      if (viewMode === 'FAVORITES') r = r.filter(m => favorites.has(m.id));
      else if (viewMode === 'LIVE') r = r.filter(m => m.status === MatchStatus.LIVE || m.status === MatchStatus.HALFTIME);
      else if (viewMode === 'FINISHED') r = r.filter(m => m.status === MatchStatus.FINISHED);
      else if (viewMode === 'SCHEDULED') r = r.filter(m => m.status === MatchStatus.SCHEDULED);
      if (selectedLeagueId) r = r.filter(m => m.leagueId === selectedLeagueId);
      return r;
  }, [matches, selectedLeagueId, viewMode, favorites]);

  const groupedMatches = useMemo(() => {
    const g: { [key: string]: Match[] } = {};
    filteredMatches.forEach(m => { if (!g[m.leagueId]) g[m.leagueId] = []; g[m.leagueId].push(m); });
    return g;
  }, [filteredMatches]);

  const handleTeamSelect = async (team: TeamSearchResult) => {
      const schedule = await getTeamSchedule(team.id);
      setSelectedTeamProfile({ details: team, matches: schedule });
      setSearchResults([]); 
  };

  const activeLeagueName = selectedLeagueId ? uniqueLeagues.find(l => l.id === selectedLeagueId)?.name || null : null;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans relative">
      <SeoHead viewMode={viewMode} leagueName={activeLeagueName} matchCount={filteredMatches.length} matches={filteredMatches} />
      <StickyAdRail position="left" />
      <StickyAdRail position="right" />

      {showCalendar && <div className="fixed inset-0 z-40 bg-black/50 md:bg-transparent" onClick={() => setShowCalendar(false)} />}

      <nav className="hidden md:block">
        <InternalSidebar leagues={uniqueLeagues} isOpen={true} toggleSidebar={() => {}} activeLeagueId={selectedLeagueId} onSelectLeague={setSelectedLeagueId} viewMode={viewMode} onViewChange={(m) => { setViewMode(m); setSearchQuery(''); }} />
      </nav>

      <BottomNav currentView={viewMode} onChangeView={(m) => { setViewMode(m); setSelectedLeagueId(null); setSearchQuery(''); }} onMenuClick={() => setSidebarOpen(true)} />
      <div className="md:hidden">
         <InternalSidebar leagues={uniqueLeagues} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} activeLeagueId={selectedLeagueId} onSelectLeague={(id) => { setSelectedLeagueId(id); setSidebarOpen(false); }} viewMode={viewMode} onViewChange={(m) => { setViewMode(m); setSidebarOpen(false); }} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 relative z-10 overflow-x-hidden">
        <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 md:hidden">
            <span className="font-bold text-lg">Hoops<span className="text-hoops-orange">Live</span></span>
             <div className="relative w-1/2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input type="text" placeholder="Search teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-850 border border-slate-700 rounded-full pl-9 pr-8 py-1.5 text-xs text-slate-200 w-full" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"><X size={14} /></button>}
            </div>
        </header>

        <div className="hidden md:flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-4">
                {['ALL', 'LIVE', 'FINISHED', 'SCHEDULED'].map(mode => (
                    <button key={mode} onClick={() => { setViewMode(mode as ViewMode); setSelectedLeagueId(null); setSearchQuery(''); }} className={`text-xs font-bold px-3 py-1.5 rounded ${viewMode === mode && !selectedLeagueId ? 'bg-hoops-orange text-white' : 'text-slate-400 hover:text-white'}`}>{mode} GAMES</button>
                ))}
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input type="text" placeholder="Search teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-850 border border-slate-700 rounded-full pl-9 pr-8 py-1.5 text-sm text-slate-200 w-64" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X size={14} /></button>}
            </div>
        </div>

        {!selectedTeamProfile && !searchQuery && (
            <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-slate-850 border-b border-slate-800 text-xs font-medium text-slate-400 relative z-30">
                <button className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800 rounded" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }}><ChevronLeft size={16} /><span>Yesterday</span></button>
                <div className="relative">
                    <button onClick={() => setShowCalendar(!showCalendar)} className="text-white bg-slate-800 px-4 py-1.5 rounded flex items-center gap-2 border border-slate-700 min-w-[160px] justify-center"><CalendarDays size={14} className="text-hoops-orange" /><span>{currentDate.toLocaleDateString()}</span></button>
                    {showCalendar && <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50"><CalendarWidget selectedDate={currentDate} onSelectDate={(d) => { setCurrentDate(d); setShowCalendar(false); }} onClose={() => setShowCalendar(false)} /></div>}
                </div>
                <button className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800 rounded" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); }}><span>Tomorrow</span><ChevronRight size={16} /></button>
            </div>
        )}

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
           {selectedTeamProfile ? (
               <div className="p-4">
                  <button onClick={() => setSelectedTeamProfile(null)} className="flex items-center gap-1 text-hoops-orange mb-4 hover:underline"><ChevronLeft size={16} /> Back</button>
                  <div className="bg-slate-850 p-6 rounded-xl border border-slate-800 flex items-center gap-6 mb-6">
                      <SharedTeamLogo src={selectedTeamProfile.details.logo} alt={selectedTeamProfile.details.name} className="w-24 h-24 object-contain" />
                      <div><h2 className="text-2xl font-bold text-white">{selectedTeamProfile.details.name}</h2><div className="text-slate-400">{selectedTeamProfile.details.country}</div></div>
                  </div>
                  <div className="space-y-2">{selectedTeamProfile.matches.map(m => <MatchRow key={m.id} match={m} onClick={setSelectedMatch} isFavorite={favorites.has(m.id)} onToggleFavorite={toggleFavorite} />)}</div>
               </div>
           ) : searchResults.length > 0 ? (
               <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {searchResults.map(t => (
                       <button key={t.id} onClick={() => handleTeamSelect(t)} className="flex items-center gap-4 p-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-left">
                           <SharedTeamLogo src={t.logo} alt={t.name} className="w-10 h-10 object-contain" />
                           <div><div className="font-bold text-white">{t.name}</div><div className="text-xs text-slate-400">{t.country}</div></div>
                       </button>
                   ))}
               </div>
           ) : loading ? (
               <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-hoops-orange" /></div>
           ) : Object.keys(groupedMatches).length === 0 ? (
               <div className="text-center py-20 text-slate-500">No matches found for this date.</div>
           ) : (
               Object.keys(groupedMatches).map(lid => {
                   const leagueName = groupedMatches[lid][0].leagueName;
                   const country = groupedMatches[lid][0].country;
                   return (
                       <div key={lid} className="mb-2">
                           <LeagueHeader name={leagueName} country={country} flag="🏀" />
                           <div className="flex flex-col">{groupedMatches[lid].map(m => <MatchRow key={m.id} match={m} onClick={setSelectedMatch} isFavorite={favorites.has(m.id)} onToggleFavorite={toggleFavorite} />)}</div>
                       </div>
                   );
               })
           )}
        </div>
      </main>

      <aside className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900 z-[60] shadow-2xl transform transition-transform duration-300 ${selectedMatch ? 'translate-x-0' : 'translate-x-full'} xl:static xl:translate-x-0 xl:block xl:shadow-none`}>
         <MatchDetails match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </aside>
    </div>
  );
};

export default App;
