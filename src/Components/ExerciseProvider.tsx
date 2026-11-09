import { Suspense } from "react"
import { ExercisesContext } from "../context"
import type { Exercise } from "../types"

const base = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@79ca7b4'
const exercisesUrl = `${base}/dist/exercises.json`
export const imgBase = `${base}/exercises/`

/**
 * Handles the fetching of the exercises from the free-exercise-db
 * https://github.com/yuhonas/free-exercise-db
 * @returns Promise list of exercise objects or Empty
 */
const getExercises = async (): Promise<Exercise[]> => {
  try {
    const res = await fetch(exercisesUrl, { signal: AbortSignal.timeout(10000) }) // if no response in 10s -> abort
    if (!res.ok) {
      // fetch does not throw
      throw new Error(`Exercise database returned ${res.status}`)
    }

    const data: unknown = await res.json()  // throws if the body isn't valid JSON

    if (!Array.isArray(data)) {
      // the response isn't the shape you expect
      throw new Error('Unexpected exercise data format')
    }

    return data as Exercise[]
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') console.log('Response took too long') /* took too long */
    else if (e instanceof DOMException && e.name === 'AbortError') console.log("request was cancelled") /* cancelled on purpose */
    else console.error("error fetching exercises", e instanceof Error ? e.message : e)
    return []
  }
}

// run once at module level (when module imported)
const exercisesPromise = getExercises()

function Spinner() {
  return (
    <div>
      Loading...
    </div>
  )
}

export default function ExerciseProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Spinner />}>
      <ExercisesContext value={exercisesPromise}>
        {children}
      </ExercisesContext>
    </Suspense>
  )
}