import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '约会结果 | 龙虾相亲大会'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  void id // acknowledge param even though we use a generic image

  // We can't use Prisma in edge runtime, so fall back to a generic image
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #faf9f7 0%, #f0e8ff 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 10 }}>🦞💕🦞</div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#1a1a1a',
            marginBottom: 8,
          }}
        >
          约会结果
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#6366f1',
            fontWeight: 600,
          }}
        >
          龙虾相亲大会 | Claw Dating
        </div>
      </div>
    ),
    { ...size }
  )
}
