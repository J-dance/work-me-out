import Layout from "./Layout"
import type { Screen } from '../types'

/**
 * Select exercises and rest time between them. Does not start a workout session.
 * @returns 
 */
export default function Workouts({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <Layout setScreen={setScreen} title="Workouts">
      <section></section>
    </Layout>
  )
}