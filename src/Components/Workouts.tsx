import Layout from "./Layout"
import type { Screen } from '../types'
import { UserContext } from "../App"
import { useContext } from "react"

/**
 * Select exercises and rest time between them. Does not start a workout session.
 * @returns 
 */
export default function Workouts({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const context = useContext(UserContext)

  return (
    <Layout setScreen={setScreen} title="Workouts">
      <section>
        <button className="p-8 rounded-full border-solid border-8 border-tertiary text-5xl aspect-square hover:bg-tertiary hover:cursor-pointer" onClick={() => { context.setState() }}>+</button>
      </section>
    </Layout>
  )
}