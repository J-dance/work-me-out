import { useEffect, useRef } from "react"
import type { Exercise } from '../types'
import { imgBase } from "./ExerciseProvider"
import { lockScroll } from "../utils"

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-tertiary px-3 py-1 text-sm capitalize">{children}</span>
)

/**
 * Full-screen detail view for a single exercise.
 * Pass `action` to show a button at the bottom (e.g. "Add to workout"); the modal closes after it runs.
 * Can be opened on top of another dialog.
 */
export default function ExerciseModal({ data, onClose, action }: {
  data: Exercise
  onClose: () => void
  action?: { label: string, onClick: () => void }
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    // stop the list behind the modal from scrolling
    return lockScroll()
  }, [])

  const details: [string, string | null][] = [
    ['Level', data.level],
    ['Category', data.category],
    ['Equipment', data.equipment],
    ['Force', data.force],
    ['Mechanic', data.mechanic],
  ]

  return (
    <dialog
      ref={dialogRef}
      onClose={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none bg-bg text-white backdrop:bg-black/60"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <h2 className="text-3xl">{data.name}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="shrink-0 border-2 border-tertiary px-3 py-1 text-xl hover:border-primary"
          >
            ✕
          </button>
        </header>

        {data.images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {data.images.map((src) => (
              <img
                key={src}
                src={imgBase + src}
                alt={data.name}
                loading="lazy"
                className="w-full max-w-sm shrink-0 object-cover"
              />
            ))}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {details.filter(([, value]) => value).map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm opacity-70">{label}</dt>
              <dd className="capitalize">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-xl">Muscles</h3>
          <div className="flex flex-wrap gap-2">
            {data.primaryMuscles.map((m) => <Tag key={m}>{m}</Tag>)}
          </div>
          {data.secondaryMuscles.length > 0 && (
            <div className="flex flex-wrap gap-2 opacity-70">
              {data.secondaryMuscles.map((m) => <Tag key={m}>{m}</Tag>)}
            </div>
          )}
        </section>

        {data.instructions.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xl">Instructions</h3>
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {data.instructions.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </section>
        )}
      </div>

      {action && (
        <div className="sticky bottom-0 border-t-2 border-tertiary bg-bg p-4">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() => {
                action.onClick()
                dialogRef.current?.close()
              }}
              className="w-full border-2 border-primary bg-primary p-3"
            >
              {action.label}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
