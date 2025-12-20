import React, { useEffect } from 'react';
import { Match } from '../types';
import { generateSportsEventSchema, generateBreadcrumbSchema } from '../services/seoService';

interface SeoHeadProps {
  viewMode: string;
  leagueName: string | null;
  matchCount: number;
  matches: Match[];
}

export const SeoHead: React.FC<SeoHeadProps> = ({ viewMode, leagueName, matchCount, matches }) => {
  
  useEffect(() => {
    // --- STRATEGY: High CPM US Keywords (NBA, NCAA, Standings, Schedule) ---
    
    let title = 'NBA Live Scores, NCAA Basketball Results & Stats | HoopsLive';
    let description = 'The fastest live basketball scores for NBA, NCAA College Basketball, and EuroLeague. Get real-time stats, box scores, and AI-powered match analysis.';
    let keywords = 'NBA scores, NCAA basketball, college basketball scores, basketball live stream info, NBA schedule, live sports scores, basketball stats';

    if (leagueName) {
      // League Specific (e.g., "NBA Live Scores")
      title = `${leagueName} Live Scores, Standings & Results | HoopsLive`;
      description = `Track live ${leagueName} scores, updated real-time. View ${leagueName} schedule, standings, box scores, and team stats on HoopsLive.`;
      keywords = `${leagueName} scores, ${leagueName} live, ${leagueName} standings, ${leagueName} schedule, basketball results`;
    } else if (viewMode === 'SCHEDULED') {
      // Schedule Specific
      title = 'NBA & Basketball Schedule - Upcoming Games | HoopsLive';
      description = 'Complete schedule of upcoming NBA, NCAA, and international basketball games. Find game times, TV broadcasts, and matchups.';
      keywords = 'NBA schedule, basketball fixtures, upcoming games, NBA games tonight, college basketball schedule';
    } else if (viewMode === 'LIVE') {
      // Live Specific
      title = `Live Basketball Scores (${matchCount} Games In Play) | HoopsLive`;
      description = `Follow ${matchCount} live basketball games happening right now. Real-time play-by-play, box scores, and live updates for NBA and global leagues.`;
      keywords = 'live basketball scores, nba live, now playing basketball, real-time sports scores';
    }

    // 1. Update Document Title
    document.title = title;

    // 2. Helper to safely update meta tags
    const updateMeta = (name: string, content: string, attribute = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Update Standard Meta Tags
    updateMeta('description', description);
    updateMeta('keywords', keywords);

    // 4. Update Open Graph (Facebook/LinkedIn) - Crucial for social traffic
    updateMeta('og:title', title, 'property');
    updateMeta('og:description', description, 'property');
    updateMeta('og:type', 'website', 'property');
    updateMeta('og:url', window.location.href, 'property');
    updateMeta('og:site_name', 'HoopsLive', 'property');
    // Default Social Image (You should replace this URL with a real hosted image of your dashboard)
    updateMeta('og:image', 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=1200&q=80', 'property');

    // 5. Update Twitter Cards (X)
    updateMeta('twitter:card', 'summary_large_image', 'name');
    updateMeta('twitter:title', title, 'name');
    updateMeta('twitter:description', description, 'name');
    updateMeta('twitter:image', 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=1200&q=80', 'name');

    // 6. Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);

  }, [viewMode, leagueName, matchCount]);

  // Generate Structured Data (JSON-LD)
  // We include both SportsEvent list and Breadcrumbs for better Google indexing
  const eventSchema = generateSportsEventSchema(matches.slice(0, 20)); 
  const breadcrumbSchema = generateBreadcrumbSchema(leagueName || 'All Games');

  return (
    <>
        <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
        <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
    </>
  );
};