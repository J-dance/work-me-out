import { useEffect, useId, useRef, useState } from "react"
import type { Exercise } from '../types'
import ExerciseImage from "./ExerciseImage"
import { lockScroll } from "../utils"
import { LevelBars, MuscleChip } from "./ExerciseBits"
import { focusRing, iconButton, softButton } from "../styles"

/** A swipe must travel this far sideways (px), and mostly sideways, so scrolling never changes exercise. */
const SWIPE_MIN = 60
/** Touches starting this close to a side edge are left to the browser (iOS Safari's back/forward swipe). */
const EDGE = 24

/**
 * Full-screen detail view for a single exercise.
 * Pass `action` to show a button at the bottom (e.g. "Add to workout"); the modal closes after it runs.
 * Pass `onEdit` to show an Edit button (for custom exercises); the modal closes after it runs.
 * Pass `onPrev`/`onNext` to step through a list: swipe (left = next), arrow keys, or the ‹ › buttons.
 * Leave one out at the end of the list; leave both out to hide the buttons.
 * Can be opened on top of another dialog.
 */
export default function ExerciseModal({ data, onClose, action, onEdit, onPrev, onNext }: {
  data: Exercise
  onClose: () => void
  action?: { label: string, onClick: () => void }
  onEdit?: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // which way we last moved, so the new exercise slides in from that side (null: just opened)
  const [direction, setDirection] = useState<'prev' | 'next' | null>(null)
  const touchStart = useRef<{ x: number, y: number } | null>(null)
  const hasNav = Boolean(onPrev || onNext)

  const go = (dir: 'prev' | 'next') => {
    const move = dir === 'prev' ? onPrev : onNext
    if (!move) return
    setDirection(dir)
    move()
  }

  // a new exercise starts at its top, not wherever the last one was scrolled to
  useEffect(() => {
    dialogRef.current?.scrollTo({ top: 0 })
  }, [data.id])

  useEffect(() => {
    dialogRef.current?.showModal()
    // stop the list behind the modal from scrolling
    return lockScroll()
  }, [])

  // level first; it gets the bars, the rest are plain text
  const details: [string, string | null][] = [
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
      onKeyDown={(e) => {
        if (!hasNav || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
        if (e.key === 'ArrowLeft') go('prev')
        else if (e.key === 'ArrowRight') go('next')
      }}
      onTouchStart={(e) => {
        const t = e.touches[0]
        // one finger only (not pinch-zoom), and not from the very edges
        touchStart.current = hasNav && e.touches.length === 1 && t.clientX > EDGE && t.clientX < window.innerWidth - EDGE
          ? { x: t.clientX, y: t.clientY }
          : null
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current
        touchStart.current = null
        if (!start) return
        const t = e.changedTouches[0]
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return
        // like flipping pages: drag left to bring in the next one
        go(dx < 0 ? 'next' : 'prev')
      }}
      onTouchCancel={() => { touchStart.current = null }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none touch-pan-y touch-pinch-zoom overflow-x-hidden overscroll-contain bg-bg text-white backdrop:bg-black/60"
    >
      {/* same side padding and column width as the screens. Keyed so each new exercise re-runs the slide-in */}
      <div
        key={data.id}
        className={`mx-auto flex max-w-[calc(var(--container-2xl)+2*var(--page-px))] flex-col gap-8 px-(--page-px) py-6 ${
          direction === 'next' ? 'motion-safe:animate-slide-from-right' : direction === 'prev' ? 'motion-safe:animate-slide-from-left' : ''
        }`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {hasNav && (
              <>
                <button
                  type="button"
                  onClick={() => go('prev')}
                  disabled={!onPrev}
                  aria-label="Previous exercise"
                  className={`size-10 text-xl ${iconButton} disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surface`}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('next')}
                  disabled={!onNext}
                  aria-label="Next exercise"
                  className={`size-10 text-xl ${iconButton} disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surface`}
                >
                  <span aria-hidden="true">›</span>
                </button>
              </>
            )}
            <div className="flex-1" />
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit()
                  dialogRef.current?.close()
                }}
                className={`${softButton} py-2 text-sm`}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close details"
              className={`size-10 ${iconButton}`}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          <header className="flex flex-col gap-3">
            <h2 id={titleId} className="text-[clamp(1.75rem,7vw,2.25rem)] font-bold leading-tight tracking-tight text-balance wrap-break-word">
              {data.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {data.custom && <span className="rounded-full bg-bg/60 px-3 py-1 text-sm text-primary ring-1 ring-primary/40">Your exercise</span>}
              <ul aria-label="Main muscles" className="contents">
                {data.primaryMuscles.map((m) => <li key={m}><MuscleChip muscle={m} size="md" /></li>)}
              </ul>
            </div>
          </header>
        </div>

        {data.images.length > 0 && (
          // side by side (start and end position), so there's no hidden image to scroll to
          <div className={`grid gap-3 ${data.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {data.images.map((src, i) => (
              <ExerciseImage
                key={src}
                src={src}
                alt={`${data.name} demonstration, ${i + 1} of ${data.images.length}`}
                loading="lazy"
                className="w-full rounded-2xl object-contain"
              />
            ))}
          </div>
        )}

        {/* small stat tiles: 2 across on phones, as many as fit when roomy */}
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8.5rem),1fr))] gap-3">
          <div className="flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3">
            <dt className="text-xs text-white/75">Level</dt>
            <dd className="flex items-center gap-2 font-medium capitalize"><LevelBars level={data.level} />{data.level}</dd>
          </div>
          {details.filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3">
              <dt className="text-xs text-white/75">{label}</dt>
              <dd className="font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>

        {/* the main muscles are the coloured chips under the title */}
        {data.secondaryMuscles.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 id={`${titleId}-secondary`} className="text-lg font-semibold">Also works</h3>
            <ul aria-labelledby={`${titleId}-secondary`} className="flex flex-wrap gap-2">
              {data.secondaryMuscles.map((m) => <li key={m}><MuscleChip muscle={m} size="md" muted /></li>)}
            </ul>
          </section>
        )}

        {data.instructions.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">How to do it</h3>
            <ol className="flex flex-col gap-4">
              {data.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  {/* left readable: Safari drops list semantics (and so the numbering) from unstyled lists */}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {action && (
        // full-bleed, like the other sticky bars
        <div className="sticky bottom-0 border-t border-white/10 bg-bg px-(--page-px) pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() => {
                action.onClick()
                dialogRef.current?.close()
              }}
              className={`w-full rounded-2xl bg-primary p-4 font-semibold text-bg hover:cursor-pointer hover:bg-[#ea8692] ${focusRing}`}
            >
              {action.label}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
