import Layout from "./Layout";
import type { Exercise, Screen, Workout } from "../types";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";
import { formatDuration, loadWorkouts, playBeep, speakDuration, Timer, unlockAudio, useFillViewport, useFocusOnChange, useWakeLock } from "../utils";
import { useExercises } from "../context";
import ExerciseImage from "./ExerciseImage";
import ExerciseModal from "./ExerciseModal";
import { InfoButton } from "./Buttons";
import { MuscleChip } from "./ExerciseBits";
import WorkoutCard from "./WorkoutCard";
import { card, fieldLabel, focusRing, iconButton, primaryButton, softButton, softButtonOnCard } from "../styles";

/** One thing to do during a session: a single set of an exercise, or a rest. */
type Phase =
  | {
    kind: 'work'
    key: string
    exercise: Exercise | undefined
    name: string
    set: number
    sets: number
    reps: number | null
    /** Seconds, null if the set is reps only (advanced manually) */
    duration: number | null
  }
  | {
    kind: 'rest'
    key: string
    label: string
    duration: number
  }

type Status = 'ready' | 'running' | 'paused' | 'done'

/** Flattens a workout's steps into the ordered list of sets and rests to run through. */
const buildPhases = (workout: Workout, exercisesById: Map<string, Exercise>): Phase[] => {
  const phases: Phase[] = []
  for (const step of workout.steps) {
    if (step.type === 'rest') {
      if (step.duration > 0) phases.push({ kind: 'rest', key: step.key, label: 'Rest', duration: step.duration })
      continue
    }
    const exercise = exercisesById.get(step.exerciseId)
    for (let set = 1; set <= step.sets; set++) {
      phases.push({
        kind: 'work',
        key: `${step.key}-set${set}`,
        exercise,
        name: exercise?.name ?? 'Unknown exercise',
        set,
        sets: step.sets,
        reps: step.reps,
        duration: step.duration,
      })
      if (set < step.sets && step.restBetweenSets > 0) {
        phases.push({ kind: 'rest', key: `${step.key}-rest${set}`, label: 'Rest between sets', duration: step.restBetweenSets })
      }
    }
  }
  // a rest at the very end has nothing to rest for
  while (phases.at(-1)?.kind === 'rest') phases.pop()
  return phases
}

const describeWork = (phase: Extract<Phase, { kind: 'work' }>): string => {
  const parts = [
    phase.reps !== null && `${phase.reps} reps`,
    phase.duration !== null && formatDuration(phase.duration),
  ].filter(Boolean)
  return parts.join(' in ')
}

/** What a screen reader announces when a phase starts, e.g. "Squat, set 1 of 3, 10 reps" or "Rest, 1 minute". */
const announcePhase = (phase: Phase): string => phase.kind === 'rest'
  ? `${phase.label}, ${speakDuration(phase.duration)}`
  : [
    `${phase.name}, set ${phase.set} of ${phase.sets}`,
    phase.reps !== null && `${phase.reps} reps`,
    phase.duration !== null && speakDuration(phase.duration),
  ].filter(Boolean).join(', ')

/**
 * Select workout.
 * Start a workout session.
 * @returns The session screen
 */
