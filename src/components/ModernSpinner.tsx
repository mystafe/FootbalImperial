import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ModernSpinnerProps {
  items: string[]
  colors?: string[]
  fullNames?: string[]
  winnerIndex: number
  onDone: (index: number) => void
  durationMs?: number
  size?: number
}

export function ModernSpinner({
  items,
  colors = [],
  fullNames = [],
  winnerIndex,
  onDone,
  durationMs = 3000,
  size = 400
}: ModernSpinnerProps) {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (winnerIndex == null || winnerIndex < 0 || winnerIndex >= items.length) return

    setIsSpinning(true)
    setShowResult(false)

    // CRITICAL MATH FIX:
    // Arrow is FIXED at TOP pointing DOWN (270° in standard coords)
    // SVG: 0° = right/east, 90° = down/south, 180° = left/west, 270° = up/north
    
    const anglePerSegment = 360 / items.length
    
    // Segment i (before any rotation):
    // - starts at: i * anglePerSegment
    // - ends at: (i+1) * anglePerSegment
    // - center at: i * anglePerSegment + anglePerSegment/2
    
    // Example for 5 teams (anglePerSegment = 72°):
    // Segment 0 (Trabzonspor): 0° - 72°, center = 36°
    // Segment 1 (Samsunspor): 72° - 144°, center = 108°
    // Segment 2 (Fenerbahce): 144° - 216°, center = 180°
    // Segment 3 (Besiktas): 216° - 288°, center = 252°
    // Segment 4 (Galatasaray): 288° - 360°, center = 324°
    
    const winnerCenterAngle = winnerIndex * anglePerSegment + anglePerSegment / 2
    const arrowAngle = 270 // Arrow at top
    
    // We want: after rotation, winnerCenterAngle should align with arrowAngle
    // (winnerCenterAngle + rotation) % 360 = arrowAngle
    // rotation = arrowAngle - winnerCenterAngle
    let rotationNeeded = arrowAngle - winnerCenterAngle
    
    // Normalize to positive angle
    while (rotationNeeded < 0) rotationNeeded += 360
    
    // FIXED: Use constant spins to ensure consistent result
    const spins = 6 // Always 6 full rotations for consistency
    const finalRotation = spins * 360 + rotationNeeded

    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentRotation = finalRotation * eased
      setRotation(currentRotation)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsSpinning(false)
        
        // Calculate which segment is actually under the arrow after rotation
        const finalAngle = ((finalRotation % 360) + 360) % 360
        const arrowAngle = 270 // Arrow points at top (270°)
        
        // After wheel rotates by finalRotation, each segment moves
        // Segment i's center moves from (i * anglePerSegment + anglePerSegment/2) to that + finalRotation
        // We need to find which segment's center is closest to arrowAngle after rotation
        
        let closestSegmentIndex = 0
        let minDistance = 360
        
        for (let i = 0; i < items.length; i++) {
          const segmentCenter = i * anglePerSegment + anglePerSegment / 2
          const rotatedCenter = (segmentCenter + finalAngle) % 360
          
          // Calculate angular distance to arrow
          let distance = Math.abs(rotatedCenter - arrowAngle)
          if (distance > 180) distance = 360 - distance
          
          if (distance < minDistance) {
            minDistance = distance
            closestSegmentIndex = i
          }
        }
        
        // Use the ACTUAL segment under arrow for perfect visual alignment
        const actualWinner = closestSegmentIndex
        
        setTimeout(() => {
          setShowResult(true)
        }, 500)
        
        setTimeout(() => {
          onDone(actualWinner)
        }, 2000)
      }
    }

    requestAnimationFrame(animate)
  }, [winnerIndex, items.length, durationMs])

  const anglePerSegment = 360 / items.length
  const radius = 50

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-white/10 to-transparent backdrop-blur-xl border border-white/20 shadow-2xl" />
        
        {/* SVG Spinner Wheel */}
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          animate={{ rotate: rotation }}
          transition={{ ease: 'linear', duration: 0 }}
          style={{ transformOrigin: '50% 50%' }}
        >
          <defs>
            <filter id="segment-glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Team Segments */}
          {items.map((item, index) => {
            const startAngleDeg = index * anglePerSegment
            const endAngleDeg = (index + 1) * anglePerSegment
            const color = colors[index] || '#3b82f6'
            
            // Convert to radians for SVG path
            const startAngleRad = (startAngleDeg * Math.PI) / 180
            const endAngleRad = (endAngleDeg * Math.PI) / 180
            
            const x1 = 50 + radius * Math.cos(startAngleRad)
            const y1 = 50 + radius * Math.sin(startAngleRad)
            const x2 = 50 + radius * Math.cos(endAngleRad)
            const y2 = 50 + radius * Math.sin(endAngleRad)
            
            const largeArcFlag = anglePerSegment > 180 ? 1 : 0
            
            return (
              <g key={index}>
                <defs>
                  <linearGradient id={`team-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 50,50 L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`}
                  fill={`url(#team-gradient-${index})`}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                  filter="url(#segment-glow)"
                />
                
                {/* Team label */}
                <text
                  x={50 + (radius * 0.7) * Math.cos((startAngleDeg + anglePerSegment / 2) * Math.PI / 180)}
                  y={50 + (radius * 0.7) * Math.sin((startAngleDeg + anglePerSegment / 2) * Math.PI / 180)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="6"
                  fontWeight="bold"
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    pointerEvents: 'none'
                  }}
                >
                  {item}
                </text>
              </g>
            )
          })}
        </motion.svg>

        {/* Center Football with Glassmorphism */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="w-20 h-20 rounded-full backdrop-blur-xl border border-white/30 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)',
              zIndex: 10
            }}
            animate={isSpinning ? { 
              scale: [1, 1.15, 1],
              rotate: [0, 360]
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <motion.div 
              className="text-3xl"
              animate={isSpinning ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              ⚽
            </motion.div>
          </motion.div>
        </div>

        {/* Fixed Arrow at Top - INSIDE wheel with glassmorphism */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 translate-y-4 pointer-events-none" style={{ zIndex: 20 }}>
          {/* Glassmorphism backing */}
          <div 
            className="absolute -inset-4 rounded-full backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.4)',
              border: '2px solid rgba(255,255,255,0.4)',
              zIndex: -1
            }}
          />
          
          {/* Arrow head */}
          <div 
            className="mx-auto relative"
            style={{
              width: 0,
              height: 0,
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderBottom: '28px solid rgba(255,255,255,0.98)',
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))'
            }}
          />
          {/* Inner gradient arrow */}
          <div 
            className="mx-auto absolute left-1/2 top-0"
            style={{
              transform: 'translateX(-50%) translateY(7px)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderBottom: '20px solid rgba(239, 68, 68, 0.98)'
            }}
          />
          {/* Arrow shaft with glassmorphism */}
          <div 
            className="mx-auto backdrop-blur-sm"
            style={{
              width: '5px',
              height: '24px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(239,68,68,0.95))',
              borderRadius: '3px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
              marginTop: '5px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          />
        </div>

        {/* Selected Team Animation with Glassmorphism */}
        {showResult && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 1 }}
            style={{ zIndex: 30 }}
          >
            <motion.div
              className="px-12 py-6 rounded-2xl font-bold text-xl backdrop-blur-xl border border-white/30"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              {fullNames[winnerIndex] || items[winnerIndex]}
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ModernSpinner
