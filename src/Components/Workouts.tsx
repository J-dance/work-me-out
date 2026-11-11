import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react"
import Layout from "./Layout"
import type { Screen, Exercise, Workout, WorkoutStep, ExerciseStep, RestStep, BodyArea, Muscle, Equipment } from '../types'
import { useCustomExercises, useExercises } from "../context"
import { BODY_AREAS, EQUIPMENT, cacheImages, estimateSeconds, formatDuration, loadWorkouts, lockScroll, saveWorkouts, speakDuration, uid } from "../utils"
import ExerciseModal from "./ExerciseModal"
import CustomExerciseForm, { type CustomExerciseDraft } from "./CustomExerciseForm"
import { InfoButton } from "./Buttons"
import { imgBase } from "./ExerciseProvider"
import { DataNote } from "./Notices"
import { MuscleChip } from "./ExerciseBits"
import WorkoutCard from "./WorkoutCard"
import { AREA_FILL, card, dashedButton, fieldLabel, focusRing, iconButton, input, primaryButton, softButton, toggleChip } from "../styles"

/** Gap between list items in px. Must match the `gap-3` on the step list. */
const LIST_GAP = 12

/** Max exercises shown in the picker at once, keeps the list fast. */
const PICKER_LIMIT = 50

const newExerciseStep = (exerciseId: string): ExerciseStep => ({
  type: 'exercise', key: uid(), exerciseId, sets: 3, reps: 10, duration: null, restBetweenSets: 60,
})

const newRestStep = (): RestStep => ({ type: 'rest', key: uid(), duration: 60 })

const newWorkout = (): Workout => ({ id: uid(), name: '', bodyAreas: [], muscles: [], equipment: [], steps: [] })

