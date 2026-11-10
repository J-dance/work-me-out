import { Component, useEffect } from "react"
import { ExercisesLoadError } from "../errors"
import { useOnline } from "../utils"

/**
 * Explains a failed exercise load. Offline usually means the exercise list was never saved on
 * this device (first visit, or website data was cleared), so say that, and retry by itself
 * as soon as the connection comes back.
 */
function LoadFailedHelp() {
  const online = useOnline()
  useEffect(() => {
    // the exercise fetch runs once at module load, so a reload is what retries it.
    // Registered once for as long as this message shows: re-subscribing on `online` changes would
    // remove the listener mid-event (React re-renders between listeners) and the retry would never run.
    const retry = () => window.location.reload()
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])

  return (
    <p className="opacity-70">
      {online
        ? "Check your internet connection and try again."
        : "You're offline, and the exercise list hasn't been saved on this device yet. Connect to the internet once and WorkMeOut will keep working offline after that. This page will retry when you're back online."}
    </p>
  )
}

interface Props {
  children: React.ReactNode
  /** Leaves the broken screen. Omit on the menu, where there's nowhere to go back to. */
  onBackToMenu?: () => void
}

interface State {
  error: Error | null
}

/**
 * Catches errors thrown while rendering a screen (including a failed exercise
 * fetch surfaced by `use`) and shows a message instead of a blank page.
 *
 * Give it `key={screen}` so switching screens mounts a fresh boundary,
 * which clears the error. Error boundaries still have to be class components.
 */
export default class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Screen crashed:", error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const loadFailed = error instanceof ExercisesLoadError

    return (
      <main role="alert" className="flex flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-2xl">{loadFailed ? "Couldn't load exercises" : "Something went wrong"}</h1>
        {loadFailed
          ? <LoadFailedHelp />
          : <p className="opacity-70">This screen hit an unexpected error.</p>}
        <div className="flex gap-2">
          {this.props.onBackToMenu && (
            <button
              type="button"
              onClick={this.props.onBackToMenu}
              className="border-2 border-outline px-4 py-2 hover:border-primary"
            >
              Back to menu
            </button>
          )}
          <button
            type="button"
            // the exercise fetch runs once at module load, so a reload is what retries it
            onClick={() => window.location.reload()}
            className="border-2 border-outline px-4 py-2 hover:border-primary"
          >
            {loadFailed ? "Try again" : "Reload"}
          </button>
        </div>
      </main>
    )
  }
}
