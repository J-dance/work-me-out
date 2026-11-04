import { MenuButton } from './Buttons'
import type { Screen } from '../types'

/**
 * Main navigation menu.
 * @param setScreen - Function to set the current screen.
 * @returns 
 */
const Menu = ({ setScreen }: { setScreen: (screen: Screen) => void }) => {
  return (
    <>
      <h1 className='text-5xl'>WorkMeOut</h1>
      <menu className="flex flex-col items-center justify-center gap-4">
        <MenuButton onClick={() => { setScreen('exercises') }} text="Exercises" />
        <MenuButton onClick={() => { setScreen('workouts') }} text="Workouts" />
        <MenuButton onClick={() => { setScreen('session') }} text="Lets Go!" />
      </menu >
    </>
  )
}

export default Menu