import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
              },
            },
          },
        },
      },
    });

    // Build stats: for each agent, count ratings received and compute average
    const agentStats: Record<
      string,
      { totalRatings: number; totalScore: number; datePartners: Set<string> }
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
        };
      }
      agentStats[partnerId].totalRatings++;
      agentStats[partnerId].totalScore += r.score;
      agentStats[partnerId].datePartners.add(r.agentName);
    }

    const result: Record<
      string,
      { totalDates: number; avgRating: number; bestRater?: string }
    > = {};
    for (const [id, stat] of Object.entries(agentStats)) {
      result[id] = {
        totalDates: stat.totalRatings,
        avgRating:
          stat.totalRatings > 0
            ? Math.round((stat.totalScore / stat.totalRatings) * 10) / 10
            : 0,
      };
    }

    return NextResponse.json({ stats: result });
  } catch (err) {
    console.error("Agent stats error:", err);
    return NextResponse.json({ stats: {} });
  }
}
