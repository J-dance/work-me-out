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
      {/* 3-col grid: back link left, title centred, empty right column balances the left so the title stays truly centred */}
      <header className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          onClick={returnHome}
          aria-label="Back to menu"
          className="justify-self-start flex items-center gap-1 rounded-md px-2 py-1 hover:text-primary hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">Menu</span>
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="min-w-0 text-3xl text-center text-balance wrap-break-word focus:outline-none">{title}</h1>
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
