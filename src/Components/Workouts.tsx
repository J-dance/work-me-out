import { use, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react"
import Layout from "./Layout"
import type { Screen, Exercise, Workout, WorkoutStep, ExerciseStep, RestStep, BodyArea, Muscle, Equipment } from '../types'
import { ExercisesContext } from "../context"
import { formatDuration, loadWorkouts, lockScroll, saveWorkouts, speakDuration, uid } from "../utils"
import ExerciseModal from "./ExerciseModal"

// stable fallback so memoised values don't recompute every render
const noExercises: Exercise[] = []

/** Gap between list items in px. Must match the `gap-3` on the step list. */
const LIST_GAP = 12

/** Rough time per rep, only used for the estimated total. */
const SECONDS_PER_REP = 3

/** Max exercises shown in the picker at once, keeps the list fast. */
const PICKER_LIMIT = 50

const newExerciseStep = (exerciseId: string): ExerciseStep => ({
  type: 'exercise', key: uid(), exerciseId, sets: 3, reps: 10, duration: null, restBetweenSets: 60,
})

const newRestStep = (): RestStep => ({ type: 'rest', key: uid(), duration: 60 })

const newWorkout = (): Workout => ({ id: uid(), name: '', bodyAreas: [], muscles: [], equipment: [], steps: [] })

/** Which muscles count towards each body area. Matched against an exercise's primary muscles. */
const BODY_AREAS: Record<BodyArea, Muscle[]> = {
  chest: ['chest'],
  shoulders: ['shoulders', 'neck'],
  back: ['lats', 'middle back', 'lower back', 'traps'],
  arms: ['biceps', 'triceps', 'forearms'],
  core: ['abdominals'],
  glutes: ['glutes', 'abductors', 'adductors'],
  legs: ['quadriceps', 'hamstrings', 'calves'],
}

const bodyAreaNames = Object.keys(BODY_AREAS) as BodyArea[]

/** Equipment chips, most common first. "other" is last as it's a catch-all. */
const EQUIPMENT: Equipment[] = [
  'body only', 'dumbbell', 'barbell', 'kettlebells', 'cable', 'machine', 'bands',
  'medicine ball', 'exercise ball', 'e-z curl bar', 'foam roll', 'other',
]

/** What the workout targets: equipment, broad areas, and optionally specific muscles within those areas. */
type Focus = { equipment: Equipment[], areas: BodyArea[], muscles: Muscle[] }

const emptyFocus: Focus = { equipment: [], areas: [], muscles: [] }

const focusFromWorkout = (w: Workout): Focus =>
  ({ equipment: w.equipment ?? [], areas: w.bodyAreas ?? [], muscles: w.muscles ?? [] })

/** Exercises with no equipment listed in the database are all bodyweight moves, so treat them as "body only". */
const equipmentOf = (e: Exercise): Equipment => e.equipment ?? 'body only'

/** Muscles of an area that have been picked, or all of the area's muscles if none have. */
const musclesForArea = (area: BodyArea, picked: Muscle[]): Muscle[] => {
  const chosen = BODY_AREAS[area].filter((m) => picked.includes(m))
  return chosen.length > 0 ? chosen : BODY_AREAS[area]
}

/**
 * Exercises that use any of the chosen equipment and whose primary muscles match the chosen areas.
 * An empty equipment or area list means no filtering on that.
 * Muscle picks only narrow their own area, e.g. Back (lats) + Legs keeps every leg exercise.
 */
const filterByFocus = (exercises: Exercise[], { equipment, areas, muscles }: Focus): Exercise[] => {
  const targets = new Set(areas.flatMap((a) => musclesForArea(a, muscles)))
  return exercises.filter((e) =>
    (equipment.length === 0 || equipment.includes(equipmentOf(e))) &&
    (areas.length === 0 || e.primaryMuscles.some((m) => targets.has(m)))
  )
}

/** e.g. "Back (lats, traps), Legs · Dumbbell, Bands" */
const describeFocus = ({ equipment, areas, muscles }: Focus): string => {
  const areaText = bodyAreaNames.filter((a) => areas.includes(a)).map((area) => {
    const chosen = BODY_AREAS[area].filter((m) => muscles.includes(m))
    return chosen.length > 0 ? `${area} (${chosen.join(', ')})` : area
  }).join(', ')
  const equipmentText = EQUIPMENT.filter((e) => equipment.includes(e)).join(', ')
  return [areaText, equipmentText].filter(Boolean).join(' · ')
}

const chipClass = (selected: boolean) =>
  `rounded-full border-2 px-3 py-1 text-sm capitalize ${selected ? 'border-primary bg-tertiary' : 'border-outline hover:border-primary'}`

/**
 * Toggleable chips for picking equipment and body areas, then optionally specific muscles within those areas.
 * The muscle row only lists areas that have more than one muscle to choose between.
 */
const FocusSelect = ({ value, onChange }: { value: Focus, onChange: React.Dispatch<React.SetStateAction<Focus>> }) => {
  // functional updates so quick taps never toggle against a stale value
  const toggleArea = (area: BodyArea) => onChange((prev) => prev.areas.includes(area)
    // deselecting an area also drops its muscle picks
    ? { ...prev, areas: prev.areas.filter((a) => a !== area), muscles: prev.muscles.filter((m) => !BODY_AREAS[area].includes(m)) }
    : { ...prev, areas: [...prev.areas, area] })

  const toggleEquipment = (item: Equipment) => onChange((prev) => ({
    ...prev,
    equipment: prev.equipment.includes(item) ? prev.equipment.filter((e) => e !== item) : [...prev.equipment, item],
  }))

  const hasFilters = value.equipment.length > 0 || value.areas.length > 0

  const toggleMuscle = (muscle: Muscle) => onChange((prev) => ({
    ...prev,
    muscles: prev.muscles.includes(muscle) ? prev.muscles.filter((m) => m !== muscle) : [...prev.muscles, muscle],
  }))

  const id = useId()

  // keep the area order fixed rather than the order they were tapped
  const muscleOptions = bodyAreaNames
    .filter((a) => value.areas.includes(a) && BODY_AREAS[a].length > 1)
    .flatMap((a) => BODY_AREAS[a])

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-equipment`} className="text-sm opacity-70">Equipment</span>
      <div role="group" aria-labelledby={`${id}-equipment`} className="flex flex-wrap gap-2">
        {EQUIPMENT.map((item) => (
          <button key={item} type="button" aria-pressed={value.equipment.includes(item)} onClick={() => toggleEquipment(item)} className={chipClass(value.equipment.includes(item))}>
            {item}
          </button>
        ))}
      </div>
      <span id={`${id}-areas`} className="mt-1 text-sm opacity-70">Body areas</span>
      <div role="group" aria-labelledby={`${id}-areas`} className="flex flex-wrap gap-2">
        {bodyAreaNames.map((area) => (
          <button key={area} type="button" aria-pressed={value.areas.includes(area)} onClick={() => toggleArea(area)} className={chipClass(value.areas.includes(area))}>
            {area}
          </button>
        ))}
      </div>
      {muscleOptions.length > 0 && (
        <div role="group" aria-labelledby={`${id}-muscles`} className="flex flex-wrap items-center gap-2 border-l-2 border-outline pl-3">
          <span id={`${id}-muscles`} className="text-sm opacity-70">Muscles:</span>
          {muscleOptions.map((muscle) => (
            <button key={muscle} type="button" aria-pressed={value.muscles.includes(muscle)} onClick={() => toggleMuscle(muscle)} className={chipClass(value.muscles.includes(muscle))}>
              {muscle}
            </button>
          ))}
        </div>
      )}
      {hasFilters && (
        <button type="button" onClick={() => onChange(emptyFocus)} className="self-start text-sm underline hover:text-primary">
          Clear filters
        </button>
      )}
    </div>
  )
}

/** Estimated workout length in seconds. Timed sets use their duration, rep-only sets are estimated. */
const estimateSeconds = (steps: WorkoutStep[]): number => steps.reduce((total, step) => {
  if (step.type === 'rest') return total + step.duration
  const perSet = step.duration ?? (step.reps ?? 0) * SECONDS_PER_REP
  return total + perSet * step.sets + step.restBetweenSets * (step.sets - 1)
}, 0)

/** An exercise step needs at least reps or a time to be doable. */
const isStepValid = (step: WorkoutStep): boolean =>
  step.type === 'rest' || step.reps !== null || step.duration !== null

/** e.g. "3 × 10 reps", "3 × 0:30", "3 × 10 reps in 0:30" */
const describeSets = (step: ExerciseStep): string => {
  const parts = [
    step.reps !== null && `${step.reps} reps`,
    step.duration !== null && formatDuration(step.duration),
  ].filter(Boolean)
  return `${step.sets} × ${parts.join(' in ') || '?'}`
}

/**
 * Whole-number input that allows the field to be temporarily empty while typing.
 * Only valid values are passed to onChange; on blur the field snaps back to the last valid value.
 */
const NumberField = ({ label, value, onChange, min = 0, max, optional = false, suffix }: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  optional?: boolean
  suffix?: string
}) => {
  const [text, setText] = useState(value?.toString() ?? '')
  // resync the text if the value changes from outside this input
  const [prevValue, setPrevValue] = useState(value)
  if (prevValue !== value) {
    setPrevValue(value)
    setText(value?.toString() ?? '')
  }

  const handleChange = (input: string) => {
    // text input (not type="number"), so drop anything that isn't a digit ourselves
    const raw = input.replace(/\D/g, '')
    setText(raw)
    if (raw.trim() === '') {
      if (optional) onChange(null)
      return
    }
    const n = Math.floor(Number(raw))
    if (Number.isFinite(n) && n >= min && (max === undefined || n <= max)) onChange(n)
  }

  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="opacity-70">
        {label}
        {suffix && <span className="sr-only"> ({suffix === 's' ? 'seconds' : suffix})</span>}
      </span>
      <span className="flex items-center border-2 border-outline focus-within:border-primary">
        {/* type="text" + inputMode: same numeric keypad on phones, but no desktop spinners,
            no scroll-wheel changes, and Firefox can't accept letters. Range is checked in handleChange. */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={text}
          placeholder={optional ? '—' : undefined}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setText(value?.toString() ?? '')}
          // text-base (16px): anything smaller makes iOS Safari zoom the page on focus
          className="w-full min-w-0 bg-bg p-2 text-base focus:outline-none"
        />
        {suffix && <span aria-hidden="true" className="pr-2 opacity-70">{suffix}</span>}
      </span>
    </label>
  )
}

type HandleProps = {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

/**
 * Grip used to drag a step. Pointer events (not HTML5 drag and drop) so it works on touch screens.
 * Arrow keys move the step when the handle is focused.
 */
const DragHandle = ({ handleProps, label }: { handleProps: HandleProps, label: string }) => (
  <button
    type="button"
    aria-label={`Reorder ${label}`}
    aria-description="Use the up and down arrow keys to move"
    data-drag-handle
    className="flex shrink-0 cursor-grab touch-none items-center self-stretch px-2 text-xl opacity-60 hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
    {...handleProps}
  >
    <span aria-hidden="true">⠿</span>
  </button>
)

/** Opens the full exercise details. */
const InfoButton = ({ onClick, label, className = '' }: { onClick: () => void, label: string, className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Details for ${label}`}
    title="Exercise details"
    className={`shrink-0 hover:text-primary focus-visible:text-primary ${className}`}
  >
    <span aria-hidden="true">ⓘ</span>
  </button>
)

