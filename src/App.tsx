import './App.css'
import { useState } from 'react'
import type { Screen } from './types'
import Menu from './Components/Menu'
import Exercises from './Components/Exercises'
import Workouts from './Components/Workouts'
import Session from './Components/Sessions'

function App() {
  const [screen, setScreen] = useState<Screen>('menu')

  return (
    <main className="flex flex-col items-center justify-center h-screen w-screen gap-4 bg-bg text-white">
      {screen === 'menu' && <Menu setScreen={setScreen} />}
      {screen === 'exercises' && <Exercises setScreen={setScreen} />}
      {screen === 'workouts' && <Workouts setScreen={setScreen} />}
      {screen === 'session' && <Session setScreen={setScreen} />}
    </main>
  )
}

export default App
