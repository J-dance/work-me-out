export type Screen = 'menu' | 'exercises' | 'workouts' | 'session'

export type Exercise = {
  name: string
  description: string
  muscles: string[]
}

export type Workout = {
  id: string
  name: string
  exerciseIds: string[]
  restSeconds: number
}