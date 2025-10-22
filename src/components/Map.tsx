import { useEffect, useMemo, useRef, useState } from "react"
import { feature } from "topojson-client"
import { geoMercator, geoPath, geoBounds, geoContains } from "d3-geo"
import { useGameStore } from "../store/game"
import world110 from "world-atlas/countries-110m.json" with { type: "json" }
import { Delaunay } from "d3-delaunay"
import { polygonCentroid } from "d3-polygon"
import { createRng } from "../lib/random"
import { COUNTRY_CLUBS, type Club } from "../data/clubs"
import { motion } from "framer-motion"
import ModernSpinner from "./ModernSpinner"
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
  showDirectionButtons?: boolean
  directionProps?: {
    attackerTeam?: any
    onDirectionSelect?: (direction: string) => void
    onConfirmAttack?: () => void
    canAttack?: boolean
  }
  uiStep?: string
  cells?: any[]
  attackedTeam?: string | null
  attackedTeamId?: number | null
  fastMode?: boolean
  animationSpeed?: "normal" | "fast" | "none"
  selectionMode?: "normal" | "fast" | "instant" | "manual" | "random"
  manualMode?: boolean
  manualMapping?: Record<number, number>
  onCellClick?: (cellId: number) => void
  targetSelectMode?: boolean
  onTargetSelect?: (cellId: number) => void
  attackerSelectMode?: boolean
  onAttackerSelect?: (teamId: number) => void
}

