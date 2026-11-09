import { use, useEffect, useRef, useState } from "react"
import Layout from "./Layout"
import type { Screen, Exercise } from '../types'
import { ExercisesContext } from "../context"
import { imgBase } from "./ExerciseProvider"

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-tertiary px-3 py-1 text-sm capitalize">{children}</span>
)

/**
 * Compact card shown in the exercise list.
 */
const ExerciseCard = ({ data, onSelect }: { data: Exercise, onSelect: () => void }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-2 border-2 border-tertiary p-4 text-left transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none"
    >
      <h3 className="text-xl">{data.name}</h3>
      <p className="text-sm capitalize opacity-70">
        {data.level} · {data.category}
        {data.equipment && ` · ${data.equipment}`}
      </p>
      <p className="text-sm capitalize">{data.primaryMuscles.join(', ')}</p>
    </button>
  )
}

/**
 * Full-screen detail view for a single exercise.
 */
const ExerciseModal = ({ data, onClose }: { data: Exercise, onClose: () => void }) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    // stop the list behind the modal from scrolling
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  const details: [string, string | null][] = [
    ['Level', data.level],
    ['Category', data.category],
    ['Equipment', data.equipment],
    ['Force', data.force],
    ['Mechanic', data.mechanic],
  ]

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none bg-bg text-white backdrop:bg-black/60"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-3xl">{data.name}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="shrink-0 border-2 border-tertiary px-3 py-1 text-xl hover:border-primary"
          >
            ✕
          </button>
        </header>

        {data.images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {data.images.map((src) => (
              <img
                key={src}
                src={imgBase + src}
                alt={data.name}
                loading="lazy"
                className="w-full max-w-sm shrink-0 object-cover"
              />
            ))}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {details.filter(([, value]) => value).map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm opacity-70">{label}</dt>
              <dd className="capitalize">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-xl">Muscles</h3>
          <div className="flex flex-wrap gap-2">
            {data.primaryMuscles.map((m) => <Tag key={m}>{m}</Tag>)}
          </div>
          {data.secondaryMuscles.length > 0 && (
            <div className="flex flex-wrap gap-2 opacity-70">
              {data.secondaryMuscles.map((m) => <Tag key={m}>{m}</Tag>)}
            </div>
          )}
        </section>

        {data.instructions.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xl">Instructions</h3>
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {data.instructions.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </section>
        )}
      </div>
    </dialog>
  )
}

/**
* List of exercises to choose from.
* @returns The exercises screen
*/
export default function Exercises({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const exercisesPromise = use(ExercisesContext)
  const exercises = exercisesPromise ? use(exercisesPromise) : []
  const [selected, setSelected] = useState<Exercise | null>(null)

  return (
    <Layout setScreen={setScreen} title="Exercises">
      <ul className="flex h-full w-full flex-col gap-4 p-4">
        {exercises.map((data) => (
          <li key={data.id}>
            <ExerciseCard data={data} onSelect={() => setSelected(data)} />
          </li>
        ))}
      </ul>
      {selected && <ExerciseModal data={selected} onClose={() => setSelected(null)} />}
    </Layout>
  )
}
