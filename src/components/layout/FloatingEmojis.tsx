// Ambient, low-key decoration for the landing page: small art-themed emojis
// drifting upward like bubbles. A few are desaturated for a retro B&W feel,
// the rest stay in colour. Values are hand-tuned (not random) so server and
// client render identically — no hydration mismatch.

interface Particle {
  emoji: string
  left: number // %
  size: number // px
  dur: number // s
  delay: number // s (negative = already mid-flight on first paint)
  drift: number // px horizontal sway by the top
  spin: number // deg
  opacity: number
  mono: boolean
}

const PARTICLES: Particle[] = [
  {
    emoji: '✏️',
    left: 6,
    size: 22,
    dur: 19,
    delay: -2,
    drift: 28,
    spin: 18,
    opacity: 0.32,
    mono: true,
  },
  {
    emoji: '🫧',
    left: 14,
    size: 30,
    dur: 15,
    delay: -8,
    drift: -22,
    spin: -10,
    opacity: 0.28,
    mono: false,
  },
  {
    emoji: '🎨',
    left: 23,
    size: 26,
    dur: 22,
    delay: -14,
    drift: 16,
    spin: 24,
    opacity: 0.3,
    mono: false,
  },
  {
    emoji: '🖍️',
    left: 33,
    size: 20,
    dur: 17,
    delay: -5,
    drift: -30,
    spin: -16,
    opacity: 0.3,
    mono: true,
  },
  {
    emoji: '✨',
    left: 42,
    size: 18,
    dur: 13,
    delay: -10,
    drift: 20,
    spin: 8,
    opacity: 0.4,
    mono: false,
  },
  {
    emoji: '🖼️',
    left: 52,
    size: 28,
    dur: 24,
    delay: -3,
    drift: -18,
    spin: 14,
    opacity: 0.26,
    mono: true,
  },
  {
    emoji: '🫧',
    left: 61,
    size: 24,
    dur: 16,
    delay: -12,
    drift: 26,
    spin: -8,
    opacity: 0.3,
    mono: false,
  },
  {
    emoji: '⭐',
    left: 70,
    size: 19,
    dur: 18,
    delay: -7,
    drift: -24,
    spin: 20,
    opacity: 0.34,
    mono: true,
  },
  {
    emoji: '🖌️',
    left: 78,
    size: 24,
    dur: 21,
    delay: -16,
    drift: 18,
    spin: -22,
    opacity: 0.3,
    mono: false,
  },
  {
    emoji: '📐',
    left: 86,
    size: 22,
    dur: 20,
    delay: -4,
    drift: -16,
    spin: 12,
    opacity: 0.26,
    mono: true,
  },
  {
    emoji: '🎈',
    left: 92,
    size: 26,
    dur: 23,
    delay: -11,
    drift: 22,
    spin: -14,
    opacity: 0.28,
    mono: false,
  },
  {
    emoji: '✏️',
    left: 47,
    size: 18,
    dur: 14,
    delay: -9,
    drift: -20,
    spin: 16,
    opacity: 0.3,
    mono: true,
  },
  {
    emoji: '🫧',
    left: 30,
    size: 16,
    dur: 12,
    delay: -6,
    drift: 14,
    spin: 6,
    opacity: 0.34,
    mono: false,
  },
  {
    emoji: '✨',
    left: 64,
    size: 16,
    dur: 15,
    delay: -13,
    drift: -12,
    spin: -6,
    opacity: 0.38,
    mono: true,
  },
]

export function FloatingEmojis() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="emoji-particle"
          style={
            {
              left: `${p.left}%`,
              fontSize: p.size,
              filter: p.mono ? 'grayscale(1)' : undefined,
              '--emoji-dur': `${p.dur}s`,
              '--emoji-delay': `${p.delay}s`,
              '--emoji-drift': `${p.drift}px`,
              '--emoji-spin': `${p.spin}deg`,
              '--emoji-opacity': p.opacity,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}
