/**
 * Which instruments a unit page shows.
 *
 * A unit may carry a dozen instruments across equipment that is not on the
 * drawing — the amine unit has nine SIL-1 trips, six of them on the
 * regeneration side that the contactor graphic deliberately omits. Showing
 * all of them is noise: an operator looking at the contactor wants the
 * contactor's points.
 *
 * Selection, in order:
 *   1. instruments on equipment that is actually drawn for this unit
 *   2. one control point, then the safeguarding points that matter most
 *   3. capped, so the faceplate row and the trip list stay readable
 */

import { EQUIPMENT, instrumentsForUnit } from './index.js'

export const MAX_FACEPLATES = 3

/**
 * Does this instrument sit on equipment that this unit draws?
 *
 * Matched on the tag's equipment number — LIT-3201-05 and C-3201-01 share
 * the 3201 series but differ in the item number, so the check is on the
 * service description naming the drawn equipment, falling back to including
 * the instrument when the unit draws everything.
 */
/** Words too generic to identify a specific item of equipment. */
const GENERIC = new Set([
  'unit', 'package', 'vessel', 'amine', 'glycol', 'water', 'produced',
  'export', 'feed', 'lean', 'rich', 'well', 'mobile', 'pipeline', 'drum',
  'column', 'pump', 'cooler', 'filter',
])

/**
 * Does this instrument sit on equipment that this unit draws?
 *
 * Matched on distinctive words in the equipment name — "absorber",
 * "contactor", "separator", "degasser", "compressor". Generic words are
 * excluded, because matching on "amine" alone would pull in every
 * instrument in the amine unit including the reboiler points whose
 * equipment the contactor graphic omits.
 */
const onDrawnEquipment = (instrument, unit) => {
  const drawn = EQUIPMENT[unit] ?? []
  if (!drawn.length) return true

  const keywords = drawn.flatMap((e) =>
    e.name
      .toLowerCase()
      .split(/[\s/]+/)
      .filter((w) => w.length > 4 && !GENERIC.has(w)),
  )
  if (!keywords.length) return true

  const service = instrument.service.toLowerCase()
  return keywords.some((k) => service.includes(k))
}

const isTrippable = (i) => Boolean(i.trips && (i.trips.HH != null || i.trips.LL != null))

/** How informative a trip is: both limits beats one. */
const tripSpan = (i) => (i.trips ? Object.keys(i.trips).length : 0)

/**
 * The instruments to show for a unit, most relevant first.
 *
 * Composed rather than just sorted, because sorting control-first and
 * truncating can leave a unit with no trippable point at all — the
 * separator has three control points and three trips, and a naive sort
 * drops every trip, which breaks the AI scenario the page exists to
 * demonstrate. So: one control point to watch, then the most informative
 * trips, and the selection is guaranteed to contain at least one trip
 * whenever the unit has one.
 */
export const relevantInstruments = (unit, limit = MAX_FACEPLATES) => {
  const all = instrumentsForUnit(unit)
  const onDrawing = all.filter((i) => onDrawnEquipment(i, unit))
  const pool = onDrawing.length ? onDrawing : all

  const controls = pool.filter((i) => i.duty === 'control')

  // Trips are drawn from the whole unit, not just the drawn equipment: a
  // unit's safeguarding is the point of the demo, and a service description
  // does not always name its vessel — the export line trip protects the
  // compressor without saying "compressor".
  const trips = all
    .filter(isTrippable)
    .sort((a, b) => tripSpan(b) - tripSpan(a))

  const rest = pool.filter((i) => !controls.includes(i) && !trips.includes(i))

  const selected = []
  // The control point an operator watches first.
  if (controls.length) selected.push(controls[0])
  // Then trips, which are what the scenarios act on.
  for (const t of trips) {
    if (selected.length >= limit) break
    selected.push(t)
  }
  // Backfill with any remaining control or monitoring points.
  for (const i of [...controls.slice(1), ...rest]) {
    if (selected.length >= limit) break
    selected.push(i)
  }

  return selected.slice(0, limit)
}

/** Of those, the ones that can be tripped — what the AI scenario box offers. */
export const trippableInstruments = (unit, limit = MAX_FACEPLATES) =>
  relevantInstruments(unit, limit).filter(
    (i) => i.trips && (i.trips.HH != null || i.trips.LL != null),
  )
