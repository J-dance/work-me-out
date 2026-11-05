import Layout from "./Layout";
import type { Screen, Workout } from "../types";
import { useRef, useState } from "react";
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
  const [workout, setWorkout] = useState<Workout>(null)

  return (
    <Layout setScreen={setScreen} title={"Lets Go!"}>{
      <section>
        {
          workout ?
            <TimerComponent workout={workout} /> : <SelectWorkout setWorkout={setWorkout} />
        }
      </section>
    }</Layout>
  )
}

function TimerComponent({ workout }: { workout: Workout }) {
  const [time, setTime] = useState<number>(0) // time in seconds
  const [isRunning, setIsRunning] = useState<boolean>(false)

  function updateTimer(time: number) {
    setTime(time)
  }

  const finishTimer = () => {
    alert("Timer is done!")
  }

  const TimerCtr = useRef<Timer>(new Timer(updateTimer, finishTimer, 10))
  return (
    <>
      <h2 className="text-3xl">{workout.name}</h2>
      <div>
        <p className="text-lg">{isRunning ? time : 'Press start'}</p>
        {
          isRunning ?
            <button onClick={() => {
              TimerCtr.current.stopTimer()
              setIsRunning(false)
            }}>Stop</button> :
            <button onClick={() => {
              TimerCtr.current.startTimer()
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
            <option value={workout.id}>{workout.name}</option>
          ))
        }
      </select>
    </>
  )
}