/**
 * Context stored here for app
 */

import { createContext, use, useMemo, type Dispatch, type SetStateAction } from "react";
import type { Exercise } from "./types";

export type UserContextValue = {
  state: unknown
  setState: Dispatch<SetStateAction<unknown>>
}

export const UserContext = createContext<UserContextValue | null>(null)
export const ExercisesContext = createContext<Promise<Exercise[]> | null>(null)

export type CustomExercisesValue = {
  /** Newest first */
  custom: Exercise[]
  add: (exercise: Exercise) => void
  update: (exercise: Exercise) => void
  remove: (id: string) => void
}

export const CustomExercisesContext = createContext<CustomExercisesValue | null>(null)

// stable fallback so memoised values don't recompute every render
const noExercises: Exercise[] = []

/** Add/edit/delete the user's own exercises. Must be inside ExerciseProvider. */
export const useCustomExercises = (): CustomExercisesValue => {
  const value = use(CustomExercisesContext)
  if (!value) throw new Error('useCustomExercises must be used inside ExerciseProvider')
  return value
}

/**
 * Every exercise: the user's own first, then the database's.
 * Suspends until the database has loaded.
 */
export const useExercises = (): Exercise[] => {
  const promise = use(ExercisesContext)
  const database = promise ? use(promise) : noExercises
  const { custom } = useCustomExercises()
  return useMemo(() => (custom.length === 0 ? database : [...custom, ...database]), [custom, database])
}
