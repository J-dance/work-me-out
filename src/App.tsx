import './App.css'
import { useState } from 'react'
import type { Screen } from './types'
import Menu from './Components/Menu'
import Exercises from './Components/Exercises'
import Workouts from './Components/Workouts'
import Session from './Components/Sessions'
import { UserContext } from './context'
import ExerciseProvider from './Components/ExerciseProvider'
import ScreenErrorBoundary from './Components/ScreenErrorBoundary'

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
          {/* keyed by screen: each screen gets its own boundary, and switching screens clears any error */}
          <ScreenErrorBoundary
            key={screen}
            onBackToMenu={screen === 'menu' ? undefined : () => setScreen('menu')}
          >
            {screen === 'menu' && <Menu setScreen={setScreen} />}
            {screen === 'exercises' && <Exercises setScreen={setScreen} />}
            {screen === 'workouts' && <Workouts setScreen={setScreen} />}
            {screen === 'session' && <Session setScreen={setScreen} />}
          </ScreenErrorBoundary>
        </ExerciseProvider>
      </UserContext>
    </main>
  )
}

export default App
