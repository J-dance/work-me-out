import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react"
import Layout from "./Layout"
import type { Screen, Exercise } from '../types'
import { useCustomExercises, useExercises } from "../context"
import { loadWorkouts } from "../utils"
import ExerciseModal from "./ExerciseModal"
import CustomExerciseForm from "./CustomExerciseForm"

/** How many saved workouts use an exercise, read fresh so it's right after edits on the Workouts screen. */
const workoutsUsing = (exerciseId: string): number =>
  loadWorkouts().filter((w) => w.steps.some((s) => s.type === 'exercise' && s.exerciseId === exerciseId)).length

/**
 * Compact card shown in the exercise list.
 */
const ExerciseCard = ({ data, onSelect }: { data: Exercise, onSelect: () => void }) => {
  return (
    <article className="relative flex w-full flex-col gap-2 border-2 border-outline p-4 transition-colors motion-reduce:transition-none hover:border-primary has-[button:focus-visible]:border-primary">
      <h2 className="text-xl wrap-break-word">
        {/* the ::after overlay makes the whole card clickable while only the name is the button's label */}
        <button
          type="button"
          onClick={onSelect}
          className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          {data.name}
        </button>
      </h2>
      {/* separate flex items: Chrome won't capitalise the first word when it follows an inline badge */}
      <p className="flex flex-wrap items-center gap-x-2 text-sm opacity-70">
        {data.custom && <span className="rounded-full bg-tertiary px-2 py-0.5">Yours</span>}
        <span className="capitalize">
          {data.level} · {data.category}
          {data.equipment && ` · ${data.equipment}`}
        </span>
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
  // min-w-0 + w-full: let the grid shrink the select below its longest option instead of overflowing.
  // justify-end keeps the selects in a row lined up when one label wraps onto two lines.
  <label className="flex min-w-0 flex-col justify-end gap-1 text-sm">
    <span className="opacity-70">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 border-2 border-outline bg-bg p-2 capitalize focus:border-primary focus:outline-none"
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
  // dropdowns other than search that are set, shown on the narrow-screen toggle
  const activeCount = [filters.muscle, filters.level, filters.category, filters.equipment].filter(Boolean).length
  // below sm the dropdowns sit behind a toggle so the sticky bar doesn't cover most of a small screen
  const [showFilters, setShowFilters] = useState(false)
  const gridId = useId()

  return (
    // Full-bleed: the negative margin cancels Layout's side padding (--page-px) so the bar spans the whole
    // viewport width; the inner padding lines the inputs up with the cards below (page padding + the list's sm:px-4).
    // iOS Safari shows page content under the status bar unless a fixed/sticky element
    // touching the top edge spans the width; then it extends that element's colour there instead.
    <search
      className="sticky top-0 z-10 -mx-(--page-px) flex w-[calc(100%+2*var(--page-px))] flex-col gap-3 bg-bg px-(--page-px) py-4 sm:px-[calc(var(--page-px)+--spacing(4))]"
      aria-label="Filter exercises"
    >
      <div className="flex gap-2">
        <input
          type="search"
          aria-label="Search exercises"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => update('search')(e.target.value)}
          className="w-full min-w-0 border-2 border-outline bg-bg p-2 focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls={gridId}
          onClick={() => setShowFilters((v) => !v)}
          className={`shrink-0 border-2 px-3 hover:border-primary sm:hidden ${showFilters ? 'border-primary' : 'border-outline'}`}
        >
          Filters{activeCount > 0 && <span className="text-primary"> ({activeCount})</span>}
        </button>
      </div>
      {/* columns by available space, not viewport: 4 across when roomy, 2 on phones, 1 on the narrowest screens */}
      <div id={gridId} className={`${showFilters ? 'grid' : 'hidden'} grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] gap-2 sm:grid`}>
        <FilterSelect label="Primary muscle" value={filters.muscle} options={options.muscle} onChange={update('muscle')} />
        <FilterSelect label="Level" value={filters.level} options={options.level} onChange={update('level')} />
        <FilterSelect label="Category" value={filters.category} options={options.category} onChange={update('category')} />
        <FilterSelect label="Equipment" value={filters.equipment} options={options.equipment} onChange={update('equipment')} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
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
  const exercises = useExercises()
  const { add, update, remove } = useCustomExercises()
  const [selected, setSelected] = useState<Exercise | null>(null)
  // 'new' for the create form, or the custom exercise being edited
  const [form, setForm] = useState<'new' | Exercise | null>(null)
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
      <div className="w-full sm:px-4">
        <button
          type="button"
          onClick={() => setForm('new')}
          className="w-full border-2 border-dashed border-outline p-3 hover:border-primary hover:bg-tertiary"
        >
          + New exercise
        </button>
      </div>
      <ul className="flex h-full w-full flex-col gap-4 pb-4 sm:px-4">
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
      {selected && (
        <ExerciseModal
          data={selected}
          onClose={() => setSelected(null)}
          onEdit={selected.custom ? () => setForm(selected) : undefined}
        />
      )}
      {form && (
        <CustomExerciseForm
          initial={form === 'new' ? undefined : form}
          // prefill from the filters so a "no results" search turns straight into a new exercise
          draft={form === 'new' ? { name: filters.search.trim() } : undefined}
          usedIn={form === 'new' ? 0 : workoutsUsing(form.id)}
          onSave={(exercise) => (form === 'new' ? add(exercise) : update(exercise))}
          onDelete={form === 'new' ? undefined : () => remove(form.id)}
          onClose={() => setForm(null)}
        />
      )}
    </Layout>
  )
}
