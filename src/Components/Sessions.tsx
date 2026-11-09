import Layout from "./Layout";
import type { Screen, Workout } from "../types";
import { useEffect, useRef, useState } from "react";
import { Timer } from "../utils";

const testWorkout: Workout = {
  id: 1,
  name: 'Test workout',
  exerciseIds: []
}

const testWorkout2: Workout = {
  id: 2,
  name: 'Test workout 2',
  exerciseIds: []
}

const testData = [
  testWorkout,
  testWorkout2
]

/**
 * Select workout. 
 * Start a workout session.
 * @returns The session screen
 */
export default function Session({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const [workout, setWorkout] = useState<Workout | null>(null)

  return (
    <Layout setScreen={setScreen} title={"Lets Go!"}>{
      <section>
        {
          workout ?
            <WorkoutComponent workout={workout} /> : <SelectWorkout setWorkout={setWorkout} />
        }
      </section>
    }</Layout>
  )
}

function WorkoutComponent({ workout }: { workout: Workout }) {
  const [index, setIndex] = useState<number | null>(0)

  return (
    <>
      <h2 className="text-3xl">{workout.name}</h2>
      {
        index != null ? index : 'No current exercise'
      }

      <TimerComponent nextIndex={() => {
        if (index === null) return
        if (index === workout.exerciseIds.length - 2) setIndex(null) // finished
        else setIndex(index + 1)
      }} />
    </>
  )
}

function TimerComponent({ nextIndex }: { nextIndex: () => void }) {
  const [time, setTime] = useState<number>(0) // time in seconds
  const [isRunning, setIsRunning] = useState<boolean>(false)

  // keep the latest callback so the Timer (created once) never calls a stale one
  const nextIndexRef = useRef(nextIndex)
  useEffect(() => { nextIndexRef.current = nextIndex })

  // create the Timer once on mount, and stop it on unmount
  const TimerCtr = useRef<Timer | null>(null)
  useEffect(() => {
    const timer = new Timer(setTime, () => {
      alert("Timer is done!")
      setIsRunning(false)
      nextIndexRef.current()
    }, 10)
    TimerCtr.current = timer
    return () => timer.stopTimer()
  }, [])
  return (
    <>
      <div>
        <p className="text-lg">{isRunning ? time : 'Press start'}</p>
        {
          isRunning ?
            <button onClick={() => {
              TimerCtr.current?.stopTimer()
              setIsRunning(false)
            }}>Stop</button> :
            <button onClick={() => {
              TimerCtr.current?.startTimer()
              setIsRunning(true)
            }}>Start</button>
        }
      </div>
    </>
  )
}

function SelectWorkout({ setWorkout }: { setWorkout: (workout: Workout) => void }) {
  return (
    <>
      <h2 className="text-3xl">Select a Work out</h2>
      <select name="workouts" id="workout-select" onChange={(e) => {
        console.log(e.target.value)
        setWorkout(testWorkout)
      }}>
        {
          testData.map((workout) => (
            <option key={workout.id} value={workout.id}>{workout.name}</option>
          ))
        }
      </select>
    </>
  )
}