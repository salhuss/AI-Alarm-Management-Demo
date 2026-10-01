import { useState, useRef, useCallback, useEffect } from 'react'
import {
  INSTRUMENTS, FINAL_ELEMENTS, EQUIPMENT, AMINE_TRIPS,
  instrumentsForUnit, finalElementsForUnit,
  makeAlarm, firstOut,
  VALVE_STATE, MOTOR_STATE, priorityFor,
} from '../plant/index.js'

/**
 * Per-unit trip simulation: the three AI scenarios, driven by whichever
 * unit you are looking at rather than hardcoded to the separator.
 *
 *   trip            — ramp an instrument to its trip point, actuate the
 *                     final elements it closes or trips, flood with
 *                     consequential alarms, then show first-out analysis
 *   predictive      — inject noise and drift into a healthy instrument and
 *                     raise an FDM-style degradation warning
 *   nuisance        — oscillate across an alarm threshold until it chatters,
 *                     then offer a contextual shelve
 *
 * Ramps advance on a tick that reads `isPaused` from a ref, so pause works
 * mid-scenario. The original scenario handlers capture isPaused at call
 * time and never refresh it (App.jsx:134, 164, 261, 339, 431), so pausing a
 * running scenario there does nothing.
 */

const TICK_MS = 100
const FLOOD_INTERVAL_MS = 400

/** Consequential alarms a trip raises across the unit, from its own tags. */
const consequentialTags = (unit) => {
  const equipment = (EQUIPMENT[unit] ?? []).map((e) => ({
    tag: e.tag, description: `${e.name} — process deviation`,
  }))
  const elements = finalElementsForUnit(unit).map((f) => ({
    tag: f.tag, description: `${f.service} — position change`,
  }))
  const others = instrumentsForUnit(unit).map((i) => ({
    tag: i.tag, description: `${i.service} — deviation`,
  }))
  return [...elements, ...equipment, ...others]
}

