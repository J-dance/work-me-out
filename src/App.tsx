import './App.css'
import { useState } from 'react'
import type { Screen } from './types'
import Menu from './Components/Menu'
import Exercises from './Components/Exercises'
import Workouts from './Components/Workouts'
import Session from './Components/Sessions'
import { UserContext } from './context'
import ExerciseProvider from './Components/ExerciseProvider'

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [userData, setUserData] = useState<unknown>(null)

  return (
    <main className="flex flex-col items-center justify-center min-h-dvh w-full gap-4 bg-bg text-white">
      <UserContext value={{
        state: userData,
        setState: setUserData
      }}>
        <ExerciseProvider>
          {screen === 'menu' && <Menu setScreen={setScreen} />}
          {screen === 'exercises' && <Exercises setScreen={setScreen} />}
          {screen === 'workouts' && <Workouts setScreen={setScreen} />}
          {screen === 'session' && <Session setScreen={setScreen} />}
        </ExerciseProvider>
      </UserContext>
    </main>
  )
}

export default App
