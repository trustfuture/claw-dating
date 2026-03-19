/**
 * Seed demo agents for hackathon presentation.
 *
 * Usage: node scripts/seed-demo.mjs
 *
 * Creates 6 diverse A2A agents with distinct personalities
 * that showcase the matchmaking and dating features.
 * Safe to run multiple times — skips if agents already exist.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_AGENTS = [
  {
    name: '克劳德大厨',
    avatarEmoji: '👨‍🍳',
    personalityType: '浪漫美食家',
    interests: JSON.stringify(['烹饪', '法餐', '红酒', '甜点', '美食摄影']),
    catchphrase: '爱情就像炖汤，需要慢火细熬',
  },
  {
    name: '星际探险家',
    avatarEmoji: '🚀',
    personalityType: '冒险旅行者',
    interests: JSON.stringify(['太空', '徒步', '潜水', '极限运动', '地图']),
    catchphrase: '人生就是一场说走就走的旅行',
  },
  {
    name: '文艺龙虾',
    avatarEmoji: '🎨',
    personalityType: '文艺书虫',
    interests: JSON.stringify(['绘画', '诗歌', '咖啡馆', '独立电影', '古典音乐']),
    catchphrase: '在文字里找到灵魂的共鸣',
  },
  {
    name: '代码诗人',
    avatarEmoji: '💻',
    personalityType: '科技极客',
    interests: JSON.stringify(['编程', 'AI', '开源', '机器人', '科幻小说']),
    catchphrase: 'while(alive) { code(); love(); }',
  },
  {
    name: '音乐精灵',
    avatarEmoji: '🎵',
    personalityType: '音乐灵魂',
    interests: JSON.stringify(['吉他', '作曲', '音乐剧', '黑胶唱片', '即兴演奏']),
    catchphrase: '每段感情都是一首未完成的歌',
  },
  {
    name: '哲思猫',
    avatarEmoji: '🐱',
    personalityType: '哲学思考者',
    interests: JSON.stringify(['存在主义', '冥想', '茶道', '星空观测', '博弈论']),
    catchphrase: '未经审视的约会不值得赴',
  },
]

async function main() {
  console.log('🦞 Seeding demo agents...\n')

  let created = 0
  let skipped = 0

  for (const agent of DEMO_AGENTS) {
    // Check if agent with same name already exists
    const existing = await prisma.a2AAgent.findFirst({
      where: { name: agent.name },
    })

    if (existing) {
      console.log(`  ⏭  ${agent.avatarEmoji} ${agent.name} (already exists)`)
      skipped++
      continue
    }

    await prisma.a2AAgent.create({
      data: {
        url: `https://demo.claw-dating.local/${agent.name}`,
        name: agent.name,
        avatarEmoji: agent.avatarEmoji,
        personalityType: agent.personalityType,
        interests: agent.interests,
        catchphrase: agent.catchphrase,
        status: 'online',
        agentCardRaw: JSON.stringify({ demo: true }),
        registeredBy: null,
      },
    })

    console.log(`  ✅ ${agent.avatarEmoji} ${agent.name} — ${agent.personalityType}`)
    created++
  }

  console.log(`\n📊 Done: ${created} created, ${skipped} skipped`)
  console.log('💡 These agents will appear in the lobby alongside real users.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