export default function useUnitTrips({ unit, isPaused, onOverride, onClearOverride }) {
  const [scenario, setScenario] = useState(null) // 'trip' | 'predictive' | 'nuisance'
  const [subjectTag, setSubjectTag] = useState(null)
  const [alarms, setAlarms] = useState([])
  const [insight, setInsight] = useState(null)
  const [health, setHealth] = useState({})
  const [valveStates, setValveStates] = useState({})
  const [motorStates, setMotorStates] = useState({})
  const [floodCount, setFloodCount] = useState(0)

  const pausedRef = useRef(isPaused)
  const timersRef = useRef([])
  useEffect(() => { pausedRef.current = isPaused }, [isPaused])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => { clearInterval(t); clearTimeout(t) })
    timersRef.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const reset = useCallback(() => {
    clearTimers()
    setScenario(null)
    setSubjectTag(null)
    setAlarms([])
    setInsight(null)
    setHealth({})
    setValveStates({})
    setMotorStates({})
    setFloodCount(0)
    onClearOverride?.()
  }, [clearTimers, onClearOverride])

  // Switching unit does not need handling here: PlantPfd keys UnitPage on
  // the unit, so React remounts this hook with fresh state and the unmount
  // cleanup above clears any running timers.

  /**
   * Scenario 1 — ramp to trip, actuate, flood, analyse.
   * `instrument` must have a trip setpoint; direction is inferred from
   * which of HH/LL it carries.
   */
  const runTrip = useCallback((instrument) => {
    if (scenario || !instrument?.trips) return
    const toHH = instrument.trips.HH != null
    const target = toHH ? instrument.trips.HH : instrument.trips.LL
    const start = instrument.envelope?.normal ?? instrument.setpoint ?? instrument.range[0]

    clearTimers()
    setScenario('trip')
    setSubjectTag(instrument.tag)
    setAlarms([])
    setInsight(null)
    setFloodCount(0)

    // Ramp over ~4s so the trend shows the approach, not a step change.
    const steps = Math.round(4000 / TICK_MS)
    let step = 0
    const ramp = setInterval(() => {
      if (pausedRef.current) return
      step += 1
      const value = start + (target - start) * (step / steps)
      onOverride?.(instrument.tag, value)

      if (step >= steps) {
        clearInterval(ramp)
        onOverride?.(instrument.tag, target)

        // Trip asserts: first-out alarm.
        const rootAlarm = makeAlarm({
          tag: instrument.tag,
          description: `${instrument.service} — ${toHH ? 'HH' : 'LL'} TRIP @ ${target} ${instrument.eng}`,
          priority: priorityFor({ kind: 'trip', duty: instrument.duty }),
          isFirstOut: true,
          unit,
        })
        setAlarms([rootAlarm])

        // Actuate the unit's final elements: SDVs close, BDVs open, pumps trip.
        const elements = finalElementsForUnit(unit)
        setValveStates(
          Object.fromEntries(
            elements
              .filter((e) => e.type !== 'control')
              .map((e) => [e.tag, e.type === 'BDV' ? VALVE_STATE.OPEN : VALVE_STATE.CLOSED]),
          ),
        )
        setMotorStates(
          Object.fromEntries(
            (EQUIPMENT[unit] ?? [])
              .filter((e) => e.type === 'pump' || e.type === 'compressor')
              .map((e) => [e.tag, MOTOR_STATE.TRIPPED]),
          ),
        )

        // Flood: consequential alarms at 400ms, then the AI card.
        const pool = consequentialTags(unit).filter((c) => c.tag !== instrument.tag)
        let i = 0
        const flood = setInterval(() => {
          if (pausedRef.current) return
          if (i >= pool.length) {
            clearInterval(flood)
            setAlarms((prev) => {
              const root = firstOut(prev)
              const span = prev.length > 1 ? prev.at(-1).timestamp - root.timestamp : 0
              setInsight(buildTripInsight({ instrument, target, toHH, consequences: prev.length - 1, span, elements }))
              return prev
            })
            return
          }
          const c = pool[i]
          i += 1
          setFloodCount(i)
          setAlarms((prev) => [
            ...prev,
            makeAlarm({ tag: c.tag, description: c.description, priority: 'high', unit }),
          ])
        }, FLOOD_INTERVAL_MS)
        timersRef.current.push(flood)
      }
    }, TICK_MS)
    timersRef.current.push(ramp)
  }, [scenario, unit, clearTimers, onOverride])

  /** Scenario 2 — sensor degradation on a healthy instrument. */
  const runPredictive = useCallback((instrument) => {
    if (scenario || !instrument?.envelope) return
    clearTimers()
    setScenario('predictive')
    setSubjectTag(instrument.tag)
    setAlarms([])
    setInsight(null)

    const env = instrument.envelope
    let t = 0
    let warned = false

    const tick = setInterval(() => {
      if (pausedRef.current) return
      t += TICK_MS / 1000

      // Noise plus slow upward drift, held inside the alarm limits so the
      // point is degradation rather than a process excursion.
      const noise = Math.sin(t * 11) * env.noise * 1.6 + Math.cos(t * 23) * env.noise
      const drift = t * env.noise * 0.35
      const raw = env.normal + noise + drift
      const ceiling = instrument.alarms?.H ?? env.band[1]
      onOverride?.(instrument.tag, Math.min(raw, ceiling - env.noise * 0.3))

      const h = Math.max(22, 100 - t * 9)
      setHealth({ [instrument.tag]: h })

      if (t > 4 && !warned) {
        warned = true
        setAlarms([
          makeAlarm({
            tag: instrument.tag,
            description: `${instrument.service} — sensor health degrading`,
            priority: 'high',
            isFirstOut: true,
            unit,
          }),
        ])
        setInsight(buildPredictiveInsight({ instrument, health: h, driftPerHour: (env.noise * 0.35 * 3600 / (instrument.range[1] - instrument.range[0])) * 100 }))
      }
    }, TICK_MS)
    timersRef.current.push(tick)
  }, [scenario, unit, clearTimers, onOverride])

  /** Scenario 3 — chattering alarm across a threshold. */
  const runNuisance = useCallback((instrument) => {
    if (scenario || !instrument?.envelope) return
    const threshold = instrument.alarms?.H ?? instrument.trips?.HH
    if (threshold == null) return

    clearTimers()
    setScenario('nuisance')
    setSubjectTag(instrument.tag)
    setAlarms([])
    setInsight(null)

    const env = instrument.envelope
    // Oscillate either side of the threshold, staying well below any trip.
    const amplitude = Math.max(env.noise * 1.4, (threshold - env.normal) * 0.45)
    const centre = threshold - amplitude * 0.1

    let n = 0
    let crossings = 0
    let above = false
    let offered = false
    let timeAbove = 0

    const tick = setInterval(() => {
      if (pausedRef.current) return
      n += 1
      const value = centre + Math.sin(n / 7) * amplitude
      onOverride?.(instrument.tag, value)

      const nowAbove = value > threshold
      if (nowAbove) timeAbove += TICK_MS / 1000
      if (nowAbove && !above) {
        crossings += 1
        setAlarms((prev) => [
          ...prev.slice(-9),
          makeAlarm({
            tag: instrument.tag,
            description: `${instrument.service} — HIGH ${value.toFixed(1)} ${instrument.eng} (${crossings})`,
            priority: 'high',
            unit,
          }),
        ])
      }
      above = nowAbove

      if (crossings >= 5 && !offered) {
        offered = true
        const elapsed = (n * TICK_MS) / 1000
        setInsight(buildNuisanceInsight({
          instrument, threshold, crossings, elapsed,
          percentAbove: (timeAbove / elapsed) * 100,
          amplitude, centre,
        }))
      }
    }, TICK_MS)
    timersRef.current.push(tick)
  }, [scenario, unit, clearTimers, onOverride])

  /** Acting on the shelve offer actually stops the chatter. */
  const shelveSubject = useCallback(() => {
    clearTimers()
    setAlarms((prev) => prev.map((a) => ({ ...a, shelved: true })))
    setInsight((prev) => prev && {
      ...prev,
      headline: `Shelved for 2 hours: ${subjectTag}`,
      details: [
        { label: 'SHELVED', value: `${subjectTag} suppressed for 2 hours. Monitoring continues — the AI will unshelve immediately on a sustained trend, a rate-of-change spike, or an approach to the trip limit.` },
        ...prev.details.slice(1),
      ],
    })
    setScenario('shelved')
    onClearOverride?.()
  }, [clearTimers, subjectTag, onClearOverride])

  return {
    scenario, subjectTag, alarms, insight, health, valveStates, motorStates, floodCount,
    runTrip, runPredictive, runNuisance, shelveSubject, reset,
    setAlarms, setInsight,
  }
}

