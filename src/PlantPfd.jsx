import { useState, useEffect, useRef, useMemo } from 'react'
import ProcessFlowDiagram from './components/ProcessFlowDiagram.jsx'
import AlarmSummary from './components/AlarmSummary.jsx'
import EsdPanel from './components/EsdPanel.jsx'
import InsightCard from './components/InsightCard.jsx'
import useCascade from './hooks/useCascade.js'
import {
  EFFECTS, INSTRUMENTS, INITIATORS, AMINE_TRIPS,
  instrumentsForUnit, limitCrossed,
} from './plant/index.js'
import { UNIT_KEYS } from './plant/layout.js'
import './plant-view.css'

/**
 * PFD landing page: the diagram across the top, controls and alarms below.
 *
 * Headline value per unit is its primary control instrument — the one an
 * operator would watch first. Live values come from the instrument
 * envelopes, so idle behaviour reflects the real operating range rather
 * than invented numbers.
 */

/** The instrument whose value heads each unit block on the diagram. */
const HEADLINE_INSTRUMENT = {
  wellpads: 'PIT-09A-03',
  separator: 'PIT-1001-01',
  amine: 'LIT-2201-05',
  dehydration: 'LIT-1101-01',
  salesGas: 'PIT-3001-01',
  producedWater: 'LIT-2001-01',
}

/** Resolve the headline tag for either dataset, falling back by service. */
const resolveHeadline = (unit) => {
  const preferred = HEADLINE_INSTRUMENT[unit]
  const exact = INSTRUMENTS.find((i) => i.tag === preferred)
  if (exact) return exact
  // Real overlay uses different tag numbers; fall back to the unit's first
  // control instrument.
  return instrumentsForUnit(unit).find((i) => i.duty === 'control')
    ?? instrumentsForUnit(unit)[0]
    ?? null
}

const fmt = (value, inst) => {
  if (value == null || !inst) return null
  const decimals = inst.eng === 'mm' ? 0 : inst.eng === 'barg' && inst.range[1] <= 1 ? 2 : 1
  return { value: value.toFixed(decimals), unit: inst.eng }
}

export default function PlantPfd() {
  const {
    activeInitiator, alarms, actuatedEffects, insight, isPaused,
    triggerInitiator, triggerAmineTrip, reset, togglePause, setAlarms, setInsight,
  } = useCascade()

  const [selectedUnit, setSelectedUnit] = useState(null)

  const headlines = useMemo(
    () => Object.fromEntries(UNIT_KEYS.map((u) => [u, resolveHeadline(u)])),
    [],
  )

  const [values, setValues] = useState(() =>
    Object.fromEntries(
      UNIT_KEYS.map((u) => [u, headlines[u]?.envelope?.normal ?? headlines[u]?.setpoint ?? 0]),
    ),
  )

  const pausedRef = useRef(isPaused)
  const unitStatesRef = useRef({})

  // Which units have had an effect actuated on them.
  const actuatedByUnit = {}
  for (const n of Object.keys(actuatedEffects).map(Number)) {
    const unit = EFFECTS[n]?.unit
    if (unit) actuatedByUnit[unit] = (actuatedByUnit[unit] ?? 0) + 1
  }

  const amineTripActive = AMINE_TRIPS.some((t) => t.tag === activeInitiator)
  const initiator = INITIATORS.find((i) => i.tag === activeInitiator)
  const isTotalShutdown = Boolean(initiator?.totalShutdown)

  const unitStates = {}
  for (const unit of UNIT_KEYS) {
    if (amineTripActive && unit === 'amine') unitStates[unit] = 'tripped'
    else if (actuatedByUnit[unit]) unitStates[unit] = isTotalShutdown ? 'shutdown' : 'tripped'
    else if (activeInitiator && !amineTripActive) unitStates[unit] = 'alarm'
    else unitStates[unit] = 'normal'
  }

  useEffect(() => { pausedRef.current = isPaused }, [isPaused])
  useEffect(() => { unitStatesRef.current = unitStates })

  // Live values from each instrument's envelope. Tripped units decay.
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return
      setValues((prev) => {
        const next = { ...prev }
        for (const unit of UNIT_KEYS) {
          const inst = headlines[unit]
          if (!inst) continue
          const env = inst.envelope
          const state = unitStatesRef.current[unit]

          if (state === 'tripped' || state === 'shutdown') {
            // Decay toward the bottom of range: vented pressure, drained level.
            const floor = inst.range[0]
            next[unit] = Math.max(floor, prev[unit] - (env?.noise ?? 1) * 2)
          } else if (env) {
            const drift = (Math.random() - 0.5) * env.noise * 2
            const wave = Math.sin(Date.now() / 5000) * env.noise * 0.6
            const raw = env.normal + drift + wave
            next[unit] = Math.min(Math.max(raw, env.band[0]), env.band[1])
          }
        }
        return next
      })
    }, 500)
    return () => clearInterval(id)
  }, [headlines])

  const unitValues = Object.fromEntries(
    UNIT_KEYS.map((u) => [u, fmt(values[u], headlines[u])]),
  )

  const acknowledge = (id) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
  const shelve = (id) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, shelved: true } : a)))

  // Any headline instrument sitting outside its limits, for the status strip.
  const deviations = UNIT_KEYS.map((u) => {
    const inst = headlines[u]
    if (!inst) return null
    const crossed = limitCrossed(values[u], inst)
    return crossed ? { unit: u, tag: inst.tag, ...crossed } : null
  }).filter(Boolean)

  return (
    <div className="plant-pfd-page">
      <ProcessFlowDiagram
        unitStates={unitStates}
        unitValues={unitValues}
        selectedUnit={selectedUnit}
        onSelectUnit={(u) => setSelectedUnit(u === selectedUnit ? null : u)}
      />

      <div className="plant-pfd-body">
        <EsdPanel
          onTriggerInitiator={triggerInitiator}
          onTriggerAmineTrip={triggerAmineTrip}
          onReset={reset}
          activeInitiator={activeInitiator}
          isPaused={isPaused}
          onTogglePause={togglePause}
        />

        <AlarmSummary
          alarms={alarms}
          onAcknowledge={acknowledge}
          onShelve={shelve}
          onSelectUnit={setSelectedUnit}
          aiSuppressing={insight ? insight.consequences : 0}
        />

        {insight ? (
          <InsightCard insight={insight} onDismiss={() => setInsight(null)} />
        ) : (
          <div className="insight-card idle">
            <div className="insight-card-head">
              <span className="insight-card-icon">🤖</span>
              <span className="insight-card-title">AI ANALYSIS</span>
            </div>
            <div className="insight-card-idle-body">
              Monitoring {UNIT_KEYS.length} units, {INSTRUMENTS.length} instruments.
              {deviations.length > 0 && (
                <div className="insight-card-deviations">
                  {deviations.map((d) => (
                    <div key={d.tag}>
                      {d.tag} <strong>{d.limit}</strong> — {d.kind}
                    </div>
                  ))}
                </div>
              )}
              <br />
              Trigger an ESD initiator to see first-out root cause analysis.
              Compare a plant-wide ESD-1 against a selective ESD-3 trip, or an
              amine unit trip that actuates no plant effects.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
