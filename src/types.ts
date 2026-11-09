export type Screen = 'menu' | 'exercises' | 'workouts' | 'session'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'hips'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'

export type Equipment =
  | 'none'
  | 'dumbbell'
  | 'barbell'
  | 'kettlebell'
  | 'squat rack'
  | 'bench'
  | 'box'
  | 'pull-up bar'
  | 'dip bars'
  | 'resistance band'
  | 'cable machine'
  | 'machine'
  | 'wall'
  | 'jump rope'
  | 'bike'
  | 'rowing machine'

/** How the exercise is grouped at a high level. */
export type Category = 'strength' | 'plyometric' | 'cardio' | 'mobility'

/** Movement pattern, used to group similar exercises and balance workouts. */
export type MovementPattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'rotation'
  | 'anti-movement'
  | 'isolation'
  | 'locomotion'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

/** What the exercise is counted in: reps, seconds, or distance. */
export type Measure = 'reps' | 'time' | 'distance'

export type Exercise = {
  id: number
  name: string
  description: string
  /** Muscles the exercise mainly targets. */
  primaryMuscles: MuscleGroup[]
  /** Muscles that assist or are worked to a lesser degree. */
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment[]
  category: Category
  movementPattern?: MovementPattern
  difficulty: Difficulty
  measure: Measure
  /** True when each side is trained separately (e.g. single-leg work). */
  unilateral: boolean
}

export type Workout = {
  id: number
  name: string
  exerciseIds: number[]
}
