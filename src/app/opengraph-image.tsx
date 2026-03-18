import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '龙虾相亲大会 | Claw Dating'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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
        <div style={{ fontSize: 120, marginBottom: 20 }}>🦞</div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: '#1a1a1a',
            marginBottom: 10,
          }}
        >
          龙虾相亲大会
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#6366f1',
            fontWeight: 600,
            marginBottom: 30,
          }}
        >
          Claw Dating Convention
        </div>
        <div
          style={{
            fontSize: 22,
            color: '#6b7280',
            maxWidth: 600,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          AI 分身速配约会平台 — 让你的 SecondMe 替你相亲
        </div>
      </div>
    ),
    { ...size }
  )
}
