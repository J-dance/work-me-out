import { useEffect, useId, useRef } from "react"
import type { Exercise } from '../types'
import ExerciseImage from "./ExerciseImage"
import { lockScroll } from "../utils"

const Tag = ({ children }: { children: React.ReactNode }) => (
  <li className="rounded-full bg-tertiary px-3 py-1 text-sm capitalize">{children}</li>
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
  const titleId = useId()

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
      aria-labelledby={titleId}
      onClose={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overscroll-contain bg-bg text-white backdrop:bg-black/60"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="min-w-0 text-2xl wrap-break-word sm:text-3xl">{data.name}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close details"
            className="shrink-0 border-2 border-outline px-3 py-1 text-xl hover:border-primary"
          >
            ✕
          </button>
        </header>

        {data.images.length > 0 && (
          // focusable so keyboard users can scroll the strip sideways
          <div className="flex gap-2 overflow-x-auto" role="region" aria-label="Images" tabIndex={0}>
            {data.images.map((src, i) => (
              <ExerciseImage
                key={src}
                src={src}
                alt={`${data.name} demonstration, ${i + 1} of ${data.images.length}`}
                loading="lazy"
                className="w-full max-w-sm shrink-0 object-cover"
              />
            ))}
          </div>
        )}

        <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8rem),1fr))] gap-x-4 gap-y-2">
          {details.filter(([, value]) => value).map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm opacity-70">{label}</dt>
              <dd className="capitalize">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-xl">Muscles</h3>
          {/* primary vs secondary was only shown by opacity, so label the lists for screen readers */}
          <ul aria-label="Primary muscles" className="flex flex-wrap gap-2">
            {data.primaryMuscles.map((m) => <Tag key={m}>{m}</Tag>)}
          </ul>
          {data.secondaryMuscles.length > 0 && (
            <ul aria-label="Secondary muscles" className="flex flex-wrap gap-2 opacity-70">
              {data.secondaryMuscles.map((m) => <Tag key={m}>{m}</Tag>)}
            </ul>
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
        <div className="sticky bottom-0 border-t-2 border-outline bg-bg p-4">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() => {
                action.onClick()
                dialogRef.current?.close()
              }}
              className="w-full border-2 border-primary bg-primary p-3 text-bg"
            >
              {action.label}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
