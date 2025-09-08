import { create } from "zustand"
import { createRng } from "../lib/random"
import { BALANCE } from "../data/balance"

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW"

export interface Cell {
  id: number
  ownerTeamId: number // -1 for neutral
  centroid: [number, number]
  polygon?: [number, number][]
  neighbors?: number[]
}

export interface Team {
  id: number
  name: string
  color: string
  alive: boolean
  overall?: number
  form?: number
  capitalCellId?: number
  capitalPenaltyUntilTurn?: number
}

export interface HistoryItem {
  turn: number
  attackerTeamId: number
  defenderTeamId?: number
  targetCellId: number
  direction: Direction
  timestamp: number
  fromCellId?: number
  attackerWon?: boolean
  p?: number
  capturedCapital?: boolean
}

interface GameState {
  selectedCountry: CountryKey
  numTeams: number
  mapColoring: "solid" | "striped"
  seed: string
  turn: number
  gameStarted?: boolean
  maxTurns: number
  teams: Team[]
  cells: Cell[]
  history: HistoryItem[]
  snapshots: {
    teams: Team[]
    cells: Cell[]
    turn: number
    history: HistoryItem[]
  }[]
  previewFromCellId?: number
  previewToCellId?: number
  suppressLastOverlay?: boolean
  frozenSnapshotIndex?: number
  previewFromTeamId?: number
  setSeed: (seed: string) => void
  setCountry: (c: CountryKey) => void
  setNumTeams: (n: number) => void
  setMapColoring: (coloring: "solid" | "striped") => void
  setTeamsAndCells: (teams: Team[], cells: Cell[]) => void
  setGameStarted?: (started: boolean) => void
  setPreviewTarget: (fromCellId?: number, toCellId?: number) => void
  setSuppressLastOverlay?: (v: boolean) => void
  setFrozenSnapshotIndex?: (idx?: number) => void
  setPreviewFromTeamId?: (teamId?: number) => void
  resolveTarget: (
    attackerTeamId: number,
    direction: Direction
  ) => { fromCellId: number; toCellId: number } | null
  applyAttack: (
    attackerTeamId: number,
    direction: Direction
  ) => { success: boolean; targetCellId?: number }
  playAutoTurn: () => { success: boolean }
  undo: () => void
  resetToInitial: () => void
  saveToStorage: () => void
  loadFromStorage: () => void
}

export type CountryKey =
  | "Turkey"
  | "Italy"
  | "Spain"
  | "France"
  | "Germany"
  | "Portugal"
  | "Netherlands"
  | "England"

export const COUNTRIES: CountryKey[] = [
  "Turkey",
  "Italy",
  "Spain",
  "France",
  "Germany",
  "Portugal",
  "Netherlands",
  "England"
]

export const DIRECTIONS: Direction[] = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW"
]

