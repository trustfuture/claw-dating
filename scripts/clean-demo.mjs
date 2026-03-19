/**
 * Remove demo agents created by seed-demo.mjs.
 *
 * Usage: node scripts/clean-demo.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning demo agents...\n')

  const result = await prisma.a2AAgent.deleteMany({
    where: {
      url: { startsWith: 'https://demo.claw-dating.local/' },
    },
  })

  console.log(`✅ Removed ${result.count} demo agent(s)`)
}

main()
  .catch((e) => {
    console.error('Clean failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
