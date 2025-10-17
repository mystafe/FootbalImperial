import "./App.css"
import { useEffect, useMemo, useRef, useState } from "react"
import MapView from "./components/Map"
import { useGameStore, DIRECTIONS, COUNTRIES, type Direction } from "./store/game"
import { createRng, weightedChoice } from "./lib/random"
import { playCapture, playClick } from "./lib/sound"
import { AnimatePresence, motion } from "framer-motion"
import { loadConfig, saveConfig, type GameConfig } from "./config/game"

function App() {
  const seed = useGameStore((s) => s.seed)
  const teams = useGameStore((s) => s.teams)
  const cells = useGameStore((s) => s.cells)
  const history = useGameStore((s) => s.history)
  const turn = useGameStore((s) => s.turn)
  const applyAttack = useGameStore((s) => s.applyAttack)
  const playAutoTurn = useGameStore((s) => s.playAutoTurn)
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
    "team" | "dir" | "attacking" | null
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

  const liveTeams = useMemo(() => teams.filter((t) => t.alive), [teams])
  
  // Memoize spinner items to prevent unnecessary re-renders
  const spinnerItems = useMemo(() => {
    const items = liveTeams.length ? liveTeams.map((t) => t.abbreviation || t.name.slice(0, 3)) : ["-"]
    // console.log('🎯 spinnerItems created:', items, 'liveTeams count:', liveTeams.length)
    return items
  }, [liveTeams])
  
  const spinnerColors = useMemo(() => 
    liveTeams.map((t) => t.color),
    [liveTeams]
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
    const msg = `${aName} (${aOvr}) → ${dName} (${dOvr}) — ${winnerName} kazandı!`
    setToast(msg)
    const t = setTimeout(() => setToast(null), 6500)
    return () => clearTimeout(t)
  }, [history, teams])

  // Find potential defender when direction is chosen
  const teamAndCellIds = JSON.stringify({
    t: teams.map((t) => t.id),
    c: cells.map((c) => c.id)
  })
  useEffect(() => {
    if (
      teamWinner !== null &&
      uiStep === "attacking"
    ) {
      const attackerTeam = liveTeams.find(t => t.id === teamWinner)
      if (!attackerTeam) return

      // Use a random direction for now
      const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)] as Direction
      const t = resolveTarget(attackerTeam.id, direction)
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
    resolveTarget
  ])

  const DIR_TR: Record<string, string> = {
    N: "Kuzey",
    NE: "Kuzey Doğu",
    E: "Doğu",
    SE: "Güney Doğu",
    S: "Güney",
    SW: "Güney Batı",
    W: "Batı",
    NW: "Kuzey Batı"
  }

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
                  🏆 Stratejik Futbol Savaşları
                </span>
              </div>
              <div className="relative inline-block group">
                <h1 className="text-6xl md:text-7xl font-black tracking-tight animate-fade-in-up mb-4">
                  <span className="text-white">Futbol</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400">
                    Emperyalizmi
                  </span>
          </h1>
                {/* Version Tooltip */}
                <div className="absolute -top-8 -right-12 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-1 z-50">
                  <div className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold rounded-lg px-4 py-2 text-base shadow-2xl border-2 border-white/20 whitespace-nowrap">
                    v0.8.0
                  </div>
                </div>
              </div>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-up">
                Takımlarınızla dünyayı fethedin. Strateji, şans ve futbol tutkunuzla imparatorluğunuzu kurun.
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
                <span className="text-emerald-300 font-medium text-sm">Oyun Hazır</span>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                İmparatorluğunuzu Kurun
              </h2>
              <p className="text-slate-400 text-base">
                Ayarları yapılandırın ve futbol dünyasında hüküm sürmeye başlayın
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
                        🌍 Ülke Seçimi
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
                        ⚽ Takım Sayısı
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={25}
                    value={numTeams}
                    onChange={(e) =>
                      setNumTeams(parseInt(e.target.value || "0", 10))
                    }
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm hover:bg-slate-700/70"
                  />
                      <p className="mt-2 text-xs text-slate-400">2-25 arası takım seçebilirsiniz</p>
                </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    <div className="group">
                      <label className="mb-2 block text-sm font-semibold text-purple-300 uppercase tracking-wide">
                        🎨 Harita Görünümü
                  </label>
                  <select
                    value={mapColoring}
                    onChange={(e) =>
                      setMapColoring(e.target.value as "solid" | "striped")
                    }
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm hover:bg-slate-700/70"
                  >
                    <option value="striped">Şeritli Desenler</option>
                    <option value="solid">Düz Renkler</option>
                  </select>
                </div>

                    <div className="group">
                      <label className="mb-2 block text-sm font-semibold text-amber-300 uppercase tracking-wide">
                        ⚙️ Oyun Modu
                  </label>
                  <select
                    value={
                      config.fastMode
                        ? "fast"
                        : config.manualMode
                        ? "manual"
                        : "normal"
                    }
                    onChange={(e) => {
                      const newConfig = {
                        ...config,
                        fastMode: e.target.value === "fast",
                        manualMode: e.target.value === "manual"
                      }
                      setConfig(newConfig)
                      saveConfig(newConfig)
                    }}
                        className="w-full rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-3 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200 backdrop-blur-sm hover:bg-slate-700/70"
                      >
                        <option value="normal">🎯 Normal (Spinner ile)</option>
                        <option value="fast">🚀 Hızlı (Otomatik)</option>
                        <option value="manual">🎮 Manuel (Elle Seçim)</option>
                  </select>
                      <p className="mt-2 text-xs text-slate-400">
                        {config.fastMode ? "Hızlı otomatik oyun" : 
                         config.manualMode ? "Manuel kontrol" : 
                         "Spinner ile rastgele seçim"}
                      </p>
                </div>
              </div>
                </div>

                {/* Start Button */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                <button
                    className="group relative w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white font-bold py-2.5 px-5 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
                  onClick={() => setGameStarted(true)}
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-base">🏆</span>
                      <span className="text-base">Oyunu Başlat</span>
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
                <h3 className="text-base font-semibold text-white mb-1">Stratejik Savaşlar</h3>
                <p className="text-slate-400 text-xs">Takımlarınızla dünyayı fethedin ve stratejik hamlelerle rakiplerinizi alt edin.</p>
              </div>
              <div className="group p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:bg-slate-700/40 transition-all duration-300 animate-fade-in-up hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10" style={{animationDelay: '0.2s'}}>
                <div className="text-2xl mb-2 animate-float" style={{animationDelay: '0.5s'}}>🎲</div>
                <h3 className="text-base font-semibold text-white mb-1">Şans ve Beceri</h3>
                <p className="text-slate-400 text-xs">Hem şans hem de futbol bilginizle kazanın. Her hamle yeni bir macera.</p>
              </div>
              <div className="group p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:bg-slate-700/40 transition-all duration-300 animate-fade-in-right hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10" style={{animationDelay: '0.4s'}}>
                <div className="text-2xl mb-2 animate-float" style={{animationDelay: '1s'}}>🏆</div>
                <h3 className="text-base font-semibold text-white mb-1">İmparatorluk Kurun</h3>
                <p className="text-slate-400 text-xs">En büyük futbol imparatorluğunu kurun ve dünyayı tek çatı altında toplayın.</p>
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
                        setAnnouncement(`⚔️ Saldıran Takım: ${attacker.name}`)
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
                  Tur {turn + 1}
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
                {/* Team Selection Button */}
                {uiStep !== "team" && teamWinner === null && (
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
                          // Clear previous turn's winner
                          setTeamWinner(null)
                        } catch (e) {
                          console.warn(e)
                        }
                        
                        // SONRA spinner başlat
                        setUiStep("team")
                        const targetIndex = pickWeightedTeamIndex()
                        setTeamSpinTarget(targetIndex)
                      }}
                      className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20"
                      disabled={disabledTeamBtn}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span className="text-xl">⚔️</span>
                        <span className="text-base">Atak Yapan Takımı Seç</span>
                        <span className="text-xl">🎯</span>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                      <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    </div>
                  )}
                {uiStep === "team" && teamSpinTarget !== undefined && (
                  <div className="w-full text-center py-4 px-6 bg-amber-900/20 rounded-xl border border-amber-500/30">
                    <div className="text-amber-300 animate-pulse text-lg font-medium">
                      ⚔️ Takım seçiliyor...
                      </div>
                    <div className="text-amber-400 text-sm mt-1">
                      Haritada dönen çarkı izleyin
                      </div>
                        </div>
                      )}
                
                {uiStep === "direction-ready" && teamWinner != null && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        console.log('🎯 Direction button clicked:', { teamWinner, liveTeams: liveTeams.map(t => ({ id: t.id, name: t.name })) })
                        const attacker = liveTeams.find(t => t.id === teamWinner)
                        if (!attacker) {
                          console.error('❌ Attacker not found!')
                          return
                        }
                        console.log('🎯 Attacker found:', { id: attacker.id, name: attacker.name })
                        
                        // Start rotating arrow animation (5 seconds)
                        const randomAngle = Math.random() * 360
                        setRotatingArrow(attacker.id, randomAngle)
                        setUiStep("direction-spinning")
                        
                        // After 5 seconds, arrow stops and beam starts
                        setTimeout(() => {
                          // Beam direction based on arrow angle - SVG uses 0°=North, Math uses 0°=East
                          // Convert SVG angle to Math angle: SVG 0°=North, Math 0°=East, so subtract 90°
                          const angleRad = (randomAngle - 90) * Math.PI / 180
                          
                          // Debug: Log the beam direction
                          console.log('🎯 Beam direction angleRad:', angleRad, 'Math.cos:', Math.cos(angleRad), 'Math.sin:', Math.sin(angleRad))
                          const beamLength = 500
                          
                          // Find target in beam direction
                          const attackerCells = cells.filter(c => c.ownerTeamId === attacker.id)
                          if (attackerCells.length === 0) {
                            console.error('❌ Attacker has no cells!')
                            setAnnouncement('❌ Hata: Saldıran takımın toprağı yok!')
                            setRotatingArrow(undefined, undefined)
                            setUiStep("direction-ready")
                            // Auto-hide after 2 seconds
                            setTimeout(() => setAnnouncement(null), 2000)
                            return
                          }
                          
                          // Calculate attacker's center using centroid
                          let totalX = 0, totalY = 0, validCount = 0
                          for (const cell of attackerCells) {
                            const centroid = (cell as any).centroid
                            if (centroid && Array.isArray(centroid) && centroid.length === 2) {
                              totalX += centroid[0]
                              totalY += centroid[1]
                              validCount++
                            }
                          }
                          
                          if (validCount === 0) {
                            console.error('❌ No valid centroids found!')
                            setAnnouncement('❌ Hata: Takım merkezi bulunamadı!')
                            setRotatingArrow(undefined, undefined)
                            setUiStep("direction-ready")
                            // Auto-hide after 2 seconds
                            setTimeout(() => setAnnouncement(null), 2000)
                            return
                          }
                          
                          const startX = totalX / validCount
                          const startY = totalY / validCount
                          
                          console.log('🎯 Arrow stopped at angle:', randomAngle, 'degrees')
                          console.log('📍 Attacker center:', { startX, startY })
                          
                          // Find first team hit by beam
                          const beamDir = [Math.cos(angleRad), Math.sin(angleRad)]
                          let closestHit: any = null
                          let closestDistance = Infinity
                          
                          for (const cell of cells) {
                            if (cell.ownerTeamId === attacker.id) continue
                            if (cell.ownerTeamId === -1 || cell.ownerTeamId == null) continue
                            
                            const cellCentroid = (cell as any).centroid
                            if (!cellCentroid || !Array.isArray(cellCentroid) || cellCentroid.length !== 2) continue
                            
                            const dx = cellCentroid[0] - startX
                            const dy = cellCentroid[1] - startY
                            
                            // Check if cell is in beam direction
                            const dotProduct = dx * beamDir[0] + dy * beamDir[1]
                            if (dotProduct <= 0) continue // Behind beam
                            
                            // Calculate perpendicular distance
                            const distance = Math.sqrt(dx * dx + dy * dy)
                            const perpDistance = Math.abs(dx * beamDir[1] - dy * beamDir[0])
                            
                            // Wider beam tolerance for better hit detection
                            if (perpDistance < 200 && distance < closestDistance) {
                              closestDistance = distance
                              closestHit = cell
                            }
                          }
                          
                          if (closestHit) {
                            const defender = teams.find(t => t.id === closestHit.ownerTeamId)
                            if (defender) {
                              console.log('✅ Hedef bulundu:', defender.name, 'at distance:', closestDistance)
                              setUiStep("attacking")
                              setShowAttackerInfo(false)
                              setPreviewTarget(attacker.capitalCellId, closestHit.id)
                              setBeam(true, closestHit.ownerTeamId)
                            } else {
                              console.warn('⚠️ Defender team not found')
                              setAnnouncement('⚠️ Bu yönde takım bulunamadı!')
                              setRotatingArrow(undefined, undefined)
                              setUiStep("direction-ready")
                              // Auto-hide after 2 seconds
                              setTimeout(() => setAnnouncement(null), 2000)
                            }
                          } else {
                            console.warn('⚠️ No target found in beam direction')
                            setAnnouncement('⚠️ Bu yönde takım bulunamadı!')
                            setRotatingArrow(undefined, undefined)
                            setUiStep("direction-ready")
                            // Auto-hide after 2 seconds
                            setTimeout(() => setAnnouncement(null), 2000)
                          }
                        }, 2000) // Wait for arrow rotation (2 seconds now)
                      }}
                      className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20 w-full"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span className="text-xl">🧭</span>
                        <span className="text-base">Yön Seç</span>
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
                      🧭 Yön belirleniyor...
                    </div>
                    <div className="text-blue-400 text-sm mt-1">
                      Haritada dönen oku izleyin
                    </div>
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
                    📊 Geçmiş & İstatistikler
                  </h3>
                  
                  {/* Team Stats */}
                  <div className="mb-3 space-y-2">
                    {teams.map((t) => {
                      const teamCells = cells.filter((c) => c.ownerTeamId === t.id)
                      const teamHistory = history.filter((h) => h.attackerTeamId === t.id)
                      const wins = teamHistory.filter((h) => h.attackerWon).length
                      const losses = teamHistory.length - wins
                      
                      return (
                        <div key={t.id} className="flex items-center justify-between rounded-lg p-2 backdrop-blur-sm border border-white/10"
                             style={{
                               background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'
                             }}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></div>
                            <span className="text-xs font-medium text-white">{t.name}</span>
                </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-emerald-400">🏆 {teamCells.length}</span>
                            <span className="text-blue-400">⚔️ {wins}</span>
                            <span className="text-red-400">💥 {losses}</span>
              </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Recent History */}
                  <div className="max-h-32 overflow-auto">
                    <h4 className="mb-2 text-xs font-medium text-white/70">Son Hamleler</h4>
                  {history.length === 0 ? (
                      <div className="text-xs text-slate-400">Henüz hamle yok.</div>
                  ) : (
                      <div className="space-y-1">
                      {history
                        .slice()
                        .reverse()
                          .slice(0, 5)
                        .map((h, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-md p-1.5 text-xs backdrop-blur-sm border border-white/5"
                                 style={{
                                   background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
                                 }}>
                              <span className="font-mono text-white/80">
                                #{h.turn} {teams.find((t) => t.id === h.attackerTeamId)?.name} → {h.direction}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                h.attackerWon ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                              }`}>
                              {h.attackerWon ? "✅" : "❌"}
                            </span>
                            </div>
                        ))}
                      </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Mobile bar with glassmorphism */}
      <div className="fixed inset-x-0 bottom-0 z-40 block border-t border-white/20 p-3 backdrop-blur-xl md:hidden"
           style={{
             background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
             boxShadow: '0 -8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
           }}>
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
          <button
            aria-label="Spin Team"
            className="rounded bg-indigo-600 px-3 py-2 text-white shadow transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => {
              const idx = pickWeightedTeamIndex()
              setTeamWinner(idx)
            }}
          >
            Team
          </button>
          <button
            aria-label="Spin Direction"
            className="rounded bg-indigo-600 px-3 py-2 text-white shadow transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => {
              const idx = Math.max(
                0,
                Math.min(
                  DIRECTIONS.length - 1,
                  Math.floor(rngRef.current() * DIRECTIONS.length)
                )
              )
            }}
          >
            Dir
          </button>
          <button
            aria-label="Apply Attack"
            className="rounded bg-emerald-600 px-3 py-2 text-white shadow transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={() => {
              if (teamWinner == null) return
              const attackerTeam = liveTeams[teamWinner]
              const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
              if (!attackerTeam) return
              playClick()
              applyAttack(attackerTeam.id, dir)
              setTimeout(() => playCapture(), 120)
            }}
          >
            Go
          </button>
          <button
            aria-label="Fast Auto Turn"
            className="rounded bg-rose-600 px-3 py-2 text-white shadow transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-500"
            onClick={() => {
              const r = playAutoTurn()
              if (r.success) {
                playClick()
                setTimeout(() => playCapture(), 120)
              }
            }}
          >
            Auto
          </button>
        </div>
      </div>
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold">Game Over</h3>
            <p className="mt-2 text-gray-700">Winner: {liveTeams[0]?.name}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
                onClick={() => window.location.reload()}
              >
                New Game
              </button>
              <button
                className="rounded bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
                onClick={() => {
                  const r = playAutoTurn()
                  if (r.success) {
                    playClick()
                    setTimeout(() => playCapture(), 120)
                  }
                }}
              >
                Fast Auto Turn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