export const useGameStore = create<GameState>((set, get) => ({
  selectedCountry: "Turkey" as CountryKey,
  numTeams: 4,
  mapColoring: "striped" as "solid" | "striped",
  seed: "demo",
  turn: 0,
  maxTurns: 500,
  gameStarted: false,
  teams: [],
  cells: [],
  history: [],
  snapshots: [],
  previewFromCellId: undefined,
  previewToCellId: undefined,
  suppressLastOverlay: false,
  frozenSnapshotIndex: undefined,
  previewFromTeamId: undefined,
  setSeed: (seed: string) => set({ seed }),
  setCountry: (c: CountryKey) => set({ selectedCountry: c }),
  setNumTeams: (n: number) =>
    set({ numTeams: Math.max(2, Math.min(25, Math.floor(n))) }),
  setMapColoring: (coloring: "solid" | "striped") =>
    set({ mapColoring: coloring }),
  setTeamsAndCells: (teamsIn: Team[], cellsIn: Cell[]) =>
    set((state) => {
      // initialize forms and capitals
      const rng = createRng(
        `${state.seed}:init:${state.selectedCountry}:${state.numTeams}`
      )
      const teams = teamsIn.map((t) => ({ ...t, form: 1 }))
      // First, assign initial team cells and mark neutrals
      const total = cellsIn.length
      const targetNeutral = Math.floor(total * BALANCE.neutrals.share)
      const neutralIds = new Set<number>()
      const teamCellIds = new Set<number>()

      // Reserve team IDs as initial team cells
      teams.forEach((t) => {
        teamCellIds.add(t.id)
      })

      // Mark neutrals: pick cells that are not team cells
      const candidates = cellsIn
        .map((c) => c.id)
        .filter((id) => !teamCellIds.has(id))
      for (
        let i = 0;
        i < candidates.length && neutralIds.size < targetNeutral;
        i++
      ) {
        const pickIndex = Math.floor(rng() * candidates.length)
        neutralIds.add(candidates[pickIndex])
      }

      // Create cells with proper ownership
      const cells = cellsIn.map((c) => {
        if (neutralIds.has(c.id)) {
          return { ...c, ownerTeamId: -1 }
        } else if (teamCellIds.has(c.id)) {
          return { ...c, ownerTeamId: c.id } // Team owns cell with same ID
        } else {
          return { ...c, ownerTeamId: c.id } // Default: team owns cell with same ID
        }
      })

      // Now assign capitals: each team's capital is the cell with same ID
      const assignedTeams = teams.map((t) => {
        const capitalCellId = t.id
        console.log(
          `Team ${t.name} (ID: ${t.id}) assigned capital cell: ${capitalCellId}`
        )
        return { ...t, capitalCellId }
      })

      return {
        teams: assignedTeams,
        cells,
        turn: 0,
        history: [],
        snapshots: [
          {
            teams: JSON.parse(JSON.stringify(assignedTeams)),
            cells: JSON.parse(JSON.stringify(cells)),
            turn: 0,
            history: []
          }
        ]
      }
    }),
  setGameStarted: (started: boolean) => set({ gameStarted: started }),
  setPreviewTarget: (fromCellId?: number, toCellId?: number) =>
    set({ previewFromCellId: fromCellId, previewToCellId: toCellId }),
  setSuppressLastOverlay: (v: boolean) => set({ suppressLastOverlay: v }),
  setFrozenSnapshotIndex: (idx?: number) => set({ frozenSnapshotIndex: idx }),
  setPreviewFromTeamId: (teamId?: number) => set({ previewFromTeamId: teamId }),
  resolveTarget: (attackerTeamId: number, direction: Direction) => {
    const state = get()
    const dirAngle: Record<Direction, number> = {
      E: 0,
      NE: 45,
      N: 90,
      NW: 135,
      W: 180,
      SW: -135,
      S: -90,
      SE: -45
    }
    const deg = dirAngle[direction]
    const ang = (deg * Math.PI) / 180
    const ux = Math.cos(-ang)
    const uy = Math.sin(-ang)

    const attackerCells = state.cells.filter(
      (c) => c.ownerTeamId === attackerTeamId
    )
    if (attackerCells.length === 0) return null

    // Center of the attacker: average of centroids
    const sum = attackerCells.reduce<[number, number]>(
      (acc, c) => [acc[0] + c.centroid[0], acc[1] + c.centroid[1]],
      [0, 0]
    )
    const cx = sum[0] / attackerCells.length
    const cy = sum[1] / attackerCells.length

    // Build boundaries (edges shared by different owners)
    type EdgeInfo = {
      cellId: number
      owner: number
      a: [number, number]
      b: [number, number]
    }
    const edgeMap = new Map<string, EdgeInfo>()
    const normKey = (p1: [number, number], p2: [number, number]) => {
      const k1 = `${p1[0]},${p1[1]}`
      const k2 = `${p2[0]},${p2[1]}`
      return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`
    }
    const boundaries: {
      a: [number, number]
      b: [number, number]
      cellA: number
      ownerA: number
      cellB: number
      ownerB: number
    }[] = []
    for (const cell of state.cells) {
      const poly = cell.polygon
      if (!poly) continue
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i] as [number, number]
        const b = poly[(i + 1) % poly.length] as [number, number]
        const key = normKey(a, b)
        const ex = edgeMap.get(key)
        if (!ex) {
          edgeMap.set(key, { cellId: cell.id, owner: cell.ownerTeamId, a, b })
        } else if (ex.owner !== cell.ownerTeamId) {
          boundaries.push({
            a: ex.a,
            b: ex.b,
            cellA: ex.cellId,
            ownerA: ex.owner,
            cellB: cell.id,
            ownerB: cell.ownerTeamId
          })
        }
      }
    }

    const isAttackerEdge = (bd: { ownerA: number; ownerB: number }) =>
      (bd.ownerA === attackerTeamId) !== (bd.ownerB === attackerTeamId)
    const cross = (ax: number, ay: number, bx: number, by: number) =>
      ax * by - ay * bx
    const eps = 1e-9
    let bestT = Infinity
    let best: { fromCellId: number; toCellId: number } | null = null

    for (const bd of boundaries) {
      if (!isAttackerEdge(bd)) continue
      const ax = bd.a[0],
        ay = bd.a[1]
      const bx = bd.b[0],
        by = bd.b[1]
      const sx = bx - ax
      const sy = by - ay
      const denom = cross(ux, uy, sx, sy)
      if (Math.abs(denom) < eps) continue
      const acx = ax - cx
      const acy = ay - cy
      const t = cross(acx, acy, sx, sy) / denom
      const s = cross(acx, acy, ux, uy) / denom
      if (t >= 0 && s >= 0 && s <= 1) {
        if (t < bestT) {
          bestT = t
          const fromCellId = bd.ownerA === attackerTeamId ? bd.cellA : bd.cellB
          const toCellId = bd.ownerA === attackerTeamId ? bd.cellB : bd.cellA
          best = { fromCellId, toCellId }
        }
      }
    }
    if (best) return best

    // Fallback: neighbor-based within angular window
    const angleDiff = (a: number, b: number) => {
      let d = ((a - b + 180) % 360) - 180
      if (d < -180) d += 360
      return Math.abs(d)
    }
    const toDeg = (x: number, y: number) => (Math.atan2(y, x) * 180) / Math.PI
    const tolerance = 60
    let bestAlong = Infinity
    let bestPerp = Infinity
    let bestFromId: number | null = null
    let bestToId: number | null = null
    for (const c of attackerCells) {
      for (const nIdx of c.neighbors || []) {
        const nb = state.cells[nIdx]
        if (!nb || nb.ownerTeamId === attackerTeamId) continue
        const dx = nb.centroid[0] - cx
        const dy = nb.centroid[1] - cy
        const along = dx * ux + dy * uy
        if (along <= 0) continue
        const aDeg = toDeg(dx, dy)
        const diff = angleDiff(aDeg, deg)
        if (diff > tolerance) continue
        const perp = Math.abs(dx * -uy + dy * ux)
        if (
          along < bestAlong - 1e-6 ||
          (Math.abs(along - bestAlong) < 1e-6 && perp < bestPerp)
        ) {
          bestAlong = along
          bestPerp = perp
          bestFromId = c.id
          bestToId = nb.id
        }
      }
    }
    if (bestToId == null) return null
    return { fromCellId: bestFromId as number, toCellId: bestToId as number }
  },
  applyAttack: (attackerTeamId: number, direction: Direction) => {
    const target = get().resolveTarget(attackerTeamId, direction)
    if (!target) {
      return { success: false }
    }

    set((state) => {
      const snapshot = {
        teams: JSON.parse(JSON.stringify(state.teams)),
        cells: JSON.parse(JSON.stringify(state.cells)),
        turn: state.turn,
        history: JSON.parse(JSON.stringify(state.history))
      }
      if (!target) return state

      const defenderTeamId = state.cells.find(
        (c) => c.id === target!.toCellId
      )?.ownerTeamId

      // Neutral handling stays the same
      if (defenderTeamId === -1) {
        const rng = createRng(
          `${state.seed}:neutral:${state.turn}:${attackerTeamId}:${
            target!.toCellId
          }`
        )
        const roll = rng()
        const success = roll < BALANCE.neutrals.captureProbability
        if (!success) return state
        const newCells = state.cells.map((cell) =>
          cell.id === target!.toCellId
            ? { ...cell, ownerTeamId: attackerTeamId }
            : cell
        )
        const ownerCounts = new Map<number, number>()
        for (const c of newCells)
          ownerCounts.set(
            c.ownerTeamId,
            (ownerCounts.get(c.ownerTeamId) || 0) + 1
          )
        const newTeams = state.teams.map((t) => ({
          ...t,
          alive: (ownerCounts.get(t.id) || 0) > 0
        }))
        const historyItem: HistoryItem = {
          turn: state.turn + 1,
          attackerTeamId,
          defenderTeamId: -1,
          targetCellId: target!.toCellId,
          direction,
          timestamp: Date.now(),
          fromCellId: target!.fromCellId,
          attackerWon: true,
          p: BALANCE.neutrals.captureProbability
        }
        const nextState = {
          ...state,
          cells: newCells,
          teams: newTeams,
          history: [...state.history, historyItem],
          turn: state.turn + 1,
          snapshots: [...state.snapshots, snapshot]
        }
        try {
          localStorage.setItem(
            "fi_game_v1",
            JSON.stringify({
              selectedCountry: nextState.selectedCountry,
              numTeams: nextState.numTeams,
              mapColoring: nextState.mapColoring,
              seed: nextState.seed,
              turn: nextState.turn,
              teams: nextState.teams,
              cells: nextState.cells,
              history: nextState.history
            })
          )
        } catch (error) {
          console.error("Error in applyAttack:", error)
        }
        return nextState
      }

      const attackerTeam = state.teams.find((t) => t.id === attackerTeamId)
      const defenderTeam = state.teams.find((t) => t.id === defenderTeamId)

      const support = (teamId: number, cellId: number) => {
        const cell = state.cells.find((c) => c.id === cellId)
        if (!cell || !cell.neighbors) return 0
        const count = cell.neighbors.reduce(
          (acc, n) => acc + (state.cells[n]?.ownerTeamId === teamId ? 1 : 0),
          0
        )
        return count * BALANCE.neighborSupportWeight
      }

      const baseA = attackerTeam?.overall ?? 75
      const baseB = defenderTeam?.overall ?? 75
      const formA =
        (attackerTeam?.form ?? 1) *
        (state.turn < (attackerTeam?.capitalPenaltyUntilTurn ?? 0)
          ? 1 - BALANCE.capital.penaltyPower / 100
          : 1)
      const formB =
        (defenderTeam?.form ?? 1) *
        (state.turn < (defenderTeam?.capitalPenaltyUntilTurn ?? 0)
          ? 1 - BALANCE.capital.penaltyPower / 100
          : 1)
      const powerA = baseA * formA + support(attackerTeamId, target.fromCellId)
      const powerB =
        baseB * formB + support(defenderTeamId as number, target.toCellId)

      const x = (powerA - powerB) / BALANCE.k + BALANCE.attackerAdvantageX
      const logistic = (v: number) => 1 / (1 + Math.exp(-v))
      const p = logistic(x)

      const rng = createRng(
        `${state.seed}:match:${state.turn}:${attackerTeamId}:${
          target!.toCellId
        }`
      )
      const roll = rng()
      const attackerWon = roll < p

      // Loser loses ALL territories
      const winnerId = attackerWon ? attackerTeamId : (defenderTeamId as number)
      const loserId = attackerWon ? (defenderTeamId as number) : attackerTeamId
      const newCells = state.cells.map((cell) =>
        cell.ownerTeamId === loserId ? { ...cell, ownerTeamId: winnerId } : cell
      )

      const ownerCounts = new Map<number, number>()
      for (const c of newCells)
        ownerCounts.set(
          c.ownerTeamId,
          (ownerCounts.get(c.ownerTeamId) || 0) + 1
        )
      const clampForm = (v: number) =>
        Math.max(BALANCE.form.min, Math.min(BALANCE.form.max, v))
      const newTeams = state.teams.map((t) => {
        let overall = t.overall ?? 75
        let form = t.form ?? 1
        let capitalPenaltyUntilTurn = t.capitalPenaltyUntilTurn
        if (
          attackerWon &&
          t.id === defenderTeamId &&
          t.capitalCellId === target!.toCellId
        ) {
          capitalPenaltyUntilTurn =
            state.turn + 1 + BALANCE.capital.penaltyTurns
        }
        if (
          !attackerWon &&
          t.id === attackerTeamId &&
          t.capitalCellId === target!.fromCellId
        ) {
          capitalPenaltyUntilTurn =
            state.turn + 1 + BALANCE.capital.penaltyTurns
        }
        if (attackerWon) {
          if (t.id === attackerTeamId) {
            overall = Math.min(99, overall + 1)
            form = clampForm(form + BALANCE.form.win)
          }
          if (t.id === defenderTeamId) {
            overall = Math.max(40, overall - 1)
            form = clampForm(form + BALANCE.form.loss)
          }
        } else {
          if (t.id === attackerTeamId) {
            overall = Math.max(40, overall - 1)
            form = clampForm(form + BALANCE.form.loss)
          }
          if (t.id === defenderTeamId) {
            overall = Math.min(99, overall + 1)
            form = clampForm(form + BALANCE.form.win)
          }
        }
        return {
          ...t,
          overall,
          form,
          capitalPenaltyUntilTurn,
          alive: (ownerCounts.get(t.id) || 0) > 0
        }
      })

      const capturedCapital =
        attackerWon &&
        newTeams.some(
          (t) =>
            t.id === defenderTeamId &&
            (t.capitalPenaltyUntilTurn ?? 0) > state.turn + 1
        )

      const historyItem: HistoryItem = {
        turn: state.turn + 1,
        attackerTeamId,
        defenderTeamId,
        targetCellId: target.toCellId,
        direction,
        timestamp: Date.now(),
        fromCellId: target.fromCellId,
        attackerWon,
        p,
        capturedCapital
      }

      const nextState = {
        ...state,
        cells: newCells,
        teams: newTeams,
        history: [...state.history, historyItem],
        turn: state.turn + 1,
        snapshots: [...state.snapshots, snapshot],
        previewFromCellId: undefined,
        previewToCellId: undefined
      }
      try {
        localStorage.setItem(
          "fi_game_v1",
          JSON.stringify({
            selectedCountry: nextState.selectedCountry,
            numTeams: nextState.numTeams,
            mapColoring: nextState.mapColoring,
            seed: nextState.seed,
            turn: nextState.turn,
            teams: nextState.teams,
            cells: nextState.cells,
            history: nextState.history
          })
        )
      } catch (error) {
        console.error("Error in playAutoTurn:", error)
      }
      return nextState
    })

    return target
      ? {
          success: true,
          targetCellId: (target as { toCellId: number }).toCellId
        }
      : { success: false }
  },
  playAutoTurn: () => {
    const success = false
    set((state) => state)
    return { success }
  },
  undo: () =>
    set((state) => {
      const snapshots = [...state.snapshots]
      if (snapshots.length === 0) return state
      const last = snapshots.pop()!
      return {
        ...state,
        teams: last.teams,
        cells: last.cells,
        turn: last.turn,
        history: last.history,
        snapshots
      }
    }),
  resetToInitial: () =>
    set((state) => {
      const first = state.snapshots[0]
      if (!first) return state
      return {
        ...state,
        teams: first.teams,
        cells: first.cells,
        turn: first.turn,
        history: first.history,
        snapshots: [first]
      }
    }),
  saveToStorage: () =>
    set((state) => {
      try {
        localStorage.setItem(
          "fi_game_v1",
          JSON.stringify({
            selectedCountry: state.selectedCountry,
            numTeams: state.numTeams,
            seed: state.seed,
            turn: state.turn,
            teams: state.teams,
            cells: state.cells,
            history: state.history
          })
        )
      } catch (error) {
        console.error("Error in undo:", error)
      }
      return state
    }),
  loadFromStorage: () =>
    set((state) => {
      try {
        const raw = localStorage.getItem("fi_game_v1")
        if (!raw) return state
        const parsed = JSON.parse(raw)
        return {
          ...state,
          selectedCountry: parsed.selectedCountry ?? state.selectedCountry,
          numTeams: parsed.numTeams ?? state.numTeams,
          mapColoring: parsed.mapColoring ?? state.mapColoring,
          seed: parsed.seed ?? state.seed,
          turn: parsed.turn ?? 0,
          teams: parsed.teams ?? [],
          cells: parsed.cells ?? [],
          history: parsed.history ?? [],
          snapshots: [
            {
              teams: parsed.teams ?? [],
              cells: parsed.cells ?? [],
              turn: parsed.turn ?? 0,
              history: parsed.history ?? []
            }
          ]
        }
      } catch (error) {
        console.error("Error loading from storage:", error)
        return state
      }
    })
}))
