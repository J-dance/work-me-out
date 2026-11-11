import { useEffect, useId, useRef, useState } from "react"
import type { BodyArea, Category, Exercise, Level, Muscle } from '../types'
import { BODY_AREAS, EQUIPMENT, lockScroll, newCustomExerciseId } from "../utils"
import { AREA_FILL, fieldLabel, focusRing, iconButton, input, primaryButton, softButton, toggleChip } from "../styles"
import { LevelBars } from "./ExerciseBits"

/** Every muscle, grouped by body area (chest, shoulders, back…) so each colour forms a run. */
const MUSCLES = (Object.entries(BODY_AREAS) as [BodyArea, Muscle[]][])
  .flatMap(([area, muscles]) => muscles.map((muscle) => ({ muscle, area })))

const CATEGORIES: Category[] = [
  'strength', 'stretching', 'plyometrics', 'cardio', 'powerlifting', 'olympic weightlifting', 'strongman',
]

const LEVELS: Level[] = ['beginner', 'intermediate', 'expert']

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

// text-base (16px): anything smaller makes iOS Safari zoom the page on focus
const fieldClass = `w-full min-w-0 text-base capitalize ${input}`

const MuscleChips = ({ label, value, onChange, disabled = [], secondary = false }: {
  label: string
  value: Muscle[]
  onChange: (value: Muscle[]) => void
  /** Shown but not selectable, e.g. secondary muscles already picked as primary */
  disabled?: Muscle[]
  /** Secondary muscles fill neutral rather than in their area colour, like in the exercise details */
  secondary?: boolean
}) => {
  const id = useId()
  const toggle = (m: Muscle) => onChange(value.includes(m) ? value.filter((v) => v !== m) : [...value, m])
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className={fieldLabel}>{label}</span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {MUSCLES.map(({ muscle: m, area }) => (
          <button
            key={m}
            type="button"
            aria-pressed={value.includes(m)}
            disabled={disabled.includes(m)}
            onClick={() => toggle(m)}
            className={`${toggleChip(value.includes(m), secondary ? 'bg-white text-bg' : AREA_FILL[area])} disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Beginner / intermediate / expert as three toggle buttons, each with its level bars. */
const LevelPicker = ({ value, onChange }: { value: Level, onChange: (level: Level) => void }) => {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className={fieldLabel}>Level</span>
      <div role="group" aria-labelledby={id} className="grid grid-cols-3 gap-2">
        {LEVELS.map((level) => {
          const selected = value === level
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-sm capitalize hover:cursor-pointer ${focusRing} ${selected ? 'border-primary bg-surface font-medium' : 'border-outline hover:bg-surface'}`}
            >
              <LevelBars level={level} />
              {level}
            </button>
          )
        })}
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
  <label className="flex min-w-0 flex-col gap-1.5 text-sm">
    <span className="text-white/75">{label}</span>
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
      {/* same side padding and column width as the screens */}
      <form onSubmit={save} noValidate className="mx-auto flex max-w-[calc(var(--container-2xl)+2*var(--page-px))] flex-col gap-6 px-(--page-px) py-6">
        <header className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-[clamp(1.75rem,7vw,2.25rem)] font-bold leading-tight tracking-tight">{initial ? 'Edit exercise' : 'New exercise'}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close without saving"
            className={`size-10 ${iconButton}`}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/75">Name</span>
          <input
            ref={nameRef}
            type="text"
            value={exercise.name}
            onChange={(e) => set('name')(e.target.value)}
            aria-invalid={triedSave && !name}
            autoComplete="off"
            className={`${fieldClass} text-lg font-semibold normal-case aria-invalid:border-primary`}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Equipment" value={exercise.equipment ?? 'body only'} options={EQUIPMENT} onChange={set('equipment')} />
          <Select label="Category" value={exercise.category} options={CATEGORIES} onChange={set('category')} />
        </div>

        <LevelPicker value={exercise.level} onChange={set('level')} />

        {/* same wording as the exercise details: "Main" muscles in colour, "Also works" in grey */}
        <MuscleChips label="Main muscles" value={exercise.primaryMuscles} onChange={set('primaryMuscles')} />
        <MuscleChips
          label="Also works (optional)"
          value={exercise.secondaryMuscles}
          onChange={set('secondaryMuscles')}
          disabled={exercise.primaryMuscles}
          secondary
        />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/75">How to do it (optional, one step per line)</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            className={`${fieldClass} normal-case`}
          />
        </label>

        {/* always rendered so screen readers pick up the message when it appears; when empty, the negative margin cancels its gap */}
        <p role="status" className="text-primary empty:-mt-6">{triedSave && problems.join('. ')}</p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <button type="submit" className={primaryButton}>
              Save
            </button>
            <button type="button" onClick={() => dialogRef.current?.close()} className={softButton}>
              Cancel
            </button>
          </div>
          {initial && onDelete && (
            <button type="button" onClick={remove} className="rounded-full px-3 py-2 text-sm underline hover:cursor-pointer hover:text-primary">
              Delete exercise
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
