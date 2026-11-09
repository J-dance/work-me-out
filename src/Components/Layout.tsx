import type { Screen } from "../types"

interface props { children: React.ReactNode, setScreen: (screen: Screen) => void, title: string }

export default function Layout({ children, setScreen, title }: props) {
  const returnHome = () => { setScreen('menu') }
  return (
    <div className="flex flex-col items-center justify-between h-full w-full gap-4 bg-bg p-6">
      <header>
        <h2 className="text-3xl" onClick={returnHome}>{title}</h2>
      </header>
      {children}
      <footer className="flex flex-col justify-center align-middle gap-2 text-center">
        <a className="underline" onClick={returnHome}>Menu</a>
        <p>© 2026 WorkMeOut</p>
      </footer>
    </div>
  )
}