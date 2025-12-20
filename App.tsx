
import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Search, Loader2, ChevronLeft, ChevronRight, X, Trophy, Calendar, Star, CircleDot, Zap, Tv, Sparkles, Activity, PieChart, History, Shield } from 'lucide-react';
import { Match, League, MatchStatus, TeamSearchResult } from './types';
import { getMatches, searchTeams, getTeamSchedule, getHeadToHead } from './services/basketballService';
import { analyzeMatch } from './services/geminiService';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// ==========================================
// ADMOB CONFIGURATION (Native Only)
// ==========================================
const ADMOB_BANNER_ID = 'ca-app-pub-1701936231288298/6233543881';
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-1701936231288298/7258124593';

// ==========================================
// 1. SHARED COMPONENTS
// ==========================================

const SharedTeamLogo: React.FC<{ src?: string; alt: string; className?: string; loading?: "lazy" | "eager" }> = ({ src, alt, className = "", loading = "lazy" }) => {
  const [hasError, setHasError] = useState(false);
  useEffect(() => { setHasError(false); }, [src]);
  const fallbackClasses = `flex items-center justify-center bg-slate-800 text-slate-600 border border-slate-700 overflow-hidden ${className}`;

  if (!src || hasError) {
    return (
      <div className={fallbackClasses} aria-label={alt} role="img">
        <Shield className="w-[60%] h-[60%] opacity-50" strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setHasError(true)} loading={loading} decoding="async" />;
};

const LeagueHeader: React.FC<{ name: string; country: string; flag: string }> = ({ name, country, flag }) => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider sticky top-0 z-10">
      <h2 className="flex items-center gap-2 m-0 text-xs font-bold">
        <span className="text-lg" aria-hidden="true">{flag}</span>
        <span className="text-slate-400">{country}:</span>
        <span className="text-white">{name}</span>
      </h2>
      <a href="#" className="text-hoops-orange hover:text-white transition-colors text-xs" aria-label={`View ${name} standings`}>Standings</a>
    </header>
  );
};

const CalendarWidget: React.FC<{ selectedDate: Date; onSelectDate: (d: Date) => void; onClose: () => void }> = ({ selectedDate, onSelectDate, onClose }) => {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    useEffect(() => { setViewDate(new Date(selectedDate)); }, [selectedDate]);
    const changeMonth = (offset: number) => { const d = new Date(viewDate); d.setMonth(viewDate.getMonth() + offset); setViewDate(d); };
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const days = Array(startDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1)));

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 w-72 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-800 rounded"><ChevronLeft size={20} className="text-slate-400 hover:text-white" /></button>
                <div className="font-bold text-slate-200">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-800 rounded"><ChevronRight size={20} className="text-slate-400 hover:text-white" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-center text-xs font-bold text-slate-500">{d}</div>)}
                {days.map((date, i) => {
                    if (!date) return <div key={`e-${i}`} />;
                    const isSel = date.toDateString() === selectedDate.toDateString();
                    return (
                        <button key={i} onClick={() => { onSelectDate(date); }} 
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${isSel ? 'bg-hoops-orange text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                            {date.getDate()}
                        </button>
                    )
                })}
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-800">
                <button onClick={() => { onSelectDate(new Date()); }} className="text-xs font-bold text-hoops-orange">Today</button>
                <button onClick={onClose} className="text-xs text-slate-500">Close</button>
            </div>
        </div>
    );
};

