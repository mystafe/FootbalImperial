export interface GameConfig {
  defaultTeamCount: number
  defaultCountry: string
  mapColoring: "solid" | "striped"
  fastMode: boolean
  manualMode: boolean
}

export const defaultConfig: GameConfig = {
  defaultTeamCount: 4,
  defaultCountry: "Turkey",
  mapColoring: "striped",
  fastMode: false,
  manualMode: false
}

// Load config from localStorage or use defaults
export const loadConfig = (): GameConfig => {
  try {
    const saved = localStorage.getItem("football-imperial-config")
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) }
    }
  } catch (error) {
    console.warn("Failed to load config from localStorage:", error)
  }
  return defaultConfig
}

// Save config to localStorage
export const saveConfig = (config: GameConfig): void => {
  try {
    localStorage.setItem("football-imperial-config", JSON.stringify(config))
  } catch (error) {
    console.warn("Failed to save config to localStorage:", error)
  }
}
