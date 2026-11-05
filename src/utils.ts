
export class Timer {
  private duration: number
  private endTime: number
  private interval: number

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

  public setInterval(interval: number): void {
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
  }

  public stopTimer() {
    clearInterval(this.interval);
  }

  public resetTimer() {
    this.stopTimer()
    this.setEndTime(null)
  }
}