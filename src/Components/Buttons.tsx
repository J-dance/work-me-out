export const MenuButton = ({ onClick, text }: { onClick: () => void, text: string }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center border-solid border-2 border-outline rounded-lg p-4 text-white hover:bg-tertiary hover:cursor-pointer"
    >
      {text}
    </button>
  )
}

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
