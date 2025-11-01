// Sound effects for the game
// These are placeholder functions - you can implement actual sound playing here

export const playCapture = () => {
  // Intentionally no-op (avoid noisy logs in production)
}

export const playClick = () => {
  // Intentionally no-op (avoid noisy logs in production)
}

export const playVictory = () => {
  // Intentionally no-op (avoid noisy logs in production)
}

export const playDefeat = () => {
  // Intentionally no-op (avoid noisy logs in production)
}

export const playChampionsMelody = () => {
  try {
    // Try to play an audio file placed in public/assets/champions.mp3
    const audio = new Audio('/assets/champions.mp3')
    audio.volume = 0.6
    // Best-effort play; browsers may block autoplay without user gesture
    audio.play().catch(() => {
      // ignore play errors (autoplay restrictions)
    })
  } catch (e) {
    // ignore
  }
}
