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
  const [displayIndex, setDisplayIndex] = useState<number | undefined>(
    undefined
  )

  useEffect(() => {
    let cancelled = false
    const spin = async () => {
      // Only spin if we have a valid winnerIndex
      if (typeof winnerIndex !== "number" || winnerIndex < 0 || winnerIndex >= items.length) {
        return
      }
      
      setStopped(false)
      const spins = 5 + Math.random() * 2
      const finalWinnerIndex = winnerIndex
      const anglePer = 360 / Math.max(1, items.length)
      // Segment visual centers (after toRad shift by -90):
      // seg0: 0*72 + 36 - 90 = -54° (or 306°)
      // seg1: 1*72 + 36 - 90 = 18°
      // seg2: 2*72 + 36 - 90 = 90°
      // seg3: 3*72 + 36 - 90 = 162°
      // seg4: 4*72 + 36 - 90 = 234°
      // Pointer is at top = -90° (or 270°)
      // To align segment's visual center with pointer at -90°:
      const visualCenter = finalWinnerIndex * anglePer + anglePer / 2 - 90
      const rotationNeeded = -90 - visualCenter
      const finalAngle = spins * 360 + rotationNeeded
      // Calculate which segment will be at pointer after rotation
      const normalizedAngle = ((finalAngle % 360) + 360) % 360
      // Pointer is at top (-90° or 270°)
      const pointerAngle = 270 // Use positive degrees for easier calculation
      let minDistance = Infinity
      let closestSegment = 0
      for (let i = 0; i < items.length; i++) {
        // Visual center of segment i (in positive degrees)
        const visualCenter = ((i * anglePer + anglePer / 2) % 360)
        // After rotation
        const rotatedCenter = (visualCenter + normalizedAngle) % 360
        // Calculate angular distance (handle wrap-around)
        let distance = Math.abs(rotatedCenter - pointerAngle)
        if (distance > 180) distance = 360 - distance
        if (distance < minDistance) {
          minDistance = distance
          closestSegment = i
        }
      }
      const pointerSegment = closestSegment
      
      // 🔍 SPINNER DEBUG - Kritik kontrol noktası
      console.log('🎯 SPINNER START:', {
        target: `${finalWinnerIndex}=${items[finalWinnerIndex]}`,
        visualCenter: visualCenter.toFixed(1),
        rotationNeeded: rotationNeeded.toFixed(1),
        finalAngle: finalAngle.toFixed(1),
        normalized: normalizedAngle.toFixed(1),
        pointerAt: '-90° (270°)'
      })
      
      await controls.start({
        rotate: finalAngle,
        transition: { duration: durationMs / 1000, ease: "easeInOut" }
      })
      
      if (cancelled) return
      
      // 🔍 SPINNER RESULT - Çark durdu, kontrol et
      console.log('🎯 SPINNER RESULT:', {
        expected: `${finalWinnerIndex}=${items[finalWinnerIndex]}`,
        actual: `${pointerSegment}=${items[pointerSegment]}`,
        match: finalWinnerIndex === pointerSegment ? '✅ DOĞRU' : '❌ YANLIŞ',
        allSegments: items.map((item, i) => {
          const visualCenter = (i * anglePer + anglePer / 2) % 360
          const rotatedCenter = (visualCenter + normalizedAngle) % 360
          let dist = Math.abs(rotatedCenter - 270)
          if (dist > 180) dist = 360 - dist
          return `${i}:${item}(${rotatedCenter.toFixed(0)}°,dist:${dist.toFixed(0)}°)`
        }).join(', ')
      })
      
      // Use the visual result (what's actually under the pointer)
      setDisplayIndex(pointerSegment)
      setStopped(true)
      setTimeout(() => {
        onDone?.(pointerSegment)
      }, 600)
    }
    spin()
    return () => {
      cancelled = true
    }
  }, [winnerIndex]) // Only re-run when winnerIndex changes

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
            const start = i * angle
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
