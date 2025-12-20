
import { GoogleGenAI } from "@google/genai";
import { Match } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMatch = async (match: Match): Promise<string> => {
  const isLive = match.status === 'LIVE' || match.status === 'HALFTIME';
  const isFinished = match.status === 'FINISHED';

  let promptContext = `
    You are an expert Basketball Analyst and Coach.
    Analyze the following match data between ${match.homeTeam.name} (Home) and ${match.awayTeam.name} (Away).
    Current Status: ${match.status} ${match.currentTime ? `(${match.currentTime})` : ''}
    
    Scores:
    ${match.homeTeam.name}: ${match.homeScore.total} (Q1:${match.homeScore.q1}, Q2:${match.homeScore.q2}, Q3:${match.homeScore.q3}, Q4:${match.homeScore.q4})
    ${match.awayTeam.name}: ${match.awayScore.total} (Q1:${match.awayScore.q1}, Q2:${match.awayScore.q2}, Q3:${match.awayScore.q3}, Q4:${match.awayScore.q4})
  `;

  if (match.homeStats && match.awayStats) {
    promptContext += `
      Stats:
      Home FG%: ${match.homeStats.fgPercentage}%, 3PT%: ${match.homeStats.threePtPercentage}%, REB: ${match.homeStats.rebounds}, AST: ${match.homeStats.assists}, TO: ${match.homeStats.turnovers}
      Away FG%: ${match.awayStats.fgPercentage}%, 3PT%: ${match.awayStats.threePtPercentage}%, REB: ${match.awayStats.rebounds}, AST: ${match.awayStats.assists}, TO: ${match.awayStats.turnovers}
    `;
  }

  let specificInstruction = "";
  if (isLive) {
    specificInstruction = "Provide a 3-sentence live commentary on the momentum of the game. Who is controlling the pace? What does the trailing team need to do to catch up?";
  } else if (isFinished) {
    specificInstruction = "Provide a concise 3-sentence summary of why the winning team won, focusing on key stats (shooting efficiency, turnovers, or rebounding).";
  } else {
    specificInstruction = "Provide a pre-game prediction. Based on typical performance (assume these are top tier teams), who has the edge?";
  }

  const prompt = `${promptContext}\n\n${specificInstruction}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate analysis at this time.";
  }
};

export const askBasketballAssistant = async (query: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a helpful basketball expert assistant. Answer this query briefly: ${query}`,
        });
        return response.text || "No response.";
    } catch (e) {
        return "Error connecting to AI.";
    }
}
