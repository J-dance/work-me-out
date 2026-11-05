export type Screen = 'menu' | 'exercises' | 'workouts' | 'session'

export type Exercise = {
  id: number
  name: string
  description: string
  muscles: string[]
}

export type Workout = {
  id: number
  name: string
  exerciseIds: number[]
}