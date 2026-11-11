interface MenuCardProps {
  onClick: () => void
  title: string
  description: string
  icon: React.ReactNode
  /** The main action: filled with the primary colour. */
  primary?: boolean
}

/** Full-width navigation card for the main menu: icon, title, one-line description and an arrow. */
export const MenuCard = ({ onClick, title, description, icon, primary = false }: MenuCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-colors hover:cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary motion-reduce:transition-none sm:p-5 ${
      // primary hover goes lighter, not darker, so the dark text keeps (and gains) contrast
      primary ? 'bg-primary text-bg hover:bg-[#ea8692]' : 'bg-surface text-white hover:bg-tertiary'
    }`}
  >
    <span
      aria-hidden="true"
      className={`grid size-12 shrink-0 place-items-center rounded-xl ${primary ? 'bg-bg/15' : 'bg-bg/60 text-primary'}`}
    >
      {icon}
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-xl font-semibold">{title}</span>
      {/* full-strength text on primary: dimming it would drop below 4.5:1 */}
      <span className={`text-sm ${primary ? '' : 'text-white/75'}`}>{description}</span>
    </span>
    <span
      aria-hidden="true"
      className="text-xl transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
    >
      →
    </span>
  </button>
)

/** Opens the full exercise details. */
export const InfoButton = ({ onClick, label, className = '' }: { onClick: () => void, label: string, className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={`Details for ${label}`}
    title="Exercise details"
    className={`shrink-0 hover:text-primary focus-visible:text-primary ${className}`}
  >
    <span aria-hidden="true">ⓘ</span>
  </button>
)
