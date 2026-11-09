import Layout from "./Layout";
import type { Exercise, Screen, Workout } from "../types";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { formatDuration, loadWorkouts, Timer } from "../utils";
import { ExercisesContext } from "../context";
import { imgBase } from "./ExerciseProvider";

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

const noExercises: Exercise[] = []

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

/**
 * Select workout.
 * Start a workout session.
 * @returns The session screen
 */
export default function Session({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [workout, setWorkout] = useState<Workout | null>(null)

  return (
    <Layout setScreen={setScreen} title={"Lets Go!"}>{
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

function WorkoutComponent({ workout, onExit }: { workout: Workout, onExit: () => void }) {
  const exercisesPromise = use(ExercisesContext)
  const exercises = exercisesPromise ? use(exercisesPromise) : noExercises
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const phases = useMemo(() => buildPhases(workout, exercisesById), [workout, exercisesById])

  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<Status>('ready')
  const [remaining, setRemaining] = useState<number | null>(phases[0]?.duration ?? null) // seconds

  const timerRef = useRef<Timer | null>(null)

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

  // keep the latest callback so the Timer (created once) never calls a stale one
  const advanceRef = useRef(() => { })
  useEffect(() => { advanceRef.current = () => goTo(index + 1, 'running') })

  // create the Timer once on mount, and stop it on unmount
  useEffect(() => {
    const timer = new Timer(setRemaining, () => advanceRef.current(), 0)
    timerRef.current = timer
    return () => timer.stopTimer()
  }, [])

  if (phases.length === 0) {
    return (
      <>
        <h2 className="text-3xl">{workout.name}</h2>
        <p className="opacity-70">This workout has no exercises yet. Add some on the Workouts screen.</p>
        <button onClick={onExit} className="self-start underline hover:text-primary">Choose another workout</button>
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
    const timer = timerRef.current
    if (timer && remaining !== null) {
      timer.setDuration(remaining)
      timer.startTimer()
    }
    setStatus('running')
  }

  return (
    <>
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-3xl">{workout.name}</h2>
        <button onClick={onExit} className="shrink-0 text-sm underline hover:text-primary">Change workout</button>
      </header>

      <div className="h-2 w-full bg-tertiary" role="progressbar" aria-valuemin={0} aria-valuemax={phases.length} aria-valuenow={index}>
        <div className="h-full bg-primary transition-all" style={{ width: `${(index / phases.length) * 100}%` }} />
      </div>

      {status === 'done' || !phase ? (
        <div className="flex flex-col items-center gap-4 border-2 border-tertiary p-6 text-center">
          <p className="text-3xl">Workout complete!</p>
          <p className="opacity-70">Nice work.</p>
          <div className="flex gap-2">
            <button onClick={() => goTo(0, 'ready')} className="border-2 border-tertiary px-4 py-2 hover:bg-tertiary">Restart</button>
            <button onClick={onExit} className="border-2 border-tertiary px-4 py-2 hover:bg-tertiary">Choose another</button>
          </div>
        </div>
      ) : (
        <>
          <CurrentPhase phase={phase} remaining={remaining} status={status} />

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => goTo(index - 1, status === 'ready' ? 'ready' : 'running')}
              disabled={index === 0}
              className="border-2 border-tertiary p-3 hover:bg-tertiary disabled:opacity-40 disabled:hover:bg-transparent"
            >Back</button>
            {status === 'ready' && (
              <button onClick={() => goTo(index, 'running')} className="border-2 border-primary p-3 hover:bg-primary">Start</button>
            )}
            {status === 'running' && (
              isTimed ?
                <button onClick={pause} className="border-2 border-primary p-3 hover:bg-primary">Pause</button> :
                <button onClick={() => goTo(index + 1, 'running')} className="border-2 border-primary p-3 hover:bg-primary">Done</button>
            )}
            {status === 'paused' && (
              <button onClick={resume} className="border-2 border-primary p-3 hover:bg-primary">Resume</button>
            )}
            <button
              onClick={() => goTo(index + 1, status === 'ready' ? 'ready' : status)}
              className="border-2 border-tertiary p-3 hover:bg-tertiary"
            >Skip</button>
          </div>

          <UpNext next={upNext} then={afterNext} />
        </>
      )}
    </>
  )
}

/** Large display of what to do right now. */
function CurrentPhase({ phase, remaining, status }: { phase: Phase, remaining: number | null, status: Status }) {
  const clock = remaining !== null && (
    <p className={`text-6xl tabular-nums ${status === 'paused' ? 'opacity-50' : ''}`}>{formatDuration(remaining)}</p>
  )

  if (phase.kind === 'rest') {
    return (
      <div className="flex flex-col items-center gap-2 border-2 border-dashed border-secondary p-6 text-center">
        <p className="text-sm uppercase tracking-wide opacity-70">{phase.label}</p>
        <p className="text-3xl">Rest</p>
        {clock}
      </div>
    )
  }

  const image = phase.exercise?.images[0]
  return (
    <div className="flex flex-col items-center gap-2 border-2 border-primary p-6 text-center">
      <p className="text-sm uppercase tracking-wide opacity-70">Set {phase.set} of {phase.sets}</p>
      <p className="text-3xl">{phase.name}</p>
      {image && <img src={imgBase + image} alt={phase.name} className="max-h-48 rounded object-contain" />}
      {phase.reps !== null && <p className="text-2xl">{phase.reps} reps</p>}
      {clock}
      {status === 'running' && phase.duration === null && <p className="text-sm opacity-70">Press Done when you finish the set</p>}
    </div>
  )
}

/** Small preview of the next phase, plus the exercise after a rest. */
function UpNext({ next, then }: { next: Phase | undefined, then: Phase | undefined }) {
  return (
    <div className="flex flex-col gap-1 border-2 border-tertiary p-3">
      <span className="text-sm opacity-70">Up next</span>
      {!next ? (
        <p>Finish!</p>
      ) : next.kind === 'rest' ? (
        <>
          <p>{next.label} · {formatDuration(next.duration)}</p>
          {then?.kind === 'work' && <p className="text-sm opacity-70">then {then.name} · set {then.set} of {then.sets}</p>}
        </>
      ) : (
        <p>{next.name} · set {next.set} of {next.sets}{describeWork(next) && ` · ${describeWork(next)}`}</p>
      )}
    </div>
  )
}

function SelectWorkout({ setWorkout, setScreen }: { setWorkout: (workout: Workout) => void, setScreen: (screen: Screen) => void }) {
  const [workouts] = useState<Workout[]>(loadWorkouts)

  if (workouts.length === 0) {
    return (
      <>
        <h2 className="text-3xl">Select a workout</h2>
        <p className="opacity-70">You don't have any saved workouts yet.</p>
        <button onClick={() => setScreen('workouts')} className="self-start border-2 border-tertiary px-4 py-2 hover:bg-tertiary">Build a workout</button>
      </>
    )
  }

  return (
    <>
      <h2 className="text-3xl">Select a workout</h2>
      <select
        name="workouts"
        id="workout-select"
        defaultValue=""
        className="w-full border-2 border-tertiary bg-bg p-2 text-xl focus:border-primary focus:outline-none"
        onChange={(e) => {
          const selected = workouts.find((w) => w.id === e.target.value)
          if (selected) setWorkout(selected)
        }}
      >
        <option value="" disabled>Choose a workout…</option>
        {
          workouts.map((workout) => (
            <option key={workout.id} value={workout.id}>{workout.name || 'Untitled workout'}</option>
          ))
        }
      </select>
    </>
  )
}