const RemoveButton = ({ onClick, label }: { onClick: () => void, label: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Remove ${label}`}
    className="shrink-0 self-start border-2 border-outline px-2 hover:border-primary"
  >
    <span aria-hidden="true">✕</span>
  </button>
)

const ExerciseStepCard = ({ step, exercise, onChange, onRemove, onAddRestAfter, onInfo, handleProps }: {
  step: ExerciseStep
  exercise: Exercise | undefined
  onChange: (step: ExerciseStep) => void
  onRemove: () => void
  onAddRestAfter: () => void
  onInfo: () => void
  handleProps: HandleProps
}) => {
  const name = exercise?.name ?? 'Unknown exercise'
  const update = <K extends keyof ExerciseStep>(key: K) => (value: ExerciseStep[K]) => onChange({ ...step, [key]: value })

  return (
    <div className="flex gap-2 border-2 border-outline bg-bg p-3">
      <DragHandle handleProps={handleProps} label={name} />
      <div className="flex min-w-0 grow flex-col gap-3">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-lg">{name}</h3>
            <p className="text-sm opacity-70">{describeSets(step)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {exercise && <InfoButton onClick={onInfo} label={name} className="border-2 border-outline px-2 hover:border-primary" />}
            <RemoveButton onClick={onRemove} label={name} />
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Sets" value={step.sets} min={1} max={50} onChange={(v) => v !== null && update('sets')(v)} />
          <NumberField label="Reps" value={step.reps} min={1} optional onChange={update('reps')} />
          <NumberField label="Time" value={step.duration} min={1} optional suffix="s" onChange={update('duration')} />
        </div>

        {step.sets > 1 && (
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Rest between sets" value={step.restBetweenSets} suffix="s" onChange={(v) => v !== null && update('restBetweenSets')(v)} />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-sm">
          {/* always rendered so screen readers pick up the message when it appears */}
          <span role="status" className="text-primary">
            {!isStepValid(step) && `${name}: set reps and/or time`}
          </span>
          <button type="button" onClick={onAddRestAfter} aria-label={`Add rest after ${name}`} className="underline hover:text-primary">
            + Rest after
          </button>
        </div>
      </div>
    </div>
  )
}

const RestStepCard = ({ step, label, onChange, onRemove, handleProps }: {
  step: RestStep
  label: string
  onChange: (step: RestStep) => void
  onRemove: () => void
  handleProps: HandleProps
}) => (
  <div className="flex items-center gap-2 border-2 border-dashed border-secondary bg-bg p-3">
    <DragHandle handleProps={handleProps} label={label} />
    <h3 className="grow">
      <span aria-hidden="true">Rest · {formatDuration(step.duration)}</span>
      <span className="sr-only">Rest, {speakDuration(step.duration)}</span>
    </h3>
    <div className="w-28">
      <NumberField label="Duration" value={step.duration} min={1} suffix="s" onChange={(v) => v !== null && onChange({ ...step, duration: v })} />
    </div>
    <RemoveButton onClick={onRemove} label={label} />
  </div>
)

/** height = dragged item's height plus the list gap, i.e. how far the other items shift */
type DragState = { from: number, over: number, dy: number, height: number }

/**
 * Reorderable list of workout steps.
 * While dragging, the dragged item follows the pointer and the items it passes slide out of the way.
 * The array is only reordered on drop.
 */
const StepList = ({ steps, setSteps, exercisesById }: {
  steps: WorkoutStep[]
  setSteps: React.Dispatch<React.SetStateAction<WorkoutStep[]>>
  exercisesById: Map<string, Exercise>
}) => {
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  // measurements taken at drag start, positions are compared against these
  const dragMeasure = useRef<{ startY: number, mids: number[] } | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)
  // read out by the live region after a keyboard move or a removal
  const [announcement, setAnnouncement] = useState('')
  // step whose drag handle should get focus back after React reorders the list
  const refocusKey = useRef<string | null>(null)

  useEffect(() => {
    const key = refocusKey.current
    if (!key) return
    refocusKey.current = null
    itemRefs.current.get(key)?.querySelector<HTMLElement>('[data-drag-handle]')?.focus()
  }, [steps])

  const stepLabel = (step: WorkoutStep, index: number): string => step.type === 'exercise'
    ? exercisesById.get(step.exerciseId)?.name ?? 'Unknown exercise'
    : `rest ${steps.slice(0, index + 1).filter((s) => s.type === 'rest').length}`

  const move = (from: number, to: number, announce = false) => {
    if (to < 0 || to >= steps.length || from === to) return
    if (announce) {
      refocusKey.current = steps[from].key
      setAnnouncement(`${stepLabel(steps[from], from)} moved to position ${to + 1} of ${steps.length}`)
    }
    setSteps((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const updateStep = (index: number, step: WorkoutStep) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? step : s)))

  const removeStep = (index: number) => {
    setAnnouncement(`Removed ${stepLabel(steps[index], index)}`)
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const insertRest = (index: number) =>
    setSteps((prev) => [...prev.slice(0, index), newRestStep(), ...prev.slice(index)])

  const handlePropsFor = (index: number): HandleProps => ({
    onPointerDown: (e) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const rects = steps.map((s) => itemRefs.current.get(s.key)!.getBoundingClientRect())
      dragMeasure.current = {
        startY: e.clientY,
        mids: rects.map((r) => r.top + r.height / 2),
      }
      setDrag({ from: index, over: index, dy: 0, height: rects[index].height + LIST_GAP })
    },
    onPointerMove: (e) => {
      const m = dragMeasure.current
      if (!m || !drag) return
      const dy = e.clientY - m.startY
      const center = m.mids[drag.from] + dy
      // new index = how many of the other items sit above the dragged item's centre
      const over = m.mids.filter((mid, i) => i !== drag.from && mid < center).length
      setDrag({ ...drag, over, dy })
    },
    onPointerUp: () => {
      if (drag) move(drag.from, drag.over)
      dragMeasure.current = null
      setDrag(null)
    },
    onPointerCancel: () => {
      dragMeasure.current = null
      setDrag(null)
    },
    onKeyDown: (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); move(index, index - 1, true) }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(index, index + 1, true) }
    },
  })

  /** Visual offset for an item while a drag is in progress. */
  const offsetFor = (index: number): number => {
    if (!drag) return 0
    const { from, over, dy, height } = drag
    if (index === from) return dy
    if (from < over && index > from && index <= over) return -height
    if (from > over && index >= over && index < from) return height
    return 0
  }

  const liveRegion = <p role="status" className="sr-only">{announcement}</p>

  if (steps.length === 0) {
    return (
      <>
        {liveRegion}
        <p className="py-8 text-center opacity-70">No exercises yet. Add one below.</p>
      </>
    )
  }

  return (
    <>
      {liveRegion}
      <ol className="flex flex-col gap-3" aria-label="Workout steps">
        {steps.map((step, index) => {
          const isDragged = drag?.from === index
          return (
            <li
              key={step.key}
              ref={(el) => {
                if (el) itemRefs.current.set(step.key, el)
                else itemRefs.current.delete(step.key)
              }}
              style={{
                transform: `translateY(${offsetFor(index)}px)`,
                // only animate the items making room; no transitions on drop so nothing jumps
                transition: drag && !isDragged ? 'transform 150ms ease' : 'none',
              }}
              className={isDragged ? 'relative z-10 opacity-90 shadow-lg shadow-black/50' : 'relative'}
            >
              {step.type === 'exercise' ? (
                <ExerciseStepCard
                  step={step}
                  exercise={exercisesById.get(step.exerciseId)}
                  onInfo={() => setInfo(exercisesById.get(step.exerciseId) ?? null)}
                  onChange={(s) => updateStep(index, s)}
                  onRemove={() => removeStep(index)}
                  onAddRestAfter={() => insertRest(index + 1)}
                  handleProps={handlePropsFor(index)}
                />
              ) : (
                <RestStepCard
                  step={step}
                  label={stepLabel(step, index)}
                  onChange={(s) => updateStep(index, s)}
                  onRemove={() => removeStep(index)}
                  handleProps={handlePropsFor(index)}
                />
              )}
            </li>
          )
        })}
      </ol>
      {info && <ExerciseModal data={info} onClose={() => setInfo(null)} />}
    </>
  )
}

/**
 * Full-screen searchable list for adding an exercise to the workout.
 */
const ExercisePicker = ({ exercises, focus, setFocus, onPick, onClose }: {
  exercises: Exercise[]
  focus: Focus
  setFocus: React.Dispatch<React.SetStateAction<Focus>>
  onPick: (exercise: Exercise) => void
  onClose: () => void
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [info, setInfo] = useState<Exercise | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal moves focus to the first button, so focus the search box after it
    searchRef.current?.focus()
    return lockScroll()
  }, [])

  const matches = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    const inFocus = filterByFocus(exercises, focus)
    return query ? inFocus.filter((e) => e.name.toLowerCase().includes(query)) : inFocus
  }, [exercises, focus, deferredSearch])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // React passes the details modal's close event up to here, so ignore it unless this dialog closed
      onClose={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overscroll-contain bg-bg text-white backdrop:bg-black/60"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <header className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-3xl">Add exercise</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close exercise picker"
            className="shrink-0 border-2 border-outline px-3 py-1 text-xl hover:border-primary"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <input
          ref={searchRef}
          type="search"
          aria-label="Search exercises"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-2 border-outline bg-bg p-2 focus:border-primary focus:outline-none"
        />
        <FocusSelect value={focus} onChange={setFocus} />
        <p role="status" className="sr-only">{matches.length} exercise{matches.length === 1 ? '' : 's'} found</p>
        <ul className="flex flex-col gap-2" aria-label="Exercises">
          {matches.slice(0, PICKER_LIMIT).map((exercise) => (
            <li key={exercise.id} className="flex border-2 border-outline has-[button:hover]:border-primary has-[button:focus-visible]:border-primary">
              <button
                type="button"
                onClick={() => onPick(exercise)}
                className="flex min-w-0 grow flex-col p-3 text-left focus-visible:outline-none"
              >
                <span>{exercise.name}</span>
                <span className="text-sm capitalize opacity-70">
                  <span className="sr-only">, works </span>
                  {exercise.primaryMuscles.join(', ')}
                </span>
              </button>
              <InfoButton onClick={() => setInfo(exercise)} label={exercise.name} className="border-l-2 border-outline px-4 text-xl" />
            </li>
          ))}
          {matches.length === 0 && <li className="text-center opacity-70">No exercises found.</li>}
          {matches.length > PICKER_LIMIT && (
            <li className="text-center text-sm opacity-70">
              Showing {PICKER_LIMIT} of {matches.length}. Search to narrow down.
            </li>
          )}
        </ul>
      </div>
      {info && (
        <ExerciseModal
          data={info}
          onClose={() => setInfo(null)}
          action={{ label: 'Add to workout', onClick: () => onPick(info) }}
        />
      )}
    </dialog>
  )
}

/**
 * Build or edit a single workout.
 */
const WorkoutEditor = ({ initial, isNew, exercises, onSave, onDelete, onCancel }: {
  initial: Workout
  isNew: boolean
  exercises: Exercise[]
  onSave: (workout: Workout) => void
  onDelete: () => void
  onCancel: () => void
}) => {
  const [name, setName] = useState(initial.name)
  const [steps, setSteps] = useState<WorkoutStep[]>(initial.steps)
  const [focus, setFocus] = useState<Focus>(() => focusFromWorkout(initial))
  const [picking, setPicking] = useState(false)

  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const exerciseSteps = steps.filter((s): s is ExerciseStep => s.type === 'exercise')
  const totalSets = exerciseSteps.reduce((n, s) => n + s.sets, 0)
  const canSave = exerciseSteps.length > 0 && steps.every(isStepValid)

  const save = () => onSave({ ...initial, name: name.trim() || 'Untitled workout', bodyAreas: focus.areas, muscles: focus.muscles, equipment: focus.equipment, steps })

  return (
    <section className="flex w-full max-w-2xl grow flex-col gap-4">
      <input
        type="text"
        aria-label="Workout name"
        placeholder="Workout name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border-2 border-outline bg-bg p-2 text-xl focus:border-primary focus:outline-none"
      />

      <div className="flex flex-col gap-2">
        <h2 className="text-lg">Filter exercises <span className="text-sm opacity-70">(what you have and what to work)</span></h2>
        <FocusSelect value={focus} onChange={setFocus} />
      </div>

      <h2 className="sr-only">Steps</h2>
      <p className="text-sm opacity-70">
        {exerciseSteps.length} exercise{exerciseSteps.length === 1 ? '' : 's'} · {totalSets} set{totalSets === 1 ? '' : 's'} · ~{formatDuration(estimateSeconds(steps))}
      </p>

      <StepList steps={steps} setSteps={setSteps} exercisesById={exercisesById} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label="Add exercise"
          className="border-2 border-outline p-3 hover:bg-tertiary"
        >
          + Exercise
        </button>
        <button
          type="button"
          onClick={() => setSteps((prev) => [...prev, newRestStep()])}
          disabled={steps.length === 0}
          aria-label="Add rest"
          className="border-2 border-dashed border-secondary p-3 hover:bg-secondary/50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          + Rest
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="border-2 border-primary bg-primary px-4 py-2 text-bg disabled:opacity-40"
          >
            Save
          </button>
          <button type="button" onClick={onCancel} className="border-2 border-outline px-4 py-2 hover:border-primary">
            Cancel
          </button>
        </div>
        {!isNew && (
          <button
            type="button"
            onClick={() => { if (confirm(`Delete "${initial.name}"?`)) onDelete() }}
            className="underline hover:text-primary"
          >
            Delete workout
          </button>
        )}
      </div>

      {picking && (
        <ExercisePicker
          exercises={exercises}
          focus={focus}
          setFocus={setFocus}
          onPick={(exercise) => {
            setSteps((prev) => [...prev, newExerciseStep(exercise.id)])
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  )
}

/**
 * Build workouts from exercises and rest times. Does not start a workout session.
 * Workouts are saved to localStorage.
 * @returns The workouts screen
 */
export default function Workouts({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const exercisesPromise = use(ExercisesContext)
  const exercises = exercisesPromise ? use(exercisesPromise) : noExercises
  const [workouts, setWorkouts] = useState<Workout[]>(loadWorkouts)
  const [editing, setEditing] = useState<Workout | null>(null)

  const persist = (next: Workout[]) => {
    setWorkouts(next)
    saveWorkouts(next)
  }

  const isNew = editing !== null && !workouts.some((w) => w.id === editing.id)

  return (
    <Layout setScreen={setScreen} title={editing ? (isNew ? 'New workout' : 'Edit workout') : 'Workouts'}>
      {editing ? (
        <WorkoutEditor
          key={editing.id}
          initial={editing}
          isNew={isNew}
          exercises={exercises}
          onSave={(workout) => {
            persist(isNew ? [...workouts, workout] : workouts.map((w) => (w.id === workout.id ? workout : w)))
            setEditing(null)
          }}
          onDelete={() => {
            persist(workouts.filter((w) => w.id !== editing.id))
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <section className="flex w-full max-w-2xl grow flex-col items-center gap-4">
          <ul className="flex w-full flex-col gap-3">
            {workouts.map((workout) => {
              const count = workout.steps.filter((s) => s.type === 'exercise').length
              return (
                <li key={workout.id} className="relative flex w-full flex-col gap-1 border-2 border-outline p-4 hover:border-primary has-[button:focus-visible]:border-primary">
                  <h2 className="text-xl">
                    {/* ::after stretches the click target over the whole card */}
                    <button
                      type="button"
                      onClick={() => setEditing(workout)}
                      aria-label={`Edit ${workout.name}`}
                      className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                    >
                      {workout.name}
                    </button>
                  </h2>
                  <p className="text-sm opacity-70">
                    {count} exercise{count === 1 ? '' : 's'} · ~{formatDuration(estimateSeconds(workout.steps))}
                  </p>
                  {describeFocus(focusFromWorkout(workout)) && (
                    <p className="text-sm capitalize">{describeFocus(focusFromWorkout(workout))}</p>
                  )}
                </li>
              )
            })}
          </ul>
          {workouts.length === 0 && <p className="opacity-70">No workouts yet.</p>}
          <button
            type="button"
            aria-label="New workout"
            className="p-8 rounded-full border-solid border-8 border-outline text-5xl aspect-square hover:bg-tertiary hover:cursor-pointer"
            onClick={() => setEditing(newWorkout())}
          >
            +
          </button>
        </section>
      )}
    </Layout>
  )
}
