import { Component } from "react"
import { ExercisesLoadError } from "../errors"

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
      <div role="alert" className="flex flex-col items-center gap-4 p-6 text-center">
        <h2 className="text-2xl">{loadFailed ? "Couldn't load exercises" : "Something went wrong"}</h2>
        <p className="opacity-70">
          {loadFailed
            ? "Check your internet connection and try again."
            : "This screen hit an unexpected error."}
        </p>
        <div className="flex gap-2">
          {this.props.onBackToMenu && (
            <button
              type="button"
              onClick={this.props.onBackToMenu}
              className="border-2 border-tertiary px-4 py-2 hover:border-primary"
            >
              Back to menu
            </button>
          )}
          <button
            type="button"
            // the exercise fetch runs once at module load, so a reload is what retries it
            onClick={() => window.location.reload()}
            className="border-2 border-tertiary px-4 py-2 hover:border-primary"
          >
            {loadFailed ? "Try again" : "Reload"}
          </button>
        </div>
      </div>
    )
  }
}
