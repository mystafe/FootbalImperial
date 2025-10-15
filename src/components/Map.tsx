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
import { Spinner } from "./Spinner"
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

interface MapViewProps {
  showTeamSpinner?: boolean
  teamSpinnerProps?: {
    items: string[]
    colors: string[]
    winnerIndex?: number
    fullNames?: string[]
    onDone?: (index: number) => void
  }
}

export default function MapView({
  showTeamSpinner = false,
  teamSpinnerProps
}: MapViewProps) {
  const selected = useGameStore((s) => s.selectedCountry)
  const numTeams = useGameStore((s) => s.numTeams)
  const mapColoring = useGameStore((s) => s.mapColoring)
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
  const rotatingArrowTeamId = useGameStore((s) => (s as { rotatingArrowTeamId?: number }).rotatingArrowTeamId)
  const rotatingArrowAngle = useGameStore((s) => (s as { rotatingArrowAngle?: number }).rotatingArrowAngle)
  const beamActive = useGameStore((s) => (s as { beamActive?: boolean }).beamActive)
  const beamTargetCell = useGameStore((s) => (s as { beamTargetCell?: number }).beamTargetCell)
  const suppressLastOverlay = useGameStore((s) => (s as { suppressLastOverlay?: boolean }).suppressLastOverlay)
  
  // Game state variables removed - no longer needed for borders
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

  const projection = useMemo(() => {
    return countryFeature
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? geoMercator().fitSize([size.w, size.h], countryFeature as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : geoMercator().fitSize([size.w, size.h], { type: 'Sphere' } as any)
  }, [countryFeature, size])

  const path = useMemo(() => {
    return geoPath(projection)
  }, [projection])

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
      // Use only the first N clubs based on priority order
      const selectedClubs = clubs.slice(0, points.length)
      
      // Assign teams: match each club to its closest cell position
      const clubAssignments: { clubIndex: number, cellIndex: number, distance: number }[] = []
      
      // For each club, find all possible cell assignments with distances
      for (let j = 0; j < selectedClubs.length; j++) {
        const club = selectedClubs[j] as { lon: number, lat: number }
        const clubXY = projection([club.lon, club.lat]) as [number, number] | null
        if (clubXY) {
          for (let i = 0; i < points.length; i++) {
            const cellCenter = points[i]
            const distance = Math.sqrt(
              Math.pow(cellCenter[0] - clubXY[0], 2) + 
              Math.pow(cellCenter[1] - clubXY[1], 2)
            )
            clubAssignments.push({ clubIndex: j, cellIndex: i, distance })
          }
        }
      }
      
      // Sort by distance and assign clubs to cells (greedy assignment)
      clubAssignments.sort((a, b) => a.distance - b.distance)
      const assignedCells = new Set<number>()
      const assignedClubs = new Set<number>()
      const cellToClub: { [cellIndex: number]: number } = {}
      
      for (const assignment of clubAssignments) {
        if (!assignedCells.has(assignment.cellIndex) && !assignedClubs.has(assignment.clubIndex)) {
          cellToClub[assignment.cellIndex] = assignment.clubIndex
          assignedCells.add(assignment.cellIndex)
          assignedClubs.add(assignment.clubIndex)
        }
      }
      
      // Create teams based on assignments
      const teamsLocal = (teamColors as unknown[]).map((colors, i) => {
        const clubIndex = cellToClub[i] ?? 0
        const assignedClub = selectedClubs[clubIndex] as { name: string, overall?: number, abbreviation?: string }
        return {
          id: i, 
          name: assignedClub.name, 
          color: Array.isArray(colors) ? (colors as string[])[0] : (colors as string), 
          alive: true, 
          overall: assignedClub.overall ?? 75,
          abbreviation: assignedClub.abbreviation
        }
      })
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
  }, [voronoiPolys, teamColors, points, setTeamsAndCells, selected, numTeams, mapColoring, size.w, size.h, seed, teams.length, storeCells.length])

  return (
    <div className="relative w-full h-full">
      {/* Controls hidden during game */}
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className={`w-full h-auto rounded border border-gray-200 transition-all duration-500 ${
          showTeamSpinner 
            ? 'blur-sm opacity-50' 
            : 'blur-0 opacity-100'
        }`}
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
                key={`pat-${(t as { id: number }).id}`}
                id={`team-stripe-${(t as { id: number }).id}`}
                patternUnits="userSpaceOnUse"
                width="40"
                height="40"
                patternTransform="rotate(35)"
                patternContentUnits="userSpaceOnUse"
              >
                <rect width="40" height="40" fill={dual[0]} />
                <rect x="0" y="0" width="20" height="40" fill={dual[1]} />
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
          {/* Render individual cells with unified styling */}
          {voronoiPolys
            .map((poly, i) => {
            if (!poly) {
              console.warn(`Voronoi poly ${i} is null`)
              return null
            }
            // Find cell by ID instead of index
            const cell = storeCells.find(c => (c as { id: number }).id === i)
            if (!cell) {
              // Skip rendering if store cells not ready yet
              if (storeCells.length === 0) {
                return null
              }
              console.warn(`No cell found for voronoi poly ${i}, using neutral`)
              return null
            }
            const owner = teams.find((t) => (t as { id: number }).id === (cell as { ownerTeamId: number }).ownerTeamId)
            const last = history[history.length - 1]
            const isCaptured = last && last.targetCellId === (cell as { id: number }).id && last.turn === turn && !suppressLastOverlay
            const isDefenderTeam = last && last.defenderTeamId != null && (cell as { ownerTeamId: number }).ownerTeamId === last.defenderTeamId && last.turn === turn && !suppressLastOverlay
            const isNeutral = (cell as { ownerTeamId: number }).ownerTeamId === -1 || (cell as { ownerTeamId: number }).ownerTeamId == null
            const isPreviewFrom = previewFrom === (cell as { id: number }).id
            const isPreviewTo = previewTo === (cell as { id: number }).id
            const ownerId = owner ? (owner as { id: number }).id : 'neutral'
            // lookup dual colors
            const club = owner ? (COUNTRY_CLUBS[selected] || []).find(c => (c as { name: string }).name === (owner as { name: string }).name) : undefined
            const dual = mapColoring === "striped" && club?.colors
            
            // Border logic removed - no internal borders between same team cells
            
            return (
              <g key={`cell-${i}-${ownerId}-${turn}`}>
                <motion.path
                  key={`path-${i}-${ownerId}-${turn}`}
                  d={`M${poly.map((p: [number, number]) => p.join(",")).join("L")}Z`}
                  fill={
                    isNeutral
                      ? BALANCE.neutrals.color
                      : dual
                      ? `url(#team-stripe-${(owner as { id: number })?.id})`
                      : ((owner as { color?: string })?.color || "#ddd")
                  }
                  stroke="none"
                  strokeWidth={0}
                  strokeOpacity={0.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={{ opacity: isNeutral ? 0.5 : 0.95, filter: "blur(0px)" }}
                  animate={
                    isCaptured || isPreviewFrom || isPreviewTo || isDefenderTeam || (previewFromTeamId!=null && (owner as { id: number })?.id === previewFromTeamId)
                      ? { opacity: 1, filter: "blur(0px)" }
                      : previewFromTeamId != null && !isNeutral
                      ? { opacity: 0.4, filter: "blur(3px)" }
                      : { opacity: isNeutral ? 0.5 : 0.95, filter: "blur(0px)" }
                  }
                  transition={{ 
                    opacity: { duration: 0.6, ease: "easeInOut" },
                    filter: { duration: 0.8, ease: "easeInOut" }
                  }}
                >
                  <title>{`${(owner as { name?: string })?.name ?? (isNeutral ? 'Neutral' : 'Team')} • cell ${(cell as { id: number }).id}`}</title>
                </motion.path>
                
                {/* Victory/Defeat animations on captured cell */}
                {isCaptured && last && (
                  <>
                  {last.attackerWon ? (
                    // Victory animation - enhanced with multiple effects
                    <>
                      {/* Expanding victory wave */}
                      <motion.path
                        d={`M${poly.map((p: [number, number]) => p.join(",")).join("L")}Z`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="6"
                        initial={{ opacity: 0, strokeWidth: 0 }}
                        animate={{ opacity: [0, 1, 0.8, 0], strokeWidth: [0, 12, 8, 0] }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                      />
                      {/* Victory sparkles with multiple stars */}
                      {[0, 1, 2].map((i) => (
                        <motion.text
                          key={i}
                          x={(poly.reduce((sum, p) => sum + p[0], 0) / poly.length) + (i - 1) * 20}
                          y={(poly.reduce((sum, p) => sum + p[1], 0) / poly.length) + (i - 1) * 15}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="24"
                          initial={{ opacity: 0, scale: 0, rotate: 0 }}
                          animate={{ 
                            opacity: [0, 1, 1, 0],
                            scale: [0, 1.8, 1.2, 0.3],
                            rotate: [0, 360]
                          }}
                          transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 + i * 0.1 }}
                        >
                          {["⭐", "✨", "🌟"][i]}
                        </motion.text>
                      ))}
                      {/* Victory crown */}
                      <motion.text
                        x={(poly.reduce((sum, p) => sum + p[0], 0) / poly.length)}
                        y={(poly.reduce((sum, p) => sum + p[1], 0) / poly.length) - 25}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="20"
                        initial={{ opacity: 0, scale: 0, y: 0 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0],
                          scale: [0, 1.2, 1, 0.5],
                          y: [0, -10, 0]
                        }}
                        transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                      >
                        👑
                      </motion.text>
                    </>
                  ) : (
                    // Defeat animation - enhanced with dramatic effects
                    <>
                      {/* Defeat shockwave */}
                      <motion.path
                        d={`M${poly.map((p: [number, number]) => p.join(",")).join("L")}Z`}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="6"
                        initial={{ opacity: 0, strokeWidth: 0 }}
                        animate={{ opacity: [0, 1, 0.6, 0], strokeWidth: [0, 10, 6, 0] }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                      />
                      {/* Defeat symbols with multiple effects */}
                      {[0, 1, 2].map((i) => (
                        <motion.text
                          key={i}
                          x={(poly.reduce((sum, p) => sum + p[0], 0) / poly.length) + (i - 1) * 18}
                          y={(poly.reduce((sum, p) => sum + p[1], 0) / poly.length) + (i - 1) * 12}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="20"
                          initial={{ opacity: 0, scale: 3 }}
                          animate={{ 
                            opacity: [0, 1, 1, 0],
                            scale: [3, 1, 0.8, 0]
                          }}
                          transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 + i * 0.15 }}
                        >
                          {["💥", "💢", "❌"][i]}
                        </motion.text>
                      ))}
                      {/* Defeat skull */}
                      <motion.text
                        x={(poly.reduce((sum, p) => sum + p[0], 0) / poly.length)}
                        y={(poly.reduce((sum, p) => sum + p[1], 0) / poly.length) - 20}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="18"
                        initial={{ opacity: 0, scale: 2, rotate: 0 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0],
                          scale: [2, 1, 0.5, 0],
                          rotate: [0, 180]
                        }}
                        transition={{ duration: 2, ease: "easeOut", delay: 0.6 }}
                      >
                        💀
                      </motion.text>
                    </>
                  )}
                  </>
                )}
                {/* Team label moved to overlay to ensure topmost layering */}
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
            
            // Find the attacking team's centroid (not just the from cell)
            const attackerTeamId = last?.attackerTeamId
            const attackerCells = storeCells.filter((c) => (c as { ownerTeamId: number }).ownerTeamId === attackerTeamId)
            
            // Fallback to from cell if attacker cells not found
            let attackerCenter: [number, number]
            if (attackerCells.length === 0) {
              attackerCenter = (from as { centroid: [number, number] }).centroid
            } else {
              // Calculate attacker's center from all their cells
              const sumX = attackerCells.reduce((sum: number, cell) => sum + (cell as { centroid: [number, number] }).centroid[0], 0)
              const sumY = attackerCells.reduce((sum: number, cell) => sum + (cell as { centroid: [number, number] }).centroid[1], 0)
              attackerCenter = [sumX / attackerCells.length, sumY / attackerCells.length]
            }
            
            const [sx, sy] = attackerCenter
            
            // Get the selected direction from rotating arrow angle, not history
            const selectedDirection = rotatingArrowAngle != null ? 
              (() => {
                // Convert angle back to direction
                const normalizedAngle = ((rotatingArrowAngle % 360) + 360) % 360
                if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return 'E'
                if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return 'NE'
                if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return 'N'
                if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return 'NW'
                if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return 'W'
                if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return 'SW'
                if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return 'S'
                if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) return 'SE'
                return 'S'
              })() : (last?.direction || 'S')
            
            // 🔍 ARROW DEBUG - Yön hesaplaması
            const normalizedForLog = rotatingArrowAngle != null ? ((rotatingArrowAngle % 360) + 360) % 360 : null
            console.log('🎯 ARROW DIRECTION:', {
              angle: rotatingArrowAngle?.toFixed(1),
              normalized: normalizedForLog?.toFixed(1),
              direction: selectedDirection,
              expected: '✅ Check visually'
            })
            
            // Calculate direction vector based on selected direction
            // Map arrow angle to Math.cos/sin angles
            // In SVG: right=0°, down=90°, left=180°, up=270°
            // But we need to map game directions to visual arrows
            const dirAngle: Record<string, number> = {
              E: 0,    // Right → 0°
              SE: 45,  // Right-Down → 45°
              S: 90,   // Down → 90°
              SW: 135, // Left-Down → 135°
              W: 180,  // Left → 180°
              NW: 225, // Left-Up → 225°
              N: 270,  // Up → 270°
              NE: 315  // Right-Up → 315°
            }
            
            const deg = dirAngle[selectedDirection] || 90
            // Convert to SVG coordinate system: Y-axis points down
            const ang = (deg * Math.PI) / 180
            const ndx = Math.cos(ang)
            const ndy = Math.sin(ang) // SVG Y-axis points down, so this is correct
            
            // Calculate arrow end point based on selected direction
            const arrowLength = 80 // Fixed arrow length
            const ex = sx + ndx * arrowLength
            const ey = sy + ndy * arrowLength
            
            const mx = (sx + ex) / 2
            const my = (sy + ey) / 2 - 24
            // attacker removed - no longer needed for arrows
            // label removed - no longer needed for arrows
            // lw and lh removed - no longer needed for arrows

            // Quadratic curve control point (above midpoint)
            const cx = mx
            const cy = my
            const pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`

            // Attack arrows removed - no longer needed
            return null
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
            // sum calculation removed - no longer needed for labels
            // Team labels removed - will show as tooltips on logo hover
            return null
          })}
        </g>
        
        {/* Team logos - rendered last for proper z-index */}
        {teams.map((team) => {
          const teamId = (team as { id: number }).id
          const teamName = (team as { name?: string })?.name
          const club = (COUNTRY_CLUBS[selected] || []).find(c => (c as { name: string }).name === teamName)
          
          // Find all cells owned by this team
          const teamCells = storeCells.filter((cell) => (cell as { ownerTeamId: number }).ownerTeamId === teamId)
          if (teamCells.length === 0) {
            return null
          }
          
          
          // Find the best position for logo within team territories
          const findBestLogoPosition = (cells: unknown[]): [number, number] => {
            if (cells.length === 1) {
              // Single cell: use voronoi poly centroid directly
              const cell = cells[0] as { id: number }
              const voronoiPoly = voronoiPolys[cell.id]
              if (voronoiPoly && voronoiPoly.length > 0) {
                // Calculate centroid of the voronoi polygon
                const sumX = voronoiPoly.reduce((sum, point) => sum + point[0], 0)
                const sumY = voronoiPoly.reduce((sum, point) => sum + point[1], 0)
                return [sumX / voronoiPoly.length, sumY / voronoiPoly.length]
              }
              // Fallback to cell centroid if voronoi poly not found
              return (cell as unknown as { centroid: [number, number] }).centroid
            }
            
            // Multiple cells: find the cell that's most central to the team's territory
            const cellsWithData = cells as { id: number }[]
            
            // Calculate the geometric center of all team cells using voronoi poly centroids
            let totalX = 0
            let totalY = 0
            let validPolys = 0
            
            for (const cell of cellsWithData) {
              const voronoiPoly = voronoiPolys[cell.id]
              if (voronoiPoly && voronoiPoly.length > 0) {
                const sumX = voronoiPoly.reduce((sum, point) => sum + point[0], 0)
                const sumY = voronoiPoly.reduce((sum, point) => sum + point[1], 0)
                totalX += sumX / voronoiPoly.length
                totalY += sumY / voronoiPoly.length
                validPolys++
              }
            }
            
            if (validPolys === 0) {
              // Fallback to first cell centroid
              return (cellsWithData[0] as unknown as { centroid: [number, number] }).centroid
            }
            
            const geometricCenter: [number, number] = [totalX / validPolys, totalY / validPolys]
            
            // Find the cell whose voronoi poly centroid is closest to the geometric center
            let bestCell = cellsWithData[0]
            let minDistance = Infinity
            
            for (const cell of cellsWithData) {
              const voronoiPoly = voronoiPolys[cell.id]
              if (voronoiPoly && voronoiPoly.length > 0) {
                const sumX = voronoiPoly.reduce((sum, point) => sum + point[0], 0)
                const sumY = voronoiPoly.reduce((sum, point) => sum + point[1], 0)
                const centroid = [sumX / voronoiPoly.length, sumY / voronoiPoly.length]
                
                const dx = centroid[0] - geometricCenter[0]
                const dy = centroid[1] - geometricCenter[1]
                const distance = Math.sqrt(dx * dx + dy * dy)
                
                if (distance < minDistance) {
                  minDistance = distance
                  bestCell = cell
                }
              }
            }
            
            // Return the voronoi poly centroid of the most central cell
            const bestVoronoiPoly = voronoiPolys[bestCell.id]
            if (bestVoronoiPoly && bestVoronoiPoly.length > 0) {
              const sumX = bestVoronoiPoly.reduce((sum, point) => sum + point[0], 0)
              const sumY = bestVoronoiPoly.reduce((sum, point) => sum + point[1], 0)
              return [sumX / bestVoronoiPoly.length, sumY / bestVoronoiPoly.length]
            }
            
            // Fallback to cell centroid
            return (bestCell as unknown as { centroid: [number, number] }).centroid
          }
          
          const logoPosition = findBestLogoPosition(teamCells)
          let centerX = logoPosition[0]
          let centerY = logoPosition[1]
          
          // Special adjustment for Başakşehir (logo appearing outside territory)
          if (teamName === 'Başakşehir') {
            // Find the most central cell by calculating distances from geometric center
            const geometricCenter = {
              x: teamCells.reduce((sum: number, cell: unknown) => sum + (cell as { centroid: [number, number] }).centroid[0], 0) / teamCells.length,
              y: teamCells.reduce((sum: number, cell: unknown) => sum + (cell as { centroid: [number, number] }).centroid[1], 0) / teamCells.length
            }
            
            let bestCell = teamCells[0] as { id: number, centroid: [number, number] }
            let minDistance = Infinity
            
            for (const cell of teamCells) {
              const cellData = cell as { id: number, centroid: [number, number] }
              const distance = Math.sqrt(
                Math.pow(cellData.centroid[0] - geometricCenter.x, 2) + 
                Math.pow(cellData.centroid[1] - geometricCenter.y, 2)
              )
              if (distance < minDistance) {
                minDistance = distance
                bestCell = cellData
              }
            }
            
            centerX = bestCell.centroid[0]
            centerY = bestCell.centroid[1]
          }
          
          
          // CSS logo generation - no need for SVG paths
          const centroid: [number, number] = [centerX, centerY]
          
          
          return (
            <g key={`logo-${teamId}-${turn}`} transform={`translate(${centroid[0]-32}, ${centroid[1]-32})`}>
              <title>{teamName}</title>
              <foreignObject width="64" height="64" x="0" y="0">
                <div 
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${club?.colors?.[0] || '#666'}, ${club?.colors?.[1] || '#999'})`,
                    border: '3px solid #fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Inner circle */}
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: club?.colors?.[1] || '#999',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff'
                    }}
                  >
                    {/* Team abbreviation */}
                    <div 
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#fff',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                        lineHeight: '1'
                      }}
                    >
                      {club?.abbreviation || (teamName || 'TM').slice(0, 2).toUpperCase()}
                    </div>
                    {/* Founded year */}
                    <div 
                      style={{
                        fontSize: '8px',
                        color: '#fff',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                        lineHeight: '1',
                        marginTop: '2px'
                      }}
                    >
                      {club?.founded || '1900'}
                    </div>
                  </div>
                </div>
              </foreignObject>
            </g>
          )
        })}
        
        {/* Rotating Arrow for Direction Selection */}
        {rotatingArrowTeamId != null && rotatingArrowAngle != null && (() => {
          const arrowTeam = teams.find(t => (t as { id: number }).id === rotatingArrowTeamId)
          if (!arrowTeam) return null
          
          const teamCells = storeCells.filter((cell) => (cell as { ownerTeamId: number }).ownerTeamId === rotatingArrowTeamId)
          if (teamCells.length === 0) return null
          
          // Calculate team center
          let totalX = 0, totalY = 0
          for (const cell of teamCells) {
            const cellData = cell as { id: number, centroid: [number, number] }
            const voronoiPoly = voronoiPolys[cellData.id]
            if (voronoiPoly && voronoiPoly.length > 0) {
              const sumX = voronoiPoly.reduce((sum, point) => sum + point[0], 0)
              const sumY = voronoiPoly.reduce((sum, point) => sum + point[1], 0)
              totalX += sumX / voronoiPoly.length
              totalY += sumY / voronoiPoly.length
            }
          }
          const centerX = totalX / teamCells.length
          const centerY = totalY / teamCells.length
          
          // Arrow length
          const arrowLength = 100
          const angle = (rotatingArrowAngle - 90) * Math.PI / 180 // Adjust for SVG coords
          const endX = centerX + Math.cos(angle) * arrowLength
          const endY = centerY + Math.sin(angle) * arrowLength
          
          return (
            <g key={`rotating-arrow-${rotatingArrowTeamId}`}>
              {/* Arrow glow */}
              <defs>
                <filter id="arrowGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Arrow line */}
              <line
                x1={centerX}
                y1={centerY}
                x2={endX}
                y2={endY}
                stroke="#fbbf24"
                strokeWidth="6"
                strokeLinecap="round"
                filter="url(#arrowGlow)"
                opacity={0.9}
              />
              
              {/* Arrow head */}
              <polygon
                points={`${endX},${endY} ${endX - 12 * Math.cos(angle - 0.5)},${endY - 12 * Math.sin(angle - 0.5)} ${endX - 12 * Math.cos(angle + 0.5)},${endY - 12 * Math.sin(angle + 0.5)}`}
                fill="#fbbf24"
                stroke="#ffffff"
                strokeWidth="2"
                filter="url(#arrowGlow)"
              />
              
              {/* Center circle */}
              <circle
                cx={centerX}
                cy={centerY}
                r="8"
                fill="#fbbf24"
                stroke="#ffffff"
                strokeWidth="3"
                filter="url(#arrowGlow)"
              />
            </g>
          )
        })()}
        
        {/* Energy Beam to Target */}
        {beamActive && beamTargetCell != null && rotatingArrowTeamId != null && (() => {
          const teamCells = storeCells.filter((cell) => (cell as { ownerTeamId: number }).ownerTeamId === rotatingArrowTeamId)
          if (teamCells.length === 0) return null
          
          // Calculate team center (beam start)
          let totalX = 0, totalY = 0
          for (const cell of teamCells) {
            const cellData = cell as { id: number, centroid: [number, number] }
            const voronoiPoly = voronoiPolys[cellData.id]
            if (voronoiPoly && voronoiPoly.length > 0) {
              const sumX = voronoiPoly.reduce((sum, point) => sum + point[0], 0)
              const sumY = voronoiPoly.reduce((sum, point) => sum + point[1], 0)
              totalX += sumX / voronoiPoly.length
              totalY += sumY / voronoiPoly.length
            }
          }
          const startX = totalX / teamCells.length
          const startY = totalY / teamCells.length
          
          // Simple beam direction: use arrow angle to determine beam endpoint
          let endX = startX
          let endY = startY
          
          if (rotatingArrowAngle !== null && rotatingArrowAngle !== undefined) {
            // Convert arrow angle to beam direction
            // Arrow angle is already in the correct coordinate system
            const angleRad = (rotatingArrowAngle * Math.PI) / 180
            const beamLength = 300
            endX = startX + Math.cos(angleRad) * beamLength
            endY = startY + Math.sin(angleRad) * beamLength
            
            // Find the actual target cell that the beam hits
            const beamDir = [Math.cos(angleRad), Math.sin(angleRad)]
            let closestHit = null
            let closestDistance = Infinity
            
            // Check all cells to find the one in beam direction
            for (const cell of storeCells) {
              const cellData = cell as { id: number, ownerTeamId: number, centroid: [number, number] }
              
              // Skip attacker's own cells
              if (cellData.ownerTeamId === rotatingArrowTeamId) continue
              
              // Check if this cell is in the beam direction
              const dx = cellData.centroid[0] - startX
              const dy = cellData.centroid[1] - startY
              const dot = dx * beamDir[0] + dy * beamDir[1]
              
              // If cell is in beam direction (positive dot product)
              if (dot > 0) {
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance < closestDistance) {
                  closestDistance = distance
                  closestHit = cellData
                }
              }
            }
            
            // Update beam target if we found a hit
            if (closestHit && beamTargetCell !== closestHit.id) {
              // Defer state update to avoid setState during render
              setTimeout(() => {
                useGameStore.getState().setBeam?.(true, closestHit.id)
              }, 0)
              
              // Update beam endpoint to hit the target
              endX = closestHit.centroid[0]
              endY = closestHit.centroid[1]
            }
          } else if (beamTargetCell != null) {
            // Fallback: use existing beam target
            const targetCell = storeCells.find((c) => (c as { id: number }).id === beamTargetCell)
            if (targetCell) {
              endX = targetCell.centroid[0]
              endY = targetCell.centroid[1]
            }
          }
          
          
          return (
            <g key="energy-beam">
              <defs>
                <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                </linearGradient>
                <filter id="beamGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Source energy effect */}
              <motion.circle
                cx={startX}
                cy={startY}
                r="0"
                fill="url(#beamGradient)"
                filter="url(#beamGlow)"
                initial={{ r: 0, opacity: 0 }}
                animate={{ 
                  r: [0, 8, 12, 8, 0],
                  opacity: [0, 0.8, 1, 0.6, 0]
                }}
                transition={{ 
                  duration: 3.0, 
                  ease: "easeOut",
                  r: { duration: 3.0, times: [0, 0.2, 0.4, 0.7, 1] },
                  opacity: { duration: 3.0, times: [0, 0.2, 0.4, 0.7, 1] }
                }}
              />
              
              {/* Animated beam */}
              <motion.line
                x1={startX}
                y1={startY}
                x2={startX}
                y2={startY}
                stroke="url(#beamGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                filter="url(#beamGlow)"
                initial={{ 
                  x2: startX, 
                  y2: startY, 
                  opacity: 0, 
                  strokeWidth: 0 
                }}
                animate={{ 
                  x2: endX,
                  y2: endY,
                  opacity: [0, 0.3, 0.8, 1, 0.8, 0],
                  strokeWidth: [0, 2, 8, 16, 12, 0]
                }}
                transition={{ 
                  duration: 3.0, 
                  ease: "easeOut",
                  x2: { duration: 3.0, ease: "easeOut" },
                  y2: { duration: 3.0, ease: "easeOut" },
                  opacity: { duration: 3.0, times: [0, 0.2, 0.4, 0.7, 0.9, 1] },
                  strokeWidth: { duration: 3.0, times: [0, 0.1, 0.3, 0.6, 0.8, 1] }
                }}
              />
              
              {/* Impact effect at target cell */}
              {(() => {
                // Use the same target position as the beam
                const targetX = endX
                const targetY = endY
                
                return (
                  <>
                    {/* Impact burst */}
                    <motion.circle
                      cx={targetX}
                      cy={targetY}
                      r="20"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="4"
                      filter="url(#beamGlow)"
                      initial={{ r: 0, opacity: 1 }}
                      animate={{ r: [0, 50], opacity: [1, 0] }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                    />
                    <motion.circle
                      cx={targetX}
                      cy={targetY}
                      r="20"
                      fill="#fbbf24"
                      opacity="0.6"
                      filter="url(#beamGlow)"
                      initial={{ r: 0, opacity: 0 }}
                      animate={{ r: [0, 30, 0], opacity: [0, 0.9, 0] }}
                      transition={{ duration: 2.2, ease: "easeOut" }}
                    />
                  </>
                )
              })()}
            </g>
          )
        })()}
      </svg>
      
      {/* Spinner Overlay */}
      {showTeamSpinner && teamSpinnerProps && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40 backdrop-blur-sm rounded-3xl p-24 shadow-2xl border border-white/30">
          <div className="scale-[3.5]">
            <Spinner
              key={`overlay-team-${teamSpinnerProps.winnerIndex}-${turn}-${Date.now()}`}
              items={teamSpinnerProps.items}
              colors={teamSpinnerProps.colors}
              winnerIndex={teamSpinnerProps.winnerIndex}
              fullNames={teamSpinnerProps.fullNames}
              onDone={teamSpinnerProps.onDone}
            />
          </div>
        </div>
      )}
      
    </div>
  )
}

