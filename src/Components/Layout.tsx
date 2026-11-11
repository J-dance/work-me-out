import type { Screen } from "../types"
import { useFocusOnChange } from "../utils"
import { focusRing } from "../styles"

interface props { children: React.ReactNode, setScreen: (screen: Screen) => void, title: string }

export default function Layout({ children, setScreen, title }: props) {
  const returnHome = () => { setScreen('menu') }
  // move focus to the heading whenever the screen changes, so screen readers announce where you are
  const headingRef = useFocusOnChange<HTMLHeadingElement>(title)
  const backToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    // move focus too, so keyboard/screen-reader users land at the top as well
    headingRef.current?.focus({ preventScroll: true })
  }

  return (
    // --page-px (App.css) is the shared side padding
    <div className="flex flex-col items-center justify-between flex-1 w-full gap-4 bg-bg py-6 px-(--page-px) short:py-4">
      <title>{`${title} · WorkMeOut`}</title>
      {/* same column width (max-w-2xl) as the menu and the screen content; title left-aligned like the menu */}
      <header className="flex w-full max-w-2xl flex-col items-start gap-4 short:gap-2">
        <button
          type="button"
          onClick={returnHome}
          aria-label="Back to menu"
          className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm hover:cursor-pointer hover:bg-tertiary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">←</span>
          <span>Menu</span>
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="min-w-0 text-[clamp(1.875rem,8vw,2.5rem)] font-bold leading-tight tracking-tight text-balance wrap-break-word focus:outline-none">{title}</h1>
      </header>
      <main className="flex w-full flex-1 flex-col items-center gap-4">
        {children}
      </main>
      {/* quiet strip in the same column as the content: a hairline, the name on the left, back to top on the right */}
      <footer className="mt-6 flex w-full max-w-2xl items-center justify-between gap-4 border-t border-white/10 pt-4 pb-[env(safe-area-inset-bottom)] text-sm">
        <p className="text-white/75">© 2026 WorkMeOut</p>
        <button
          type="button"
          onClick={backToTop}
          className={`flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 hover:cursor-pointer hover:bg-tertiary ${focusRing}`}
        >
          <span aria-hidden="true">↑</span>
          Back to top
        </button>
      </footer>
    </div>
  )
}
