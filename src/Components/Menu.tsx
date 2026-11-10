import { MenuButton } from './Buttons'
import type { Screen } from '../types'
import { useFocusOnChange } from '../utils'

/**
 * Main navigation menu.
 * @param setScreen - Function to set the current screen.
 * @returns 
 */
const Menu = ({ setScreen }: { setScreen: (screen: Screen) => void }) => {
  // focus the heading when coming back from another screen, so the change is announced
  const headingRef = useFocusOnChange<HTMLHeadingElement>()
  return (
    <main className="flex flex-col items-center gap-4">
      <title>WorkMeOut</title>
      <h1 ref={headingRef} tabIndex={-1} className='text-5xl focus:outline-none'>WorkMeOut</h1>
      <nav aria-label="Main">
        <ul className="flex flex-col items-center justify-center gap-4">
          <li><MenuButton onClick={() => { setScreen('exercises') }} text="Exercises" /></li>
          <li><MenuButton onClick={() => { setScreen('workouts') }} text="Workouts" /></li>
          <li><MenuButton onClick={() => { setScreen('session') }} text="Lets Go!" /></li>
        </ul>
      </nav>
    </main>
  )
}

export default Menu