/* ------------------------------------------------------------- insights --- */

function buildTripInsight({ instrument, target, toHH, consequences, span, elements }) {
  const closed = elements.filter((e) => e.type === 'SDV').map((e) => e.tag)
  const opened = elements.filter((e) => e.type === 'BDV').map((e) => e.tag)

  return {
    kind: 'root-cause',
    icon: '🤖',
    title: 'AI ROOT CAUSE ANALYSIS',
    headline: `Root cause: ${instrument.tag}`,
    subtitle: `${instrument.service} — ${toHH ? 'HIGH-HIGH' : 'LOW-LOW'} trip at ${target} ${instrument.eng}`,
    rootTag: instrument.tag,
    consequences,
    details: [
      {
        label: 'ROOT CAUSE (first-out)',
        value: `${instrument.tag} reached ${target} ${instrument.eng} and asserted its ${toHH ? 'HH' : 'LL'} trip${instrument.sil ? ` (${instrument.sil})` : ''}. Earliest timestamp in the event, so it is the cause and everything after it is consequence.`,
      },
      {
        label: 'EXECUTIVE ACTION',
        value: [
          closed.length ? `Closed ${closed.join(', ')}` : null,
          opened.length ? `Opened ${opened.join(', ')}` : null,
          'Rotating equipment tripped',
        ].filter(Boolean).join('. ') + '.',
      },
      {
        label: 'CONSEQUENTIAL ALARMS',
        value: `${consequences} alarms followed within ${(span / 1000).toFixed(1)}s, all downstream of the trip above — valve position changes, equipment deviations and transmitter excursions caused by the isolation, not separate faults.`,
      },
      {
        label: 'WITHOUT AI',
        value: `Operator sees ${consequences + 1} alarms with no indication of order or causation. Reconstructing the sequence from timestamps and the C&E drawings takes 3-5 minutes while the unit is down.`,
      },
      {
        label: 'WITH AI',
        value: `First-out identification plus the cause & effect mapping isolates the initiator in about 2 seconds, and the ${consequences} consequential alarms are grouped beneath it rather than competing for attention.`,
      },
    ],
  }
}

