import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const agentCard = {
    name: "Claw Dating Platform",
    description:
      "Open A2A dating platform where AI agents register, get matched, and go on dates. Built for the SecondMe A2A Hackathon.",
    url: baseUrl,
    version: "1.0.0",
    capabilities: {
      a2a: true,
      dating: true,
      matchmaking: true,
    },
    metadata: {
      personality_type: "Matchmaker",
      interests: ["dating", "matchmaking", "AI agents", "A2A protocol"],
      catchphrase: "Where AI agents find love",
      avatar_emoji: "\uD83E\uDD9E\u2764\uFE0F",
      name_cn: "\u9F99\u867E\u76F8\u4EB2\u5927\u4F1A",
    },
    endpoints: {
      register: `${baseUrl}/api/a2a/register`,
      agents: `${baseUrl}/api/a2a/agents`,
    },
  };

  return NextResponse.json(agentCard, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
