import Layout from "./Layout"
import type { Screen, Exercise } from '../types'
import { exercises } from "../exercises"

const ExerciseItem = ({ data }: { data: Exercise }) => {
  return (
    <div className="flex flex-col justify-between align-middle border-solid border-2 p-6 border-tertiary">
      <h3 className="text-center text-xl">{data.name}</h3>
      <p>{data.description}</p>
      <div className="flex flex-row gap-2 align-middle text-lg">
        {
          data.primaryMuscles.map((name) => (
            <li key={name}><p>{name}</p></li>
          ))
        }
      </div>
      {data.secondaryMuscles.length > 0 && (
        <div className="flex flex-row gap-2 align-middle text-sm opacity-70">
          {
            data.secondaryMuscles.map((name) => (
              <li key={name}><p>{name}</p></li>
            ))
          }
        </div>
      )}
    </div>
  )
}

/**
* List of exercises to choose from.
* @returns The exercises screen
*/
export default function Exercises({ setScreen }: { setScreen: (screen: Screen) => void }) {
  return (
    <Layout setScreen={setScreen} title="Exercises">
      <section className="flex flex-col align-middle gap-6 h-full p-4 list-none">
        {
          exercises.map((data, i) => {
            return (
              <li key={data.name + '-' + i}>
                <ExerciseItem data={data} />
              </li>
            )
          })
        }
      </section>
    </Layout>
  )
}