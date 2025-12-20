import React from 'react';

interface LeagueHeaderProps {
  name: string;
  country: string;
  flag: string;
}

export const LeagueHeader: React.FC<LeagueHeaderProps> = ({ name, country, flag }) => {
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