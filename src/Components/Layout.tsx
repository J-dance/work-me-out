import type { Screen } from "../types"
import { useFocusOnChange } from "../utils"

interface props { children: React.ReactNode, setScreen: (screen: Screen) => void, title: string }

export default function Layout({ children, setScreen, title }: props) {
  const returnHome = () => { setScreen('menu') }
  // move focus to the heading whenever the screen changes, so screen readers announce where you are
  const headingRef = useFocusOnChange<HTMLHeadingElement>(title)

  return (
    <div className="flex flex-col items-center justify-between h-full w-full gap-4 bg-bg p-6">
      <title>{`${title} · WorkMeOut`}</title>
      <header>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl focus:outline-none">{title}</h1>
      </header>
      <main className="flex w-full flex-col items-center gap-4">
        {children}
      </main>
      <footer className="flex flex-col justify-center align-middle gap-2 text-center">
        <button type="button" className="underline hover:text-primary" onClick={returnHome}>Menu</button>
        <p>© 2026 WorkMeOut</p>
      </footer>
    </div>
  )
}
