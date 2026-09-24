/**
 * Cause & Effect evaluator
 *
 * Takes an initiator and produces the ordered list of effect actuations it
 * causes, staged by plant unit so the HMI can animate the cascade
 * propagating along the train instead of actuating everything on one tick.
 *
 * The staging is presentation only. A real ESD actuates its outputs
 * effectively simultaneously; `delayMs` exists so an audience can follow
 * what happened. `ACTUATION_ALL_AT_ONCE` renders true simultaneous
 * behaviour if that is ever wanted.
 */

/**
 * This module holds no plant data of its own. The dataset is passed in, so
 * the same logic runs against either the synthetic or the real overlay (see
 * ./index.js) and can be tested against both.
 */

/** Per-unit stagger for the cascade animation. */
export const UNIT_STAGGER_MS = 400
/** Spread between effects inside one unit, so they read as a group. */
export const INTRA_UNIT_STAGGER_MS = 90
export const ACTUATION_ALL_AT_ONCE = false

export const ALARM_PRIORITY = {
  CRITICAL: 'critical',
  URGENT: 'urgent',
  HIGH: 'high',
  LOW: 'low',
}

/**
 * Priority per HMI_Standards.md section 2:
 *   Critical = magenta, system critical
 *   Urgent   = red, ESD & FGS trips
 *   High     = yellow, process warnings
 *   Low      = cyan, minor deviations
 */
export const priorityForInitiator = (initiator) => {
  if (!initiator) return ALARM_PRIORITY.HIGH
  if (initiator.voting === '2ooN') return ALARM_PRIORITY.URGENT // confirmed FGS
  if (initiator.totalShutdown) return ALARM_PRIORITY.CRITICAL
  return ALARM_PRIORITY.URGENT // ESD trip
}

/**
 * Build the staged actuation schedule for an initiator tag.
 * Returns [{ effectNumber, tag, description, action, unit, delayMs }], in
 * ascending delay order.
 */
export const buildCascade = (initiatorTag, { EFFECTS, INITIATORS, UNIT_ORDER }) => {
  const initiator = INITIATORS.find((i) => i.tag === initiatorTag)
  if (!initiator) return []

  const byUnit = new Map()
  for (const n of initiator.effects) {
    const effect = EFFECTS[n]
    if (!effect) continue
    if (!byUnit.has(effect.unit)) byUnit.set(effect.unit, [])
    byUnit.get(effect.unit).push(n)
  }

  const schedule = []
  let unitIndex = 0
  for (const unit of UNIT_ORDER) {
    const effectNumbers = byUnit.get(unit)
    if (!effectNumbers) continue
    effectNumbers.sort((a, b) => a - b)
    effectNumbers.forEach((n, i) => {
      schedule.push({
        effectNumber: n,
        ...EFFECTS[n],
        delayMs: ACTUATION_ALL_AT_ONCE
          ? 0
          : unitIndex * UNIT_STAGGER_MS + i * INTRA_UNIT_STAGGER_MS,
      })
    })
    unitIndex++
  }

  return schedule.sort((a, b) => a.delayMs - b.delayMs)
}

/**
 * Amine unit-level trips do not actuate Effects 1-30 (see amine.js). They
 * trip their own equipment and disturb the downstream train, so their
 * "cascade" is the local equipment plus a flow disturbance.
 */
export const buildAmineCascade = (tripTag, { AMINE_TRIPS }) => {
  const trip = AMINE_TRIPS.find((t) => t.tag === tripTag)
  if (!trip) return []
  return [
    {
      effectNumber: null,
      tag: trip.equipment,
      description: `${trip.service} — unit ESD trip (${trip.sil})`,
      action: 'Trip',
      unit: 'amine',
      delayMs: 0,
    },
  ]
}

/** An alarm record for the banner and the scrollable summary. */
export const makeAlarm = ({ tag, description, priority, isFirstOut = false, unit, effectNumber = null }) => ({
  id: `${tag}-${effectNumber ?? 'init'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  tag,
  description,
  priority,
  unit,
  effectNumber,
  isFirstOut,
  timestamp: new Date(),
  acknowledged: false,
  shelved: false,
})

/**
 * First-out root cause: the earliest-timestamped alarm. This is the analysis
 * the AI insight card presents — the initiator precedes every effect alarm
 * it caused, so the earliest timestamp is the cause and everything after it
 * is consequence.
 */
export const firstOut = (alarms) => {
  if (!alarms.length) return null
  return alarms.reduce((earliest, a) => (a.timestamp < earliest.timestamp ? a : earliest))
}

/** Count of alarms raised within `windowMs` of the earliest — flood detection. */
export const floodSize = (alarms, windowMs = 5000) => {
  const first = firstOut(alarms)
  if (!first) return 0
  return alarms.filter((a) => a.timestamp - first.timestamp <= windowMs).length
}
