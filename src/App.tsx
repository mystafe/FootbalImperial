import "./App.css"
import { useEffect, useRef, useState } from "react"
import { Spinner } from "./components/Spinner"
import MapView from "./components/Map"
import { useGameStore, DIRECTIONS, COUNTRIES, type Direction } from "./store/game"
import { createRng, weightedChoice } from "./lib/random"
import { playCapture, playClick, playVictory, playDefeat } from "./lib/sound"
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
  const setFrozenSnapshotIndex = useGameStore(
    (s) =>
      (s as unknown as { setFrozenSnapshotIndex: (idx?: number) => void })
        .setFrozenSnapshotIndex
  )
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
  const [dirWinner, setDirWinner] = useState<number | null>(null)
  const [actualDirection, setActualDirection] = useState<string | null>(null)
  const [uiStep, setUiStep] = useState<
    "team" | "dir" | "dir-select" | "attack-confirm" | "attacking" | null
  >(null)
  const [teamSpinTarget, setTeamSpinTarget] = useState<number | undefined>(
    undefined
  )
  const [spinnerSize, setSpinnerSize] = useState<number>(280)
  const [toast, setToast] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [showAttackerInfo, setShowAttackerInfo] = useState<boolean>(false)
  const [showDefenderInfo, setShowDefenderInfo] = useState<boolean>(false)
  const isSpinning = uiStep === "team" || uiStep === "dir"
  const disabledTeamBtn = isSpinning
  const disabledApplyBtn = isSpinning || uiStep !== "attack-confirm"
  const rngRef = useRef<() => number>(() => Math.random())
  const [defenderInfo, setDefenderInfo] = useState<{
    name: string
    ovr: number
  } | null>(null)

  const liveTeams = teams.filter((t) => t.alive)

  useEffect(() => {
    rngRef.current = createRng(`${seed}:spins:${teams.length}:${cells.length}`)
  }, [seed, teams.length, cells.length])

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      setSpinnerSize(w >= 1536 ? 320 : w >= 1280 ? 300 : w >= 1024 ? 280 : 240)
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

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
      dirWinner !== null &&
      uiStep === "attack-confirm"
    ) {
      const attackerTeam = teams.find(t => t.id === teamWinner)
      const direction = DIRECTIONS[dirWinner]
      if (!attackerTeam) return

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
    dirWinner,
    teamAndCellIds,
    teams,
    cells,
    setPreviewTarget,
    resolveTarget
  ])

  const teamItems = liveTeams.map((t) => t.name)
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
    return weightedChoice(weights, rng)
  }

  const pickWeightedDirectionIndex = (attackerTeamId: number) => {
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
    const attackerCells = cells.filter((c) => c.ownerTeamId === attackerTeamId)
    const weights = DIRECTIONS.map((d) => {
      let score = 0
      for (const c of attackerCells) {
        const [ax, ay] = c.centroid
        for (const nIdx of c.neighbors || []) {
          const nb = cells[nIdx]
          if (!nb || nb.ownerTeamId === attackerTeamId) continue
          const [bx, by] = nb.centroid
          const dy = -(by - ay)
          const dx = bx - ax
        const aDeg = (Math.atan2(dy, dx) * 180) / Math.PI
        const diff = Math.abs(((aDeg - dirAngle[d] + 180) % 360) - 180)
        const w = Math.max(0, 1.0 - diff / 180)
        score += 0.5 + 1.5 * w
        }
      }
      return score
    })
    const rng = createRng(
      `${seed}:wdir:${turn}:${attackerTeamId}:${Date.now()}`
    )
    return weightedChoice(weights, rng)
  }

  const isGameOver = liveTeams.length <= 1 && liveTeams.length > 0
  const attackerTeam = teamWinner != null ? teams.find(t => t.id === teamWinner) : undefined


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
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
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
      
      <div className="w-full p-0">
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
                    v0.2.3
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
                <div className="mt-6 pt-5 border-t border-slate-700/50">
                <button
                    className="group relative w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
                  onClick={() => setGameStarted(true)}
                >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <span className="text-lg">🏆</span>
                      <span className="text-lg">Oyunu Başlat</span>
                      <span className="text-lg">⚽</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="group p-5 bg-slate-800/40 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:bg-slate-700/40 transition-all duration-300 animate-fade-in-left hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="text-3xl mb-3 animate-float">🎯</div>
                <h3 className="text-lg font-semibold text-white mb-2">Stratejik Savaşlar</h3>
                <p className="text-slate-400 text-sm">Takımlarınızla dünyayı fethedin ve stratejik hamlelerle rakiplerinizi alt edin.</p>
              </div>
              <div className="group p-5 bg-slate-800/40 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:bg-slate-700/40 transition-all duration-300 animate-fade-in-up hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10" style={{animationDelay: '0.2s'}}>
                <div className="text-3xl mb-3 animate-float" style={{animationDelay: '0.5s'}}>🎲</div>
                <h3 className="text-lg font-semibold text-white mb-2">Şans ve Beceri</h3>
                <p className="text-slate-400 text-sm">Hem şans hem de futbol bilginizle kazanın. Her hamle yeni bir macera.</p>
              </div>
              <div className="group p-5 bg-slate-800/40 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:bg-slate-700/40 transition-all duration-300 animate-fade-in-right hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10" style={{animationDelay: '0.4s'}}>
                <div className="text-3xl mb-3 animate-float" style={{animationDelay: '1s'}}>🏆</div>
                <h3 className="text-lg font-semibold text-white mb-2">İmparatorluk Kurun</h3>
                <p className="text-slate-400 text-sm">En büyük futbol imparatorluğunu kurun ve dünyayı tek çatı altında toplayın.</p>
              </div>
            </div>
          </div>
        )}

        {gameStarted && (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
                <MapView />
              <div className="border-t border-slate-700 p-0 flex items-center justify-between">
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-1 rounded-lg bg-slate-800/80 p-1"
                    >
                      <span className="text-sm font-semibold tracking-wide text-white">
                        {t.name}
                      </span>
                      <span className="ml-auto text-xs font-mono text-emerald-400">
                        {cells.filter((c) => c.ownerTeamId === t.id).length}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="rounded bg-rose-600 px-3 py-2 text-white hover:bg-rose-700"
                  onClick={() => {
                    window.location.href = "/"
                  }}
                >
                  Yeniden Başlat
                </button>
              </div>
              <div className="border-t border-slate-700 p-4">
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-1 rounded-lg bg-slate-800/80 p-1"
                    >
                      <span className="text-sm font-semibold tracking-wide text-white">
                        {t.name}
                      </span>
                      <span className="ml-auto text-xs font-mono text-emerald-400">
                        {cells.filter((c) => c.ownerTeamId === t.id).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:col-span-4">
              <div className="card p-4 flex-1 flex flex-col">
                <h2 className="mb-3 text-lg font-semibold text-white">
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
                    {dirWinner !== null && (
                      <div className="inline-flex items-center gap-2 rounded-lg bg-slate-700/60 px-3 py-1 text-sm">
                        <span className="font-semibold">Yön:</span>
                        <span>{actualDirection ? DIR_TR[actualDirection] : DIR_TR[DIRECTIONS[dirWinner]]}</span>
                      </div>
                    )}
                  </motion.div>
                )}
                <div className="flex flex-col items-center justify-center flex-1">
                  {/* Team Spinner */}
                  {uiStep !== "team" && teamWinner === null && (
                      <button
                        onClick={() => {
                          setUiStep("team")
                          setTeamSpinTarget(pickWeightedTeamIndex())
                          // Immediately suppress old overlays and clear any preview
                          try {
                            setSuppressLastOverlay(true)
                            setPreviewTarget(undefined, undefined)
                            setPreviewFromTeamId(undefined)
                          } catch (e) {
                            console.warn(e)
                          }
                        }}
                        className="btn-secondary w-full"
                        disabled={disabledTeamBtn}
                      >
                        Saldıran Takımı Seç
                      </button>
                    )}
                  {(uiStep === "team" || uiStep === "dir-select") &&
                    teamSpinTarget !== undefined && (
                      <Spinner
                        key={`team-${teamSpinTarget}-${turn}`}
                        items={
                          teamItems.length
                            ? teamItems.map((t) => t.slice(0, 3))
                            : ["-"]
                        }
                        colors={liveTeams.map((t) => t.color)}
                        winnerIndex={teamSpinTarget}
                        fullNames={teamItems.length ? teamItems : undefined}
                        onDone={(i) => {
                          const attacker = liveTeams[i]
                          setTeamWinner(attacker.id) // Use team ID instead of array index
                          
                          // Play selection sound
                          playClick()
                          
                          // Show announcement
                          setAnnouncement(`⚔️ Saldıran: ${attacker.name}`)
                          setTimeout(() => setAnnouncement(null), 2000)
                          
                          setTimeout(() => {
                          setUiStep("dir-select")
                          setShowAttackerInfo(false)
                          try {
                            if (attacker) {
                              setSuppressLastOverlay(true)
                              setPreviewTarget(
                                attacker.capitalCellId,
                                undefined
                              )
                              setPreviewFromTeamId(attacker.id)
                            }
                          } catch (e) {
                            console.warn(e)
                          }
                            setTimeout(() => setShowAttackerInfo(true), 500)
                          }, 1500)
                        }}
                        sizePx={spinnerSize}
                      />
                    )}
                  {/* Direction Selection with Rotating Arrow */}
                  {teamWinner !== null && (uiStep === "dir-select" || uiStep === "dir") && (
                    <div className="w-full text-center">
                      <button
                        onClick={() => {
                          setUiStep("dir")
                          const attacker = teams.find(t => t.id === teamWinner)
                          if (!attacker) return
                          
                          
                          // Find a valid target by trying directions until we find one
                          let targetDirIndex = -1
                          let targetResult = null
                          let attempts = 0
                          const maxAttempts = 10
                          
                          while (!targetResult && attempts < maxAttempts) {
                            targetDirIndex = pickWeightedDirectionIndex(attacker.id)
                            const direction = DIRECTIONS[targetDirIndex]
                            targetResult = resolveTarget(attacker.id, direction)
                            attempts++
                          }
                          
                          if (!targetResult) {
                            setToast("❌ Geçerli hedef bulunamadı!")
                                  return
                                }

                          // Calculate the actual direction from attacker to target
                          const attackerCells = cells.filter((c) => c.ownerTeamId === attacker.id)
                          if (attackerCells.length === 0) return
                          
                          // Calculate attacker center
                          const attackerCenter = attackerCells.reduce<[number, number]>(
                            (acc, c) => [acc[0] + c.centroid[0], acc[1] + c.centroid[1]],
                            [0, 0]
                          )
                          const [ax, ay] = [attackerCenter[0] / attackerCells.length, attackerCenter[1] / attackerCells.length]
                          
                          // Get target cell center
                          const targetCell = cells.find(c => c.id === targetResult.toCellId)
                          if (!targetCell) return
                          
                          const [tx, ty] = targetCell.centroid
                          
                          // Calculate actual angle from attacker to target
                          const dx = tx - ax
                          const dy = ty - ay
                          const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI
                          
                          // Find the closest direction to the actual target angle
                          const dirAngle: Record<string, number> = {
                            E: 0, NE: 45, N: 90, NW: 135, W: 180, 
                            SW: -135, S: -90, SE: -45
                          }
                          let closestDirection = "E"
                          let minDiff = Infinity
                          for (const [dir, angle] of Object.entries(dirAngle)) {
                            const diff = Math.abs(((targetAngle - angle + 180) % 360) - 180)
                            if (diff < minDiff) {
                              minDiff = diff
                              closestDirection = dir
                            }
                          }
                          setActualDirection(closestDirection)
                          
                          // Start rotation animation
                          setRotatingArrow(attacker.id, 0)
                          
                          // Rotate arrow with animation
                          const duration = 2500
                          const startTime = Date.now()
                          const spins = 3 // Number of full rotations
                          
                          const animateArrow = () => {
                            const elapsed = Date.now() - startTime
                            if (elapsed < duration) {
                              const progress = elapsed / duration
                              const eased = 1 - Math.pow(1 - progress, 3) // easeOut cubic
                              const currentAngle = (spins * 360 * eased + targetAngle * eased) % 360
                              setRotatingArrow(attacker.id, currentAngle)
                              requestAnimationFrame(animateArrow)
                            } else {
                              setRotatingArrow(attacker.id, targetAngle)
                              
                              // Use the pre-calculated target
                                  setTimeout(() => {

                                // Activate beam animation
                                setBeam(true, targetResult.toCellId)
                                  
                                  // Show defender announcement after beam
                                setTimeout(() => {
                                    const defender = teams.find((tm) => tm.id === cells.find((c: { id: number }) => c.id === targetResult.toCellId)?.ownerTeamId)
                                    if (defender) {
                                      setAnnouncement(`🛡️ Savunan: ${defender.name}`)
                                      setTimeout(() => setAnnouncement(null), 2000)
                                    }
                                    
                                    // Set states after beam
                                    setTimeout(() => {
                                      setDirWinner(targetDirIndex)
                                      setUiStep("attack-confirm")
                                      setShowDefenderInfo(true)
                              setSuppressLastOverlay(true)
                                      setPreviewTarget(targetResult.fromCellId, targetResult.toCellId)
                              setPreviewFromTeamId(attacker.id)
                                      setBeam(false, undefined)
                                    }, 1500)
                                  }, 800) // Beam duration
                              }, 300)
                            }
                          }
                          
                          animateArrow()
                        }}
                        className="btn-secondary w-full"
                        disabled={uiStep === "dir"}
                      >
                        {uiStep === "dir" ? "🎯 Ok Dönüyor..." : "🧭 Yön Seç (Ok ile)"}
                      </button>
                      {uiStep === "dir" && (
                        <p className="mt-2 text-sm text-amber-300 animate-pulse">
                          Haritada dönen oku izleyin...
                        </p>
                      )}
                    </div>
                    )}
                  {/* Attack Button */}
                  {dirWinner !== null && uiStep === "attack-confirm" && (
                      <button
                        className="btn-primary w-full"
                        disabled={disabledApplyBtn}
                        onClick={() => {
                          if (teamWinner == null || dirWinner == null) return
                          const attackerTeam = teams.find(t => t.id === teamWinner)
                          const dir = DIRECTIONS[dirWinner] as Direction
                          if (!attackerTeam) return
                          playClick()
                          setUiStep("attacking")
                          // Freeze map at current snapshot during animation & toast
                          try {
                            const idx =
                              useGameStore.getState().snapshots.length - 1
                            setFrozenSnapshotIndex(idx >= 0 ? idx : undefined)
                          } catch (e) {
                            console.warn(e)
                          }
                          setTimeout(() => {
                            const r = applyAttack(attackerTeam.id, dir)
                            if (!r.success) {
                            setToast("Uygun hedef bulunamadı. Tekrar deneyin.")
                            } else {
                              setTimeout(() => playCapture(), 160)
                              // Play victory/defeat motif after state updates propagate slightly
                              setTimeout(() => {
                                const last = useGameStore
                                  .getState()
                                  .history.slice(-1)[0]
                                if (last?.attackerWon) playVictory()
                                else playDefeat()
                              }, 260)
                            }
                            // Unfreeze after toast duration
                            setTimeout(
                              () => setFrozenSnapshotIndex(undefined),
                              1600
                            )
                            setUiStep(null)
                            setTeamWinner(null)
                            setDirWinner(null)
                            setActualDirection(null)
                            setTeamSpinTarget(undefined)
                            setShowAttackerInfo(false)
                            setShowDefenderInfo(false)
                            setSuppressLastOverlay(false)
                            setPreviewTarget(undefined, undefined)
                            setPreviewFromTeamId(undefined)
                          setRotatingArrow(undefined, undefined)
                          }, 800)
                        }}
                      >
                        Saldırıyı Başlat
                      </button>
                    )}
                </div>
              </div>
              <div className="card p-4">
                <h2 className="mb-2 text-lg font-semibold text-white">
                  Geçmiş
                </h2>
                <div className="max-h-[240px] overflow-auto rounded-lg bg-slate-900/70 p-2 text-sm">
                  {history.length === 0 ? (
                    <div className="text-slate-400">Henüz hamle yok.</div>
                  ) : (
                    <ul className="space-y-1">
                      {history
                        .slice()
                        .reverse()
                        .map((h, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between rounded-md bg-slate-800 p-2"
                          >
                            <span className="font-mono text-xs">
                              #{h.turn} •{" "}
                              {teams.find((t) => t.id === h.attackerTeamId)
                                ?.name ?? "?"}{" "}
                              → {h.direction} →{" "}
                              {h.defenderTeamId != null && h.defenderTeamId >= 0
                                ? teams.find((t) => t.id === h.defenderTeamId)
                                    ?.name ?? "?"
                                : "Neutral"}{" "}
                              {h.attackerWon ? "✅" : "❌"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(h.timestamp).toLocaleTimeString()}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Mobile bar remains */}
      <div className="fixed inset-x-0 bottom-0 z-40 block border-t bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
          <button
            aria-label="Spin Team"
            className="rounded bg-indigo-600 px-3 py-2 text-white shadow transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => {
              const idx = Math.max(
                0,
                Math.min(
                  Math.max(1, liveTeams.length) - 1,
                  Math.floor(rngRef.current() * Math.max(1, liveTeams.length))
                )
              )
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
              setDirWinner(idx)
            }}
          >
            Dir
          </button>
          <button
            aria-label="Apply Attack"
            className="rounded bg-emerald-600 px-3 py-2 text-white shadow transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={() => {
              if (teamWinner == null || dirWinner == null) return
              const attackerTeam = liveTeams[teamWinner]
              const dir = DIRECTIONS[dirWinner]
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
