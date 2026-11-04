import Layout from "./Layout";
import type { Screen } from "../types";

/**
 * Select workouts and rest time between them. Start a workout session.
 * @returns The session screen
 */
export default function Session({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <Layout setScreen={setScreen} title={"Lets Go!"}>{
      <section></section>
    }</Layout>
  )
}