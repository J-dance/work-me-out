import { useEffect, useId, useRef, useState } from "react"
import type { Category, Equipment, Exercise, Level, Muscle } from '../types'
import { lockScroll, newCustomExerciseId } from "../utils"

const MUSCLES: Muscle[] = [
  'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest', 'forearms', 'glutes', 'hamstrings',
  'lats', 'lower back', 'middle back', 'neck', 'quadriceps', 'shoulders', 'traps', 'triceps',
]

const CATEGORIES: Category[] = [
  'strength', 'stretching', 'plyometrics', 'cardio', 'powerlifting', 'olympic weightlifting', 'strongman',
]

const LEVELS: Level[] = ['beginner', 'intermediate', 'expert']

/** Most common first; "other" last as it's a catch-all. Same order as the workout builder's chips. */
const EQUIPMENT: Equipment[] = [
  'body only', 'dumbbell', 'barbell', 'kettlebells', 'cable', 'machine', 'bands',
  'medicine ball', 'exercise ball', 'e-z curl bar', 'foam roll', 'other',
]

/** Starting values for a new custom exercise; any of them can be prefilled, e.g. from the picker's search and filters. */
export type CustomExerciseDraft = Partial<Pick<Exercise, 'name' | 'equipment' | 'primaryMuscles' | 'category' | 'level'>>

const fromDraft = (draft: CustomExerciseDraft = {}): Exercise => ({
  id: newCustomExerciseId(),
  name: draft.name ?? '',
  force: null,
  level: draft.level ?? 'beginner',
  mechanic: null,
  equipment: draft.equipment ?? 'body only',
  primaryMuscles: draft.primaryMuscles ?? [],
  secondaryMuscles: [],
  instructions: [],
  category: draft.category ?? 'strength',
  images: [],
  custom: true,
})

const chipClass = (selected: boolean) =>
  `rounded-full border-2 px-3 py-1 text-sm capitalize ${selected ? 'border-primary bg-tertiary' : 'border-outline hover:border-primary'}`

// text-base (16px): anything smaller makes iOS Safari zoom the page on focus
const fieldClass = 'w-full min-w-0 border-2 border-outline bg-bg p-2 text-base capitalize focus:border-primary focus:outline-none'

const MuscleChips = ({ label, value, onChange, disabled = [] }: {
  label: string
  value: Muscle[]
  onChange: (value: Muscle[]) => void
  /** Shown but not selectable, e.g. secondary muscles already picked as primary */
  disabled?: Muscle[]
}) => {
  const id = useId()
  const toggle = (m: Muscle) => onChange(value.includes(m) ? value.filter((v) => v !== m) : [...value, m])
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-sm opacity-70">{label}</span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {MUSCLES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={value.includes(m)}
            disabled={disabled.includes(m)}
            onClick={() => toggle(m)}
            className={`${chipClass(value.includes(m))} disabled:opacity-30 disabled:hover:border-outline`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}

const Select = <T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: T[]
  onChange: (value: T) => void
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-sm">
    <span className="opacity-70">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={fieldClass}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
)

/**
 * Full-screen form to create or edit one of the user's own exercises.
 * Pass `initial` to edit an existing custom exercise, or `draft` to prefill a new one.
 * Can be opened on top of another dialog (e.g. the workout builder's exercise picker).
 */
export default function CustomExerciseForm({ initial, draft, onSave, onDelete, usedIn = 0, onClose }: {
  initial?: Exercise
  draft?: CustomExerciseDraft
  onSave: (exercise: Exercise) => void
  /** Shown when editing. */
  onDelete?: () => void
  /** Number of saved workouts that use this exercise, to warn before deleting. */
  usedIn?: number
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const [exercise, setExercise] = useState<Exercise>(() => initial ?? fromDraft(draft))
  // one step per line; kept as text so blank lines can be typed in the middle
  const [instructions, setInstructions] = useState(() => exercise.instructions.join('\n'))
  const [triedSave, setTriedSave] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
    // a prefilled name is most likely right, so only jump to it when it's empty
    if (!exercise.name) nameRef.current?.focus()
    return lockScroll()
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = <K extends keyof Exercise>(key: K) => (value: Exercise[K]) => setExercise((prev) => ({ ...prev, [key]: value }))

  const name = exercise.name.trim()
  const problems = [
    !name && 'Add a name',
    exercise.primaryMuscles.length === 0 && 'Pick at least one primary muscle',
  ].filter((p): p is string => Boolean(p))

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    setTriedSave(true)
    if (problems.length > 0) return
    onSave({
      ...exercise,
      name,
      // a muscle can't be both, primary wins
      secondaryMuscles: exercise.secondaryMuscles.filter((m) => !exercise.primaryMuscles.includes(m)),
      instructions: instructions.split('\n').map((line) => line.trim()).filter(Boolean),
      custom: true,
    })
    dialogRef.current?.close()
  }

  const remove = () => {
    const warning = usedIn > 0
      ? `"${exercise.name}" is used in ${usedIn} workout${usedIn === 1 ? '' : 's'}. Those steps will show as "Unknown exercise". Delete anyway?`
      : `Delete "${exercise.name}"?`
    if (!confirm(warning)) return
    onDelete?.()
    dialogRef.current?.close()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overscroll-contain bg-bg text-white backdrop:bg-black/60"
    >
      <form onSubmit={save} noValidate className="mx-auto flex max-w-2xl flex-col gap-5 p-4 sm:p-6">
        <header className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-3xl">{initial ? 'Edit exercise' : 'New exercise'}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close without saving"
            className="shrink-0 border-2 border-outline px-3 py-1 text-xl hover:border-primary"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-70">Name</span>
          <input
            ref={nameRef}
            type="text"
            value={exercise.name}
            onChange={(e) => set('name')(e.target.value)}
            aria-invalid={triedSave && !name}
            autoComplete="off"
            className={`${fieldClass} normal-case`}
          />
        </label>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
          <Select label="Equipment" value={exercise.equipment ?? 'body only'} options={EQUIPMENT} onChange={set('equipment')} />
          <Select label="Category" value={exercise.category} options={CATEGORIES} onChange={set('category')} />
          <Select label="Level" value={exercise.level} options={LEVELS} onChange={set('level')} />
        </div>

        <MuscleChips label="Primary muscles" value={exercise.primaryMuscles} onChange={set('primaryMuscles')} />
        <MuscleChips
          label="Secondary muscles (optional)"
          value={exercise.secondaryMuscles}
          onChange={set('secondaryMuscles')}
          disabled={exercise.primaryMuscles}
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-70">Instructions (optional, one step per line)</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            className={`${fieldClass} normal-case`}
          />
        </label>

        {/* always rendered so screen readers pick up the message when it appears */}
        <p role="status" className="text-primary">{triedSave && problems.join('. ')}</p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button type="submit" className="border-2 border-primary bg-primary px-4 py-2 text-bg">
              Save
            </button>
            <button type="button" onClick={() => dialogRef.current?.close()} className="border-2 border-outline px-4 py-2 hover:border-primary">
              Cancel
            </button>
          </div>
          {initial && onDelete && (
            <button type="button" onClick={remove} className="underline hover:text-primary">
              Delete exercise
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
