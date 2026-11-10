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