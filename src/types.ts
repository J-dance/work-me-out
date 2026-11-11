export type Screen = 'menu' | 'exercises' | 'workouts' | 'session'

export type Force = 'push' | 'pull' | 'static'

export type Level = 'beginner' | 'intermediate' | 'expert'

export type Mechanic = 'compound' | 'isolation'

export type Equipment =
  | 'body only'
  | 'machine'
  | 'other'
  | 'foam roll'
  | 'kettlebells'
  | 'dumbbell'
  | 'cable'
  | 'barbell'
  | 'bands'
  | 'medicine ball'
  | 'exercise ball'
  | 'e-z curl bar'

export type Muscle =
  | 'abdominals'
  | 'abductors'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'forearms'
  | 'glutes'
  | 'hamstrings'
  | 'lats'
  | 'lower back'
  | 'middle back'
  | 'neck'
  | 'quadriceps'
  | 'shoulders'
  | 'traps'
  | 'triceps'

export type Category =
  | 'strength'
  | 'stretching'
  | 'plyometrics'
  | 'strongman'
  | 'powerlifting'
  | 'cardio'
  | 'olympic weightlifting'

export type Exercise = {
  id: string
  name: string
  force: Force | null
  level: Level
  mechanic: Mechanic | null
  equipment: Equipment | null
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  instructions: string[]
  category: Category
  /** Relative paths, e.g. "3_4_Sit-Up/0.jpg" */
  images: string[]
  /** Made by the user and saved in localStorage, rather than from the exercise database. */
  custom?: true
}

/** An exercise performed for one or more straight sets. */
export type ExerciseStep = {
  type: 'exercise'
  /** Unique per step, so the same exercise can appear more than once */
  key: string
  exerciseId: string
  /** Number of straight sets */
  sets: number
  /** Reps per set, null if the set is purely timed */
  reps: number | null
  /** Seconds per set, null if the set is purely reps */
  duration: number | null
  /** Seconds of rest between each straight set */
  restBetweenSets: number
}

/** A break between steps. */
export type RestStep = {
  type: 'rest'
  key: string
  /** Seconds */
  duration: number
}

export type WorkoutStep = ExerciseStep | RestStep

/** Broad body regions a workout targets, each covering one or more muscles. */
export type BodyArea = 'chest' | 'shoulders' | 'back' | 'arms' | 'core' | 'glutes' | 'legs'

export type Workout = {
  id: string
  name: string
  /** Areas the workout targets, used to filter exercises. Optional so older saved workouts still load. */
  bodyAreas?: BodyArea[]
  /** Specific muscles within bodyAreas to narrow the filter further. Empty means every muscle in those areas. */
  muscles?: Muscle[]
  /** Equipment the exercises should use. Empty means any. */
  equipment?: Equipment[]
  steps: WorkoutStep[]
}
