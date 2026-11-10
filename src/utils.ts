import { useEffect, useRef, useSyncExternalStore } from "react"
import type { Workout } from "./types"


export class Timer {
  private duration: number
  private endTime: number = 0
  private interval: ReturnType<typeof setInterval> | undefined

  private onUpdate: (time: number) => void
  private onFinsih: () => void

  constructor(onUpdate: (time: number) => void, onFinish: () => void, duration?: number) {
    this.duration = duration === 0 ? 0 : duration ?? 60
    this.onUpdate = onUpdate
    this.onFinsih = onFinish
  }

  public setDuration(duration: number): void {
    this.duration = duration
  }

  public setEndTime(endTime: number): void {
    this.endTime = endTime
  }

  public setInterval(interval: ReturnType<typeof setInterval>): void {
    this.interval = interval
  }

  // -------------------------

  /**
   * Starts the timer. Time is calculated based of real date/times data.
   */
  public startTimer() {
    this.setEndTime(Date.now() + this.duration * 1000)

    this.setInterval(setInterval(() => { this.updateTimer() }, 100)) // 100ms
  }

  /**
   * Callback for setInterval
   * Calculates remaing time left on timer in seconds
   * Handles timer finish
   */
  public updateTimer() {
    try {
      const remaining = Math.max(
        0,
        this.endTime - Date.now()
      );

      const seconds = Math.ceil(remaining / 1000);

      this.onUpdate(seconds)

      if (remaining <= 0) {
        this.stopTimer()
        this.onFinsih()
      }
    } catch (e) {
      // errors in a setInterval callback don't stop the interval and aren't seen by
      // React error boundaries, so stop here instead of throwing every 100ms
      this.stopTimer()
      console.error("Timer stopped after an error", e)
    }
  }

  public stopTimer() {
    clearInterval(this.interval);
  }

  public resetTimer() {
    this.stopTimer()
    this.setEndTime(0)
  }
}

const WORKOUTS_KEY = 'workouts'

/** Short unique id. Avoids crypto.randomUUID, which is missing outside secure contexts (e.g. testing over LAN http). */
export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/** Saved workouts from localStorage, or an empty list if none/unreadable. */
export const loadWorkouts = (): Workout[] => {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(WORKOUTS_KEY) ?? '[]')
    return Array.isArray(data) ? data as Workout[] : []
  } catch {
    return []
  }
}

export const saveWorkouts = (workouts: Workout[]): void => {
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts))
}

/** Must match the image cacheName in vite.config.ts, so the service worker serves what we store here. */
const EXERCISE_IMAGES_CACHE = 'exercise-images'

/**
 * Downloads images into the offline cache ahead of time (e.g. for a saved workout),
 * skipping any already cached. Best effort: failures are ignored, the image just loads online later.
 */
export const cacheImages = async (urls: string[]): Promise<void> => {
  if (!('caches' in window) || urls.length === 0) return // Cache API is missing outside secure contexts
  try {
    const cache = await caches.open(EXERCISE_IMAGES_CACHE)
    await Promise.allSettled(
      [...new Set(urls)].map(async (url) => {
        if (!(await cache.match(url))) await cache.add(url)
      }),
    )
  } catch {
    // storage full or unavailable; nothing to do
  }
}

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** True while the browser thinks it has a network connection; re-renders when that changes. */
export const useOnline = (): boolean => useSyncExternalStore(subscribeOnline, () => navigator.onLine)

/** Running as an installed app (home screen / dock) rather than in a browser tab. */
export const isInstalledApp = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone/iPad. iPadOS reports itself as a Mac, so also check for touch. Every iOS browser runs on Safari's engine. */
export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Safari on a Mac (Chrome, Edge, Firefox etc. also put "Safari" in their user agent, so exclude them). */
export const isMacSafari = (): boolean =>
  !isIOS() && /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Edg|Firefox|OPR/.test(navigator.userAgent)

/** Seconds as m:ss, e.g. 90 -> "1:30". */
export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// number of open dialogs holding the page scroll lock
let scrollLocks = 0

/**
 * Stops the page behind a dialog from scrolling. Returns the unlock function.
 * Counted, so stacked dialogs can open and close in any order without leaving the page stuck.
 */
export const lockScroll = (): (() => void) => {
  if (scrollLocks++ === 0) document.body.style.overflow = 'hidden'
  return () => {
    if (--scrollLocks === 0) document.body.style.overflow = ''
  }
}

/** Seconds in words for screen readers, e.g. 90 -> "1 minute 30 seconds". */
export const speakDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  const parts = [
    m > 0 && `${m} minute${m === 1 ? '' : 's'}`,
    (s > 0 || m === 0) && `${s} second${s === 1 ? '' : 's'}`,
  ].filter(Boolean)
  return parts.join(' ')
}

/**
 * Focuses the returned element on mount and whenever `key` changes.
 * Used on headings (with tabIndex={-1}) so screen readers announce a new screen or view
 * instead of losing focus when the button that was pressed disappears.
 */
export const useFocusOnChange = <T extends HTMLElement>(key?: unknown) => {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [key])
  return ref
}

let audioCtx: AudioContext | null = null

/**
 * Creates/resumes the shared AudioContext. Must be called from a tap (e.g. Start/Resume),
 * because iOS Safari only allows audio that was unlocked by a user gesture.
 */
export const unlockAudio = () => {
  try {
    // Safari 17+: play through the silent switch like a media app, instead of being muted by it
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'

    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch (e) {
    console.error('Could not start audio', e)
  }
}

/** Three short beeps for when a timer finishes. Does nothing if audio was never unlocked. */
export const playBeep = () => {
  if (!audioCtx) return
  const now = audioCtx.currentTime
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.frequency.value = 880 // A5, a clear "timer" pitch
    const t = now + i * 0.25
    // quick fade in/out avoids clicks
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(t)
    osc.stop(t + 0.2)
  }
}

/**
 * Keeps the screen on while `active` is true, so the phone doesn't lock (and pause the timer) mid-workout.
 * The browser drops the lock whenever the page is hidden, so it's requested again when the page comes back.
 * Does nothing where the Screen Wake Lock API isn't supported.
 */
export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) void next.release()
        else lock = next
      } catch (e) {
        // e.g. low battery mode, or the page isn't visible
        console.warn('Could not keep the screen on', e)
      }
    }

    void request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [active])
}
