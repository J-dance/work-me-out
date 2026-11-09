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
}

export type Workout = {
  id: number
  name: string
  exerciseIds: number[]
}