export default function Session({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [workout, setWorkout] = useState<Workout | null>(null)

  return (
    <Layout setScreen={setScreen} title="Let's go">{
      <section className="flex w-full max-w-2xl grow flex-col gap-4">
        {
          workout ?
            <WorkoutComponent key={workout.id} workout={workout} onExit={() => setWorkout(null)} /> :
            <SelectWorkout setWorkout={setWorkout} setScreen={setScreen} />
        }
      </section>
    }</Layout>
  )
}

/** Shortest the session view gets before the page scrolls instead (small phones in landscape, etc.). */
const MIN_SESSION_HEIGHT = 380

function WorkoutComponent({ workout, onExit }: { workout: Workout, onExit: () => void }) {
  const exercises = useExercises()
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const phases = useMemo(() => buildPhases(workout, exercisesById), [workout, exercisesById])

  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<Status>('ready')
  const [remaining, setRemaining] = useState<number | null>(phases[0]?.duration ?? null) // seconds
  const [info, setInfo] = useState<Exercise | null>(null)

  const timerRef = useRef<Timer | null>(null)
  const headingRef = useFocusOnChange<HTMLHeadingElement>()
  // the whole session (minus the page footer) fits the screen; below this height it scrolls instead
  const fillRef = useFillViewport<HTMLDivElement>(MIN_SESSION_HEIGHT)
  // keep the screen on while the workout is running, so the phone locking doesn't pause the timer
  useWakeLock(status === 'running')

  /**
   * Moves to a phase and loads its time into the timer.
   * The timer only starts if the session is running.
   */
  const goTo = (i: number, nextStatus: Status) => {
    const timer = timerRef.current
    timer?.stopTimer()
    const phase = phases[i]
    if (!phase) {
      setIndex(phases.length)
      setStatus('done')
      setRemaining(null)
      return
    }
    setIndex(i)
    setStatus(nextStatus)
    setRemaining(phase.duration)
    if (phase.duration !== null && timer) {
      timer.setDuration(phase.duration)
      if (nextStatus === 'running') timer.startTimer()
    }
  }

  // effect event: always sees the latest index/goTo, so the Timer (created once) never calls a stale one
  const onTimerFinish = useEffectEvent(() => {
    playBeep()
    goTo(index + 1, 'running')
  })

  // create the Timer once on mount, and stop it on unmount
  useEffect(() => {
    const timer = new Timer(setRemaining, () => onTimerFinish(), 0)
    timerRef.current = timer
    return () => timer.stopTimer()
  }, [])

  if (phases.length === 0) {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold wrap-break-word focus:outline-none">{workout.name}</h2>
        <p className="text-white/75">This workout has no exercises yet. Add some on the Workouts screen.</p>
        <button type="button" onClick={onExit} className={`self-start ${softButton}`}>Choose another workout</button>
      </>
    )
  }

  const phase = phases[index] as Phase | undefined
  const upNext = phases[index + 1] as Phase | undefined
  const afterNext = phases[index + 2] as Phase | undefined
  const isTimed = phase?.duration != null

  const pause = () => {
    timerRef.current?.stopTimer()
    setStatus('paused')
  }

  const resume = () => {
    unlockAudio()
    const timer = timerRef.current
    if (timer && remaining !== null) {
      timer.setDuration(remaining)
      timer.startTimer()
    }
    setStatus('running')
  }

  const isDone = status === 'done' || !phase

  // one button whose label and action change with the status, so focus stays on it when you press Start/Pause/Resume
  const primary = status === 'ready'
    ? { label: 'Start', onClick: () => { unlockAudio(); goTo(index, 'running') } }
    : status === 'paused'
      ? { label: 'Resume', onClick: resume }
      : isTimed
        ? { label: 'Pause', onClick: pause }
        : { label: 'Done', onClick: () => goTo(index + 1, 'running') }

  // announced politely whenever the phase changes (including when the timer moves on by itself)
  const announcement = isDone
    ? 'Workout complete!'
    : status === 'ready' ? '' : `${status === 'paused' ? 'Paused. ' : ''}${announcePhase(phase)}`

  return (
    // fills the screen height; the current-step card takes up whatever space is left
    <div ref={fillRef} className="box-border flex flex-col gap-3 pb-[env(safe-area-inset-bottom)] short:gap-2">
      {/* wraps so "Change workout" drops under a long name on narrow screens instead of running off the edge */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 ref={headingRef} tabIndex={-1} className="min-w-0 text-lg font-semibold leading-snug wrap-break-word focus:outline-none">{workout.name}</h2>
        <button type="button" onClick={onExit} className={`shrink-0 rounded-full bg-surface px-3 py-1 text-sm hover:cursor-pointer hover:bg-tertiary ${focusRing}`}>Change workout</button>
      </header>

      {/* Progress bar */}
      <div
        className="h-2 w-full shrink-0 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-label="Workout progress"
        aria-valuemin={0}
        aria-valuemax={phases.length}
        aria-valuenow={index}
        aria-valuetext={`${index} of ${phases.length} steps complete`}
      >
        <div className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none" style={{ width: `${(index / phases.length) * 100}%` }} />
      </div>

      <p role="status" className="sr-only">{announcement}</p>

      {isDone ? (
        <WorkoutComplete onRestart={() => goTo(0, 'ready')} onExit={onExit} />
      ) : (
        <>
          <CurrentPhase phase={phase} remaining={remaining} status={status} onInfo={setInfo} />

          {/* main action wider and filled, Back/Skip as soft pills either side */}
          <div className="grid shrink-0 grid-cols-[1fr_1.4fr_1fr] gap-3" role="group" aria-label="Session controls">
            <button
              type="button"
              onClick={() => goTo(index - 1, status === 'ready' ? 'ready' : 'running')}
              disabled={index === 0}
              aria-label="Previous step"
              className={`${softButton} px-2 py-3 short:py-2.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface`}
            >Back</button>
            <button type="button" onClick={primary.onClick} className={`${primaryButton} px-2 py-3 text-lg short:py-2.5`}>{primary.label}</button>
            <button
              type="button"
              aria-label="Skip step"
              onClick={() => goTo(index + 1, status === 'ready' ? 'ready' : status)}
              className={`${softButton} px-2 py-3 short:py-2.5`}
            >Skip</button>
          </div>

          <UpNext next={upNext} then={afterNext} />
        </>
      )}

      {/* lives here rather than in CurrentPhase, so it stays open if the timer moves on to a rest */}
      {info && <ExerciseModal data={info} onClose={() => setInfo(null)} />}
    </div>
  )
}

/** Large display of what to do right now. */
function CurrentPhase({ phase, remaining, status, onInfo }: {
  phase: Phase
  remaining: number | null
  status: Status
  /** Opens the exercise details */
  onInfo: (exercise: Exercise) => void
}) {
  const clock = remaining !== null && (
    // role="timer" is not live by default, so it doesn't announce every second
    <p role="timer" aria-label="Time remaining" className={`text-6xl leading-none font-bold sm:text-7xl tracking-tight tabular-nums select-none ${status === 'paused' ? 'opacity-50' : ''}`}>
      <span aria-hidden="true">{formatDuration(remaining)}</span>
      <span className="sr-only">{speakDuration(remaining)}{status === 'paused' ? ', paused' : ''}</span>
    </p>
  )

  if (phase.kind === 'rest') {
    return (
      // same soft green as rest steps in the workout editor
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-secondary bg-secondary/15 px-5 py-6 text-center">
        <p className={fieldLabel}>{phase.label}</p>
        <h3 className="text-3xl font-bold">Breathe</h3>
        {clock}
      </div>
    )
  }

  const { exercise } = phase
  // the data has up to two images (start and end position), shown side by side
  const images = exercise?.images.slice(0, 2) ?? []
  return (
    // grows to fill the space left on screen; the photos are the part that stretches or shrinks
    <div className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-3 ${card} px-4 py-4 text-center sm:px-5 short:gap-2 short:py-3`}>
      <p className="rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">Set {phase.set} of {phase.sets}</p>
      <div className="flex max-w-full items-center justify-center gap-2">
        <h3 className="min-w-0 text-xl font-bold leading-tight tracking-tight text-balance wrap-break-word sm:text-3xl">{phase.name}</h3>
        {exercise && <InfoButton onClick={() => onInfo(exercise)} label={phase.name} className={`size-9 bg-bg/60 ${iconButton}`} />}
      </div>
      {exercise && exercise.primaryMuscles.length > 0 && (
        // dropped on short screens to make room; still in the exercise details
        <p className="flex flex-wrap justify-center gap-2 short:hidden">
          <span className="sr-only">Works </span>
          {exercise.primaryMuscles.map((m) => <MuscleChip key={m} muscle={m} size="md" />)}
        </p>
      )}
      {images.length > 0 && (
        // min-h-16: if there's barely any room, keep a sliver rather than letting them vanish
        <div className={`grid min-h-16 w-full max-h-80 flex-1 grid-rows-[minmax(0,1fr)] gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {images.map((src, i) => (
            <ExerciseImage
              key={src}
              src={src}
              alt={`${phase.name} demonstration, ${i + 1} of ${images.length}`}
              className="h-full min-h-0 w-full rounded-xl object-contain"
            />
          ))}
        </div>
      )}
      {phase.reps !== null && <p className="text-3xl font-bold">{phase.reps} <span className="text-xl font-normal text-white/75">reps</span></p>}
      {clock}
      {status === 'running' && phase.duration === null && <p className="text-sm text-white/75">Press Done when you finish the set</p>}
    </div>
  )
}

