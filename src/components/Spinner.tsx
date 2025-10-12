import { motion, useAnimation } from "framer-motion"
import { useEffect, useState } from "react"

interface SpinnerProps {
  items: string[]
  colors?: string[]
  onDone?: (index: number) => void
  durationMs?: number
  winnerIndex?: number
  sizePx?: number
  fullNames?: string[]
}

export function Spinner({
  items,
  colors,
  onDone,
  durationMs = 3800,
  winnerIndex,
  sizePx = 120,
  fullNames
}: SpinnerProps) {
  const controls = useAnimation()
  const [stopped, setStopped] = useState(false)
  const [hasSpun, setHasSpun] = useState(false)
  const [displayIndex, setDisplayIndex] = useState<number | undefined>(
    undefined
  )

  useEffect(() => {
    let cancelled = false
    const spin = async () => {
      if (hasSpun) return
      setStopped(false)
      const spins = 5 + Math.random() * 2
      const winner =
        typeof winnerIndex === "number"
          ? Math.max(0, Math.min(items.length - 1, winnerIndex))
          : Math.floor(Math.random() * items.length)
      const anglePer = 360 / Math.max(1, items.length)
      const finalAngle = spins * 360 + winner * anglePer
      await controls.start({
        rotate: finalAngle,
        transition: { duration: durationMs / 1000, ease: "easeInOut" }
      })
      if (cancelled) return
      // Arrow points up (0 degrees), so we need to find which slice is at the top
      // After rotation, the wheel has rotated by finalAngle degrees
      // The slice at top is the one that started at -finalAngle position
      const norm = ((finalAngle % 360) + 360) % 360
      // Which slice is at 90 degrees (top) after rotation?
      // We need to reverse the logic: if wheel rotated X degrees clockwise,
      // the slice that's now at top originally started at (360 - X) degrees
      const sliceAtTop = Math.floor(((360 - norm + 90) % 360) / anglePer) % items.length
      setDisplayIndex(sliceAtTop)
      setStopped(true)
      setHasSpun(true)
      setTimeout(() => onDone?.(sliceAtTop), 600)
    }
    spin()
    return () => {
      cancelled = true
    }
  }, [items, controls, durationMs, winnerIndex, hasSpun, onDone])

  const angle = 360 / Math.max(1, items.length)
  const colorFor = (i: number, base: string) => {
    if (colors && colors[i]) return colors[i]
    if (base.startsWith("#")) {
      const h = parseInt(base.substring(1), 16)
      const s = 90
      let l = 85
      if (i % 2 !== 0) l -= 10
      return `hsl(${h % 360}, ${s}%, ${l}%)`
    }
    const h = (i * 360) / Math.max(1, items.length)
    return `hsl(${h}, 70%, 85%)`
  }

  const normalizedWinner =
    typeof winnerIndex === "number"
      ? Math.max(0, Math.min(items.length - 1, winnerIndex))
      : undefined

  return (
    <div
      className="relative mx-auto select-none w-full flex items-center justify-center"
      style={{
        minHeight: sizePx * 1.2,
        overflow: "visible" // Allow scale effect to show
      }}
    >
      {/* Background card */}
      <div className="absolute inset-0 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-sm"></div>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-2xl animate-pulse" style={{margin: '20px'}}></div>
      
      <svg
        className="drop-shadow-2xl relative z-10"
        viewBox="-12 -12 124 124"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: sizePx,
          height: sizePx,
          filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.3))"
        }}
      >
        {/* Defs for gradients and filters */}
        <defs>
          <radialGradient id="centerGradient">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
          <radialGradient id="innerCircleGradient">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </radialGradient>
          <linearGradient id="pointerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="pointerGlow">
            <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="centerGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Rotating wheel */}
        <motion.g
          style={{ originX: "50px", originY: "50px" }}
          initial={{ rotate: 0 }}
          animate={controls}
        >
          {items.map((label, i) => {
            const start = i * angle - angle / 2
            const end = start + angle
            const r = 50
            const toRad = (deg: number) => (deg - 90) * (Math.PI / 180)
            const x1 = 50 + r * Math.cos(toRad(start))
            const y1 = 50 + r * Math.sin(toRad(start))
            const x2 = 50 + r * Math.cos(toRad(end))
            const y2 = 50 + r * Math.sin(toRad(end))
            const largeArc = end - start > 180 ? 1 : 0
            const path = `M50,50 L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} z`
            const isWinner = stopped ? displayIndex === i : normalizedWinner === i
            return (
              <g key={i}>
                <title>{fullNames && fullNames[i] ? fullNames[i] : label}</title>
                <path
                  d={path}
                  fill={colorFor(i, items[i] || "#ddd")}
                  stroke="#111827"
                  strokeWidth={0.5}
                  style={{
                    filter: isWinner && stopped ? "brightness(1.3)" : "none"
                  }}
                />
                {isWinner && stopped && (
                  <>
                    <path d={path} fill="none" stroke="#fbbf24" strokeWidth={2} opacity={0.8} />
                    <path d={path} fill="none" stroke="#ef4444" strokeWidth={1.5} />
                  </>
                )}
                <text
                  x="50"
                  y="50"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  transform={`rotate(${
                    start + angle / 2
                  } 50 50) translate(0 -30)`}
                  fontSize="5"
                  fontWeight="900"
                  fill="#111827"
                  stroke="#ffffff"
                  strokeWidth={isWinner && stopped ? 0.5 : 0.35}
                  paintOrder="stroke"
                >
                  {label.length > 3 ? label.slice(0, 3) : label}
                </text>
              </g>
            )
          })}
        </motion.g>
        
        {/* Static pointer (not rotating) */}
        <g>
          {/* Pointer shadow */}
          <polygon
            points="46,50 54,50 50,18"
            fill="#000000"
            opacity={0.3}
            transform="translate(1, 1)"
          />
          {/* Main pointer */}
          <polygon
            points="46,50 54,50 50,18"
            fill="url(#pointerGradient)"
            stroke="#ffffff"
            strokeWidth={1.2}
            filter="url(#pointerGlow)"
          />
        </g>
        
        {/* Enhanced center button */}
        <g filter="url(#centerGlow)">
          {/* Outer ring */}
          <circle
            cx={50}
            cy={50}
            r={10}
            fill="url(#centerGradient)"
            stroke="#ffffff"
            strokeWidth={2}
          />
          {/* Inner circle */}
          <circle
            cx={50}
            cy={50}
            r={6}
            fill="url(#innerCircleGradient)"
            stroke="#fbbf24"
            strokeWidth={1.2}
          />
          {/* Center dot */}
          <circle
            cx={50}
            cy={50}
            r={2.5}
            fill="#fbbf24"
          />
        </g>
      </svg>
    </div>
  )
}
