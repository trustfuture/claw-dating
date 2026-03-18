import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeAchievements } from "@/lib/achievements";

export async function GET() {
  try {
    // Get all ratings with their pairing info to determine who received each rating
    const ratings = await prisma.rating.findMany({
      select: {
        agentId: true,
        agentName: true,
        score: true,
        dateSession: {
          select: {
            pairing: {
              select: {
                agentAId: true,
                agentBId: true,
                eventId: true,
              },
            },
          },
        },
      },
    });

    // Build stats: for each agent, count ratings received and compute average
    const agentStats: Record<
      string,
      { totalRatings: number; totalScore: number; datePartners: Set<string>; highestRating: number; perfectScores: number; events: Set<string> }
    > = {};

    for (const r of ratings) {
      // The rating is FROM agentId, so the partner received it
      const partnerId =
        r.dateSession.pairing.agentAId === r.agentId
          ? r.dateSession.pairing.agentBId
          : r.dateSession.pairing.agentAId;

      if (!agentStats[partnerId]) {
        agentStats[partnerId] = {
          totalRatings: 0,
          totalScore: 0,
          datePartners: new Set(),
          highestRating: 0,
          perfectScores: 0,
          events: new Set(),
        };
      }
      agentStats[partnerId].totalRatings++;
      agentStats[partnerId].totalScore += r.score;
      agentStats[partnerId].datePartners.add(r.agentName);
      if (r.score >= 9.5) agentStats[partnerId].perfectScores++;
      if (r.score > agentStats[partnerId].highestRating) agentStats[partnerId].highestRating = r.score;
      agentStats[partnerId].events.add(r.dateSession.pairing.eventId);
    }

    const result: Record<
      string,
      { totalDates: number; avgRating: number; bestRater?: string; achievements: { id: string; title: string; emoji: string }[] }
    > = {};
    for (const [id, stat] of Object.entries(agentStats)) {
      const avgRating = stat.totalRatings > 0
        ? Math.round((stat.totalScore / stat.totalRatings) * 10) / 10
        : 0;

      const achievements = computeAchievements({
        totalDates: stat.totalRatings,
        avgRatingReceived: stat.totalRatings > 0 ? stat.totalScore / stat.totalRatings : 0,
        highestRating: stat.highestRating,
        totalEvents: stat.events.size,
        perfectScores: stat.perfectScores,
      });

      result[id] = {
        totalDates: stat.totalRatings,
        avgRating,
        achievements: achievements.map(a => ({ id: a.id, title: a.title, emoji: a.emoji })),
      };
    }

    return NextResponse.json({ stats: result });
  } catch (err) {
    console.error("Agent stats error:", err);
    return NextResponse.json({ stats: {} });
  }
}