/** Small preview of the next phase, plus the exercise after a rest. */
function UpNext({ next, then }: { next: Phase | undefined, then: Phase | undefined }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={`flex shrink-0 flex-col gap-0.5 ${card} px-5 py-3 short:py-2`}>
      <h3 id={headingId} className={fieldLabel}>Up next</h3>
      {!next ? (
        <p className="font-semibold">Finish!</p>
      ) : next.kind === 'rest' ? (
        <>
          <p className="font-semibold">{next.label} · {formatDuration(next.duration)}</p>
          {then?.kind === 'work' && <p className="text-sm text-white/75 short:hidden">then {then.name} · set {then.set} of {then.sets}</p>}
        </>
      ) : (
        <p>
          <span className="font-semibold">{next.name}</span>
          <span className="text-white/75"> · set {next.set} of {next.sets}{describeWork(next) && ` · ${describeWork(next)}`}</span>
        </p>
      )}
    </section>
  )
}

/** Shown when every phase is finished. Takes focus so the end of the workout is announced. */
function WorkoutComplete({ onRestart, onExit }: { onRestart: () => void, onExit: () => void }) {
  const headingRef = useFocusOnChange<HTMLHeadingElement>()
  return (
    <div className={`flex flex-1 flex-col items-center justify-center gap-4 ${card} px-5 py-10 text-center`}>
      <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-primary/15 text-3xl text-primary">✓</span>
      <h3 ref={headingRef} tabIndex={-1} className="text-2xl font-bold focus:outline-none sm:text-3xl">Workout complete!</h3>
      <p className="text-white/75">Nice work.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onExit} className={primaryButton}>Choose another</button>
        <button type="button" onClick={onRestart} className={softButtonOnCard}>Restart</button>
      </div>
    </div>
  )
}

/** Pick a saved workout. Tapping one opens it ready to start; nothing runs until Start is pressed. */
function SelectWorkout({ setWorkout, setScreen }: { setWorkout: (workout: Workout) => void, setScreen: (screen: Screen) => void }) {
  const [workouts] = useState<Workout[]>(loadWorkouts)
  const headingRef = useFocusOnChange<HTMLHeadingElement>()

  return (
    <>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold focus:outline-none">Select a workout</h2>
      {workouts.length === 0 ? (
        <div className={`flex flex-col items-start gap-4 ${card} px-5 py-6`}>
          <p className="text-white/75">You don't have any saved workouts yet.</p>
          <button type="button" onClick={() => setScreen('workouts')} className={primaryButton}>Build a workout</button>
        </div>
      ) : (
        <ul className="flex w-full flex-col gap-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} actionLabel="Open" headingLevel="h3" onSelect={() => setWorkout(workout)} />
          ))}
        </ul>
      )}
    </>
  )
}
