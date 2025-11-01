import type { CountryKey } from "../store/game"
export type PhaseMode = "normal" | "fast" | "instant" | "manual" | "random"
export type AnimationSpeed = "normal" | "fast" | "none"
export type Language = "tr" | "en"

export interface GameConfig {
  defaultTeamCount: number
  defaultCountry: string
  mapColoring: "solid" | "striped" | "classic" | "modern" | "retro" | "minimal" | "vibrant"
  mapTheme: "classic" | "neon" | "ocean" | "fire" | "forest"
  // legacy flags (kept for backwards compatibility with saved configs)
  fastMode?: boolean
  manualMode?: boolean
  // presets and granular controls
  presetMode: PhaseMode
  selectionMode: PhaseMode
  directionMode: PhaseMode
  resultMode: PhaseMode
  animationSpeed: AnimationSpeed
  // pre-game team selection/placement strategy
  teamSelectionMode: "default" | "manual" | "layout"
  teamSelectionLayoutName?: string
  language: Language
  gameMode?: 'football' | 'world-domination'
  // World Domination specific
  worldHumanPlayers?: number
  worldStartingArmies?: number
  worldReinforcementsPerTurn?: number
}

export const defaultConfig: GameConfig = {
  defaultTeamCount: 4,
  defaultCountry: "Champions League",
  mapColoring: "striped",
  mapTheme: "classic",
  fastMode: false,
  manualMode: false,
  presetMode: "normal",
  selectionMode: "normal",
  directionMode: "normal",
  resultMode: "normal",
  animationSpeed: "normal",
  teamSelectionMode: "default",
  language: "en"
  ,gameMode: 'football'
  ,worldHumanPlayers: 2
  ,worldStartingArmies: 20
  ,worldReinforcementsPerTurn: 3
}

// Load config from localStorage or use defaults
export const loadConfig = (): GameConfig => {
  try {
    const saved = localStorage.getItem("football-imperial-config")
    if (saved) {
      const parsed = JSON.parse(saved)
      const merged = { ...defaultConfig, ...parsed }
      if (!parsed.language && typeof navigator !== 'undefined') {
        merged.language = navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en'
      }
      return merged
    }
  } catch (error) {
    console.warn("Failed to load config from localStorage:", error)
  }
  const base = { ...defaultConfig }
  if (typeof navigator !== 'undefined') {
    base.language = navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en'
  }
  return base
}

// Save config to localStorage
export const saveConfig = (config: GameConfig): void => {
  try {
    localStorage.setItem("football-imperial-config", JSON.stringify(config))
  } catch (error) {
    console.warn("Failed to save config to localStorage:", error)
  }
}

// Saved Layouts
export interface SavedLayout {
  name: string
  country: CountryKey
  numTeams: number
  mapping: Record<number, number>
  createdAt: number
}

const LAYOUTS_KEY = "football-imperial-layouts"

export const loadLayouts = (): SavedLayout[] => {
  try {
    const raw = localStorage.getItem(LAYOUTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as SavedLayout[]
  } catch {}
  return []
}

export const saveLayoutPreset = (layout: SavedLayout): void => {
  try {
    const list = loadLayouts()
    const withoutSame = list.filter((l) => l.name !== layout.name)
    const next = [...withoutSame, layout]
    localStorage.setItem(LAYOUTS_KEY, JSON.stringify(next))
  } catch {}
}

export const deleteLayoutPreset = (name: string): void => {
  try {
    const list = loadLayouts().filter((l) => l.name !== name)
    localStorage.setItem(LAYOUTS_KEY, JSON.stringify(list))
  } catch {}
}