const bodyAreaNames = Object.keys(BODY_AREAS) as BodyArea[]

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
    .flatMap((area) => BODY_AREAS[area].map((muscle) => ({ muscle, area })))

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-equipment`} className={fieldLabel}>Equipment</span>
      <div role="group" aria-labelledby={`${id}-equipment`} className="flex flex-wrap gap-2">
        {EQUIPMENT.map((item) => (
          <button key={item} type="button" aria-pressed={value.equipment.includes(item)} onClick={() => toggleEquipment(item)} className={toggleChip(value.equipment.includes(item))}>
            {item}
          </button>
        ))}
      </div>
      <span id={`${id}-areas`} className={`mt-2 ${fieldLabel}`}>Body areas</span>
      <div role="group" aria-labelledby={`${id}-areas`} className="flex flex-wrap gap-2">
        {bodyAreaNames.map((area) => (
          <button key={area} type="button" aria-pressed={value.areas.includes(area)} onClick={() => toggleArea(area)} className={toggleChip(value.areas.includes(area), AREA_FILL[area])}>
            {area}
          </button>
        ))}
      </div>
      {muscleOptions.length > 0 && (
        <div role="group" aria-labelledby={`${id}-muscles`} className="mt-1 flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-3">
          <span id={`${id}-muscles`} className={fieldLabel}>Muscles:</span>
          {muscleOptions.map(({ muscle, area }) => (
            <button key={muscle} type="button" aria-pressed={value.muscles.includes(muscle)} onClick={() => toggleMuscle(muscle)} className={toggleChip(value.muscles.includes(muscle), AREA_FILL[area])}>
              {muscle}
            </button>
          ))}
        </div>
      )}
      {hasFilters && (
        <button type="button" onClick={() => onChange(emptyFocus)} className="mt-1 self-start text-sm underline hover:text-primary">
          Clear filters
        </button>
      )}
    </div>
  )
}

/**
 * Starting values for an exercise created from the picker: the search text, plus whatever the filters pin down.
 * Areas with a single muscle (chest, core) count as picking that muscle; one equipment chip counts as picking it.
 */
const draftFromPicker = (search: string, { equipment, areas, muscles }: Focus): CustomExerciseDraft => ({
  name: search.trim(),
  equipment: equipment.length === 1 ? equipment[0] : undefined,
  primaryMuscles: [...new Set([...muscles, ...areas.filter((a) => BODY_AREAS[a].length === 1).flatMap((a) => BODY_AREAS[a])])],
})

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
      <span className="text-white/75">
        {label}
        {suffix && <span className="sr-only"> ({suffix === 's' ? 'seconds' : suffix})</span>}
      </span>
      <span className="flex items-center overflow-hidden rounded-xl border-2 border-outline bg-bg focus-within:border-primary">
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
          className="w-full min-w-0 bg-bg px-3 py-2 text-base focus:outline-none"
        />
        {suffix && <span aria-hidden="true" className="pr-3 text-white/75">{suffix}</span>}
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
    className={`flex shrink-0 cursor-grab touch-none items-center self-stretch rounded-lg px-1 text-xl text-white/60 hover:text-white focus-visible:text-white active:cursor-grabbing sm:px-2 ${focusRing}`}
    {...handleProps}
  >
    <span aria-hidden="true">⠿</span>
  </button>
)

const RemoveButton = ({ onClick, label }: { onClick: () => void, label: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Remove ${label}`}
    className={`size-9 self-start bg-bg/60 text-sm ${iconButton}`}
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
    <div className={`flex gap-1 ${card} p-3 sm:gap-2 sm:p-4`}>
      <DragHandle handleProps={handleProps} label={name} />
      <div className="flex min-w-0 grow flex-col gap-3">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug wrap-break-word">{name}</h3>
            <p className="text-sm text-white/75">{describeSets(step)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {exercise && <InfoButton onClick={onInfo} label={name} className={`size-9 bg-bg/60 ${iconButton}`} />}
            <RemoveButton onClick={onRemove} label={name} />
          </div>
        </header>

        {/* 3 across normally; drops to 2 (then 1) on mini screens rather than squashing the inputs */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
          <NumberField label="Sets" value={step.sets} min={1} max={50} onChange={(v) => v !== null && update('sets')(v)} />
          <NumberField label="Reps" value={step.reps} min={1} optional onChange={update('reps')} />
          <NumberField label="Time" value={step.duration} min={1} optional suffix="s" onChange={update('duration')} />
        </div>

        {step.sets > 1 && (
          <div className="max-w-40">
            <NumberField label="Rest between sets" value={step.restBetweenSets} suffix="s" onChange={(v) => v !== null && update('restBetweenSets')(v)} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {/* always rendered so screen readers pick up the message when it appears */}
          <span role="status" className="text-primary">
            {!isStepValid(step) && `${name}: set reps and/or time`}
          </span>
          <button type="button" onClick={onAddRestAfter} aria-label={`Add rest after ${name}`} className={`rounded-full bg-bg/60 px-3 py-1 hover:cursor-pointer hover:bg-tertiary ${focusRing}`}>
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
  <div className="flex items-center gap-1 rounded-2xl border-2 border-dashed border-secondary bg-secondary/15 p-3 sm:gap-2 sm:p-4">
    <DragHandle handleProps={handleProps} label={label} />
    {/* on mini screens the duration field wraps under the title instead of crushing it */}
    <div className="flex min-w-0 grow flex-wrap items-center gap-x-2 gap-y-1">
      <h3 className="grow whitespace-nowrap font-semibold">
        <span aria-hidden="true">Rest · {formatDuration(step.duration)}</span>
        <span className="sr-only">Rest, {speakDuration(step.duration)}</span>
      </h3>
      <div className="w-28">
        <NumberField label="Duration" value={step.duration} min={1} suffix="s" onChange={(v) => v !== null && onChange({ ...step, duration: v })} />
      </div>
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
        <p className="py-8 text-center text-white/75">No exercises yet. Add one below.</p>
      </>
    )
  }

  return (
    <>
      {liveRegion}
      {/* while dragging, a finger/mouse sweeping over other cards shouldn't start a text selection */}
      <ol className={`flex flex-col gap-3 ${drag ? 'select-none' : ''}`} aria-label="Workout steps">
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
              className={isDragged ? 'relative z-10 rounded-2xl opacity-90 shadow-lg shadow-black/50' : 'relative'}
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
  const [creating, setCreating] = useState(false)
  const { add } = useCustomExercises()

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
      {/* same side padding and column width as the screens */}
      <div className="mx-auto flex max-w-[calc(var(--container-2xl)+2*var(--page-px))] flex-col gap-4 px-(--page-px) py-6">
        <header className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-[clamp(1.75rem,7vw,2.25rem)] font-bold leading-tight tracking-tight">Add exercise</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close exercise picker"
            className={`size-10 ${iconButton}`}
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
          className={`w-full ${input}`}
        />
        <FocusSelect value={focus} onChange={setFocus} />
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={dashedButton}
        >
          {/* when nothing matches, offer the search text as the name */}
          {matches.length === 0 && search.trim() ? `+ Create "${search.trim()}"` : '+ Create your own exercise'}
        </button>
        <p role="status" className="sr-only">{matches.length} exercise{matches.length === 1 ? '' : 's'} found</p>
        <ul className="flex flex-col gap-3" aria-label="Exercises">
          {matches.slice(0, PICKER_LIMIT).map((exercise) => (
            <li key={exercise.id} className={`flex items-center gap-2 ${card} pr-3 transition-colors has-[button:hover]:bg-surface-hover motion-reduce:transition-none`}>
              <button
                type="button"
                onClick={() => onPick(exercise)}
                className={`flex min-w-0 grow flex-col gap-2 rounded-2xl py-4 pl-5 text-left hover:cursor-pointer ${focusRing}`}
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold leading-snug">
                  {exercise.name}
                  {exercise.custom && <span className="rounded-full bg-bg/60 px-2 py-0.5 text-xs font-normal text-primary">Yours</span>}
                </span>
                <span className="flex flex-wrap gap-2">
                  <span className="sr-only">, works </span>
                  {exercise.primaryMuscles.map((m) => <MuscleChip key={m} muscle={m} />)}
                </span>
              </button>
              <InfoButton onClick={() => setInfo(exercise)} label={exercise.name} className={`size-10 bg-bg/60 text-lg ${iconButton}`} />
            </li>
          ))}
          {matches.length === 0 && <li className="py-6 text-center text-white/75">No exercises found.</li>}
          {matches.length > PICKER_LIMIT && (
            <li className="text-center text-sm text-white/75">
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
      {creating && (
        <CustomExerciseForm
          draft={draftFromPicker(search, focus)}
          onSave={(exercise) => {
            add(exercise)
            onPick(exercise)
          }}
          onClose={() => setCreating(false)}
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
  // collapsed for a new workout to keep the screen calm; open when editing one that already has filters
  const [showFilters, setShowFilters] = useState(() => !isNew && (focus.areas.length > 0 || focus.equipment.length > 0))
  const filtersId = useId()
  const filterCount = focus.equipment.length + focus.areas.length + focus.muscles.length

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
        className={`w-full text-xl font-semibold ${input}`}
      />

      <div className="flex flex-col gap-3">
        <h2>
          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls={filtersId}
            onClick={() => setShowFilters((v) => !v)}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-3 text-left hover:cursor-pointer hover:bg-tertiary ${focusRing}`}
          >
            <span className="flex flex-col">
              <span className="font-semibold">
                Filter exercises
                {!showFilters && filterCount > 0 && <span className="font-normal text-primary"> ({filterCount})</span>}
              </span>
              <span className="text-sm text-white/75">What you have and what to work</span>
            </span>
            <span aria-hidden="true" className={`text-sm transition-transform motion-reduce:transition-none ${showFilters ? 'rotate-180' : ''}`}>▾</span>
          </button>
        </h2>
        <div id={filtersId} hidden={!showFilters}>
          <FocusSelect value={focus} onChange={setFocus} />
        </div>
      </div>

      <h2 className="sr-only">Steps</h2>
      <p className="mt-2 text-sm text-white/75">
        {exerciseSteps.length} exercise{exerciseSteps.length === 1 ? '' : 's'} · {totalSets} set{totalSets === 1 ? '' : 's'} · ~{formatDuration(estimateSeconds(steps))}
      </p>

      <StepList steps={steps} setSteps={setSteps} exercisesById={exercisesById} />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label="Add exercise"
          className={dashedButton}
        >
          + Exercise
        </button>
        <button
          type="button"
          onClick={() => setSteps((prev) => [...prev, newRestStep()])}
          disabled={steps.length === 0}
          aria-label="Add rest"
          className={`rounded-2xl border-2 border-dashed border-secondary p-4 font-semibold hover:cursor-pointer hover:bg-secondary/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${focusRing}`}
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
            className={primaryButton}
          >
            Save
          </button>
          <button type="button" onClick={onCancel} className={softButton}>
            Cancel
          </button>
        </div>
        {!isNew && (
          <button
            type="button"
            onClick={() => { if (confirm(`Delete "${initial.name}"?`)) onDelete() }}
            className="rounded-full px-3 py-2 text-sm underline hover:cursor-pointer hover:text-primary"
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
  const exercises = useExercises()
  const [workouts, setWorkouts] = useState<Workout[]>(loadWorkouts)
  const [editing, setEditing] = useState<Workout | null>(null)

  const persist = (next: Workout[]) => {
    setWorkouts(next)
    saveWorkouts(next)
  }

  // keep images for every saved workout available offline (also covers workouts saved before caching existed)
  useEffect(() => {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    const urls = workouts.flatMap((w) =>
      w.steps.flatMap((s) => (s.type === 'exercise' ? (byId.get(s.exerciseId)?.images ?? []) : [])),
    )
    void cacheImages(urls.map((src) => imgBase + src))
  }, [workouts, exercises])

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
        <section className="flex w-full max-w-2xl grow flex-col gap-3">
          {/* same place and style as "+ New exercise" on the Exercises screen */}
          <button type="button" className={`w-full ${dashedButton}`} onClick={() => setEditing(newWorkout())}>
            + New workout
          </button>
          {workouts.length > 0 ? (
            <ul className="flex w-full flex-col gap-3">
              {workouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} actionLabel="Edit" onSelect={() => setEditing(workout)} />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-white/75">No workouts yet.</p>
          )}
          <DataNote />
        </section>
      )}
    </Layout>
  )
}
