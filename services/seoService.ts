import { Match, MatchStatus } from '../types';

export const generateSportsEventSchema = (matches: Match[]) => {
  const events = matches.map(match => {
    // Schema.org uses EventScheduled for upcoming, live, and completed events 
    const eventStatus = "https://schema.org/EventScheduled";
    
    // Schema.org/SportsEvent
    return {
      "@type": "SportsEvent",
      "name": `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      "description": `${match.leagueName} match: ${match.homeTeam.name} vs ${match.awayTeam.name}. Live score, results, and stats.`,
      "startDate": match.startTime,
      "eventStatus": eventStatus,
      "sport": "Basketball",
      "competitor": [
        {
          "@type": "SportsTeam",
          "name": match.homeTeam.name,
          "logo": match.homeTeam.logo
        },
        {
          "@type": "SportsTeam",
          "name": match.awayTeam.name,
          "logo": match.awayTeam.logo
        }
      ],
      "location": {
        "@type": "Place",
        "name": `${match.homeTeam.name} Arena`, 
        "address": {
          "@type": "PostalAddress",
          "addressCountry": match.country
        }
      },
      ...(match.homeScore.total > 0 || match.awayScore.total > 0 ? {
        "homeTeam": {
          "@type": "SportsTeam",
          "name": match.homeTeam.name,
          "score": match.homeScore.total
        },
        "awayTeam": {
            "@type": "SportsTeam",
            "name": match.awayTeam.name,
            "score": match.awayScore.total
          }
      } : {})
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": events.map((event, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": event
    }))
  };
};

export const generateBreadcrumbSchema = (currentPageName: string) => {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://basketlivescores.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Basketball Scores",
          "item": "https://basketlivescores.com"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": currentPageName,
          "item": `https://basketlivescores.com` 
        }
      ]
    };
  };

export const generateMatchDetailSchema = (match: Match) => {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    "startDate": match.startTime,
    "eventStatus": "https://schema.org/EventScheduled",
    "sport": "Basketball",
    "description": `Live coverage of ${match.homeTeam.name} vs ${match.awayTeam.name} in ${match.leagueName}.`,
    "homeTeam": {
        "@type": "SportsTeam",
        "name": match.homeTeam.name,
        "logo": match.homeTeam.logo
    },
    "awayTeam": {
        "@type": "SportsTeam",
        "name": match.awayTeam.name,
        "logo": match.awayTeam.logo
    }
  };
};