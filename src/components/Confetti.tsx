'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#6366f1', '#e85d4d', '#d4a853', '#4ecdc4', '#f28c7d', '#818cf8']
const PARTICLE_COUNT = 50

interface Particle {
  id: number
  x: number
  color: string
  delay: number
  duration: number
  size: number
  rotation: number
}

export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!active) return
    setParticles(
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.8,
        duration: 2 + Math.random() * 2,
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
      }))
    )
    const timer = setTimeout(() => setParticles([]), 5000)
    return () => clearTimeout(timer)
  }, [active])

  if (particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: '1px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}
