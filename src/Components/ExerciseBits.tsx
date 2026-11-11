import type { BodyArea, Exercise, Muscle } from '../types'
import { areaOf } from '../utils'
import { AREA_CHIP } from '../styles'

/**
 * A muscle as a soft chip, coloured by its body area so exercises can be scanned by colour.
 * `muted` is for secondary muscles: a plain neutral chip, so the primary ones stand out.
 */
export const MuscleChip = ({ muscle, size = 'sm', muted = false }: { muscle: Muscle, size?: 'sm' | 'md', muted?: boolean }) => {
  const area = areaOf(muscle)
  const colour = !muted && area ? AREA_CHIP[area] : 'bg-white/10 text-white'
  const sizing = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
  return <span className={`inline-block rounded-full font-medium capitalize ${sizing} ${colour}`}>{muscle}</span>
}

/** A body area as a soft chip in its colour. `detail` adds the specific muscles, e.g. "Back · lats". */
export const AreaChip = ({ area, detail }: { area: BodyArea, detail?: string }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${AREA_CHIP[area]}`}>
    {area}{detail && <span className="font-normal"> · {detail}</span>}
  </span>
)

const LEVEL_BARS: Record<Exercise['level'], number> = { beginner: 1, intermediate: 2, expert: 3 }

/** Three rising bars, filled up to the level. Decorative: always show the level as text too. */
export const LevelBars = ({ level }: { level: Exercise['level'] }) => (
  <span aria-hidden="true" className="flex h-4 items-end gap-0.5">
    {[1, 2, 3].map((bar) => (
      <span
        key={bar}
        className={`w-1 rounded-full ${bar <= LEVEL_BARS[level] ? 'bg-primary' : 'bg-white/20'}`}
        style={{ height: `${bar * 33.4}%` }}
      />
    ))}
  </span>
)

/** Level bars with the level written underneath, in a fixed-width column so a list of them lines up. */
export const LevelMeter = ({ level }: { level: Exercise['level'] }) => (
  <span className="flex w-20 shrink-0 flex-col items-center gap-1.5">
    <LevelBars level={level} />
    <span className="text-xs capitalize text-white/75">
      <span className="sr-only">Level: </span>{level}
    </span>
  </span>
)
