/**
 * Thrown (via `use`) when the exercise database can't be loaded,
 * so error boundaries can tell it apart from bugs in a screen.
 */
export class ExercisesLoadError extends Error {
  name = 'ExercisesLoadError'
}
