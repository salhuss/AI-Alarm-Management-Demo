import { useState, useRef, useCallback, useEffect } from 'react'
import {
  EFFECTS, INITIATORS, UNIT_ORDER, AMINE_TRIPS, AMINE_FGS_ZONE,
  buildCascade, buildAmineCascade, makeAlarm, priorityForInitiator, firstOut,
} from '../plant/index.js'

const DATA = { EFFECTS, INITIATORS, UNIT_ORDER, AMINE_TRIPS }

/**
 * Runs a C&E cascade: actuates effects on their scheduled delays, raising an
 * alarm per actuation, then produces the AI root-cause analysis.
 *
 * Pause is held in a ref rather than read from state inside the timers. The
 * existing scenario handlers in App.jsx check a captured `isPaused` that
 * never refreshes, so pausing them has no effect once a scenario is running
 * (App.jsx:134, 164, 261, 339, 431). A ref is always current, so pause here
 * actually pauses, and resume continues from where it stopped.
 */
export default function useCascade() {
  const [activeInitiator, setActiveInitiator] = useState(null)
  const [alarms, setAlarms] = useState([])
  const [actuatedEffects, setActuatedEffects] = useState({}) // effectNumber -> true
  const [insight, setInsight] = useState(null)
  const [isPaused, setIsPaused] = useState(false)

  const pausedRef = useRef(false)
  const timersRef = useRef([])
  const queueRef = useRef([]) // pending [{ item, remainingMs }]
  const tickRef = useRef(null)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    queueRef.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  /**
   * Drives the pending queue on a 50ms tick, decrementing only while not
   * paused. Using a tick rather than one setTimeout per effect is what makes
   * pause/resume mid-cascade work — a timeout cannot be paused, only
   * cancelled and recreated with a recomputed delay.
   */
  const startQueue = useCallback((items, onItem, onDone) => {
    queueRef.current = items.map((item) => ({ item, remainingMs: item.delayMs }))
    const TICK = 50

    tickRef.current = setInterval(() => {
      if (pausedRef.current) return

      const due = []
      queueRef.current = queueRef.current.filter((entry) => {
        entry.remainingMs -= TICK
        if (entry.remainingMs <= 0) {
          due.push(entry.item)
          return false
        }
        return true
      })

      due.forEach(onItem)

      if (queueRef.current.length === 0) {
        clearInterval(tickRef.current)
        tickRef.current = null
        onDone?.()
      }
    }, TICK)
  }, [])

  const togglePause = useCallback(() => {
    setIsPaused((p) => {
      pausedRef.current = !p
      return !p
    })
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setActiveInitiator(null)
    setAlarms([])
    setActuatedEffects({})
    setInsight(null)
    setIsPaused(false)
    pausedRef.current = false
  }, [clearTimers])

  /** Trigger a plant-wide ESD initiator. */
  const triggerInitiator = useCallback((tag) => {
    const initiator = INITIATORS.find((i) => i.tag === tag)
    if (!initiator) return

    clearTimers()
    setActuatedEffects({})
    setInsight(null)
    setActiveInitiator(tag)

    // The initiator alarm is first-out: it precedes every effect it causes.
    const initiatorAlarm = makeAlarm({
      tag: initiator.tag,
      description: initiator.description,
      priority: priorityForInitiator(initiator),
      isFirstOut: true,
      unit: initiator.effects.length === 30 ? 'separator' : EFFECTS[initiator.effects[0]]?.unit,
    })
    setAlarms([initiatorAlarm])

    const schedule = buildCascade(tag, DATA)

    startQueue(
      schedule,
      (item) => {
        setActuatedEffects((prev) => ({ ...prev, [item.effectNumber]: true }))
        setAlarms((prev) => [
          ...prev,
          makeAlarm({
            tag: item.tag,
            description: `${item.description} — ${item.action.toUpperCase()}`,
            priority: 'high',
            unit: item.unit,
            effectNumber: item.effectNumber,
          }),
        ])
      },
      () => {
        // Cascade complete — produce the AI analysis.
        setAlarms((prev) => {
          const root = firstOut(prev)
          const consequences = prev.length - 1
          const span = prev.length > 1
            ? prev[prev.length - 1].timestamp - root.timestamp
            : 0

          setInsight(buildInsight({ initiator, root, consequences, span, schedule }))
          return prev
        })
      },
    )
  }, [clearTimers, startQueue])

  /** Trigger a unit-level sweetening trip. */
  const triggerAmineTrip = useCallback((tag) => {
    const trip = AMINE_TRIPS.find((t) => t.tag === tag)
    if (!trip) return

    clearTimers()
    setActuatedEffects({})
    setInsight(null)
    setActiveInitiator(tag)

    const tripAlarm = makeAlarm({
      tag: trip.tag,
      description: `${trip.service} — ${trip.direction} @ ${trip.setpoint} ${trip.unit}`,
      priority: 'urgent',
      isFirstOut: true,
      unit: 'amine',
    })

    const local = buildAmineCascade(tag, DATA)
    setAlarms([
      tripAlarm,
      ...local.map((item) =>
        makeAlarm({
          tag: item.tag,
          description: item.description,
          priority: 'high',
          unit: 'amine',
        }),
      ),
    ])

    setInsight(buildAmineInsight({ trip, local }))
  }, [clearTimers])

  return {
    activeInitiator, alarms, actuatedEffects, insight, isPaused,
    triggerInitiator, triggerAmineTrip, reset, togglePause,
    setAlarms, setInsight,
  }
}