export default function MapView({
  showTeamSpinner = false,
  teamSpinnerProps,
  attackedTeam: _attackedTeam = null,
  attackedTeamId = null,
  fastMode = false,
  animationSpeed = "normal",
  selectionMode = "normal",
  manualMode = false,
  manualMapping,
  onCellClick,
  targetSelectMode = false,
  onTargetSelect,
  attackerSelectMode = false,
  onAttackerSelect
}: MapViewProps) {
  const selected = useGameStore((s) => s.selectedCountry)
  const numTeams = useGameStore((s) => s.numTeams)
  const mapColoring = useGameStore((s) => s.mapColoring)
  const mapTheme = useGameStore((s) => (s as any).mapTheme) || 'classic'
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
  
  // Arrow rotation animation state
  const [currentRotation, setCurrentRotation] = useState(0)
  
  // Animate arrow rotation
  useEffect(() => {
    if (rotatingArrowAngle == null) return
    
    const startTime = Date.now()
    const duration = animationSpeed === 'none' ? 1 : (animationSpeed === 'fast' ? 400 : 2000)
    const spins = fastMode ? 1 : 3
    const targetRotation = rotatingArrowAngle + 360 * spins
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const rotation = targetRotation * eased
      
      setCurrentRotation(rotation)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [rotatingArrowAngle, fastMode, animationSpeed])

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
    const sig = `${selected}|${numTeams}|${size.w}x${size.h}|${seed}|${points.length}|${voronoiPolys.length}|manual:${manualMode?JSON.stringify(manualMapping||{}):'off'}`
    if (initSigRef.current === sig) return
    if (!manualMode && teams.length === points.length && storeCells.length === voronoiPolys.length && teams.length > 0) {
      initSigRef.current = sig
      return
    }
    try {
      const clubs = (COUNTRY_CLUBS[selected] || [])
      // In manual mode, wait until mapping is complete
      if (manualMode) {
        const mapSize = Object.keys(manualMapping || {}).length
        if (mapSize < points.length) {
          return
        }
      }
      // Manual mapping: map each cell index i -> club index manualMapping[i]
      const selectedClubs: (Club | undefined)[] = (manualMode && manualMapping && Object.keys(manualMapping).length === points.length)
        ? Array.from({ length: points.length }, (_, i) => {
            const idx = (manualMapping as Record<number, number>)[i]
            return clubs[idx] as Club | undefined
          })
        : clubs.slice(0, points.length)
      
      // Assign teams: if manual, map 1-1 by index; else, match by closest cells
      const clubAssignments: { clubIndex: number, cellIndex: number, distance: number }[] = []
      const assignedCells = new Set<number>()
      const assignedClubs = new Set<number>()
      const cellToClub: { [cellIndex: number]: number } = {}
      if (manualMode && selectedClubs.every(Boolean)) {
        for (let i = 0; i < points.length; i++) {
          cellToClub[i] = i
          assignedCells.add(i)
          assignedClubs.add(i)
        }
      } else {
        // For each club, find all possible cell assignments with distances
        for (let j = 0; j < selectedClubs.length; j++) {
          const club = selectedClubs[j] as Club
          if (!club) continue
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
        for (const assignment of clubAssignments) {
          if (!assignedCells.has(assignment.cellIndex) && !assignedClubs.has(assignment.clubIndex)) {
            cellToClub[assignment.cellIndex] = assignment.clubIndex
            assignedCells.add(assignment.cellIndex)
            assignedClubs.add(assignment.clubIndex)
          }
        }
      }
      
      // Create teams based on assignments
      const teamsLocal = (teamColors as unknown[]).map((colors, i) => {
        const clubIndex = cellToClub[i] ?? 0
        const assignedClub = selectedClubs[clubIndex] as Club
        const primaryColor = (manualMode ? (assignedClub?.colors?.[0] || assignedClub?.color) : undefined) || (Array.isArray(colors) ? (colors as string[])[0] : (colors as string))
        return {
          id: i, 
          name: assignedClub.name, 
          color: primaryColor || "#3b82f6", 
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
  }, [voronoiPolys, teamColors, points, setTeamsAndCells, selected, numTeams, mapColoring, size.w, size.h, seed, teams.length, storeCells.length, manualMode, manualMapping])

  return (
    <div className="relative w-full h-full max-w-6xl mx-auto p-4">
      {/* Glassmorphism Container */}
      <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl border border-white/20 shadow-2xl"
           style={{
             background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
             boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
           }}>
      {/* Controls hidden during game */}
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="w-full h-auto rounded-lg transition-all duration-500"
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
            // Find cell by ID; if not present and manualMode pre-phase, build a pseudo cell
            let cell = storeCells.find(c => (c as { id: number }).id === i) as unknown as { id: number; ownerTeamId: number; centroid: [number, number] } | undefined
            if (!cell) {
              if (manualMode && storeCells.length === 0) {
                const c = polygonCentroid(poly as [number, number][]) as [number, number]
                cell = { id: i, ownerTeamId: -1, centroid: c }
              } else {
                // Skip rendering if store cells not ready yet
                if (storeCells.length === 0) {
                  return null
                }
                console.warn(`No cell found for voronoi poly ${i}, using neutral`)
                return null
              }
            }
            const owner = teams.find((t) => (t as { id: number }).id === (cell as { ownerTeamId: number }).ownerTeamId)
            const last = history[history.length - 1]
            
            // Hide territories of dead teams completely
            const isDeadTeam = owner && !(owner as { alive: boolean }).alive
            if (isDeadTeam) return null
            
            const isCaptured = last && last.targetCellId === (cell as { id: number }).id && last.turn === turn && !suppressLastOverlay
            const isDefenderTeam = last && last.defenderTeamId != null && (cell as { ownerTeamId: number }).ownerTeamId === last.defenderTeamId && last.turn === turn && !suppressLastOverlay
            const isNeutral = (cell as { ownerTeamId: number }).ownerTeamId === -1 || (cell as { ownerTeamId: number }).ownerTeamId == null
            const isPreviewFrom = previewFrom === (cell as { id: number }).id
            const isPreviewTo = previewTo === (cell as { id: number }).id
            // Saldırılan takım vurgusu - sadece attackedTeamId kullan, previewTo ile çakışmasın
            const isAttackedTeam = attackedTeamId != null && owner && (owner as { id: number }).id === attackedTeamId
            const ownerId = owner ? (owner as { id: number }).id : 'neutral'
            // lookup dual colors
            const club = owner ? (COUNTRY_CLUBS[selected] || []).find(c => (c as { name: string }).name === (owner as { name: string }).name) : undefined
            const dual = mapColoring === "striped" && club?.colors
            
            // Apply theme-based visual effects
            const getThemeEffect = (baseColor: string) => {
              switch (mapTheme) {
                case 'neon':
                  return `drop-shadow(0 0 8px ${baseColor}) drop-shadow(0 0 16px ${baseColor}40)`
                case 'ocean':
                  return `filter: hue-rotate(180deg) saturate(1.2)`
                case 'fire':
                  return `filter: hue-rotate(30deg) saturate(1.5) brightness(1.1)`
                case 'forest':
                  return `filter: hue-rotate(120deg) saturate(0.8) brightness(0.9)`
                case 'modern':
                  return `filter: contrast(1.2) saturate(1.1)`
                case 'retro':
                  return `filter: sepia(0.3) saturate(1.2) contrast(1.1)`
                case 'minimal':
                  return `filter: grayscale(0.3) contrast(1.1)`
                case 'vibrant':
                  return `filter: saturate(1.5) contrast(1.2) brightness(1.1)`
                default:
                  return ''
              }
            }
            // Manual pre-phase: immediate provisional coloring from manualMapping
            const prePhase = manualMode && storeCells.length === 0
            const mappedIdx = prePhase ? (manualMapping ? (manualMapping as Record<number, number>)[i] : undefined) : undefined
            const preClub = mappedIdx != null ? (COUNTRY_CLUBS[selected] || [])[mappedIdx] as unknown as { colors?: string[]; color?: string; name?: string; abbreviation?: string }
                                           : undefined
            
            // Border logic removed - no internal borders between same team cells
            
            return (
              <g key={`cell-${i}-${ownerId}-${turn}`}>
                <motion.path
                  key={`path-${i}-${ownerId}-${turn}`}
                  d={`M${poly.map((p: [number, number]) => p.join(",")).join("L")}Z`}
                  fill={ prePhase
                    ? (preClub ? ((preClub.colors && preClub.colors.length > 0 ? preClub.colors[0] : preClub.color) || BALANCE.neutrals.color) : BALANCE.neutrals.color)
                    : (isNeutral
                        ? BALANCE.neutrals.color
                        : dual
                        ? `url(#team-stripe-${(owner as { id: number })?.id})`
                        : (
                            // Solid: prefer club primary color to avoid mismatches (e.g., Galatasaray)
                            (club?.colors && club.colors.length > 0
                              ? club.colors[0]
                              : ((owner as { color?: string })?.color || "#ddd")
                            )
                          )
                      )
                  }
                  stroke={isAttackedTeam ? "#ff6b6b" : "none"}
                  strokeWidth={isAttackedTeam ? 3 : 0}
                  strokeOpacity={0.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{ 
                    cursor: (manualMode && storeCells.length === 0) || targetSelectMode || attackerSelectMode ? 'pointer' as const : undefined,
                    filter: mapTheme !== 'classic' ? getThemeEffect(
                      prePhase
                        ? (preClub ? ((preClub.colors && preClub.colors.length > 0 ? preClub.colors[0] : preClub.color) || BALANCE.neutrals.color) : BALANCE.neutrals.color)
                        : (isNeutral
                            ? BALANCE.neutrals.color
                            : dual
                            ? `url(#team-stripe-${(owner as { id: number })?.id})`
                            : (
                                // Solid: prefer club primary color to avoid mismatches (e.g., Galatasaray)
                                (club?.colors && club.colors.length > 0
                                  ? club.colors[0]
                                  : ((owner as { color?: string })?.color || "#ddd")
                                )
                              )
                          )
                    ) : undefined
                  }}
                  onClick={() => {
                    if (targetSelectMode && onTargetSelect) {
                      onTargetSelect((cell as { id: number }).id)
                      return
                    }
                    if (attackerSelectMode && onAttackerSelect && owner) {
                      onAttackerSelect((owner as { id: number }).id)
                      return
                    }
                    if (manualMode) {
                      // When manualMode active, click communicates cell index to parent
                      // Use provided onCellClick if available
                      if (onCellClick) onCellClick((cell as { id: number }).id)
                    }
                  }}
                  initial={{ opacity: isNeutral ? 0.5 : 0.95, filter: "blur(0px)" }}
                  animate={
                    // Saldırılan takımın hücrelerini netleştir
                    isAttackedTeam
                      ? { opacity: 1, filter: "blur(0px)", scale: 1.05 }
                      : // Only show attacker team clearly when previewFromTeamId is set
                    previewFromTeamId != null && (owner as { id: number })?.id === previewFromTeamId
                      ? { opacity: 1, filter: "blur(0px)" }
                      : previewFromTeamId != null && !isNeutral
                      ? { opacity: 0.4, filter: "blur(3px)" }
                      : isCaptured || isPreviewFrom || isPreviewTo || isDefenderTeam
                      ? { opacity: 1, filter: "blur(0px)" }
                      : { opacity: isNeutral ? 0.5 : 0.95, filter: "blur(0px)" }
                  }
                  transition={{ 
                    opacity: { duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.15 : 0.6), ease: "easeInOut" },
                    filter: { duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.18 : 0.8), ease: "easeInOut" },
                    scale: { duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.18 : 0.8), ease: "easeInOut" }
                  }}
                >
                  <title>{`${(owner as { name?: string })?.name ?? (isNeutral ? 'Neutral' : 'Team')} • cell ${(cell as { id: number }).id}`}</title>
                </motion.path>
                {/* Manual pre-phase label/pin for instant feedback */}
                {prePhase && preClub && (
                  <g>
                    {(() => {
                      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length
                      const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length
                      return (
                        <>
                          <circle cx={cx} cy={cy} r={10} fill="#000" opacity={0.25} />
                          <text x={cx} y={cy + 3} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">
                            {(preClub.abbreviation || (preClub.name || '').slice(0,2)).toUpperCase()}
                          </text>
                        </>
                      )
                    })()}
                  </g>
                )}
                
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
                        transition={{ duration: fastMode ? 0.5 : 1.2, ease: "easeOut", delay: fastMode ? 0.05 : 0.1 }}
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
                          transition={{ duration: fastMode ? 0.7 : 1.8, ease: "easeOut", delay: (fastMode ? 0.1 : 0.2) + i * (fastMode ? 0.05 : 0.1) }}
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
                        transition={{ duration: fastMode ? 0.9 : 2, ease: "easeOut", delay: fastMode ? 0.2 : 0.5 }}
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
                        transition={{ duration: fastMode ? 0.5 : 1.2, ease: "easeOut", delay: fastMode ? 0.05 : 0.1 }}
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
                          transition={{ duration: fastMode ? 0.7 : 1.6, ease: "easeOut", delay: (fastMode ? 0.1 : 0.2) + i * (fastMode ? 0.07 : 0.15) }}
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
                        transition={{ duration: fastMode ? 0.9 : 2, ease: "easeOut", delay: fastMode ? 0.25 : 0.6 }}
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
            
            // Attacker team calculation removed - no longer needed
            
            // Attacker center calculation removed - no longer needed
            
            // const [sx, sy] = attackerCenter // Removed unused variables
            
            // Direction calculation removed - no longer needed
            
            // Arrow direction calculation
            
            // Direction mapping removed - no longer needed
            
            // const deg = dirAngle[selectedDirection] || 90 // Removed unused variable
            // Convert to SVG coordinate system - removed unused variables
            
            // Calculate arrow end point based on selected direction - removed unused variables
            
            // const mx = (sx + ex) / 2
            // const my = (sy + ey) / 2 - 24
            // attacker removed - no longer needed for arrows
            // label removed - no longer needed for arrows
            // lw and lh removed - no longer needed for arrows

            // Quadratic curve control point (above midpoint) - removed unused variables

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
          const isAlive = (team as { alive: boolean }).alive
          const club = (COUNTRY_CLUBS[selected] || []).find(c => (c as { name: string }).name === teamName)
          
          // Hide logos of dead teams
          if (!isAlive) {
            return null
          }
          
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
            <g key={`logo-${teamId}-${turn}`} transform={`translate(${centroid[0]-32}, ${centroid[1]-32})`} data-team-id={teamId}>
              <title>{teamName}</title>
              <foreignObject width="64" height="64" x="0" y="0">
                <div 
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '18px',
                    background: `linear-gradient(145deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05))`,
                    border: '1px solid rgba(255,255,255,0.4)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 8px 24px rgba(0,0,0,0.25)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Inner tint matching team colors */}
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(145deg, ${(club?.colors?.[0] || '#666')}80, ${(club?.colors?.[1] || '#999')}50)`,
                      opacity: 0.85,
                      mixBlendMode: 'multiply'
                    }}
                  >
                    {/* content overlay */}
                  </div>
                  <div style={{position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center'}}>
                    <div style={{
                      fontSize:'12px', fontWeight:900,
                      color:'#fff', textShadow:'0 2px 8px rgba(0,0,0,0.5)'
                    }}>{club?.abbreviation || (teamName || 'TM').slice(0,2).toUpperCase()}</div>
                    <div style={{
                      fontSize:'8px', color:'#fff', opacity:0.9
                    }}>{club?.founded || '1900'}</div>
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
          
          // Use the SAME calculation as team logo positioning
          const teamName = (arrowTeam as { name?: string })?.name
          
          // Find the best position for logo within team territories (SAME as team logo)
          const findBestLogoPosition = (cells: unknown[]): [number, number] => {
            if (cells.length === 1) {
              const cell = cells[0] as { id: number }
              const voronoiPoly = voronoiPolys[cell.id]
              if (voronoiPoly && voronoiPoly.length > 0) {
                const sumX = voronoiPoly.reduce((sum, point) => sum + point[0], 0)
                const sumY = voronoiPoly.reduce((sum, point) => sum + point[1], 0)
                return [sumX / voronoiPoly.length, sumY / voronoiPoly.length]
              }
              return (cell as unknown as { centroid: [number, number] }).centroid
            }
            
            const cellsWithData = cells as { id: number }[]
            let totalX = 0, totalY = 0, validPolys = 0
            
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
              return (cellsWithData[0] as unknown as { centroid: [number, number] }).centroid
            }
            
            const geometricCenter: [number, number] = [totalX / validPolys, totalY / validPolys]
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
            
            const bestVoronoiPoly = voronoiPolys[bestCell.id]
            if (bestVoronoiPoly && bestVoronoiPoly.length > 0) {
              const sumX = bestVoronoiPoly.reduce((sum, point) => sum + point[0], 0)
              const sumY = bestVoronoiPoly.reduce((sum, point) => sum + point[1], 0)
              return [sumX / bestVoronoiPoly.length, sumY / bestVoronoiPoly.length]
            }
            
            return (bestCell as unknown as { centroid: [number, number] }).centroid
          }
          
          // Use the EXACT SAME coordinates as the team logo
          // Team logo uses: centroid[0] and centroid[1]
          const logoPosition = findBestLogoPosition(teamCells)
          let centerX = logoPosition[0]
          let centerY = logoPosition[1]
          
          // Special adjustment for Başakşehir (SAME as team logo)
          if (teamName === 'Başakşehir') {
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
          
          
          return (
            <g key={`rotating-arrow-${rotatingArrowTeamId}`}>
              {/* Enhanced filters for better visual effects */}
              <defs>
                <filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="arrowShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.3)"/>
                </filter>
                <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(251, 191, 36, 1)" />
                  <stop offset="50%" stopColor="rgba(245, 158, 11, 1)" />
                  <stop offset="100%" stopColor="rgba(239, 68, 68, 1)" />
                </linearGradient>
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.8)" />
                  <stop offset="70%" stopColor="rgba(251, 191, 36, 0.9)" />
                  <stop offset="100%" stopColor="rgba(245, 158, 11, 0.7)" />
                </radialGradient>
              </defs>
              
              {/* Rotating arrow group - centered on team icon */}
              <g transform={`rotate(${currentRotation}, ${centerX}, ${centerY})`}>
                  {/* Arrow shaft - longer and more prominent */}
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={centerX}
                    y2={centerY - 120}
                    stroke="url(#arrowGradient)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    filter="url(#arrowGlow)"
                  />
                  
                  {/* Arrow head - larger and more detailed */}
                  <polygon
                    points={`${centerX},${centerY - 120} ${centerX - 25},${centerY - 90} ${centerX + 25},${centerY - 90}`}
                    fill="url(#arrowGradient)"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="3"
                    filter="url(#arrowGlow)"
                  />
                  
                  {/* Center pivot point - enhanced */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r="12"
                    fill="url(#centerGlow)"
                    stroke="rgba(255,255,255,0.95)"
                    strokeWidth="3"
                    filter="url(#arrowGlow)"
                  />
                  
                  {/* Inner center dot */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r="6"
                    fill="rgba(255,255,255,0.9)"
                    filter="url(#arrowShadow)"
                  />
                  
                  {/* Direction indicator lines */}
                  <g stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none">
                    <line x1={centerX - 8} y1={centerY - 8} x2={centerX + 8} y2={centerY + 8} />
                    <line x1={centerX + 8} y1={centerY - 8} x2={centerX - 8} y2={centerY + 8} />
                  </g>
                </g>
            </g>
          )
        })()}
        
        {/* Energy Beam to Target */}
        {beamActive && rotatingArrowTeamId != null && rotatingArrowAngle != null && (() => {
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
            // Convert arrow angle to beam direction - use same calculation as arrow
            const angleRad = (rotatingArrowAngle! - 90) * Math.PI / 180
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
            
            // If we found a hit, compute intersection with the target cell boundary
            if (closestHit) {
              const poly = voronoiPolys[closestHit.id]
              if (poly && poly.length > 1) {
                const dirX = beamDir[0]
                const dirY = beamDir[1]
                const eps = 1e-6
                let bestT = Infinity
                let hitX = endX
                let hitY = endY
                for (let i = 0; i < poly.length; i++) {
                  const p1 = poly[i]
                  const p2 = poly[(i + 1) % poly.length]
                  const sx = p2[0] - p1[0]
                  const sy = p2[1] - p1[1]
                  const denom = dirX * sy - dirY * sx
                  if (Math.abs(denom) < eps) continue
                  const rx = p1[0] - startX
                  const ry = p1[1] - startY
                  const t = (rx * sy - ry * sx) / denom
                  const u = (rx * dirY - ry * dirX) / denom
                  if (t >= 0 && u >= 0 && u <= 1) {
                    if (t < bestT) {
                      bestT = t
                      hitX = startX + dirX * t
                      hitY = startY + dirY * t
                    }
                  }
                }
                if (bestT !== Infinity) {
                  endX = hitX
                  endY = hitY
                } else {
                  // fallback to centroid if boundary intersection fails
                  endX = closestHit.centroid[0]
                  endY = closestHit.centroid[1]
                }
              }
            }
          } else if (beamTargetCell != null) {
            // Fallback: use existing beam target
            const targetCell = storeCells.find((c) => (c as { id: number }).id === beamTargetCell)
            if (targetCell) {
              endX = (targetCell as any).centroid[0]
              endY = (targetCell as any).centroid[1]
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
              <circle
                cx={startX}
                cy={startY}
                r="12"
                fill="url(#beamGradient)"
                filter="url(#beamGlow)"
                opacity={0.8}
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
                  duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.4 : 3.0), 
                  ease: "easeOut",
                  x2: { duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.4 : 3.0), ease: "easeOut" },
                  y2: { duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.4 : 3.0), ease: "easeOut" },
                  opacity: { duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.4 : 3.0), times: [0, 0.2, 0.4, 0.7, 0.9, 1] },
                  strokeWidth: { duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.4 : 3.0), times: [0, 0.1, 0.3, 0.6, 0.8, 1] }
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
                      transition={{ duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.35 : 1.8), ease: "easeOut" }}
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
                      transition={{ duration: animationSpeed === 'none' ? 0.01 : (animationSpeed === 'fast' ? 0.4 : 2.2), ease: "easeOut" }}
                    />
                  </>
                )
              })()}
            </g>
          )
        })()}
        
      </svg>
      
      {/* Modern Spinner Overlay */}
      {showTeamSpinner && teamSpinnerProps && (
        <ModernSpinner
          key={`spinner-${teamSpinnerProps.winnerIndex}`}
          items={teamSpinnerProps.items}
          colors={teamSpinnerProps.colors}
          winnerIndex={teamSpinnerProps.winnerIndex ?? 0}
          fullNames={teamSpinnerProps.fullNames ?? []}
          onDone={teamSpinnerProps.onDone ?? (() => {})}
          durationMs={animationSpeed === 'none' || selectionMode === 'instant' ? 0 : ((selectionMode === 'fast' || animationSpeed === 'fast') ? 600 : 3000)}
        />
      )}
      
      </div> {/* Glassmorphism Container */}
      
      {/* Direction Selection Buttons moved to right panel */}
    </div>
  )
}

