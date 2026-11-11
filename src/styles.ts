/**
 * Shared Tailwind class strings, so every screen uses the same buttons, inputs, cards and chips.
 * Full class names only (no string building inside a class), so Tailwind can find them.
 */
import type { BodyArea } from './types'

/** Keyboard focus ring used by every control. */
export const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary'

/** Main action: filled pink with dark text (4.7:1). Lighter on hover so the text keeps its contrast. */
export const primaryButton = `rounded-full bg-primary px-6 py-2.5 font-semibold text-bg hover:cursor-pointer hover:bg-[#ea8692] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary ${focusRing}`

/** Everything else: a soft pill on the surface colour. */
export const softButton = `rounded-full bg-surface px-5 py-2.5 hover:cursor-pointer hover:bg-tertiary ${focusRing}`

/** Soft pill for use on top of a surface card, where the normal soft button would vanish. */
export const softButtonOnCard = `rounded-full bg-bg/60 px-5 py-2.5 hover:cursor-pointer hover:bg-tertiary ${focusRing}`

/** Round icon button (close, info, remove). Size it with size-* where used. */
export const iconButton = `grid shrink-0 place-items-center rounded-full bg-surface hover:cursor-pointer hover:bg-tertiary ${focusRing}`

/** "+ Add something" button: dashed outline, fills softly on hover. */
export const dashedButton = `rounded-2xl border-2 border-dashed border-outline p-4 font-semibold hover:cursor-pointer hover:border-primary hover:bg-surface ${focusRing}`

/** Text inputs and selects. The outline border is kept for 3:1 against bg. */
export const input = 'rounded-xl border-2 border-outline bg-bg px-3 py-2 focus:border-primary focus:outline-none'

/** Soft panel for list items and grouped content. */
export const card = 'rounded-2xl bg-surface'

/** Small heading over a group of controls. */
export const fieldLabel = 'text-sm text-white/75'

/** Display chip per body area: pastel text on a tint of itself. */
export const AREA_CHIP: Record<BodyArea, string> = {
  chest: 'bg-area-chest/15 text-area-chest',
  shoulders: 'bg-area-shoulders/15 text-area-shoulders',
  back: 'bg-area-back/15 text-area-back',
  arms: 'bg-area-arms/15 text-area-arms',
  core: 'bg-area-core/15 text-area-core',
  glutes: 'bg-area-glutes/15 text-area-glutes',
  legs: 'bg-area-legs/15 text-area-legs',
}

/** Selected toggle chip per body area: solid pastel with dark text (8:1 or more). */
export const AREA_FILL: Record<BodyArea, string> = {
  chest: 'bg-area-chest text-bg',
  shoulders: 'bg-area-shoulders text-bg',
  back: 'bg-area-back text-bg',
  arms: 'bg-area-arms text-bg',
  core: 'bg-area-core text-bg',
  glutes: 'bg-area-glutes text-bg',
  legs: 'bg-area-legs text-bg',
}

/**
 * Toggle chip (filters). Off: outlined. On: filled, with `fill` choosing the colour (pink by default,
 * or an area's pastel), so the state shows by fill as well as colour.
 */
export const toggleChip = (selected: boolean, fill = 'bg-primary text-bg') =>
  `rounded-full border-2 px-3 py-1 text-sm capitalize hover:cursor-pointer ${focusRing} ${selected ? `border-transparent font-medium ${fill}` : 'border-outline hover:bg-surface'}`
