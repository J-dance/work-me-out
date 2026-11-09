import { use, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
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

type Filters = {
  search: string
  muscle: string
  level: string
  category: string
  equipment: string
}

const emptyFilters: Filters = { search: '', muscle: '', level: '', category: '', equipment: '' }

// stable fallback so memoised filters don't recompute every render
const noExercises: Exercise[] = []

/** Sorted unique values from a list, dropping nulls. */
const uniqueSorted = <T extends string>(values: (T | null)[]): T[] =>
  [...new Set(values.filter((v): v is T => v !== null))].sort()

const FilterSelect = ({ label, value, options, onChange }: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) => (
  <label className="flex flex-col gap-1 text-sm">
    <span className="opacity-70">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-2 border-tertiary bg-bg p-2 capitalize focus:border-primary focus:outline-none"
    >
      <option value="">All</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
)

/**
 * Search box plus dropdown filters for the exercise list.
 */
const FilterBar = ({ filters, setFilters, options, resultCount }: {
  filters: Filters
  setFilters: (filters: Filters) => void
  options: { muscle: string[], level: string[], category: string[], equipment: string[] }
  resultCount: number
}) => {
  const update = (key: keyof Filters) => (value: string) => setFilters({ ...filters, [key]: value })
  const isFiltered = Object.values(filters).some(Boolean)

  return (
    <div className="sticky top-0 z-10 flex w-full flex-col gap-3 bg-bg p-4">
      <input
        type="search"
        placeholder="Search exercises..."
        value={filters.search}
        onChange={(e) => update('search')(e.target.value)}
        className="w-full border-2 border-tertiary bg-bg p-2 focus:border-primary focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FilterSelect label="Primary muscle" value={filters.muscle} options={options.muscle} onChange={update('muscle')} />
        <FilterSelect label="Level" value={filters.level} options={options.level} onChange={update('level')} />
        <FilterSelect label="Category" value={filters.category} options={options.category} onChange={update('category')} />
        <FilterSelect label="Equipment" value={filters.equipment} options={options.equipment} onChange={update('equipment')} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="opacity-70">{resultCount} exercise{resultCount === 1 ? '' : 's'}</span>
        {isFiltered && (
          <button type="button" onClick={() => setFilters(emptyFilters)} className="underline hover:text-primary">
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

/**
* List of exercises to choose from.
* @returns The exercises screen
*/
export default function Exercises({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const exercisesPromise = use(ExercisesContext)
  const exercises = exercisesPromise ? use(exercisesPromise) : noExercises
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  // keeps typing responsive while the (long) list re-filters in the background
  const deferredFilters = useDeferredValue(filters)

  // dropdown options come from the data itself, so only values that exist are offered
  const options = useMemo(() => ({
    muscle: uniqueSorted(exercises.flatMap((e) => e.primaryMuscles)),
    level: uniqueSorted(exercises.map((e) => e.level)),
    category: uniqueSorted(exercises.map((e) => e.category)),
    equipment: uniqueSorted(exercises.map((e) => e.equipment)),
  }), [exercises])

  const filtered = useMemo(() => {
    const { search, muscle, level, category, equipment } = deferredFilters
    const query = search.trim().toLowerCase()
    return exercises.filter((e) =>
      (!query || e.name.toLowerCase().includes(query)) &&
      (!muscle || e.primaryMuscles.includes(muscle as Exercise['primaryMuscles'][number])) &&
      (!level || e.level === level) &&
      (!category || e.category === category) &&
      (!equipment || e.equipment === equipment)
    )
  }, [exercises, deferredFilters])

  return (
    <Layout setScreen={setScreen} title="Exercises">
      <FilterBar filters={filters} setFilters={setFilters} options={options} resultCount={filtered.length} />
      <ul className="flex h-full w-full flex-col gap-4 p-4">
        {filtered.map((data) => (
          <li key={data.id}>
            <ExerciseCard data={data} onSelect={() => setSelected(data)} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-center opacity-70">No exercises match your filters.</li>
        )}
      </ul>
      {selected && <ExerciseModal data={selected} onClose={() => setSelected(null)} />}
    </Layout>
  )
}
