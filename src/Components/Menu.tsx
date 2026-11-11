import { MenuCard } from './Buttons'
import type { Screen } from '../types'
import { useFocusOnChange } from '../utils'

/** 24px line icons, drawn in currentColor. */
const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const PlayIcon = () => <Icon><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></Icon>
const ListIcon = () => <Icon><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></Icon>
const DumbbellIcon = () => <Icon><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></Icon>

/** The app's logo mark (same as public/favicon.svg), drawn in currentColor. Not shown at the moment, see the menu header. */
export const LogoMark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 91 86" className={className} fill="currentColor" aria-hidden="true">
    <rect width="18" height="86" rx="5" />
    <rect x="73" width="18" height="86" rx="5" />
    <rect x="14" y="36" width="24" height="16" rx="5" />
    <rect x="53" y="36" width="24" height="16" rx="5" />
    <path d="M30.7132 41.5145C29.2147 40.3153 29.2147 38.3709 30.7132 37.1716C32.2116 35.9723 34.6411 35.9723 36.1395 37.1716L48.2104 46.8324C49.7088 48.0317 49.7088 49.9761 48.2104 51.1754C46.7119 52.3746 44.2825 52.3746 42.784 51.1754L30.7132 41.5145Z" />
    <path d="M60.1296 41.5145C61.628 40.3153 61.628 38.3709 60.1296 37.1716C58.6311 35.9723 56.2016 35.9723 54.7032 37.1716L42.9927 46.544C41.4943 47.7433 41.4943 49.6877 42.9927 50.8869C44.4912 52.0862 46.9207 52.0862 48.4191 50.8869L60.1296 41.5145Z" />
  </svg>
)

/**
 * Main navigation menu.
 * @param setScreen - Function to set the current screen.
 */
const Menu = ({ setScreen }: { setScreen: (screen: Screen) => void }) => {
  // focus the heading when coming back from another screen, so the change is announced
  const headingRef = useFocusOnChange<HTMLHeadingElement>()
  return (
    // same as Layout: side padding (--page-px) outside, content capped at max-w-2xl inside,
    // so the menu column is exactly as wide as every other screen's
    <div className="flex w-full flex-1 justify-center px-(--page-px)">
    <main className="flex w-full max-w-2xl flex-col justify-center gap-10 py-12">
      <title>WorkMeOut</title>
      <header className="flex flex-col gap-2">
        {/* Logo tile beside the title, hidden for now. To bring it back, wrap the h1 in
            <div className="flex items-center gap-3 sm:gap-4"> and put this before it:
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-bg sm:size-14 sm:rounded-2xl">
            <LogoMark className="size-7 sm:size-8" />
          </span>
        */}
        <h1 ref={headingRef} tabIndex={-1} className="min-w-0 text-[clamp(2.25rem,11vw,3.25rem)] font-bold leading-tight tracking-tight focus:outline-none">
          WorkMeOut
        </h1>
        <p className="text-lg text-white/75">A simple, no-fuss way to work out.</p>
      </header>
      <nav aria-label="Main">
        <ul className="flex flex-col gap-5">
          <li>
            <MenuCard primary onClick={() => { setScreen('session') }} title="Let's go" description="Start one of your workouts" icon={<PlayIcon />} />
          </li>
          <li>
            <MenuCard onClick={() => { setScreen('workouts') }} title="Workouts" description="Build and edit your routines" icon={<ListIcon />} />
          </li>
          <li>
            <MenuCard onClick={() => { setScreen('exercises') }} title="Exercises" description="Browse moves and add your own" icon={<DumbbellIcon />} />
          </li>
        </ul>
      </nav>
    </main>
    </div>
  )
}

export default Menu
