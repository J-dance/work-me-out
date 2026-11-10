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
import { InstallNotice, OfflineStatus } from './Components/Notices'

const SCREEN_TITLES: Record<Screen, string> = {
  menu: 'WorkMeOut',
  exercises: 'WorkMeOut - Exercises',
  workouts: 'WorkMeOut - Workouts',
  session: 'WorkMeOut - Session',
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [userData, setUserData] = useState<unknown>(null)

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh w-full gap-4 bg-bg text-white">
      {/* React 19 hoists <title> into <head> */}
      <title>{SCREEN_TITLES[screen]}</title>
      <UserContext value={{
        state: userData,
        setState: setUserData
      }}>
        {/* outside ExerciseProvider so they still show while exercises load or fail to load */}
        <OfflineStatus />
        {screen === 'menu' && <InstallNotice />}
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
    </div>
  )
}

export default App
