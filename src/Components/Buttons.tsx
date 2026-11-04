export const MenuButton = ({ onClick, text }: { onClick: () => void, text: string }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center border-solid border-2 border-tertiary rounded-lg p-4 text-white hover:bg-tertiary hover:cursor-pointer"
    >
      <p>{text}</p>
    </button>
  )
}