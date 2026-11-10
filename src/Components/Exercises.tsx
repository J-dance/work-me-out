import { use, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import Layout from "./Layout"
import type { Screen, Exercise } from '../types'
import { ExercisesContext } from "../context"
import ExerciseModal from "./ExerciseModal"

/**
 * Compact card shown in the exercise list.
 */
const ExerciseCard = ({ data, onSelect }: { data: Exercise, onSelect: () => void }) => {
  return (
    <article className="relative flex w-full flex-col gap-2 border-2 border-outline p-4 transition-colors motion-reduce:transition-none hover:border-primary has-[button:focus-visible]:border-primary">
      <h2 className="text-xl">
        {/* the ::after overlay makes the whole card clickable while only the name is the button's label */}
        <button
          type="button"
          onClick={onSelect}
          className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          {data.name}
        </button>
      </h2>
      <p className="text-sm capitalize opacity-70">
        {data.level} · {data.category}
        {data.equipment && ` · ${data.equipment}`}
      </p>
      <p className="text-sm capitalize">
        <span className="sr-only">Primary muscles: </span>
        {data.primaryMuscles.join(', ')}
      </p>
    </article>
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

// how many cards to render per "page" of the infinite scroll
const PAGE_SIZE = 30

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
      className="border-2 border-outline bg-bg p-2 capitalize focus:border-primary focus:outline-none"
    >
      <option value="">All</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
)

/**
 * Search box plus dropdown filters for the exercise list.
 */
const FilterBar = ({ filters, setFilters, options, resultCount, shownCount }: {
  filters: Filters
  setFilters: (filters: Filters) => void
  options: { muscle: string[], level: string[], category: string[], equipment: string[] }
  resultCount: number
  shownCount: number
}) => {
  const update = (key: keyof Filters) => (value: string) => setFilters({ ...filters, [key]: value })
  const isFiltered = Object.values(filters).some(Boolean)

  return (
    <search className="sticky top-0 z-10 flex w-full flex-col gap-3 bg-bg p-4" aria-label="Filter exercises">
      <input
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises..."
        value={filters.search}
        onChange={(e) => update('search')(e.target.value)}
        className="w-full border-2 border-outline bg-bg p-2 focus:border-primary focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FilterSelect label="Primary muscle" value={filters.muscle} options={options.muscle} onChange={update('muscle')} />
        <FilterSelect label="Level" value={filters.level} options={options.level} onChange={update('level')} />
        <FilterSelect label="Category" value={filters.category} options={options.category} onChange={update('category')} />
        <FilterSelect label="Equipment" value={filters.equipment} options={options.equipment} onChange={update('equipment')} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="opacity-70" aria-hidden="true">
          {shownCount < resultCount && `Showing ${shownCount} of `}
          {resultCount} exercise{resultCount === 1 ? '' : 's'}
        </span>
        {isFiltered && (
          <button type="button" onClick={() => setFilters(emptyFilters)} className="underline hover:text-primary">
            Clear filters
          </button>
        )}
      </div>
      {/* announce the result count as filters change; the visible count above also changes on scroll, which would be noisy */}
      <span role="status" className="sr-only">
        {resultCount} exercise{resultCount === 1 ? '' : 's'} found
      </span>
    </search>
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  // empty element after the last card; when it scrolls into view we load the next page
  const sentinelRef = useRef<HTMLLIElement>(null)
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

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // any filter change starts the list again from the first page
  const updateFilters = (next: Filters) => {
    setFilters(next)
    setVisibleCount(PAGE_SIZE)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    // re-created whenever visibleCount changes: a new observer reports straight away,
    // so if the sentinel is still on screen (e.g. tall display) the next page loads too
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE) },
      { rootMargin: '100px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, hasMore])

  return (
    <Layout setScreen={setScreen} title="Exercises">
      <FilterBar
        filters={filters}
        setFilters={updateFilters}
        options={options}
        resultCount={filtered.length}
        shownCount={visible.length}
      />
      <ul className="flex h-full w-full flex-col gap-4 p-4">
        {visible.map((data) => (
          <li key={data.id}>
            <ExerciseCard data={data} onSelect={() => setSelected(data)} />
          </li>
        ))}
        {hasMore && <li ref={sentinelRef} aria-hidden="true" className="h-px" />}
        {filtered.length === 0 && (
          <li className="text-center opacity-70">No exercises match your filters.</li>
        )}
      </ul>
      {selected && <ExerciseModal data={selected} onClose={() => setSelected(null)} />}
    </Layout>
  )
}