function buildPredictiveInsight({ instrument, health, driftPerHour }) {
  return {
    kind: 'predictive',
    icon: '🔧',
    title: 'PREDICTIVE MAINTENANCE ALERT',
    headline: `Sensor health degrading: ${instrument.tag}`,
    subtitle: `${instrument.service} — still in range, but the signal is deteriorating`,
    rootTag: instrument.tag,
    consequences: 0,
    details: [
      { label: 'TAG', value: `${instrument.tag} — ${instrument.service}, range ${instrument.range[0]}-${instrument.range[1]} ${instrument.eng}` },
      { label: 'SIGNAL NOISE', value: 'Elevated above baseline. Micro-fluctuations well beyond the historical variance for this point.' },
      { label: 'DRIFT RATE', value: `${driftPerHour.toFixed(1)}% per hour, against a 2% threshold.` },
      { label: 'SENSOR HEALTH', value: `${health.toFixed(0)}%` },
      { label: 'PREDICTION', value: '80% probability of a Bad PV failure within 24 hours. The process value is still inside its alarm limits, so no process alarm has been raised — this is visible only in the signal quality.' },
      { label: 'RECOMMENDATION', value: `Schedule maintenance on ${instrument.tag} before the next shift. Catching it here avoids an unplanned trip on a failed transmitter.` },
    ],
  }
}

function buildNuisanceInsight({ instrument, threshold, crossings, elapsed, percentAbove, amplitude, centre }) {
  const trip = instrument.trips?.HH
  const margin = trip != null ? trip - centre : null

  return {
    kind: 'shelve',
    icon: '🔕',
    title: 'CONTEXTUAL SMART ALARM SHELVING',
    headline: `Chattering alarm: ${instrument.tag}`,
    subtitle: `${crossings} activations in ${elapsed.toFixed(0)}s — nuisance, not a process abnormality`,
    rootTag: instrument.tag,
    consequences: crossings,
    actionable: true,
    details: [
      { label: 'SITUATION', value: `${instrument.tag} has alarmed ${crossings} times in ${elapsed.toFixed(0)}s, oscillating +/-${amplitude.toFixed(1)} ${instrument.eng} around its high alarm at ${threshold} ${instrument.eng}.` },
      { label: 'WHY', value: `The alarm setpoint sits inside the normal control band for this loop. The process is stable; the setpoint is too close to the operating point, so ordinary control action crosses it repeatedly.` },
      {
        label: 'RISK ASSESSMENT',
        value: margin != null
          ? `LOW. Mean value ${centre.toFixed(1)} ${instrument.eng} is ${margin.toFixed(1)} ${instrument.eng} below the HH trip at ${trip}. Oscillation amplitude is ${amplitude.toFixed(1)}. ${percentAbove.toFixed(0)}% of the time has been spent above the alarm but nowhere near the trip. No shutdown risk from this pattern.`
          : `LOW. Mean value ${centre.toFixed(1)} ${instrument.eng}, oscillating +/-${amplitude.toFixed(1)}. ${percentAbove.toFixed(0)}% of the time above the alarm threshold.`,
      },
      { label: 'IF LEFT ALONE', value: `The pattern continues and contributes to alarm fatigue, which is how genuine alarms get missed. The underlying fix is a setpoint review, not suppression.` },
      { label: 'RECOMMENDATION', value: `Shelve for 2 hours to cut the distraction, and raise a work order to review the high alarm setpoint. Monitoring continues while shelved — a sustained trend, a rate-of-change spike or an approach to the trip will unshelve it immediately.` },
      { label: 'ISA-18.2', value: 'Contextual shelving with continuous threat monitoring: reduces alarm load without blinding the operator.' },
    ],
  }
}
