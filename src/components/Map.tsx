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
  }, [voronoiPolys, teamColors, points, setTeamsAndCells, selected, numTeams, mapColoring, size.w, size.h, seed, teams.length, storeCells.length])

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
              console.log(`Available cell IDs: [${storeCells.map(c => (c as { id: number }).id).join(', ')}]`)
              console.log(`Voronoi poly count: ${voronoiPolys.length}, Store cells count: ${storeCells.length}`)
              return (
                <g key={`cell-${i}-neutral`}>
                  <motion.path
                    d={`M${poly.map((p: [number, number]) => p.join(",")).join("L")}Z`}
                    fill={BALANCE.neutrals.color}
                    stroke="none"
                    strokeWidth={0}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 0.5 }}
                  />
                </g>
              )
            }
            const owner = teams.find((t) => (t as { id: number }).id === (cell as { ownerTeamId: number }).ownerTeamId)
            const last = history[history.length - 1]
            const isCaptured = last && last.targetCellId === (cell as { id: number }).id
            // isFrom and isTo removed - no longer needed
            // isAttacker and isDefender removed - no longer needed
            const isDefenderTeam = last && last.defenderTeamId != null && (cell as { ownerTeamId: number }).ownerTeamId === last.defenderTeamId
            const isNeutral = (cell as { ownerTeamId: number }).ownerTeamId === -1 || (cell as { ownerTeamId: number }).ownerTeamId == null
            const isPreviewFrom = previewFrom === (cell as { id: number }).id
            const isPreviewTo = previewTo === (cell as { id: number }).id
            const ownerId = owner ? (owner as { id: number }).id : 'neutral'
            // lookup dual colors
            const club = owner ? (COUNTRY_CLUBS[selected] || []).find(c => (c as { name: string }).name === (owner as { name: string }).name) : undefined
            const dual = mapColoring === "striped" && club?.colors
            // fillUrl removed; team-wide patterns are defined in <defs>
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
                  initial={{ opacity: isNeutral ? 0.5 : 0.95, scale: 1 }}
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
            
            console.log(`🎯 Debug: attackerTeamId=${attackerTeamId}, attackerCells.length=${attackerCells.length}`)
            
            // Fallback to from cell if attacker cells not found
            let attackerCenter: [number, number]
            if (attackerCells.length === 0) {
              console.log(`🎯 Fallback: Using from cell centroid`)
              attackerCenter = (from as { centroid: [number, number] }).centroid
            } else {
              // Calculate attacker's center from all their cells
              const sumX = attackerCells.reduce((sum: number, cell) => sum + (cell as { centroid: [number, number] }).centroid[0], 0)
              const sumY = attackerCells.reduce((sum: number, cell) => sum + (cell as { centroid: [number, number] }).centroid[1], 0)
              attackerCenter = [sumX / attackerCells.length, sumY / attackerCells.length]
            }
            
            console.log(`🎯 Attacker Center: (${attackerCenter[0].toFixed(1)}, ${attackerCenter[1].toFixed(1)})`)
            
            const [sx, sy] = attackerCenter
            
            // Get the selected direction from history
            const selectedDirection = last?.direction || 'S'
            console.log(`🎯 Attack arrow direction: ${selectedDirection}`)
            
            // Calculate direction vector based on selected direction
            const dirAngle: Record<string, number> = {
              E: 0,
              NE: 45,
              N: 90,
              NW: 135,
              W: 180,
              SW: -135,
              S: -90,
              SE: -45
            }
            
            const deg = dirAngle[selectedDirection] || -90
            const ang = (deg * Math.PI) / 180
            const ndx = Math.cos(-ang)
            const ndy = Math.sin(-ang)
            
            // Calculate arrow end point based on selected direction
            const arrowLength = 80 // Fixed arrow length
            const ex = sx + ndx * arrowLength
            const ey = sy + ndy * arrowLength
            
            console.log(`🎯 Arrow: Start(${sx.toFixed(1)}, ${sy.toFixed(1)}) → End(${ex.toFixed(1)}, ${ey.toFixed(1)})`)
            
            const mx = (sx + ex) / 2
            const my = (sy + ey) / 2 - 24
            // attacker removed - no longer needed for arrows
            // label removed - no longer needed for arrows
            // lw and lh removed - no longer needed for arrows

            // Quadratic curve control point (above midpoint)
            const cx = mx
            const cy = my
            const pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`
            
            console.log(`🎯 Arrow path: ${pathD}`)

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
          const centerX = logoPosition[0]
          let centerY = logoPosition[1]
          
          // Special adjustment for Başakşehir (logo appearing too low)
          if (teamName === 'Başakşehir') {
            centerY = centerY - 50 // Move logo up by 50px (more aggressive)
            console.log(`🔧 Başakşehir logo adjusted: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`)
          }
          
          // Detailed debug for logo positioning (only on first render)
          if (turn === 0) {
            console.log(`\n=== ${teamName} LOGO ANALYSIS ===`)
            console.log(`Team ID: ${teamId}`)
            console.log(`Team cells: ${teamCells.length}`)
            
            // Show all team cells with their centroids and voronoi poly info
            teamCells.forEach((cell, idx) => {
              const cellData = cell as { id: number, centroid: [number, number] }
              const voronoiPoly = voronoiPolys[cellData.id]
              if (voronoiPoly && voronoiPoly.length > 0) {
                const sumX = voronoiPoly.reduce((sum, point) => sum + point[0], 0)
                const sumY = voronoiPoly.reduce((sum, point) => sum + point[1], 0)
                const voronoiCentroid = [sumX / voronoiPoly.length, sumY / voronoiPoly.length]
                console.log(`  Cell ${idx}: ID=${cellData.id}, CellCentroid=(${cellData.centroid[0].toFixed(1)}, ${cellData.centroid[1].toFixed(1)}), VoronoiCentroid=(${voronoiCentroid[0].toFixed(1)}, ${voronoiCentroid[1].toFixed(1)})`)
              } else {
                console.log(`  Cell ${idx}: ID=${cellData.id}, Centroid=(${cellData.centroid[0].toFixed(1)}, ${cellData.centroid[1].toFixed(1)}), VoronoiPoly=NOT_FOUND`)
              }
            })
            
            console.log(`Final logo position: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`)
            console.log(`=== END ${teamName} ANALYSIS ===\n`)
          }
          
          // CSS logo generation - no need for SVG paths
          const centroid: [number, number] = [centerX, centerY]
          
          // Debug logo position for Başakşehir
          if (teamName === 'Başakşehir') {
            console.log(`🎯 Başakşehir logo position: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`)
            console.log(`🎯 Başakşehir logo transform: translate(${(centerX-16).toFixed(1)}, ${(centerY-16).toFixed(1)})`)
          }
          
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
      </svg>
    </div>
  )
}