const MatchRow: React.FC<{ match: Match; onClick: (match: Match) => void; isFavorite: boolean; onToggleFavorite: (e: React.MouseEvent, matchId: string) => void; }> = ({ match, onClick, isFavorite, onToggleFavorite }) => {
  const [showTvPopup, setShowTvPopup] = useState(false);
  const isLive = match.status === MatchStatus.LIVE || match.status === MatchStatus.HALFTIME;
  const isFinished = match.status === MatchStatus.FINISHED;
  const homeWinning = match.homeScore.total > match.awayScore.total;
  const awayWinning = match.awayScore.total > match.homeScore.total;

  const handleTvClick = (e: React.MouseEvent) => { e.stopPropagation(); setShowTvPopup(!showTvPopup); };

  return (
    <>
        <article onClick={() => onClick(match)} className="group flex items-center gap-3 px-4 py-4 sm:py-3 bg-slate-850 hover:bg-slate-800 border-b border-slate-800 cursor-pointer transition-colors active:bg-slate-800 relative">
        <div role="button" onClick={(e) => onToggleFavorite(e, match.id)} className={`p-3 -ml-3 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-400'}`}>
            <Star size={20} fill={isFavorite ? "currentColor" : "none"} />
        </div>
        <div className="w-16 flex flex-col items-center justify-center text-xs">
            {isLive ? (
            <div className="flex items-center gap-1.5">
                {match.status === MatchStatus.LIVE && (<span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>)}
                <span className="text-hoops-orange font-bold text-[10px] sm:text-xs whitespace-nowrap">{match.currentTime}</span>
            </div>
            ) : match.status === MatchStatus.FINISHED ? <span className="text-slate-400 font-semibold">Ended</span> : <time className="text-slate-400">{new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>}
        </div>
        <div className="flex-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 items-center">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SharedTeamLogo src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-6 h-6 rounded-full object-contain" />
                    <span className={`text-sm sm:text-base font-medium ${homeWinning && (isFinished || isLive) ? 'text-white' : 'text-slate-400'}`}>{match.homeTeam.name}</span>
                </div>
            </div>
            <span className={`text-sm sm:text-base font-bold ${homeWinning ? 'text-hoops-orange' : 'text-white'}`}>{match.status === MatchStatus.SCHEDULED ? '-' : match.homeScore.total}</span>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SharedTeamLogo src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-6 h-6 rounded-full object-contain" />
                    <span className={`text-sm sm:text-base font-medium ${awayWinning && (isFinished || isLive) ? 'text-white' : 'text-slate-400'}`}>{match.awayTeam.name}</span>
                </div>
            </div>
            <span className={`text-sm sm:text-base font-bold ${awayWinning ? 'text-hoops-orange' : 'text-white'}`}>{match.status === MatchStatus.SCHEDULED ? '-' : match.awayScore.total}</span>
        </div>
        <div className="flex items-center text-slate-600 relative">
            {match.tv ? (
            <button onClick={handleTvClick} className="flex items-center gap-2 hover:bg-slate-800 p-2 -mr-2 rounded transition-colors group/tv">
                <Tv size={16} className="text-white group-hover/tv:text-hoops-orange transition-colors" />
                <span className="text-[10px] font-medium text-slate-400 uppercase hidden md:block max-w-[80px] truncate group-hover/tv:text-slate-200">{match.tv}</span>
            </button>
            ) : <Tv size={16} className="opacity-30" />}
        </div>
        </article>
        {showTvPopup && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setShowTvPopup(false); }}>
                <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-850">
                        <h3 className="font-bold text-white flex items-center gap-2"><Tv size={18} className="text-hoops-orange" /> Broadcasters</h3>
                        <button onClick={() => setShowTvPopup(false)} className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-2 max-h-80 overflow-y-auto">
                        <ul className="space-y-1">{match.tv?.split(',').map((channel, i) => (<li key={i} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg text-slate-200 transition-colors group"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div><span className="font-semibold text-sm">{channel.trim()}</span></li>))}</ul>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

const MatchDetails: React.FC<{ match: Match | null; onClose: () => void }> = ({ match, onClose }) => {
  const [activeTab, setActiveTab] = useState<'match' | 'stats' | 'h2h'>('match');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [h2hMatches, setH2hMatches] = useState<Match[]>([]);
  const [loadingH2h, setLoadingH2h] = useState(false);

  useEffect(() => { setAiAnalysis(''); setActiveTab('match'); setH2hMatches([]); }, [match]);
  useEffect(() => {
    if (activeTab === 'h2h' && match && h2hMatches.length === 0) {
        setLoadingH2h(true);
        getHeadToHead(match.homeTeam.id, match.awayTeam.id).then(history => { setH2hMatches(history.filter(h => h.id !== match.id)); setLoadingH2h(false); });
    }
  }, [activeTab, match, h2hMatches.length]);

  const handleAiAnalysis = async () => { if (!match) return; setLoadingAi(true); const result = await analyzeMatch(match); setAiAnalysis(result); setLoadingAi(false); };

  if (!match) return <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center border-l border-slate-800"><Activity size={48} className="mb-4 opacity-50" /><p className="text-lg font-medium">Select a match</p></div>;
  const isLive = match.status === MatchStatus.LIVE;

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 overflow-y-auto relative">
      <div className="sticky top-0 bg-slate-900 z-20 border-b border-slate-800 p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="text-xs font-bold text-slate-400 uppercase">{match.leagueName}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white xl:hidden"><X size={24} /></button>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col items-center w-1/3"><SharedTeamLogo src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-16 h-16 rounded-full bg-slate-800 mb-2 p-1 border border-slate-700" /><h3 className="text-sm font-bold text-center leading-tight">{match.homeTeam.name}</h3></div>
          <div className="flex flex-col items-center"><div className="text-3xl font-black text-white tracking-widest">{match.homeScore.total} - {match.awayScore.total}</div><div className={`mt-1 text-xs font-bold px-2 py-0.5 rounded ${isLive ? 'bg-hoops-orange text-white animate-pulse' : 'bg-slate-700 text-slate-300'}`}>{match.status === MatchStatus.FINISHED ? 'FT' : isLive ? match.currentTime : 'VS'}</div></div>
          <div className="flex flex-col items-center w-1/3"><SharedTeamLogo src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-16 h-16 rounded-full bg-slate-800 mb-2 p-1 border border-slate-700" /><h3 className="text-sm font-bold text-center leading-tight">{match.awayTeam.name}</h3></div>
        </div>
        <div className="flex border-b border-slate-700">
          {['match', 'stats', 'h2h'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'text-hoops-orange border-b-2 border-hoops-orange' : 'text-slate-400 hover:text-slate-200'}`}>{tab}</button>
          ))}
        </div>
      </div>
      <div className="p-4 flex-1">
        {activeTab === 'match' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700 shadow-lg">
              <div className="flex items-center justify-between mb-3"><h4 className="flex items-center gap-2 text-hoops-orange font-bold text-sm"><Sparkles size={16} /> Gemini AI Analysis</h4>{!aiAnalysis && <button onClick={handleAiAnalysis} disabled={loadingAi} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors">{loadingAi ? 'Thinking...' : 'Generate Insight'}</button>}</div>
              {aiAnalysis ? <div className="text-sm text-slate-200 leading-relaxed animate-in fade-in">{aiAnalysis}</div> : <p className="text-xs text-slate-500 italic">Tap "Generate Insight" to get real-time tactical analysis using Google Gemini.</p>}
            </div>
            <div className="bg-slate-850 rounded-lg p-4 border border-slate-800">
               <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase">Score Progression</h4>
               <table className="w-full text-sm text-center"><thead className="text-slate-500 border-b border-slate-700"><tr><th className="py-2 text-left pl-2">Team</th><th className="w-8">Q1</th><th className="w-8">Q2</th><th className="w-8">Q3</th><th className="w-8">Q4</th><th className="w-10 font-bold text-white">T</th></tr></thead><tbody className="text-slate-300"><tr className="border-b border-slate-800/50"><td className="py-2 text-left pl-2 font-medium">{match.homeTeam.shortName}</td><td>{match.homeScore.q1}</td><td>{match.homeScore.q2}</td><td>{match.homeScore.q3}</td><td>{match.homeScore.q4}</td><td className="font-bold text-white">{match.homeScore.total}</td></tr><tr><td className="py-2 text-left pl-2 font-medium">{match.awayTeam.shortName}</td><td>{match.awayScore.q1}</td><td>{match.awayScore.q2}</td><td>{match.awayScore.q3}</td><td>{match.awayScore.q4}</td><td className="font-bold text-white">{match.awayScore.total}</td></tr></tbody></table>
            </div>
          </div>
        )}
        {activeTab === 'stats' && match.homeStats && match.awayStats ? (
           <div className="space-y-4">
              <StatRow label="Field Goals %" homeVal={match.homeStats.fgPercentage} awayVal={match.awayStats.fgPercentage} suffix="%" />
              <StatRow label="3-Point %" homeVal={match.homeStats.threePtPercentage} awayVal={match.awayStats.threePtPercentage} suffix="%" />
              <StatRow label="Rebounds" homeVal={match.homeStats.rebounds} awayVal={match.awayStats.rebounds} />
              <StatRow label="Assists" homeVal={match.homeStats.assists} awayVal={match.awayStats.assists} />
              <StatRow label="Turnovers" homeVal={match.homeStats.turnovers} awayVal={match.awayStats.turnovers} invert />
           </div>
        ) : activeTab === 'stats' && <div className="text-center text-slate-500 py-10"><PieChart className="mx-auto mb-2 opacity-50" /> No stats available.</div>}
        {activeTab === 'h2h' && (
            <div className="space-y-3">{loadingH2h ? <div className="flex justify-center py-10 text-hoops-orange"><Loader2 className="animate-spin" /></div> : h2hMatches.length === 0 ? <div className="text-center text-slate-500 py-10"><History className="mx-auto mb-2 opacity-50" /> No H2H found.</div> : h2hMatches.map(game => (
                <div key={game.id} className="bg-slate-850 p-3 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 border-b border-slate-800 pb-1">{new Date(game.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="flex flex-col gap-2">
                        <div className={`flex justify-between items-center ${game.homeScore.total > game.awayScore.total ? 'bg-slate-800/50 -mx-1 px-1 rounded' : ''}`}><div className="flex items-center gap-2"><SharedTeamLogo src={game.homeTeam.logo} alt={game.homeTeam.shortName} className="w-5 h-5 rounded-full" /><span className={`text-sm ${game.homeScore.total > game.awayScore.total ? 'font-bold text-white' : 'text-slate-400'}`}>{game.homeTeam.name}</span></div><span className={`text-sm font-bold ${game.homeScore.total > game.awayScore.total ? 'text-hoops-orange' : 'text-slate-500'}`}>{game.homeScore.total}</span></div>
                        <div className={`flex justify-between items-center ${game.awayScore.total > game.homeScore.total ? 'bg-slate-800/50 -mx-1 px-1 rounded' : ''}`}><div className="flex items-center gap-2"><SharedTeamLogo src={game.awayTeam.logo} alt={game.awayTeam.shortName} className="w-5 h-5 rounded-full" /><span className={`text-sm ${game.awayScore.total > game.homeScore.total ? 'font-bold text-white' : 'text-slate-400'}`}>{game.awayTeam.name}</span></div><span className={`text-sm font-bold ${game.awayScore.total > game.homeScore.total ? 'text-hoops-orange' : 'text-slate-500'}`}>{game.awayScore.total}</span></div>
                    </div>
                </div>
            ))}</div>
        )}
      </div>
    </div>
  );
};
const StatRow = ({ label, homeVal, awayVal, suffix = '', invert = false }: any) => {
  const total = homeVal + awayVal;
  const homePct = total > 0 ? (homeVal / total) * 100 : 50;
  const homeIsBetter = invert ? homeVal < awayVal : homeVal > awayVal;
  return (
    <div className="bg-slate-850 p-3 rounded border border-slate-800">
      <div className="flex justify-between text-xs font-bold mb-1"><span className="text-white">{homeVal}{suffix}</span><span className="text-slate-500 font-normal uppercase">{label}</span><span className="text-white">{awayVal}{suffix}</span></div>
      <div className="flex h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${homeIsBetter ? 'bg-hoops-orange' : 'bg-slate-500'}`} style={{ width: `${homePct}%` }} /><div className={`h-full transition-all duration-500 ${!homeIsBetter ? 'bg-hoops-accent' : 'bg-slate-600'}`} style={{ width: `${100 - homePct}%` }} /></div>
    </div>
  )
}

const InternalSidebar: React.FC<{ leagues: League[]; isOpen: boolean; toggleSidebar: () => void; activeLeagueId: string | null; onSelectLeague: (id: string | null) => void; viewMode: any; onViewChange: (m: any) => void; }> = ({ leagues, isOpen, toggleSidebar, activeLeagueId, onSelectLeague, viewMode, onViewChange }) => {
  const handleSelect = (id: string | null) => { onSelectLeague(id); onViewChange('ALL'); if (window.innerWidth < 768) toggleSidebar(); };
  const handleView = (mode: any) => { onViewChange(mode); onSelectLeague(null); if (window.innerWidth < 768) toggleSidebar(); };
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={toggleSidebar} />}
      <div className={`
        fixed bg-slate-900 z-50 transition-transform duration-300 ease-out
        
        /* Mobile: Bottom Sheet Styles */
        bottom-0 left-0 right-0 w-full h-[85vh] 
        rounded-t-2xl border-t border-slate-700 shadow-2xl
        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        
        /* Desktop: Left Sidebar Styles (Overrides) */
        md:static md:h-full md:w-64 md:border-r md:border-t-0 md:rounded-none md:translate-y-0 md:shadow-none
      `}>
        {/* Mobile Handle */}
        <div className="md:hidden flex items-center justify-center pt-3 pb-2 cursor-pointer" onClick={toggleSidebar}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
        </div>

        {/* Desktop Logo (Hidden on mobile sheet) */}
        <div className="hidden md:flex items-center gap-3 px-4 h-16 border-b border-slate-800">
            <div className="w-8 h-8 bg-gradient-to-tr from-hoops-orange to-red-500 rounded flex items-center justify-center text-white font-black italic">H</div>
            <span className="text-xl font-bold tracking-tight text-white">Hoops<span className="text-hoops-orange">Live</span></span>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-40px)] md:h-[calc(100vh-64px)] pb-20">
          <div className="mb-6"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Menu</h3><ul className="space-y-1">{[{id:'ALL', l:'All Games', i:Trophy}, {id:'SCHEDULED', l:'Schedule', i:Calendar}, {id:'FAVORITES', l:'Favorites', i:Star}].map(item => (<li key={item.id}><button onClick={() => handleView(item.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded ${viewMode === item.id && !activeLeagueId ? 'bg-hoops-orange/10 text-hoops-orange' : 'text-slate-300 hover:bg-slate-800'}`}><item.i size={16} /> {item.l}</button></li>))}</ul></div>
          <div className="mb-6"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Today's Leagues</h3><ul className="space-y-1">{leagues.map(l => (<li key={l.id}><button onClick={() => handleSelect(l.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded group ${activeLeagueId === l.id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><span className="opacity-70 w-4 text-center">{l.flag || '🏀'}</span><span className="truncate">{l.name}</span>{activeLeagueId === l.id && <CircleDot size={8} className="ml-auto text-hoops-orange fill-current" />}</button></li>))}</ul></div>
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
            <button key={item.id} onClick={() => onChangeView(item.id)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === item.id ? 'text-hoops-orange' : 'text-slate-500'}`}><item.i size={22} className={currentView === item.id ? 'fill-current' : ''} /><span className="text-[10px] font-medium">{item.l}</span></button>
        ))}
        <button onClick={onMenuClick} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500"><Menu size={22} /><span className="text-[10px] font-medium">Leagues</span></button>
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN APP
// ==========================================

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<any>('ALL');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeamSearchResult[]>([]);
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<{ details: TeamSearchResult, matches: Match[] } | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('hoops_favorites') || '[]')); } catch { return new Set(); } });
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NATIVE HARDWARE BACK BUTTON HANDLING ---
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (showCalendar) {
          setShowCalendar(false);
        } else if (selectedMatch) {
          setSelectedMatch(null);
        } else if (selectedTeamProfile) {
          setSelectedTeamProfile(null);
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        } else if (searchQuery.length > 0) {
          setSearchQuery('');
          setSearchResults([]);
        } else {
          CapacitorApp.exitApp();
        }
      });
    }
  }, [showCalendar, selectedMatch, selectedTeamProfile, sidebarOpen, searchQuery]);

  // --- ADMOB INITIALIZATION (Native Only) ---
  useEffect(() => {
    const initAdMob = async () => {
        try {
            // Check if running natively
            if (Capacitor.isNativePlatform()) {
                 await AdMob.requestTrackingAuthorization();
                 await AdMob.initialize({
                    initializeForTesting: false, 
                });

                // Show Banner automatically at bottom
                await AdMob.showBanner({
                    adId: ADMOB_BANNER_ID,
                    adSize: BannerAdSize.ADAPTIVE_BANNER,
                    position: BannerAdPosition.BOTTOM_CENTER,
                    margin: 0,
                });

                // Prepare Interstitial
                await AdMob.prepareInterstitial({
                    adId: ADMOB_INTERSTITIAL_ID, 
                });
            }
        } catch (e) {
            console.error("AdMob Init Failed", e);
        }
    };
    initAdMob();
  }, []);

  const handleMatchClick = async (match: Match) => {
    // Show Interstitial Ad before navigating (Native Only)
    try {
        if (Capacitor.isNativePlatform()) {
            await AdMob.showInterstitial();
            await AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID });
        }
    } catch (e) {
        console.error("AdMob Interstitial failed", e);
    }
    setSelectedMatch(match);
  };

  useEffect(() => { if (searchQuery.length >= 3) { searchTeams(searchQuery).then(setSearchResults); } else setSearchResults([]); }, [searchQuery]);
  useEffect(() => { setLoading(true); getMatches(currentDate).then(res => { setMatches(res.matches); setLoading(false); }); const i = setInterval(() => document.visibilityState === 'visible' && getMatches(currentDate).then(res => setMatches(res.matches)), 60000); return () => clearInterval(i); }, [currentDate]);

  const toggleFavorite = (e: React.MouseEvent, matchId: string) => { e.stopPropagation(); const newFavs = new Set(favorites); newFavs.has(matchId) ? newFavs.delete(matchId) : newFavs.add(matchId); setFavorites(newFavs); localStorage.setItem('hoops_favorites', JSON.stringify([...newFavs])); };
  const getLeaguePriority = (name: string, country: string): number => { const n = name.toLowerCase(); if (n === 'nba') return 1; if (n.includes('euroleague')) return 2; if (n.includes('ncaa')) return 3; return 100; };
  const uniqueLeagues = useMemo(() => { const m = new Map<string, League>(); matches.forEach(match => { if (!m.has(match.leagueId)) { m.set(match.leagueId, { id: match.leagueId, name: match.leagueName, country: match.country, flag: '🏀', priority: getLeaguePriority(match.leagueName, match.country) }); } }); return Array.from(m.values()).sort((a,b) => a.priority - b.priority); }, [matches]);
  const filteredMatches = useMemo(() => { let r = matches; if (viewMode === 'FAVORITES') r = r.filter(m => favorites.has(m.id)); else if (viewMode === 'LIVE') r = r.filter(m => m.status === MatchStatus.LIVE || m.status === MatchStatus.HALFTIME); else if (viewMode === 'FINISHED') r = r.filter(m => m.status === MatchStatus.FINISHED); else if (viewMode === 'SCHEDULED') r = r.filter(m => m.status === MatchStatus.SCHEDULED); if (selectedLeagueId) r = r.filter(m => m.leagueId === selectedLeagueId); return r; }, [matches, selectedLeagueId, viewMode, favorites]);
  const groupedMatches = useMemo(() => { const g: { [key: string]: Match[] } = {}; filteredMatches.forEach(m => { if (!g[m.leagueId]) g[m.leagueId] = []; g[m.leagueId].push(m); }); return g; }, [filteredMatches]);
  const handleTeamSelect = async (team: TeamSearchResult) => { const schedule = await getTeamSchedule(team.id); setSelectedTeamProfile({ details: team, matches: schedule }); setSearchResults([]); };
  const activeLeagueName = selectedLeagueId ? uniqueLeagues.find(l => l.id === selectedLeagueId)?.name || null : null;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans relative pt-safe">
      <nav className="hidden md:block"><InternalSidebar leagues={uniqueLeagues} isOpen={true} toggleSidebar={() => {}} activeLeagueId={selectedLeagueId} onSelectLeague={setSelectedLeagueId} viewMode={viewMode} onViewChange={(m) => { setViewMode(m); setSearchQuery(''); }} /></nav>
      <BottomNav currentView={viewMode} onChangeView={(m) => { setViewMode(m); setSelectedLeagueId(null); setSearchQuery(''); }} onMenuClick={() => setSidebarOpen(true)} />
      <div className="md:hidden"><InternalSidebar leagues={uniqueLeagues} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} activeLeagueId={selectedLeagueId} onSelectLeague={(id) => { setSelectedLeagueId(id); setSidebarOpen(false); }} viewMode={viewMode} onViewChange={(m) => { setViewMode(m); setSidebarOpen(false); }} /></div>
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
            <div className="flex items-center gap-4">{['ALL', 'LIVE', 'FINISHED', 'SCHEDULED'].map(mode => (<button key={mode} onClick={() => { setViewMode(mode as any); setSelectedLeagueId(null); setSearchQuery(''); }} className={`text-xs font-bold px-3 py-1.5 rounded ${viewMode === mode && !selectedLeagueId ? 'bg-hoops-orange text-white' : 'text-slate-400 hover:text-white'}`}>{mode} GAMES</button>))}</div>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="text" placeholder="Search teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-850 border border-slate-700 rounded-full pl-9 pr-8 py-1.5 text-sm text-slate-200 w-64" />{searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X size={14} /></button>}</div>
        </div>
        {!selectedTeamProfile && !searchQuery && (
            <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-slate-850 border-b border-slate-800 text-xs font-medium text-slate-400 relative z-30">
                <button className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800 rounded" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }}><ChevronLeft size={16} /><span>Yesterday</span></button>
                <div className="relative"><button onClick={() => setShowCalendar(!showCalendar)} className="text-white bg-slate-800 px-4 py-1.5 rounded flex items-center gap-2 border border-slate-700 min-w-[160px] justify-center"><Calendar size={14} className="text-hoops-orange" /><span>{currentDate.toLocaleDateString()}</span></button></div>
                <button className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800 rounded" onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); }}><span>Tomorrow</span><ChevronRight size={16} /></button>
            </div>
        )}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
           {selectedTeamProfile ? (
               <div className="p-4"><button onClick={() => setSelectedTeamProfile(null)} className="flex items-center gap-1 text-hoops-orange mb-4 hover:underline"><ChevronLeft size={16} /> Back</button><div className="bg-slate-850 p-6 rounded-xl border border-slate-800 flex items-center gap-6 mb-6"><SharedTeamLogo src={selectedTeamProfile.details.logo} alt={selectedTeamProfile.details.name} className="w-24 h-24 object-contain" /><div><h2 className="text-2xl font-bold text-white">{selectedTeamProfile.details.name}</h2><div className="text-slate-400">{selectedTeamProfile.details.country}</div></div></div><div className="space-y-2">{selectedTeamProfile.matches.map(m => <MatchRow key={m.id} match={m} onClick={handleMatchClick} isFavorite={favorites.has(m.id)} onToggleFavorite={toggleFavorite} />)}</div></div>
           ) : searchResults.length > 0 ? (
               <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">{searchResults.map(t => (<button key={t.id} onClick={() => handleTeamSelect(t)} className="flex items-center gap-4 p-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-left"><SharedTeamLogo src={t.logo} alt={t.name} className="w-10 h-10 object-contain" /><div><div className="font-bold text-white">{t.name}</div><div className="text-xs text-slate-400">{t.country}</div></div></button>))}</div>
           ) : loading ? (
               <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-hoops-orange" /></div>
           ) : Object.keys(groupedMatches).length === 0 ? (
               <div className="text-center py-20 text-slate-500">No matches found for this date.</div>
           ) : (
               Object.keys(groupedMatches).map(lid => <div key={lid} className="mb-2"><LeagueHeader name={groupedMatches[lid][0].leagueName} country={groupedMatches[lid][0].country} flag="🏀" /><div className="flex flex-col">{groupedMatches[lid].map(m => <MatchRow key={m.id} match={m} onClick={handleMatchClick} isFavorite={favorites.has(m.id)} onToggleFavorite={toggleFavorite} />)}</div></div>)
           )}
        </div>
      </main>
      <aside className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900 z-[60] shadow-2xl transform transition-transform duration-300 ${selectedMatch ? 'translate-x-0' : 'translate-x-full'} xl:static xl:translate-x-0 xl:block xl:shadow-none`}>
         <MatchDetails match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      </aside>
      
      {/* Root-level Calendar Modal to avoid Z-index stacking issues */}
      {showCalendar && (
        <>
            <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={() => setShowCalendar(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90]">
                <CalendarWidget selectedDate={currentDate} onSelectDate={(d) => { setCurrentDate(d); setShowCalendar(false); }} onClose={() => setShowCalendar(false)} />
            </div>
        </>
      )}
    </div>
  );
};

export default App;
