import type { BodyArea, Workout } from '../types'
import { BODY_AREAS, EQUIPMENT, estimateSeconds, formatDuration } from '../utils'
import { card } from '../styles'
import { AreaChip } from './ExerciseBits'

const bodyAreaNames = Object.keys(BODY_AREAS) as BodyArea[]

/**
 * A saved workout as a tappable card: name, length, and its focus as coloured area chips.
 * Renders the <li>, so use it inside a <ul>. `actionLabel` names what tapping does, e.g. "Edit" or "Start".
 */
export default function WorkoutCard({ workout, actionLabel, onSelect, headingLevel = 'h2' }: {
  workout: Workout
  actionLabel: string
  onSelect: () => void
  /** h2 when the list sits right under the page title, h3 under a section heading */
  headingLevel?: 'h2' | 'h3'
}) {
  const Heading = headingLevel
  const count = workout.steps.filter((s) => s.type === 'exercise').length
  // fixed order, not the order they were tapped
  const areas = bodyAreaNames.filter((a) => workout.bodyAreas?.includes(a))
  const equipment = EQUIPMENT.filter((e) => workout.equipment?.includes(e))
  const name = workout.name || 'Untitled workout'

  return (
    <li className={`relative flex w-full flex-col gap-2 ${card} px-5 py-4 transition-colors hover:bg-surface-hover has-[button:focus-visible]:outline-3 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-primary motion-reduce:transition-none`}>
      <Heading className="font-semibold leading-snug wrap-break-word">
        {/* ::after stretches the click target over the whole card */}
        <button
          type="button"
          onClick={onSelect}
          aria-label={`${actionLabel} ${name}`}
          className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:cursor-pointer focus-visible:outline-none"
        >
          {name}
        </button>
      </Heading>
      <p className="text-sm text-white/75">
        {count} exercise{count === 1 ? '' : 's'} · ~{formatDuration(estimateSeconds(workout.steps))}
      </p>
      {(areas.length > 0 || equipment.length > 0) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          <span className="sr-only">Focus: </span>
          {areas.map((area) => {
            const picked = BODY_AREAS[area].filter((m) => workout.muscles?.includes(m))
            return <AreaChip key={area} area={area} detail={picked.length > 0 ? picked.join(', ') : undefined} />
          })}
          {equipment.length > 0 && <span className="capitalize text-white/75"><span className="sr-only">, equipment: </span>{equipment.join(', ')}</span>}
        </p>
      )}
    </li>
  )
}
