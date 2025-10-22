import "./App.css"
import { useEffect, useMemo, useRef, useState } from "react"
import MapView from "./components/Map"
import { useGameStore, COUNTRIES, type Direction } from "./store/game"
import { createRng, weightedChoice } from "./lib/random"
import { playClick } from "./lib/sound"
import { AnimatePresence, motion } from "framer-motion"
import { loadConfig, saveConfig, loadLayouts, saveLayoutPreset, deleteLayoutPreset, type GameConfig, type SavedLayout } from "./config/game"
import { COUNTRY_CLUBS } from "./data/clubs"

function App() {
  const seed = useGameStore((s) => s.seed)
  const teams = useGameStore((s) => s.teams)
  const cells = useGameStore((s) => s.cells)
  const history = useGameStore((s) => s.history)
  const turn = useGameStore((s) => s.turn)
  const gameStarted = useGameStore(
    (s) => (s as unknown as { gameStarted: boolean }).gameStarted
  )
  const setGameStarted = useGameStore(
    (s) => s.setGameStarted as (v: boolean) => void
  )
  const selectedCountry = useGameStore((s) => s.selectedCountry)
  const setCountry = useGameStore((s) => s.setCountry)
  const numTeams = useGameStore((s) => s.numTeams)
  const setNumTeams = useGameStore((s) => s.setNumTeams)
  const mapColoring = useGameStore((s) => s.mapColoring)
  const setMapColoring = useGameStore((s) => s.setMapColoring)

  // Config state
  const [config, setConfig] = useState<GameConfig>(loadConfig())
  const manualEnabled = useMemo(() => config.teamSelectionMode === 'manual' || config.teamSelectionMode === 'layout', [config.teamSelectionMode])
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>(loadLayouts())
  const availableLayouts = useMemo(() => savedLayouts.filter(l => l.country === selectedCountry && l.numTeams === numTeams), [savedLayouts, selectedCountry, numTeams])
  const [saveName, setSaveName] = useState<string>("")
  const [layoutSaved, setLayoutSaved] = useState<boolean>(false)
  const m = useMemo(() => ({
    tr: {
      country: 'Ülke Seçimi', teams: 'Takım Sayısı', mapLook: 'Harita Görünümü', striped: 'Şeritli Desenler', solid: 'Düz Renkler',
      classic: 'Klasik', modern: 'Modern', retro: 'Retro', minimal: 'Minimal', vibrant: 'Canlı',
      themeClassic: 'Klasik', themeNeon: 'Neon', themeOcean: 'Okyanus', themeFire: 'Ateş', themeForest: 'Orman',
      preset: 'Hazır Oyun Modu', teamSelections: 'Takım Seçimleri', default: 'Default', manual: 'Manuel',
      selection: 'Saldıran Takım Seçimi', selectionManualHint: '⚔️ Haritadan saldıran takımı seçin',
      direction: 'Saldırılan Takım Seçimi', directionManualHint: '🎯 Haritadan savunulacak takımı seçin',
      result: 'Mücadele Sonucu', anim: 'Animasyon Hızı',
      dirOptDefaultWheel: 'Default Çark', dirOptFastWheel: 'Hızlı Çark', dirOptInstant: 'Anlık Seçim', rand: 'Rastgele',
      normal: 'Normal', fast: 'Hızlı', instant: 'Anlık', none: 'Animasyonsuz',
      lang: 'Dil', turkish: 'Türkçe', english: 'English',
      manualPlacement: 'Manuel yerleşim', picked: 'Seçilenler', clickToPlace: 'Seçtiğiniz takımın merkezini haritada tıklayın',
      placementDone: 'Yerleşim tamamlandı', layoutName: 'Düzen adı', save: 'Kaydet',
      start: 'Oyunu Başlat', attackerPick: 'Atak Yapan Takımı Seç',
      resultReal: 'Gerçekçi', resultRandom: 'Rastgele', resultManual: 'Manuel'
      ,turn: 'Tur', heroDesc: 'Takımlarınızla dünyayı fethedin. Strateji, şans ve futbol tutkunuzla imparatorluğunuzu kurun.',
      strategicWars: 'Stratejik Savaşlar', luckSkill: 'Şans ve Beceri', buildEmpire: 'İmparatorluk Kurun',
      strategicWarsDesc: 'Strateji, şans ve futbol tutkunuzla imparatorluğunuzu kurun.',
      luckSkillDesc: 'Hem şans hem de futbol bilginizle kazanın. Her hamle yeni bir macera.',
      buildEmpireDesc: 'En büyük futbol imparatorluğunu kurun ve dünyayı tek çatı altında toplayın.',
      historyStats: 'Geçmiş & İstatistikler', lastMoves: 'Son Hamleler', noMovesYet: 'Henüz hamle yok.',
      restart: 'Yeniden Başlat', presetNormal: 'Normal', presetFast: 'Hızlı', presetInstant: 'Anlık', presetManual: 'Manuel',
      teamSelecting: 'Takım seçiliyor...', watchWheel: 'Haritada dönen çarkı izleyin', teamWon: 'kazandı!', vs: '→',
      attackingTeam: 'Saldıran Takım', defendingTeam: 'Saldırılan Takım',
      directionSelecting: 'Yön belirleniyor...', watchArrow: 'Haritada dönen oku izleyin',
      battleStart: 'Mücadeleyi Başlat', gameReady: 'Oyun Hazır', teamPlaced: 'yerleştirildi',
      placementComplete: 'Yerleşim Tamamlandı', layoutSaved: 'Düzen kaydedildi',
      attackerWins: 'Saldıran Kazansın', defenderWins: 'Savunan Kazansın',
      gameOver: 'Oyun Bitti', winner: 'Kazanan', delete: 'Sil',
      animNormal: 'Normal', animFast: 'Hızlı', animNone: 'Animasyonsuz', randomizeAll: 'Rastgele Ayarla'
    },
    en: {
      country: 'Country', teams: 'Team Count', mapLook: 'Map Look', striped: 'Striped', solid: 'Solid',
      classic: 'Classic', modern: 'Modern', retro: 'Retro', minimal: 'Minimal', vibrant: 'Vibrant',
      themeClassic: 'Classic', themeNeon: 'Neon', themeOcean: 'Ocean', themeFire: 'Fire', themeForest: 'Forest',
      preset: 'Preset Mode', teamSelections: 'Team Selections', default: 'Default', manual: 'Manual',
      selection: 'Attacker Selection', selectionManualHint: '⚔️ Pick an attacking team on the map',
      direction: 'Defender Selection', directionManualHint: '🎯 Pick a defending team on the map',
      result: 'Battle Result', anim: 'Animation Speed',
      dirOptDefaultWheel: 'Default Wheel', dirOptFastWheel: 'Fast Wheel', dirOptInstant: 'Instant Pick', rand: 'Random',
      normal: 'Normal', fast: 'Fast', instant: 'Instant', none: 'No Animations',
      lang: 'Language', turkish: 'Turkish', english: 'English',
      manualPlacement: 'Manual placement', picked: 'Picked', clickToPlace: 'Click a cell on map to place',
      placementDone: 'Placement complete', layoutName: 'Layout name', save: 'Save',
      start: 'Start Game', attackerPick: 'Pick Attacking Team',
      resultReal: 'Realistic', resultRandom: 'Random', resultManual: 'Manual'
      ,turn: 'Turn', heroDesc: 'Conquer the world with your teams. Build your empire with strategy, luck, and football passion.',
      strategicWars: 'Strategic Wars', luckSkill: 'Luck and Skill', buildEmpire: 'Build Empire',
      strategicWarsDesc: 'Build your empire with strategy, luck, and football passion.',
      luckSkillDesc: 'Win with both luck and your football knowledge. Every move is a new adventure.',
      buildEmpireDesc: 'Build the greatest football empire and unite the world under one roof.',
      historyStats: 'History & Statistics', lastMoves: 'Last Moves', noMovesYet: 'No moves yet.',
      restart: 'Restart', presetNormal: 'Normal', presetFast: 'Fast', presetInstant: 'Instant', presetManual: 'Manual',
      teamSelecting: 'Selecting team...', watchWheel: 'Watch the spinning wheel on the map', teamWon: 'won!', vs: '→',
      attackingTeam: 'Attacking Team', defendingTeam: 'Defending Team',
      directionSelecting: 'Determining direction...', watchArrow: 'Watch the spinning arrow on the map',
      battleStart: 'Start Battle', gameReady: 'Game Ready', teamPlaced: 'placed',
      placementComplete: 'Placement Complete', layoutSaved: 'Layout saved',
      attackerWins: 'Attacker Wins', defenderWins: 'Defender Wins',
      gameOver: 'Game Over', winner: 'Winner', delete: 'Delete',
      animNormal: 'Normal', animFast: 'Fast', animNone: 'No Animations', randomizeAll: 'Randomize All'
    }
  }), [])
  const t = (k: keyof typeof m['tr']) => (m as any)[config.language || 'en'][k]
  const setPreviewTarget = useGameStore((s) => s.setPreviewTarget)
  const resolveTarget = useGameStore((s) => s.resolveTarget)
  const setSuppressLastOverlay = useGameStore(
    (s) => s.setSuppressLastOverlay as (v: boolean) => void
  )
  // Removed setFrozenSnapshotIndex - no longer needed
  const setPreviewFromTeamId = useGameStore(
    (s) =>
      (s as unknown as { setPreviewFromTeamId: (id?: number) => void })
        .setPreviewFromTeamId
  )
  const setRotatingArrow = useGameStore(
    (s) =>
      (s as unknown as { setRotatingArrow: (teamId?: number, angle?: number) => void })
        .setRotatingArrow
  )
  const setBeam = useGameStore(
    (s) =>
      (s as unknown as { setBeam: (active: boolean, targetCell?: number) => void })
        .setBeam
  )

  const [teamWinner, setTeamWinner] = useState<number | null>(null)
  const [uiStep, setUiStep] = useState<
    "team" | "dir" | "attacking" | "direction-ready" | "direction-spinning" | null
  >(null)
  const [teamSpinTarget, setTeamSpinTarget] = useState<number | undefined>(
    undefined
  )
  const [toast, setToast] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [showAttackerInfo, setShowAttackerInfo] = useState<boolean>(false)
  const [showDefenderInfo, setShowDefenderInfo] = useState<boolean>(false)
  const isSpinning = uiStep === "team" || uiStep === "dir"
  const disabledTeamBtn = isSpinning
  const rngRef = useRef<() => number>(() => Math.random())
  const [defenderInfo, setDefenderInfo] = useState<{
    name: string
    ovr: number
  } | null>(null)
  const [attackedTeam, setAttackedTeam] = useState<string | null>(null)
  const [attackedTeamId, setAttackedTeamId] = useState<number | null>(null)
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null)
  const [manualMapping, setManualMapping] = useState<Record<number, number>>({})
  const manualClubs = useMemo(() => (COUNTRY_CLUBS[selectedCountry] || []), [selectedCountry])
  const [manualSelectedClubIdx, setManualSelectedClubIdx] = useState<number | null>(0)
  const manualPlacedCount = useMemo(() => Object.keys(manualMapping).length, [manualMapping])
  const manualPickedSet = useMemo(() => new Set(Object.values(manualMapping)), [manualMapping])
  const leagueMax = useMemo(() => {
    switch (selectedCountry) {
      case 'England':
      case 'Italy':
      case 'Spain':
        return 20
      case 'France':
      case 'Germany':
      case 'Portugal':
      case 'Netherlands':
      case 'Turkey':
      default:
        return 18
    }
  }, [selectedCountry])

  const liveTeams = useMemo(() => teams.filter((t) => t.alive), [teams])
  
  // Memoize spinner items to prevent unnecessary re-renders
  const spinnerItems = useMemo(() => {
    const items = liveTeams.length ? liveTeams.map((t) => t.abbreviation || t.name.slice(0, 3)) : ["-"]
    // console.log('🎯 spinnerItems created:', items, 'liveTeams count:', liveTeams.length)
    return items
  }, [liveTeams])
  
  const spinnerColors = useMemo(() => 
    liveTeams.map((t) => {
      // Takım renklerini kontrol et - önce colors array'ini, sonra color'ı kullan
      const club = (COUNTRY_CLUBS[selectedCountry] || []).find((c: any) => c.name === t.name)
      if (club?.colors && club.colors.length > 0) {
        return club.colors[0] // İlk renk (ana renk)
      }
      return t.color || '#3b82f6'
    }),
    [liveTeams, selectedCountry]
  )
  const spinnerFullNames = useMemo(() => 
    liveTeams.length ? liveTeams.map((t) => t.name) : undefined,
    [liveTeams]
  )

  useEffect(() => {
    rngRef.current = createRng(`${seed}:spins:${teams.length}:${cells.length}`)
  }, [seed, teams.length, cells.length])


  useEffect(() => {
    if (!history.length) return
    const h = history[history.length - 1]
    const attacker = teams.find((t) => t.id === h.attackerTeamId)
    const defender = teams.find((t) => t.id === (h.defenderTeamId ?? -1))
    const aName = attacker?.name ?? `Takım ${h.attackerTeamId + 1}`
    const dName = defender?.name ?? `?`
    const aOvr = attacker?.overall ?? 75
    const dOvr = defender?.overall ?? 75
    const winnerName = h.attackerWon ? aName : defender?.name ?? dName
    const msg = `${aName} (${aOvr}) ${t('vs')} ${dName} (${dOvr}) — ${winnerName} ${t('teamWon')}`
    setToast(msg)
    const timeout = setTimeout(() => setToast(null), 6500)
    return () => clearTimeout(timeout)
  }, [history, teams])

  // Find potential defender when direction is chosen
  const teamAndCellIds = JSON.stringify({
    t: teams.map((t) => t.id),
    c: cells.map((c) => c.id)
  })
  useEffect(() => {
    if (teamWinner !== null && uiStep === "attacking" && selectedDirection != null) {
      const attackerTeam = liveTeams.find(t => t.id === teamWinner)
      if (!attackerTeam) return

      const t = resolveTarget(attackerTeam.id, selectedDirection)
      if (t) {
        const defenderId = cells.find((c) => c.id === t.toCellId)?.ownerTeamId
        const defender = teams.find((tm) => tm.id === defenderId)
        if (defender) {
          setDefenderInfo({ name: defender.name, ovr: defender.overall ?? 75 })
        } else if (defenderId === -1) {
          setDefenderInfo({ name: "Neutral Zone", ovr: 50 })
        }
        try {
          setPreviewTarget(t.fromCellId, t.toCellId)
        } catch (e) {
          console.warn(e)
        }
      }
    } else {
      setDefenderInfo(null)
      // keep any previously set preview target during selection flow
    }
  }, [
    uiStep,
    teamWinner,
    teamAndCellIds,
    teams,
    cells,
    setPreviewTarget,
    resolveTarget,
    selectedDirection
  ])


  const pickWeightedTeamIndex = () => {
    if (liveTeams.length === 0) return 0
    const counts = liveTeams.map(
      (t) => cells.filter((c) => c.ownerTeamId === t.id).length
    )
    const maxCount = Math.max(...counts)
    const minCount = Math.min(...counts)
    const weights = liveTeams.map((t, i) => {
      const cellCount = counts[i]
      const comebackBoost = 1 + (maxCount - cellCount) * 0.1
      const bullyPenalty = 1 - Math.max(0, cellCount - minCount) * 0.08
      const form = t.form ?? 1
      const overPowerPenalty = (t.overall ?? 75) > 85 ? 0.9 : 1
      return Math.max(
        0.05,
        comebackBoost * bullyPenalty * overPowerPenalty * (1.0 / form)
      )
    })
    const rng = createRng(`${seed}:wteam:${turn}:${Date.now()}`)
    const selectedIndex = weightedChoice(weights, rng)
    // console.log('🎯 pickWeightedTeamIndex:', { selectedIndex, team: liveTeams[selectedIndex]?.name })
    return selectedIndex
  }


  const isGameOver = liveTeams.length <= 1 && liveTeams.length > 0
  const attackerTeam = teamWinner != null ? liveTeams.find(t => t.id === teamWinner) : undefined

  // Manual direction selection - removed automatic selection


  return (
    <div>
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -28, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="fixed left-1/2 top-8 z-50 -translate-x-1/2"
          >
            <motion.div
              className="relative overflow-visible rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-r from-slate-900/98 via-emerald-900/95 to-slate-900/98 px-8 py-5 text-lg font-bold text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] backdrop-blur-md"
              animate={{
                boxShadow: [
                  "0 0 30px rgba(16,185,129,0.4)",
                  "0 0 50px rgba(248,250,252,0.5)",
                  "0 0 30px rgba(16,185,129,0.4)"
                ],
                scale: [1, 1.02, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
            >
              <motion.span
                className="pointer-events-none absolute -inset-12 -z-10 rounded-full bg-gradient-to-r from-emerald-400/40 via-amber-300/30 to-purple-400/40 blur-3xl"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative flex items-center gap-4">
                <motion.span
                  aria-hidden
                  className="text-4xl"
                  animate={{ 
                    scale: [1, 1.3, 1], 
                    rotate: [0, -15, 15, -15, 0] 
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror" }}
                >
                  🏆
                </motion.span>
                <motion.span
                  className="leading-tight"
                  animate={{ 
                    color: ["#f8fafc", "#fbbf24", "#10b981", "#fbbf24", "#f8fafc"] 
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
                >
                  {toast}
                </motion.span>
                <motion.span
                  aria-hidden
                  className="text-4xl"
                  animate={{ 
                    scale: [1, 1.3, 1], 
                    rotate: [0, 15, -15, 15, 0] 
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror", delay: 0.6 }}
                >
                  ⚽
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Team Announcement */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            key="announcement"
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -100 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="fixed left-1/2 top-20 z-50 -translate-x-1/2"
          >
            <motion.div
              className="relative overflow-visible rounded-3xl border-4 border-amber-400/80 bg-gradient-to-br from-slate-900/98 via-amber-900/90 to-slate-900/98 px-12 py-8 text-center shadow-[0_0_60px_rgba(251,191,36,0.6)] backdrop-blur-lg"
              animate={{
                boxShadow: [
                  "0 0 60px rgba(251,191,36,0.6)",
                  "0 0 100px rgba(251,191,36,0.9)",
                  "0 0 60px rgba(251,191,36,0.6)"
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "mirror" }}
            >
              <motion.div
                className="pointer-events-none absolute -inset-20 -z-10 rounded-full bg-gradient-to-r from-amber-400/50 via-orange-400/40 to-red-400/50 blur-3xl"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="text-5xl font-black text-white mb-2"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatType: "mirror" }}
              >
                {announcement}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="w-full p-0 bg-gradient-to-br from-slate-900/50 via-blue-900/30 to-slate-900/50 backdrop-blur-sm min-h-screen">
        {!gameStarted && (
          <header className="text-center relative overflow-hidden mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 blur-3xl"></div>
            <div className="relative z-10">
              <div className="mb-4">
                <span className="inline-block px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-sm font-medium backdrop-blur-sm">
                  🏆 {config.language==='tr' ? 'Stratejik Futbol Savaşları' : 'Strategic Football Battles'}
                </span>
              </div>
              <div className="relative inline-block group">
                <h1 className="text-6xl md:text-7xl font-black tracking-tight animate-fade-in-up mb-4">
                  <span className="text-white">{config.language==='tr' ? 'Futbol' : 'Football'}</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400">
                    {config.language==='tr' ? 'Emperyalizmi' : 'Empire'}
                  </span>
          </h1>
                {/* Version Tooltip */}
                <div className="absolute -top-8 -right-12 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-1 z-50">
                  <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold rounded-lg px-4 py-2 text-base shadow-2xl border-2 border-white/20 whitespace-nowrap">
                    v0.10.7
                  </div>
                </div>
              </div>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-up">
                {t('heroDesc')}
              </p>
            </div>
        </header>
        )}

        {!gameStarted && (
          <div className="relative mx-auto mt-8 max-w-3xl animate-fade-in-scale">
            {/* Hero Section */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-400/30 rounded-full backdrop-blur-sm mb-4">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-300 font-medium text-sm">{t('gameReady')}</span>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {config.language==='tr' ? 'İmparatorluğunuzu Kurun' : 'Build Your Empire'}
              </h2>
              <p className="text-slate-400 text-base">
                {config.language==='tr' ? 'Ayarları yapılandırın ve futbol dünyasında hüküm sürmeye başlayın' : 'Configure settings and start ruling the football world'}
              </p>
            </div>

            {/* Main Configuration Card */}
            <div className="relative">
              {/* Background Effects */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl blur-sm"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-800/90 rounded-2xl border border-slate-700/50 backdrop-blur-xl"></div>
              
            <div className="relative p-6">
                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Left Column */}
                  <div className="space-y-5">
                    <div className="group">
                      <label className="mb-2 block text-sm font-semibold text-emerald-300 uppercase tracking-wide">
                        🌍 {t('country')}
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) =>
                      setCountry(e.target.value as (typeof COUNTRIES)[number])
                    }
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 backdrop-blur-sm hover:bg-slate-700/70"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                    <div className="group">
                      <label className="mb-2 block text-sm font-semibold text-blue-300 uppercase tracking-wide">
                        ⚽ {t('teams')}
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={leagueMax}
                    value={numTeams}
                    onChange={(e) =>
                      setNumTeams(parseInt(e.target.value || "0", 10))
                    }
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm hover:bg-slate-700/70"
                  />
                      <p className="mt-2 text-xs text-slate-400">2-{leagueMax}</p>
                </div>

                    <div className="group">
                      <label className="mb-2 block text-sm font-semibold text-amber-300 uppercase tracking-wide">
                        🧩 {t('teamSelections')}
                      </label>
                      <select
                        value={config.teamSelectionMode === 'layout' ? `layout::${config.teamSelectionLayoutName || ''}` : config.teamSelectionMode}
                        onChange={(e)=>{ 
                          const val = e.target.value
                          if (val.startsWith('layout::')) {
                            const name = val.slice('layout::'.length)
                            const newConfig = { ...config, teamSelectionMode: 'layout' as const, teamSelectionLayoutName: name }
                            setConfig(newConfig); saveConfig(newConfig)
                          } else {
                            const newConfig = { ...config, teamSelectionMode: val as any, teamSelectionLayoutName: undefined }
                            setConfig(newConfig); saveConfig(newConfig)
                          }
                        }}
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white"
                      >
                        <option value="default">{t('default')}</option>
                        <option value="manual">{t('manual')}</option>
                        {availableLayouts.length > 0 && (
                          <option disabled>──────────</option>
                        )}
                        {availableLayouts.map((l)=> (
                          <option key={l.name} value={`layout::${l.name}`}>{l.name}</option>
                        ))}
                      </select>
                      
                      {/* Delete saved layouts */}
                      {availableLayouts.length > 0 && (
                        <div className="mt-3">
                          <label className="mb-2 block text-xs font-semibold text-red-300 uppercase tracking-wide">
                            🗑️ {t('delete')} {t('teamSelections')}
                          </label>
                          <div className="space-y-2">
                            {availableLayouts.map((layout) => (
                              <div key={layout.name} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2 border border-slate-600/30">
                                <span className="text-sm text-slate-300">{layout.name}</span>
                                <button
                                  onClick={() => {
                                    if (confirm(`${t('delete')} "${layout.name}"?`)) {
                                      deleteLayoutPreset(layout.name)
                                      setSavedLayouts(loadLayouts())
                                      if (config.teamSelectionLayoutName === layout.name) {
                                        const newConfig = { ...config, teamSelectionMode: 'default' as const, teamSelectionLayoutName: undefined }
                                        setConfig(newConfig)
                                        saveConfig(newConfig)
                                      }
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-400/30 hover:bg-red-400/10 transition-colors"
                                >
                                  {t('delete')}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="group">
                      <label className="mb-2 block text-sm font-semibold text-indigo-300 uppercase tracking-wide">{t('lang')}</label>
                      <select
                        value={config.language}
                        onChange={(e)=>{ const newConfig = { ...config, language: e.target.value as any }; setConfig(newConfig); saveConfig(newConfig) }}
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white"
                      >
                        <option value="tr">{t('turkish')}</option>
                        <option value="en">{t('english')}</option>
                      </select>
                </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    <div className="group">
                      <label className="mb-2 block text-sm font-semibold text-purple-300 uppercase tracking-wide">
                        🎨 {t('mapLook')}
                  </label>
                  <select
                    value={mapColoring}
                    onChange={(e) =>
                      setMapColoring(e.target.value as "solid" | "striped")
                    }
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm hover:bg-slate-700/70"
                  >
                    <option value="striped">🎨 {t('striped')}</option>
                    <option value="solid">🎯 {t('solid')}</option>
                    <option value="classic">🏛️ {t('classic')}</option>
                    <option value="modern">✨ {t('modern')}</option>
                    <option value="retro">📺 {t('retro')}</option>
                    <option value="minimal">⚪ {t('minimal')}</option>
                    <option value="vibrant">🌈 {t('vibrant')}</option>
                  </select>
                  
                </div>

                  <div className="group space-y-3">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-amber-300 uppercase tracking-wide">⚙️ {t('preset')}</label>
                      <select
                        value={config.presetMode}
                        onChange={(e) => {
                          const preset = e.target.value as GameConfig["presetMode"]
                          const presets: Record<string, Partial<GameConfig>> = {
                            normal: { selectionMode: 'normal', directionMode: 'normal', resultMode: 'normal', animationSpeed: 'normal', presetMode: 'normal', teamSelectionMode: 'default' },
                            fast: { selectionMode: 'fast', directionMode: 'fast', resultMode: 'fast', animationSpeed: 'fast', presetMode: 'fast', teamSelectionMode: 'default' },
                            instant: { selectionMode: 'instant', directionMode: 'instant', resultMode: 'instant', animationSpeed: 'fast', presetMode: 'instant', teamSelectionMode: 'default' },
                            manual: { selectionMode: 'manual', directionMode: 'manual', resultMode: 'manual', animationSpeed: 'normal', presetMode: 'manual', teamSelectionMode: 'manual' }
                          }
                          const newConfig = { ...config, ...presets[preset] }
                          setConfig(newConfig)
                          saveConfig(newConfig)
                        }}
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200 backdrop-blur-sm hover:bg-slate-700/70"
                      >
                        <option value="normal">🎯 {t('presetNormal')}</option>
                        <option value="fast">🚀 {t('presetFast')}</option>
                        <option value="instant">⚡ {t('presetInstant')}</option>
                        <option value="manual">🎮 {t('presetManual')}</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-sky-300 uppercase tracking-wide">{t('selection')}</label>
                        <select
                          value={config.selectionMode}
                          onChange={(e)=>{ const newConfig = { ...config, selectionMode: e.target.value as any }; setConfig(newConfig); saveConfig(newConfig) }}
                          className="w-full rounded-lg border border-slate-600/50 bg-slate-800/70 px-3 py-2 text-white"
                        >
                          <option value="normal">{t('dirOptDefaultWheel')}</option>
                          <option value="fast">{t('dirOptFastWheel')}</option>
                          <option value="instant">{t('dirOptInstant')}</option>
                          <option value="random">{t('rand')}</option>
                          <option value="manual">{t('manual')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-purple-300 uppercase tracking-wide">{t('direction')}</label>
                        <select
                          value={config.directionMode}
                          onChange={(e)=>{ const newConfig = { ...config, directionMode: e.target.value as any }; setConfig(newConfig); saveConfig(newConfig) }}
                          className="w-full rounded-lg border border-slate-600/50 bg-slate-800/70 px-3 py-2 text-white"
                        >
                          <option value="normal">{t('dirOptDefaultWheel')}</option>
                          <option value="fast">{t('dirOptFastWheel')}</option>
                          <option value="instant">{t('dirOptInstant')}</option>
                          <option value="random">{t('rand')}</option>
                          <option value="manual">{t('manual')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-rose-300 uppercase tracking-wide">{t('result')}</label>
                        <select
                          value={config.resultMode}
                          onChange={(e)=>{ const newConfig = { ...config, resultMode: e.target.value as any }; setConfig(newConfig); saveConfig(newConfig) }}
                          className="w-full rounded-lg border border-slate-600/50 bg-slate-800/70 px-3 py-2 text-white"
                        >
                          <option value="normal">{t('resultReal')}</option>
                          <option value="random">{t('resultRandom')}</option>
                          <option value="manual">{t('resultManual')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-emerald-300 uppercase tracking-wide">{t('anim')}</label>
                        <select
                          value={config.animationSpeed}
                          onChange={(e)=>{ const newConfig = { ...config, animationSpeed: e.target.value as any }; setConfig(newConfig); saveConfig(newConfig) }}
                          className="w-full rounded-lg border border-slate-600/50 bg-slate-800/70 px-3 py-2 text-white"
                        >
                          <option value="normal">{t('animNormal')}</option>
                          <option value="fast">{t('animFast')}</option>
                          <option value="none">{t('animNone')}</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Randomize All Settings Button */}
                    <div className="mt-4 pt-4 border-t border-slate-600/30">
                      <button
                        onClick={() => {
                          const randomConfig = {
                            ...config,
                            presetMode: ['normal', 'fast', 'instant', 'manual'][Math.floor(Math.random() * 4)] as any,
                            selectionMode: ['normal', 'fast', 'instant', 'random', 'manual'][Math.floor(Math.random() * 5)] as any,
                            directionMode: ['normal', 'fast', 'instant', 'random', 'manual'][Math.floor(Math.random() * 5)] as any,
                            resultMode: ['normal', 'random', 'manual'][Math.floor(Math.random() * 3)] as any,
                            animationSpeed: ['normal', 'fast', 'none'][Math.floor(Math.random() * 3)] as any,
                            mapColoring: ['striped', 'solid'][Math.floor(Math.random() * 2)] as any,
                            teamSelectionMode: ['default', 'manual'][Math.floor(Math.random() * 2)] as any,
                            numTeams: Math.floor(Math.random() * 8) + 4, // 4-11 teams
                            selectedCountry: ['Turkey', 'Italy', 'Germany', 'Portugal', 'Netherlands', 'England'][Math.floor(Math.random() * 6)] as any
                          }
                          setConfig(randomConfig)
                          saveConfig(randomConfig)
                          setNumTeams(randomConfig.numTeams)
                          setCountry(randomConfig.selectedCountry)
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300 transform hover:scale-105"
                      >
                        <span className="text-xl">🎲</span>
                        <span>{t('randomizeAll')}</span>
                      </button>
                    </div>
                  </div>
              </div>
                </div>

                {/* Manual team picker */}
                {/* Start Button */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                <button
                    className="group relative w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white font-bold py-2.5 px-5 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
                  onClick={() => {
                    if (config.teamSelectionMode === 'layout') {
                      const layout = availableLayouts.find(l => l.name === config.teamSelectionLayoutName)
                      if (layout) {
                        setManualMapping(layout.mapping)
                        setManualSelectedClubIdx(null)
                        setLayoutSaved(true)
                      }
                    } else if (config.teamSelectionMode === 'manual') {
                      setManualMapping({}); setManualSelectedClubIdx(0)
                      setLayoutSaved(false)
                    }
                    setGameStarted(true)
                  }}
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-base">🏆</span>
                      <span className="text-base">{t('start')}</span>
                      <span className="text-base">⚽</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="group p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:bg-slate-700/40 transition-all duration-300 animate-fade-in-left hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="text-2xl mb-2 animate-float">🎯</div>
                <h3 className="text-base font-semibold text-white mb-1">{t('strategicWars')}</h3>
                <p className="text-slate-400 text-xs">{t('strategicWarsDesc')}</p>
              </div>
              <div className="group p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:bg-slate-700/40 transition-all duration-300 animate-fade-in-up hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10" style={{animationDelay: '0.2s'}}>
                <div className="text-2xl mb-2 animate-float" style={{animationDelay: '0.5s'}}>🎲</div>
                <h3 className="text-base font-semibold text-white mb-1">{t('luckSkill')}</h3>
                <p className="text-slate-400 text-xs">{t('luckSkillDesc')}</p>
              </div>
              <div className="group p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:bg-slate-700/40 transition-all duration-300 animate-fade-in-right hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10" style={{animationDelay: '0.4s'}}>
                <div className="text-2xl mb-2 animate-float" style={{animationDelay: '1s'}}>🏆</div>
                <h3 className="text-base font-semibold text-white mb-1">{t('buildEmpire')}</h3>
                <p className="text-slate-400 text-xs">{t('buildEmpireDesc')}</p>
              </div>
            </div>
          </div>
        )}

        {gameStarted && (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-10">
                {/* Debug spinner props */}
                <MapView 
                  showTeamSpinner={uiStep === "team" && teamSpinTarget !== undefined}
                  uiStep={uiStep || ""}
                  cells={cells}
                  fastMode={config.animationSpeed === 'fast'}
                  animationSpeed={config.animationSpeed}
                  selectionMode={config.selectionMode}
                  manualMode={manualEnabled}
                  manualMapping={manualEnabled ? manualMapping : undefined}
                  attackedTeam={attackedTeam}
                  attackedTeamId={attackedTeamId}
                  targetSelectMode={config.directionMode === 'manual' && teamWinner != null && attackedTeamId == null}
                  attackerSelectMode={uiStep !== 'team' && teamWinner === null && config.selectionMode === 'manual'}
                  onAttackerSelect={(teamId:number)=>{
                    const attacker = teams.find(t=> t.id === teamId)
                    if (!attacker) return
                    setTeamWinner(attacker.id)
                    setPreviewFromTeamId(attacker.id)
                    playClick()
                    setAnnouncement(`⚔️ ${attacker.name}`)
                    setUiStep('direction-ready')
                    setTimeout(()=> setAnnouncement(null), 800)
                  }}
                  onTargetSelect={(cellId:number)=>{
                    const attackerId = teamWinner
                    if (attackerId == null) return
                    const targetCell = cells.find(c => c.id === cellId)
                    if (!targetCell) return
                    if (targetCell.ownerTeamId === attackerId) return
                    const attackerCells = cells.filter(c => c.ownerTeamId === attackerId)
                    if (attackerCells.length === 0) return
                    let fromId = attackerCells[0].id
                    let best = Infinity
                    for (const c of attackerCells) {
                      const dx = (c as any).centroid?.[0] - (targetCell as any).centroid?.[0]
                      const dy = (c as any).centroid?.[1] - (targetCell as any).centroid?.[1]
                      const d = (dx||0)*(dx||0) + (dy||0)*(dy||0)
                      if (d < best) { best = d; fromId = c.id }
                    }
                    setPreviewTarget(fromId, cellId)
                    setPreviewFromTeamId(attackerId)
                    const defTeam = teams.find(t => t.id === targetCell.ownerTeamId)
                    if (defTeam) {
                      setAttackedTeam(defTeam.name)
                      setAttackedTeamId(defTeam.id)
                      setAnnouncement(`🎯 ${t('defendingTeam')}: ${defTeam.name}`)
                      setTimeout(()=> setAnnouncement(null), 1200)
                      // Immediately set battle state for manual defender selection
                      setUiStep("attacking")
                    }
                  }}
                  onCellClick={(cellId:number)=>{
                    if (!manualEnabled) return
                    if (manualSelectedClubIdx == null) return
                    const assignIdx = manualSelectedClubIdx
                    // Move team if already placed: remove its old cell
                    const prevForTeam = Object.entries(manualMapping).find(([, idx]) => idx === assignIdx)
                    const nextMap: Record<number, number> = { ...manualMapping }
                    if (prevForTeam) delete nextMap[Number(prevForTeam[0])]
                    // If target cell occupied by another team, free it (that team becomes unplaced)
                    if (nextMap[cellId] != null) delete nextMap[cellId]
                    nextMap[cellId] = assignIdx
                    setManualMapping(nextMap)
                    setLayoutSaved(false)
                    // Instant feedback announcement
                    const club = manualClubs[assignIdx]
                    if (club) {
                      setAnnouncement(`📍 ${club.name} ${t('teamPlaced')}`)
                      setTimeout(() => setAnnouncement(null), 1200)
                    }
                    const placed = Object.keys(nextMap).length
                    if (placed >= numTeams) {
                      // Final toast when all placements are done
                      setAnnouncement(`✅ ${t('placementComplete')}, ${t('gameReady')}!`)
                      setTimeout(() => setAnnouncement(null), 1200)
                      return
                    }
                    // Auto-focus next unplaced team for faster flow
                    const nextIdx = manualClubs.findIndex((_, idx) => !Object.values(nextMap).includes(idx))
                    setManualSelectedClubIdx(nextIdx >= 0 ? nextIdx : null)
                  }}
                  teamSpinnerProps={{
                    items: spinnerItems,
                    colors: spinnerColors,
                    winnerIndex: teamSpinTarget,
                    fullNames: spinnerFullNames,
                    onDone: (i) => {
                      const attacker = liveTeams[i]
                      if (!attacker) {
                        return
                      }
                      
                      setTeamWinner(attacker.id)
                      
                      // Immediately blur other teams
                      setPreviewFromTeamId(attacker.id)
                      
                      // Play selection sound
                      playClick()
                      
                      // Show attacker message after 2 seconds
                      setTimeout(() => {
                        setAnnouncement(`⚔️ ${t('attackingTeam')}: ${attacker.name}`)
                        setUiStep("direction-ready") // Hide spinner immediately when announcement shows
                        
                        // Hide announcement after 2 seconds
                        setTimeout(() => {
                          setAnnouncement(null)
                        }, 2000) // Show announcement for 2 seconds
                      }, 2000) // Show attacker message after 2 seconds
                    }
                  }}
                />
            </div>

            <div className="flex flex-col lg:col-span-2">
              <div className="relative rounded-xl overflow-hidden backdrop-blur-xl border border-white/20 p-3 flex-1 flex flex-col shadow-2xl"
                   style={{
                     background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                     boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
                   }}>
                <h2 className="mb-2 text-base font-semibold text-white">
                  {t('turn')} {turn + 1}
                </h2>
                {attackerTeam && showAttackerInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mb-2 flex flex-wrap items-center gap-3"
                  >
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-700/60 px-3 py-1 text-sm">
                      <span className="font-semibold">Saldıran:</span>
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: attackerTeam.color }}
                      />
                      <span>{attackerTeam.name}</span>
                      <span className="text-xs text-slate-300">
                        OVR {attackerTeam.overall ?? 75}
                      </span>
                    </div>
                  </motion.div>
                )}
                {defenderInfo && showDefenderInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mb-2 flex flex-wrap items-center gap-3"
                  >
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-700/60 px-3 py-1 text-sm">
                      <span className="font-semibold">Savunan:</span>
                      <span>{defenderInfo.name}</span>
                      <span className="text-xs text-slate-300">
                        OVR {defenderInfo.ovr}
                      </span>
                    </div>
                  </motion.div>
                )}
                {/* Team Selection Button / Manual attacker pick */}
                {config.selectionMode === 'manual' && teamWinner === null && (
                  <div className="flex justify-center mb-4">
                    <div className="w-full text-center py-3 px-4 bg-amber-900/20 rounded-xl border border-amber-500/30">{t('selectionManualHint')}</div>
                  </div>
                )}
                {config.selectionMode !== 'manual' && uiStep !== "team" && teamWinner === null && (!manualEnabled || (manualEnabled && (!gameStarted || Object.keys(manualMapping).length >= numTeams))) && (
                  <div className="flex justify-center mb-4">
                      <button
                        onClick={() => {
                        // ÖNCE TÜM STATE'LERİ TEMİZLE (Spinner başlamadan önce!)
                        try {
                          setSuppressLastOverlay(true)
                          setPreviewTarget(undefined, undefined)
                          setPreviewFromTeamId(undefined)
                          setRotatingArrow(undefined, undefined)
                          setBeam(false, undefined)
                          setShowAttackerInfo(false)
                          setShowDefenderInfo(false)
                          setDefenderInfo(null)
                          setAnnouncement(null)
                          setAttackedTeamId(null)
                          // Clear previous turn's winner
                          setTeamWinner(null)
                        } catch (e) {
                          console.warn(e)
                        }
                        
                        // SONRA seçim moduna göre ilerle
                        const targetIndex = pickWeightedTeamIndex()
                        if (config.selectionMode === 'instant' || config.animationSpeed === 'none') {
                          const attacker = liveTeams[targetIndex]
                          if (attacker) {
                            setTeamWinner(attacker.id)
                            setPreviewFromTeamId(attacker.id)
                            playClick()
                            const delay = config.animationSpeed === 'fast' ? 800 : 2000
                            setAnnouncement(`⚔️ ${t('attackingTeam')}: ${attacker.name}`)
                            setUiStep("direction-ready")
                            setTimeout(()=> setAnnouncement(null), delay)
                          }
                        } else if (config.selectionMode === 'random') {
                          // Random selection - pick any team instantly
                          const randomIndex = Math.floor(Math.random() * liveTeams.length)
                          const attacker = liveTeams[randomIndex]
                          if (attacker) {
                            setTeamWinner(attacker.id)
                            setPreviewFromTeamId(attacker.id)
                            playClick()
                            setAnnouncement(`⚔️ ${t('attackingTeam')}: ${attacker.name}`)
                            setUiStep("direction-ready")
                            setTimeout(()=> setAnnouncement(null), 1200)
                          }
                        } else {
                          setUiStep("team")
                          setTeamSpinTarget(targetIndex)
                        }
                      }}
                      className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20"
                      disabled={disabledTeamBtn}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span className="text-xl">⚔️</span>
                        <span className="text-base">{t('attackerPick')}</span>
                        <span className="text-xl">🎯</span>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                      <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    </div>
                  )}
                {manualEnabled && gameStarted && manualPlacedCount < numTeams && (
                  <div className="w-full text-center py-3 px-4 bg-amber-900/20 rounded-xl border border-amber-500/30 mb-3">
                    <div className="text-amber-300 text-sm font-medium mb-2">{t('manualPlacement')}</div>
                    {/* Selectable teams (all teams) */}
                    <div className="flex flex-wrap gap-2 justify-center mb-2">
                      {manualClubs.map((c, idx) => (
                        <button key={idx} onClick={()=> setManualSelectedClubIdx(idx)}
                          className={`px-2 py-1 rounded-md text-xs border ${manualSelectedClubIdx===idx? 'border-amber-400 text-amber-300':'border-white/10 text-white/80'}`}>{c.name}</button>
                      ))}
                    </div>
                    {/* Picked teams list */}
                    {manualPickedSet.size > 0 && (
                      <div className="mt-2">
                        <div className="text-emerald-300 text-xs mb-1">{t('picked')}</div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {manualClubs.map((c, idx) => manualPickedSet.has(idx) && (
                            <button key={`picked-${idx}`} onClick={()=> setManualSelectedClubIdx(idx)}
                              className={`px-2 py-1 rounded-md text-xs border bg-emerald-600/20 border-emerald-400/40 text-emerald-200 ${manualSelectedClubIdx===idx? 'ring-2 ring-emerald-400':'hover:border-emerald-400/60'}`}>{c.name}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-amber-400 text-xs mt-2">{t('clickToPlace')} ({manualPlacedCount}/{numTeams})</div>
                  </div>
                )}
                {manualEnabled && config.teamSelectionMode === 'manual' && gameStarted && manualPlacedCount >= numTeams && !layoutSaved && (
                  <div className="w-full text-center py-3 px-4 bg-emerald-900/20 rounded-xl border border-emerald-500/30 mb-3">
                    <div className="text-emerald-300 text-sm font-medium mb-2">{t('placementDone')}</div>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        value={saveName}
                        onChange={(e)=> setSaveName(e.target.value)}
                        placeholder={t('layoutName')}
                        className="min-w-0 flex-1 rounded-md bg-slate-800/70 border border-emerald-400/30 px-3 py-1.5 text-sm text-white placeholder:text-slate-400"
                      />
                      <button
                        onClick={()=>{
                          const name = (saveName || `Düzen ${new Date().toLocaleString()}`).trim()
                          const layout = { name, country: selectedCountry, numTeams, mapping: manualMapping, createdAt: Date.now() }
                          saveLayoutPreset(layout as any)
                          setSavedLayouts(loadLayouts())
                          setAnnouncement(`💾 '${name}' ${t('layoutSaved')}`)
                          setTimeout(()=> setAnnouncement(null), 1200)
                          setSaveName("")
                          setLayoutSaved(true)
                        }}
                        className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 border border-white/10"
                      >{t('save')}</button>
                    </div>
                  </div>
                )}

                {uiStep === "team" && teamSpinTarget !== undefined && (
                  <div className="w-full text-center py-4 px-6 bg-amber-900/20 rounded-xl border border-amber-500/30">
                    <div className="text-amber-300 animate-pulse text-lg font-medium">
                      ⚔️ {t('teamSelecting')}
                      </div>
                    <div className="text-amber-400 text-sm mt-1">
                      {t('watchWheel')}
                      </div>
                        </div>
                      )}
                
                {config.directionMode === 'manual' && teamWinner != null && attackedTeamId == null && (
                  <div className="w-full text-center py-4 px-6 bg-blue-900/20 rounded-xl border border-blue-500/30 mb-3">
                    <div className="text-blue-300 font-medium">{t('directionManualHint')}</div>
                  </div>
                )}
                {uiStep === "direction-ready" && teamWinner != null && config.directionMode !== 'manual' && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const attacker = liveTeams.find(t => t.id === teamWinner)
                        if (!attacker) {
                          return
                        }
                        // Manual defender pick
                        if (config.directionMode === 'manual') {
                          try { setBeam(false, undefined) } catch {}
                          setUiStep('attacking')
                          setShowAttackerInfo(false)
                          setAnnouncement('🎯 Haritadan savunulacak takımı seçin')
                          setTimeout(()=> setAnnouncement(null), 1200)
                          return
                        }
                        // Random defender selection
                        if (config.directionMode === 'random') {
                          const candidateCells = cells.filter(c => c.ownerTeamId !== attacker.id)
                          if (candidateCells.length === 0) return
                          const picked = candidateCells[Math.floor(Math.random() * candidateCells.length)]
                          const attackerCells2 = cells.filter(c => c.ownerTeamId === attacker.id)
                          if (attackerCells2.length === 0) return
                          let fromId = attackerCells2[0].id
                          let best = Infinity
                          for (const c of attackerCells2) {
                            const dx = (c as any).centroid?.[0] - (picked as any).centroid?.[0]
                            const dy = (c as any).centroid?.[1] - (picked as any).centroid?.[1]
                            const d = (dx||0)*(dx||0) + (dy||0)*(dy||0)
                            if (d < best) { best = d; fromId = c.id }
                          }
                          setPreviewTarget(fromId, picked.id)
                          try { setBeam(false, undefined) } catch {}
                          setUiStep('attacking')
                          const defTeam = teams.find(t => t.id === picked.ownerTeamId)
                          if (defTeam) {
                            setAttackedTeam(defTeam.name)
                            setAttackedTeamId(defTeam.id)
                            setAnnouncement(`🎯 ${t('defendingTeam')}: ${defTeam.name}`)
                            setTimeout(()=> setAnnouncement(null), 800)
                          }
                          return
                        }
                        
                        // Start rotating arrow animation
                        const randomAngle = Math.random() * 360
                        setRotatingArrow(attacker.id, randomAngle)
                        setUiStep("direction-spinning")
                        // Show guidance beam only during direction selection
                        try { setBeam(true, undefined) } catch {}
                        
                        // After delay, arrow stops and resolve target
                        const spinDelay = (config.directionMode === 'instant' || config.animationSpeed === 'none') ? 0 : ((config.directionMode === 'fast' || config.animationSpeed === 'fast') ? 800 : 2000)
                        setTimeout(() => {
                          // Ok yönüne en yakın 8-yön eşleştirmesi için dereceye çevrilir
                          
                          
                          // Find target in beam direction
                          const attackerCells2 = cells.filter(c => c.ownerTeamId === attacker.id)
                          if (attackerCells2.length === 0) {
                            setAnnouncement('❌ Hata: Saldıran takımın toprağı yok!')
                            setRotatingArrow(undefined, undefined)
                            setUiStep("direction-ready")
                            // Auto-hide after 2 seconds
                            setTimeout(() => setAnnouncement(null), 2000)
                            return
                          }
                          
                          // Calculate attacker's center using centroid
                          let totalX = 0, totalY = 0, validCount = 0
                          for (const cell of attackerCells2) {
                            const centroid = (cell as any).centroid
                            if (centroid && Array.isArray(centroid) && centroid.length === 2) {
                              totalX += centroid[0]
                              totalY += centroid[1]
                              validCount++
                            }
                          }
                          
                          if (validCount === 0) {
                            setAnnouncement('❌ Hata: Takım merkezi bulunamadı!')
                            setRotatingArrow(undefined, undefined)
                            setUiStep("direction-ready")
                            // Auto-hide after 2 seconds
                            setTimeout(() => setAnnouncement(null), 2000)
                            return
                          }
                          
                          // Takım merkezi hesaplandı (gerekirse görsellerde kullanılabilir)
                          
                          // En yakın 8-yön eşleştirmesine göre gerçek hedefi hesapla
                          // Arrow final angle (0°=East basis)
                          // Arrow visual rotates clockwise; 0° at top (North). Convert to screen angle (0°=East, CCW):
                          const arrowDeg = (450 - (randomAngle % 360)) % 360

                          // Evaluate all 8 directions and pick the one whose target vector
                          // aligns best with the arrow angle from the attacker's center
                          const candDirs: Direction[] = ['E','NE','N','NW','W','SW','S','SE']
                          let bestDir: Direction | null = null
                          let bestDiff = Infinity
                          let bestResolved: { fromCellId: number; toCellId: number } | null = null

                          // Compute attacker center used earlier
                          let totalX2 = 0, totalY2 = 0, count2 = 0
                          for (const c of attackerCells2) {
                            const cent = (c as any).centroid
                            if (cent && cent.length === 2) { totalX2 += cent[0]; totalY2 += cent[1]; count2++ }
                          }
                          const sx = count2 > 0 ? totalX2 / count2 : 0
                          const sy = count2 > 0 ? totalY2 / count2 : 0

                          for (const d of candDirs) {
                            const r = resolveTarget(attacker.id, d)
                            if (!r) continue
                            const to = cells.find((c) => c.id === r.toCellId) as any
                            if (!to?.centroid) continue
                            const dx = to.centroid[0] - sx
                            const dy = to.centroid[1] - sy
                            // Screen Y grows down; convert to math angle with 0°=East
                            const deg = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360
                            const raw = Math.abs(deg - arrowDeg)
                            const diff = Math.min(raw, 360 - raw)
                            if (diff < bestDiff) { bestDiff = diff; bestDir = d; bestResolved = r }
                          }

                          const selectedDir = (bestDir ?? 'N') as Direction
                          setSelectedDirection(selectedDir)

                          const resolved = (useGameStore.getState() as { resolveTargetByAngle?: (a:number,b:number)=>{fromCellId:number;toCellId:number}|null }).resolveTargetByAngle?.(attacker.id, arrowDeg) || bestResolved
                          if (resolved) {
                            // Önce önizlemeyi sabitle (ışın + sınır animasyonu gözüksün)
                            setPreviewTarget(resolved.fromCellId, resolved.toCellId)
                            // Yol gösterici ışını kapat
                            try { setBeam(false, undefined) } catch {}
                            setUiStep("attacking")
                            setShowAttackerInfo(false)

                            // Banner’ı ve attackedTeam bilgisini kısa bir gecikmeden sonra, 
                            // doğrudan previewTo üzerinden hesapla (yanlış eşleşmeyi engeller)
                            setTimeout(() => {
                              const { previewToCellId } = useGameStore.getState() as { previewToCellId?: number }
                              if (previewToCellId == null) return
                              const defId = cells.find(c => c.id === previewToCellId)?.ownerTeamId
                              const defTeam = teams.find(t => t.id === defId)
                              if (defTeam) {
                                setAttackedTeam(defTeam.name)
                                setAttackedTeamId(defTeam.id)
                                setAnnouncement(`🎯 ${t('defendingTeam')}: ${defTeam.name}`)
                              }
                            }, (config.animationSpeed === 'none' || config.directionMode === 'instant') ? 0 : (config.animationSpeed === 'fast' || config.directionMode === 'fast' ? 400 : 800))
                          } else {
                              setAnnouncement('⚠️ Bu yönde takım bulunamadı!')
                              setRotatingArrow(undefined, undefined)
                              setUiStep("direction-ready")
                              // Auto-hide after 2 seconds
                              setTimeout(() => setAnnouncement(null), 2000)
                          }
                        }, spinDelay)
                      }}
                      className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20 w-full"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span className="text-xl">🧭</span>
                        <span className="text-base">{t('direction')}</span>
                        <span className="text-xl">🎯</span>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                      <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  </div>
                )}
                
                {uiStep === "direction-spinning" && (
                  <div className="w-full text-center py-4 px-6 bg-blue-900/20 rounded-xl border border-blue-500/30">
                    <div className="text-blue-300 animate-pulse text-lg font-medium">
                      🧭 {t('directionSelecting')}
                    </div>
                    <div className="text-blue-400 text-sm mt-1">
                      {t('watchArrow')}
                    </div>
                  </div>
                )}

                {uiStep === "attacking" && config.resultMode !== 'manual' && (
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={() => {
                        const attacker = liveTeams.find(t => t.id === teamWinner)
                        const storeState = useGameStore.getState() as { previewToCellId?: number, previewFromCellId?: number }
                        const previewToId = storeState.previewToCellId
                        const previewFromId = storeState.previewFromCellId
                        if (!attacker || previewToId == null || previewFromId == null) return
                        // Hide stale banner and ensure no beam during battle
                        setAnnouncement(null)
                        setUiStep("direction-spinning")
                        try { setBeam(false, undefined) } catch {}
                        // Apply battle after a short animation
                        const resultDelay = (config.resultMode === 'instant' || config.animationSpeed === 'none') ? 0 : ((config.resultMode === 'fast' || config.animationSpeed === 'fast') ? 600 : 1400)
                        setTimeout(() => {
                          if (config.resultMode === 'random') {
                            const localRng = createRng(`${seed}:result:${turn}:${previewFromId}:${previewToId}:${Date.now()}`)
                            const attackerWon = localRng() < 0.5
                            ;(useGameStore.getState() as { applyAttackWithOutcome: (a:number,f:number,t:number,w:boolean)=>{success:boolean} }).applyAttackWithOutcome(attacker.id, previewFromId, previewToId, attackerWon)
                          } else {
                            ;(useGameStore.getState() as { applyAttackToCell: (a:number,f:number,t:number)=>{success:boolean} }).applyAttackToCell(attacker.id, previewFromId, previewToId)
                          }
                          // Cleanup and prepare next turn
                          try {
                            setBeam(false, undefined)
                            setRotatingArrow(undefined, undefined)
                            setPreviewTarget(undefined, undefined)
                          } catch (e) {
                            console.warn(e)
                          }
                          setAttackedTeam(null)
                          setAttackedTeamId(null)
                          setAnnouncement(null)
                          setSelectedDirection(null)
                          setTeamWinner(null)
                          setUiStep(null)
                        }, resultDelay)
                      }}
                      className="group relative overflow-hidden bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20 w-full"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span className="text-xl">⚔️</span>
                        <span className="text-base">{t('battleStart')}</span>
                        <span className="text-xl">🔥</span>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                      <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  </div>
                )}
                {uiStep === "attacking" && config.resultMode === 'manual' && (
                  <div className="flex justify-center gap-2 mb-4">
                    <button
                      onClick={() => {
                        const attacker = liveTeams.find(t => t.id === teamWinner)
                        const storeState = useGameStore.getState() as { previewToCellId?: number, previewFromCellId?: number }
                        const previewToId = storeState.previewToCellId
                        const previewFromId = storeState.previewFromCellId
                        if (!attacker || previewToId == null || previewFromId == null) return
                        ;(useGameStore.getState() as any).applyAttackWithOutcome(attacker.id, previewFromId, previewToId, true)
                        setAttackedTeam(null); setAttackedTeamId(null); setAnnouncement(null); setSelectedDirection(null); setTeamWinner(null); setUiStep(null)
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold border border-white/10">
                      {t('attackerWins')}
                    </button>
                    <button
                      onClick={() => {
                        const attacker = liveTeams.find(t => t.id === teamWinner)
                        const storeState = useGameStore.getState() as { previewToCellId?: number, previewFromCellId?: number }
                        const previewToId = storeState.previewToCellId
                        const previewFromId = storeState.previewFromCellId
                        if (!attacker || previewToId == null || previewFromId == null) return
                        ;(useGameStore.getState() as any).applyAttackWithOutcome(attacker.id, previewFromId, previewToId, false)
                        setAttackedTeam(null); setAttackedTeamId(null); setAnnouncement(null); setSelectedDirection(null); setTeamWinner(null); setUiStep(null)
                      }}
                      className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold border border-white/10">
                      {t('defenderWins')}
                    </button>
                  </div>
                )}

                {false && (
                  <div className="w-full text-center py-4 px-6 bg-blue-900/20 rounded-xl border border-blue-500/30">
                    <div className="text-blue-300 animate-pulse text-lg font-medium">
                      🧭 Yön seçiliyor...
                          </div>
                    <div className="text-blue-400 text-sm mt-1">
                      Harita altındaki butonları kullanın
                    </div>
                        </div>
                      )}

                {false && (
                  <div className="w-full text-center py-4 px-6 bg-red-900/20 rounded-xl border border-red-500/30">
                    <div className="text-red-300 animate-pulse text-lg font-medium">
                      ⚔️ Saldırıya hazır
                            </div>
                    <div className="text-red-400 text-sm mt-1">
                      Harita altındaki butonu kullanın
                            </div>
                    </div>
                  )}



                {/* History & Stats Section */}
                <div className="mt-4 border-t border-white/20 pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-white/90 uppercase tracking-wide">
                    📊 {t('historyStats')}
                  </h3>
                  
                  {/* Team Stats */}
                  <div className="mb-3 space-y-2">
                    {teams.map((t) => {
                      const teamCells = cells.filter((c) => c.ownerTeamId === t.id)
                      const teamHistory = history.filter((h) => h.attackerTeamId === t.id)
                      const wins = teamHistory.filter((h) => h.attackerWon).length
                      const losses = teamHistory.length - wins
                      const clubInfo = (COUNTRY_CLUBS[selectedCountry] || []).find((c:any)=> c.name === t.name)
                      const primary = clubInfo?.colors?.[0] || t.color
                      const strength = t.overall || 75
                      
                      return (
                        <div key={t.id} className="flex items-center justify-between rounded-lg p-2 backdrop-blur-sm border"
                             style={{
                               background: `linear-gradient(135deg, ${primary}20, rgba(255,255,255,0.03))`,
                               borderColor: `${primary}55`
                             }}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primary }}></div>
                            <span className="text-xs font-medium text-white">{t.name}</span>
                </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-emerald-400">🏆 {teamCells.length}</span>
                            <span className="text-blue-400">⚔️ {wins}</span>
                            <span className="text-red-400">💥 {losses}</span>
                            <span className="text-yellow-400">💪 {strength}</span>
              </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Recent History */}
                  <div className="max-h-32 overflow-auto">
                    <h4 className="mb-2 text-xs font-medium text-white/70">{t('lastMoves')}</h4>
                  {history.length === 0 ? (
                      <div className="text-xs text-slate-400">{t('noMovesYet')}</div>
                  ) : (
                      <div className="space-y-1">
                      {history
                        .slice()
                        .reverse()
                          .slice(0, 5)
                        .map((h, idx) => {
                          const attackerName = teams.find((t) => t.id === h.attackerTeamId)?.name ?? '—'
                          const defenderName = h.defenderTeamId === -1 ? 'Neutral' : (teams.find((t) => t.id === (h.defenderTeamId ?? -99))?.name ?? '—')
                          const winnerName = h.attackerWon ? attackerName : defenderName
                          return (
                            <div key={idx} className="flex items-center justify-between rounded-md p-1.5 text-xs backdrop-blur-sm border border-white/5"
                              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }}>
                              <span className="text-white/85">
                                #{h.turn} {attackerName} vs {defenderName}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${h.attackerWon ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                {winnerName}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Restart button (desktop) */}
      <div className="hidden md:flex fixed bottom-4 right-4 z-40">
        <button
          className="rounded-xl px-4 py-2 font-semibold text-white bg-gradient-to-r from-slate-600 to-slate-800 border border-white/20 shadow-lg hover:from-slate-500 hover:to-slate-700"
          onClick={() => window.location.reload()}
        >
          {t('restart')}
        </button>
      </div>
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/80 to-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 p-6 backdrop-blur-xl"
               style={{background:'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))'}}>
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-3xl font-extrabold text-white mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {t('gameOver')}
              </h3>
              <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-400/30 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-lg font-semibold text-emerald-300">
                  {t('winner')}: <span className="text-yellow-300 font-bold">{liveTeams[0]?.name}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-xl px-4 py-2 font-semibold text-white bg-gradient-to-r from-slate-600 to-slate-800 border border-white/20 shadow-lg hover:from-slate-500 hover:to-slate-700"
                onClick={() => window.location.reload()}
              >
                {t('restart')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
