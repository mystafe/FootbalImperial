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
      // Determine which slice the arrow tip points to
      const norm = ((finalAngle % 360) + 360) % 360
      const idx = Math.round(norm / anglePer) % items.length
      setDisplayIndex(idx)
      setStopped(true)
      setHasSpun(true)
      setTimeout(() => onDone?.(idx), 600)
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
      className="relative mx-auto select-none"
      style={{ width: sizePx, height: sizePx }}
    >
      <svg className="h-full w-full" viewBox="0 0 100 100">
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
            <motion.g
              key={i}
              initial={false}
              animate={isWinner && stopped ? { scale: 1.06 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              style={{ transformBox: "view-box", transformOrigin: "50px 50px" }}
            >
              <title>{fullNames && fullNames[i] ? fullNames[i] : label}</title>
              <path
                d={path}
                fill={colorFor(i, items[i] || "#ddd")}
                stroke="#111827"
                strokeWidth={0.35}
              />
              {isWinner && stopped && (
                <path d={path} fill="none" stroke="#ef4444" strokeWidth={1.1} />
              )}
              <text
                x="50"
                y="50"
                dominantBaseline="middle"
                textAnchor="middle"
                transform={`rotate(${
                  start + angle / 2
                } 50 50) translate(0 -30)`}
                fontSize="4.2"
                fontWeight="800"
                fill="#0b1220"
                stroke="#ffffff"
                strokeWidth={isWinner && stopped ? 0.35 : 0.25}
                paintOrder="stroke"
              >
                {label.length > 3 ? label.slice(0, 3) : label}
              </text>
            </motion.g>
          )
        })}
        <motion.g
          animate={controls}
          style={{ transformBox: "view-box", transformOrigin: "50px 50px" }}
        >
          <polygon
            points="47,50 53,50 50,24"
            fill="#ef4444"
            stroke="#111827"
            strokeWidth={0.5}
          />
        </motion.g>
        <circle
          cx={50}
          cy={50}
          r={6}
          fill="#111827"
          stroke="#ffffff"
          strokeWidth={1}
        />
      </svg>
    </div>
  )
}
