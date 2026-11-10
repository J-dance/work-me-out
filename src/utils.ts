import { useEffect, useRef } from "react"
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
