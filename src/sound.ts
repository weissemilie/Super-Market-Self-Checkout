let audioContext: AudioContext | null = null
let unlocked = false

function isAudioSupported(): boolean {
  return typeof AudioContext !== 'undefined'
}

function getAudioContext(): AudioContext | null {
  if (!isAudioSupported()) {
    return null
  }
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function unlock() {
  if (unlocked) return
  unlocked = true
  const context = getAudioContext()
  if (context && context.state === 'suspended') {
    void context.resume()
  }
}

// Browseren blokerer lyd før brugeren har interageret med siden, så vi
// låser Web Audio API op ved det første tastetryk eller klik.
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', unlock, { once: true })
  window.addEventListener('click', unlock, { once: true })
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = 'sine',
  startDelayMs = 0,
  volume = 0.2,
): void {
  if (!unlocked) return

  const context = getAudioContext()
  if (!context) return

  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = type
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  gain.connect(context.destination)

  const startTime = context.currentTime + startDelayMs / 1000
  const endTime = startTime + durationMs / 1000

  gain.gain.setValueAtTime(volume, startTime)
  gain.gain.linearRampToValueAtTime(0, endTime)

  oscillator.start(startTime)
  oscillator.stop(endTime)
}

export function beep(): void {
  playTone(880, 90, 'sine')
}

export function errorAlarm(): void {
  playTone(440, 220, 'square', 0)
  playTone(440, 220, 'square', 300)
}

export function success(): void {
  playTone(660, 120, 'sine', 0)
  playTone(880, 160, 'sine', 130)
}