/** AI root-cause card for a plant-wide ESD. */
function buildInsight({ initiator, root, consequences, span, schedule }) {
  const unitsHit = [...new Set(schedule.map((s) => s.unit))]
  const byAction = schedule.reduce((acc, s) => {
    acc[s.action] = (acc[s.action] ?? 0) + 1
    return acc
  }, {})
  const actionSummary = Object.entries(byAction)
    .map(([action, n]) => `${n} ${action.toLowerCase()}`)
    .join(', ')

  return {
    kind: 'root-cause',
    icon: '🤖',
    title: 'AI ROOT CAUSE ANALYSIS',
    headline: `Root cause: ${initiator.tag}`,
    subtitle: initiator.description,
    rootTag: initiator.tag,
    consequences,
    details: [
      {
        label: 'ROOT CAUSE (first-out)',
        value: `${initiator.tag} — ${initiator.description}. Voting ${initiator.voting}. Timestamped ${root.timestamp.toLocaleTimeString('en-GB', { hour12: false })}.${root.timestamp.getMilliseconds().toString().padStart(3, '0')}, earlier than every other alarm in this event.`,
      },
      {
        label: 'CONSEQUENTIAL ALARMS',
        value: `${consequences} alarms raised across ${unitsHit.length} units within ${span}ms, all downstream of the initiator above. Executive actions: ${actionSummary}.`,
      },
      {
        label: 'CAUSE & EFFECT BASIS',
        value: initiator.effects.length === 30
          ? `${initiator.tag} is a total facility shutdown initiator: the C&E matrix maps it to all 30 output effects. The AI reads that mapping directly rather than inferring it from alarm order.`
          : `The C&E matrix maps ${initiator.tag} to effects ${initiator.effects.join(', ')} only. Everything else in the alarm list is a process consequence, not a separate fault.`,
      },
      {
        label: 'WITHOUT AI',
        value: `Operator sees ${consequences + 1} alarms arriving inside ${span}ms with no indication of which came first or which caused the rest. Reconstructing the sequence from timestamps and the C&E drawings takes 3-5 minutes.`,
      },
      {
        label: 'WITH AI',
        value: `First-out identification plus the C&E mapping isolates the initiator in ~2 seconds, and the ${consequences} consequential alarms are grouped beneath it instead of competing for attention.`,
      },
    ],
  }
}

/**
 * AI card for a sweetening unit trip. The point of contrast: this is a
 * genuine SIL-1 ESD trip, but it is unit-level, so it does not actuate the
 * plant effects — a distinction an operator watching an alarm list cannot
 * easily make, and the reason the FGS voting path is worth calling out.
 */
function buildAmineInsight({ trip, local }) {
  const h2s = AMINE_FGS_ZONE.detectors.find((d) => d.type === 'Toxic H2S')

  return {
    kind: 'unit-trip',
    icon: '🤖',
    title: 'AI SCOPE ANALYSIS',
    headline: `Unit-level trip: ${trip.tag}`,
    subtitle: `${trip.service} — contained to the sweetening unit`,
    rootTag: trip.tag,
    consequences: local.length,
    details: [
      {
        label: 'TRIP CONFIRMED',
        value: `${trip.tag} — ${trip.service}. ${trip.direction} trip at ${trip.setpoint} ${trip.unit}, ${trip.sil} rated. Actuated on ${trip.equipment}.`,
      },
      {
        label: 'SCOPE: UNIT-LEVEL ONLY',
        value: `This trip actuates local equipment and does NOT initiate a plant shutdown. The sweetening unit is not a primary initiator in the top-level C&E matrix, so effects 1-30 remain unactuated and the rest of the train keeps running on reduced feed.`,
      },
      {
        label: 'WHY THAT MATTERS',
        value: `An operator seeing a SIL-1 ESD trip may reasonably assume a plant-wide shutdown is in progress. The AI states the actual scope from the C&E matrix, so the response is sized to the event.`,
      },
      {
        label: 'THE ESCALATION PATH',
        value: `A release in this area does reach full shutdown, but by a different route: detectors ${h2s.tags.slice(0, 2).join('/')}… trip at ${h2s.tripAt} ${h2s.unit} and vote 2ooN into ${h2s.votesInto}, which is an ESD-1 initiator actuating all 30 effects. Level and pressure trips here do not.`,
      },
    ],
  }
}
