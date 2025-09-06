// Game Configuration
// Bu dosyayı değiştirerek oyunun varsayılan ayarlarını kolayca değiştirebilirsiniz

export const GAME_CONFIG = {
  // Varsayılan takım sayısı
  DEFAULT_TEAM_COUNT: 5,

  // Varsayılan ülke (Türkiye)
  DEFAULT_COUNTRY: "Turkey",

  // Diğer ayarlar
  MIN_TEAMS: 2,
  MAX_TEAMS: 8,

  // Desteklenen ülkeler (store'daki CountryKey ile uyumlu)
  SUPPORTED_COUNTRIES: [
    "Turkey",
    "Italy",
    "Spain",
    "France",
    "Germany",
    "Portugal",
    "Netherlands",
    "England"
  ] as const,

  // Ülke isimleri
  COUNTRY_NAMES: {
    Turkey: "Türkiye",
    Italy: "İtalya",
    Spain: "İspanya",
    France: "Fransa",
    Germany: "Almanya",
    Portugal: "Portekiz",
    Netherlands: "Hollanda",
    England: "İngiltere"
  } as const
} as const

export type SupportedCountry = (typeof GAME_CONFIG.SUPPORTED_COUNTRIES)[number]
