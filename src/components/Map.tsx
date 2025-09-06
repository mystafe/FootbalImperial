import { useEffect, useMemo, useRef, useState } from "react"
import { feature } from "topojson-client"
import { geoMercator, geoPath, geoBounds, geoContains } from "d3-geo"
import { useGameStore } from "../store/game"
import world110 from "world-atlas/countries-110m.json" with { type: "json" }
import { Delaunay } from "d3-delaunay"
import { polygonCentroid } from "d3-polygon"
import { createRng } from "../lib/random"
import { COUNTRY_CLUBS } from "../data/clubs"
import { motion } from "framer-motion"
import { BALANCE } from "../data/balance"

const COUNTRY_NAME_TO_ID: Record<string, number | undefined> = {
  Turkey: 792,
  Italy: 380,
  Spain: 724,
  France: 250,
  Germany: 276,
  Portugal: 620,
  Netherlands: 528,
  England: 826 // UK id; we will use the UK outline as England placeholder
}

export default function MapView() {
  const selected = useGameStore((s) => s.selectedCountry)
  const numTeams = useGameStore((s) => s.numTeams)
  const seed = useGameStore((s) => s.seed)
  const setTeamsAndCells = useGameStore((s) => s.setTeamsAndCells)
  const snapIdx = useGameStore((s) => (s as { frozenSnapshotIndex?: number }).frozenSnapshotIndex)
  const history = useGameStore((s) => s.history)
  const teams = useGameStore((s) => (snapIdx != null && (s as { snapshots: { teams: unknown[], cells: unknown[] }[] }).snapshots[snapIdx]?.teams) || s.teams)
  const storeCells = useGameStore((s) => (snapIdx != null && (s as { snapshots: { teams: unknown[], cells: unknown[] }[] }).snapshots[snapIdx]?.cells) || s.cells)
  const turn = useGameStore((s) => s.turn)
  const previewFrom = useGameStore((s) => (s as { previewFromCellId?: number }).previewFromCellId)
  const previewTo = useGameStore((s) => (s as { previewToCellId?: number }).previewToCellId)
  const previewFromTeamId = useGameStore((s) => (s as { previewFromTeamId?: number }).previewFromTeamId)
  const svgRef = useRef<SVGSVGElement | null>(null)
  // overlay suppression flag read at use-time via getState() to avoid re-render triggers
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 900, h: 600 })
  const initSigRef = useRef<string | null>(null)

  useEffect(() => {
    const onResize = () => {
      const el = svgRef.current?.parentElement
      if (!el) return
      const w = Math.max(400, el.clientWidth)
      const h = Math.max(500, Math.floor((el.clientWidth * 4) / 5))
      setSize({ w, h })
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const { countryFeature } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const world = world110 as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countries = feature(world, world.objects.countries) as any
    const id = COUNTRY_NAME_TO_ID[selected]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = countries.features.find((f: any) => String(f.id) === String(id)) as any
    return { countryFeature: f }
  }, [selected])

  const path = useMemo(() => {
    const projection = countryFeature
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? geoMercator().fitSize([size.w, size.h], countryFeature as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : geoMercator().fitSize([size.w, size.h], { type: 'Sphere' } as any)
    return geoPath(projection)
  }, [countryFeature, size])

  // Create Voronoi partition inside the selected country
  const { voronoiPolys, teamColors, points } = useMemo(() => {
    if (!countryFeature)
      return {
        voronoiPolys: [] as [number, number][][],
        teamColors: [] as string[],
        points: [] as [number, number][]
      }

    // Build projection/bounds
    const projection = geoMercator().fitSize(
      [size.w, size.h],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      countryFeature as any
    )
    const p = geoPath(projection)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [[minX, minY], [maxX, maxY]] = p.bounds(countryFeature as any)

    const clubs = (COUNTRY_CLUBS[selected] || []).map((c, i) => ({ ...c, originalIndex: i }))
    const validClubs = []
    for (const c of clubs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!geoContains(countryFeature as any, [c.lon, c.lat])) continue
      const xy = projection([c.lon, c.lat]) as [number, number] | null
      if (!xy) continue
      if (xy[0] < minX || xy[0] > maxX || xy[1] < minY || xy[1] > maxY) continue
      validClubs.push({ ...c, xy })
    }

    // Group clubs by city to handle local clusters
    const cityGroups = new Map<string, typeof validClubs>()
    for (const c of validClubs) {
      if (!cityGroups.has(c.city)) cityGroups.set(c.city, [])
      cityGroups.get(c.city)!.push(c)
    }

    const finalClubPoints: { xy: [number, number]; idx: number }[] = []
    for (const [, group] of cityGroups) {
      if (group.length === 1) {
        finalClubPoints.push({ xy: group[0].xy, idx: group[0].originalIndex })
      } else {
        // Jitter within the city group with a tiny radius just to break ties
        const r = 0.1 // Minimal jitter
        for (let i = 0; i < group.length; i++) {
          const club = group[i]
          const ang = (2 * Math.PI * i) / group.length
          const x = club.xy[0] + r * Math.cos(ang)
          const y = club.xy[1] + r * Math.sin(ang)
          finalClubPoints.push({ xy: [x, y], idx: club.originalIndex })
        }
      }
    }

    const pts: [number, number][] = []
    finalClubPoints.sort((a, b) => a.idx - b.idx)
    for (let i = 0; i < finalClubPoints.length && pts.length < numTeams; i++) {
      pts.push(finalClubPoints[i].xy)
    }

    // Fallback to random points if not enough clubs
    if (pts.length < numTeams) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(countryFeature as any)
      const rng = createRng(`${seed}:${selected}:${numTeams}`)
      const maxTries = Math.max(500, numTeams * 400)
      let tries = 0
      while (pts.length < numTeams && tries < maxTries) {
        tries++
        const lon = minLon + rng() * (maxLon - minLon)
        const lat = minLat + rng() * (maxLat - minLat)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!geoContains(countryFeature as any, [lon, lat])) continue
        const xy = projection([lon, lat]) as [number, number] | null
        if (!xy) continue
        if (xy[0] < minX || xy[0] > maxX || xy[1] < minY || xy[1] > maxY) continue
        pts.push(xy)
      }
    }

    if (pts.length < 2)
      return {
        voronoiPolys: [] as [number, number][][],
        teamColors: [] as (string[] | string)[],
        points: [] as [number, number][]
      }

    const delaunay = Delaunay.from(pts)
    const voronoi = delaunay.voronoi([minX, minY, maxX, maxY])

    const voronoiPolys: [number, number][][] = []
    for (let i = 0; i < pts.length; i++) {
      const poly = voronoi.cellPolygon(i)
      if (poly) voronoiPolys.push(poly as [number, number][])
    }

      const clubList = (COUNTRY_CLUBS[selected] || [])
      const clubColors = clubList.map(c => ((c as { colors?: string[], color?: string }).colors && (c as { colors?: string[], color?: string }).colors!.length >= 2 ? (c as { colors?: string[], color?: string }).colors : [(c as { colors?: string[], color?: string }).color || "#3b82f6", (c as { colors?: string[], color?: string }).color || "#1d4ed8"]))
    const palette = clubColors.length ? clubColors : [["#ef4444", "#3b82f6"],["#10b981","#f59e0b"],["#8b5cf6","#22c55e"]]
    const teamColors = Array.from({ length: pts.length }, (_, i) => palette[i % palette.length])
    return { voronoiPolys, teamColors, points: pts }
  }, [countryFeature, size, numTeams, seed, selected])

  useEffect(() => {
    if (!voronoiPolys.length) return
    const sig = `${selected}|${numTeams}|${size.w}x${size.h}|${seed}|${points.length}|${voronoiPolys.length}`
    if (initSigRef.current === sig) return
    if (teams.length === points.length && storeCells.length === voronoiPolys.length && teams.length > 0) {
      initSigRef.current = sig
      return
    }
    try {
      const clubs = (COUNTRY_CLUBS[selected] || [])
      const candidateNames = clubs.map(c => (c as { name: string }).name)
      const teamsLocal = (teamColors as unknown[]).map((colors, i) => ({ id: i, name: candidateNames[i] || `Team ${i + 1}`, color: Array.isArray(colors) ? (colors as string[])[0] : (colors as string), alive: true, overall: ((clubs[i] as { overall?: number })?.overall ?? 75) }))
      const cellsLocal = voronoiPolys.map((poly, i) => {
        const c = polygonCentroid(poly as [number, number][]) as [number, number]
        return { id: i, ownerTeamId: i, centroid: c, polygon: poly, neighbors: [] as number[] }
      })
      const neighborsByIndex: number[][] = []
      const delaunay2 = Delaunay.from(points)
      for (let i = 0; i < points.length; i++) neighborsByIndex[i] = Array.from(delaunay2.neighbors(i))
      for (let i = 0; i < cellsLocal.length; i++) (cellsLocal[i] as { neighbors: number[] }).neighbors = neighborsByIndex[i]
      setTeamsAndCells(teamsLocal, cellsLocal)
      initSigRef.current = sig
    } catch (error) {
      console.error('Error initializing map:', error)
    }
  }, [voronoiPolys, teamColors, points, setTeamsAndCells, selected, numTeams, size.w, size.h, seed, teams.length, storeCells.length])

  return (
    <div className="w-full h-full">
      {/* Controls hidden during game */}
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="w-full h-auto rounded border border-gray-200"
      >
        <defs>
          <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.35" />
          </linearGradient>
          {/* Team stripe patterns - global per team to ensure seamless stripes across cells */}
          {teams.map((t) => {
            const club = (COUNTRY_CLUBS[selected] || []).find(c => (c as { name: string }).name === (t as { name: string }).name)
            const dual = club?.colors
            if (!dual) return null
            return (
              <pattern
                key={`pat-${(t as { id: number }).id}-${turn}`}
                id={`team-stripe-${(t as { id: number }).id}-${turn}`}
                patternUnits="userSpaceOnUse"
                width="24"
                height="24"
                patternTransform="rotate(35)"
              >
                <rect width="24" height="24" fill={dual[0]} />
                <rect x="0" y="0" width="12" height="24" fill={dual[1]} />
              </pattern>
            )
          })}
        </defs>
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#ocean)" />
        {countryFeature && (
          <defs>
            <clipPath id="countryClip">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <path d={path(countryFeature as any) || undefined} />
            </clipPath>
          </defs>
        )}
        {countryFeature && (
          <path
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            d={path(countryFeature as any) || undefined}
            fill="#dbeafe"
            stroke="#1e3a8a"
            strokeWidth={1.2}
          />
        )}
        <g clipPath="url(#countryClip)">
          {voronoiPolys
            .map((poly, i) => {
            if (!poly) {
              console.warn(`Voronoi poly ${i} is null`)
              return null
            }
            const cell = storeCells[i]
            if (!cell) {
              console.warn(`No cell found for voronoi poly ${i}, using neutral`)
              return (
                <g key={`cell-${i}-neutral`}>
                  <motion.path
                    d={`M${poly.map((p: [number, number]) => p.join(",")).join("L")}Z`}
                    fill={BALANCE.neutrals.color}
                    stroke="#64748b"
                    strokeWidth={0.5}
                    opacity={0.5}
                  />
                </g>
              )
            }
            const owner = teams.find((t) => (t as { id: number }).id === (cell as { ownerTeamId: number }).ownerTeamId)
            const last = history[history.length - 1]
            const isCaptured = last && last.targetCellId === (cell as { id: number }).id
            const isFrom = last && last.fromCellId === (cell as { id: number }).id
            const isTo = last && last.targetCellId === (cell as { id: number }).id
            const isAttacker = isFrom && last?.attackerWon !== false
            const isDefender = isTo && last?.attackerWon === false
            const isDefenderTeam = last && last.defenderTeamId != null && (cell as { ownerTeamId: number }).ownerTeamId === last.defenderTeamId
            const isNeutral = (cell as { ownerTeamId: number }).ownerTeamId === -1 || (cell as { ownerTeamId: number }).ownerTeamId == null
            const isPreviewFrom = previewFrom === (cell as { id: number }).id
            const isPreviewTo = previewTo === (cell as { id: number }).id
            const ownerId = owner ? (owner as { id: number }).id : 'neutral'
            // lookup dual colors
            const club = owner ? (COUNTRY_CLUBS[selected] || []).find(c => (c as { name: string }).name === (owner as { name: string }).name) : undefined
            const dual = club?.colors
            // fillUrl removed; team-wide patterns are defined in <defs>
            return (
              <g key={`cell-${i}-${ownerId}-${turn}`}>
                <motion.path
                  key={`path-${i}-${ownerId}-${turn}`}
                  d={`M${poly.map((p: [number, number]) => p.join(",")).join("L")}Z`}
                  fill={
                    isNeutral
                      ? BALANCE.neutrals.color
                      : isPreviewTo || isDefenderTeam
                      ? "#3b82f6"
                      : previewFromTeamId!=null && (owner as { id: number })?.id === previewFromTeamId
                      ? "#ef4444"
                      : dual
                      ? `url(#team-stripe-${(owner as { id: number })?.id}-${turn})`
                      : ((owner as { color?: string })?.color || "#ddd")
                  }
                  stroke={
                    isPreviewTo || isDefenderTeam
                      ? "#3b82f6"
                      : isPreviewFrom
                      ? "#ef4444"
                      : previewFromTeamId!=null && (owner as { id: number })?.id === previewFromTeamId
                      ? "#ef4444"
                      : isAttacker
                      ? "#ef4444"
                      : isCaptured
                      ? "#f59e0b"
                      : "none"
                  }
                  strokeWidth={
                    isPreviewTo || isPreviewFrom || isDefenderTeam || (previewFromTeamId!=null && (owner as { id: number })?.id === previewFromTeamId)
                      ? 4
                      : isDefender || isAttacker
                      ? 2.6
                      : isCaptured
                      ? 1.6
                      : 0
                  }
                  animate={
                    isCaptured || isPreviewFrom || isPreviewTo || isDefenderTeam || (previewFromTeamId!=null && (owner as { id: number })?.id === previewFromTeamId)
                      ? { opacity: 1, scale: 1.12 }
                      : { opacity: isNeutral ? 0.5 : 0.95, scale: 1 }
                  }
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                >
                  <title>{`${(owner as { name?: string })?.name ?? (isNeutral ? 'Neutral' : 'Team')} • cell ${(cell as { id: number }).id}`}</title>
                </motion.path>
                {/* Team label moved to overlay to ensure topmost layering */}
                {/* Capital icon */}
                {!isNeutral && (owner as { capitalCellId?: number })?.capitalCellId === (cell as { id: number }).id && (
                  <g transform={`translate(${(cell as { centroid: [number, number] }).centroid[0]-6}, ${(cell as { centroid: [number, number] }).centroid[1]-14})`}>
                    <circle cx="6" cy="10" r="6" fill="#111827" stroke="#fbbf24" strokeWidth="1" />
                    <path d="M6 0 L7.8 3.6 L11.8 4.2 L8.9 6.9 L9.6 10.8 L6 9 L2.4 10.8 L3.1 6.9 L0.2 4.2 L4.2 3.6 Z" fill="#fbbf24" />
                  </g>
                )}
              </g>
            )
          })}
          {((history.length > 0 && !(useGameStore.getState() as { suppressLastOverlay?: boolean }).suppressLastOverlay) || (previewFrom!=null && previewTo!=null)) && (() => {
            const last = history[history.length - 1]
            // Use preview values if available, otherwise use last history
            const fromId = previewFrom!=null ? previewFrom : last?.fromCellId
            const toId = previewTo!=null ? previewTo : last?.targetCellId
            const from = storeCells.find((c) => (c as { id: number }).id === fromId)
            const to = storeCells.find((c) => (c as { id: number }).id === toId)
            if (!from || !to) return null
            
            // Use the actual attacking cell's centroid for more accurate arrow origin
            const attackerCenter = (from as { centroid: [number, number] }).centroid
            
            const [sx, sy] = attackerCenter
            const [tx, ty] = (to as { centroid: [number, number] }).centroid
            const mx = (sx + tx) / 2
            const my = (sy + ty) / 2 - 24
            const attacker = teams.find((t) => (t as { id: number }).id === last?.attackerTeamId)
            const label = last ? `${(attacker as { name?: string })?.name?.slice(0,3).toUpperCase()} • ${last.direction}` : `ATAK`
            const lw = Math.max(70, label.length * 6 + 18)
            const lh = 18

            // Quadratic curve control point (above midpoint)
            const cx = mx
            const cy = my
            const pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`

            return (
              <g>
                <defs>
                  <linearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                  <marker id="arrowHead2" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
                    <polygon points="0 0, 10 4, 0 8" fill="#dc2626" stroke="#ef4444" strokeWidth="0.5" />
                  </marker>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <motion.path d={pathD} fill="none" stroke="#0b1220" strokeWidth={6}
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 0.8, pathLength: 1 }}
                  transition={{ duration: 0.6 }}
                  filter="url(#glow)"
                />
                <motion.path d={pathD} fill="none" stroke="url(#arrowGrad)" strokeWidth={4}
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 1, pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  markerEnd="url(#arrowHead2)" />
                <motion.rect x={mx - lw/2} y={my - lh - 6} rx={6} ry={6} width={lw} height={lh}
                  fill="#0b1220" stroke="#ef4444" strokeWidth={0.8} opacity={0.95}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 0.95, scale: 1 }}
                  transition={{ delay: 0.12, duration: 0.2 }}
                />
                {/* remove mid label to keep only team names on map */}
                {/* WIN/LOSE badge near target (only when not previewing) */}
                {last && !(previewFrom!=null && previewTo!=null) && (
                  <>
                    <motion.rect x={tx + 8} y={ty - 18} rx={4} ry={4} width={44} height={16}
                      fill="#111827" opacity={0.95}
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 0.95, x: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                    <text x={tx + 30} y={ty - 6} textAnchor="middle" fontSize={10} fill="#fff">
                      {last.attackerWon ? 'WIN' : 'LOSE'}
                    </text>
                  </>
                )}
              </g>
            )
          })()}
        </g>
        {/* Team labels overlay - topmost */}
        <g>
          {teams.map((t) => {
            const owned = voronoiPolys
              .map((poly, i) => {
                const cell = storeCells[i]
                if (!cell || (cell as { ownerTeamId: number }).ownerTeamId !== (t as { id: number }).id) return null
                // Calculate real centroid from polygon
                const realCentroid = polygonCentroid(poly as [number, number][]) as [number, number]
                return { poly, centroid: realCentroid }
              })
              .filter((item): item is { poly: [number, number][]; centroid: [number, number] } => item !== null)
            if (owned.length === 0) return null
            const sum = owned.reduce((acc: [number, number], item) => {
              const nx = acc[0] + item.centroid[0]
              const ny = acc[1] + item.centroid[1]
              return [nx, ny] as [number, number]
            }, [0, 0] as [number, number])
            const x = sum[0] / owned.length
            const y = sum[1] / owned.length
            const label = (t as { name: string }).name
            const lw = Math.max(32, label.length * 7 + 16)
            const lh = 20
            return (
              <g key={`label-${(t as { id: number }).id}`}>
                <rect x={x - lw/2} y={y - lh/2} rx={8} ry={8} width={lw} height={lh} fill="#0b1220" opacity={0.92} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={800} fill="#f8fafc">
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
