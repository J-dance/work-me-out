import type { Screen } from "../types"
import { useFocusOnChange } from "../utils"

interface props { children: React.ReactNode, setScreen: (screen: Screen) => void, title: string }

export default function Layout({ children, setScreen, title }: props) {
  const returnHome = () => { setScreen('menu') }
  // move focus to the heading whenever the screen changes, so screen readers announce where you are
  const headingRef = useFocusOnChange<HTMLHeadingElement>(title)

  return (
    // --page-px is the side padding; full-bleed children (Exercises' sticky filter bar) read it to cancel it out.
    // Tighter on small phones/mini widths so content isn't squeezed by 48px of gutter.
    <div className="flex flex-col items-center justify-between h-full w-full gap-4 bg-bg py-6 px-(--page-px) [--page-px:--spacing(4)] sm:[--page-px:--spacing(6)]">
      <title>{`${title} · WorkMeOut`}</title>
      <header className="max-w-full">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl text-center text-balance wrap-break-word focus:outline-none">{title}</h1>
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
