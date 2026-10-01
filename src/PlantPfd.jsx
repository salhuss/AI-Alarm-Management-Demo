import { useState, useMemo } from 'react'
import ProcessFlowDiagram from './components/ProcessFlowDiagram.jsx'
import AlarmSummary from './components/AlarmSummary.jsx'
import EsdPanel from './components/EsdPanel.jsx'
import InsightCard from './components/InsightCard.jsx'
import UnitPage from './UnitPage.jsx'
import useCascade from './hooks/useCascade.js'
import useUnitSimulation from './hooks/useUnitSimulation.js'
import {
  EFFECTS, INSTRUMENTS, INITIATORS, AMINE_TRIPS,
  instrumentsForUnit, limitCrossed,
} from './plant/index.js'
import { UNIT_KEYS } from './plant/layout.js'
import { VALVE_STATE, MOTOR_STATE } from './plant/hmiStates.js'
import './plant-view.css'

/**
 * PFD landing page with unit drill-down.
 *
 * Clicking a unit on the diagram opens its detail view — equipment graphic,
 * faceplates, trend, final elements — which is what the separator screen
 * provides, generated for any of the six stages from the dataset.
 *
 * The simulation runs at this level rather than inside the detail view, so
 * values keep advancing while you are on the diagram and a unit you drill
 * into shows continuous history rather than restarting.
 */

/**
 * The instrument whose value heads each unit block on the diagram: the
 * primary control point, which is what an operator watches first.
 *
 * Selected by duty rather than by tag, so it resolves against either
 * dataset without this file naming any instrument — a hardcoded tag list
 * here would both break on the other dataset and publish real tags.
 */
const resolveHeadline = (unit) => {
  const forUnit = instrumentsForUnit(unit)
  return forUnit.find((i) => i.duty === 'control' && i.envelope)
    ?? forUnit.find((i) => i.duty === 'control')
    ?? forUnit.find((i) => i.envelope)
    ?? forUnit[0]
    ?? null
}

const fmt = (value, inst) => {
  if (value == null || !inst) return null
  const decimals = inst.eng === 'mm' ? 0 : inst.range[1] <= 1 ? 2 : 1
  return { value: value.toFixed(decimals), unit: inst.eng }
}

export default function PlantPfd() {
  const {
    activeInitiator, alarms, actuatedEffects, insight, isPaused,
    triggerInitiator, triggerAmineTrip, reset, togglePause, setAlarms, setInsight,
  } = useCascade()

  const [drilledUnit, setDrilledUnit] = useState(null)
  // A scenario on a unit page drives values directly, overriding the idle
  // simulation for that tag until it is reset.
  const [overrides, setOverrides] = useState({})
  const setOverride = (tag, value) => setOverrides((prev) => ({ ...prev, [tag]: value }))
  const clearOverrides = () => setOverrides({})

  const headlines = useMemo(
    () => Object.fromEntries(UNIT_KEYS.map((u) => [u, resolveHeadline(u)])),
    [],
  )

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

  const { values, trends, reset: resetSim } = useUnitSimulation({ unitStates, isPaused, overrides })

  // Reset the simulation alongside the cascade, so values return to normal.
  const resetAll = () => { reset(); resetSim() }

  const unitValues = Object.fromEntries(
    UNIT_KEYS.map((u) => [u, fmt(values[headlines[u]?.tag], headlines[u])]),
  )

  const acknowledge = (id) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
  const shelve = (id) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, shelved: true } : a)))

  // Valve and motor states derived from which effects have actuated.
  const valveStates = {}
  const motorStates = {}
  for (const n of Object.keys(actuatedEffects).map(Number)) {
    const effect = EFFECTS[n]
    if (!effect) continue
    if (effect.action === 'Close') valveStates[effect.tag] = VALVE_STATE.CLOSED
    else if (effect.action === 'Open') valveStates[effect.tag] = VALVE_STATE.OPEN
    else if (effect.action === 'Trip') motorStates[effect.tag] = MOTOR_STATE.TRIPPED
  }

  const deviations = UNIT_KEYS.map((u) => {
    const inst = headlines[u]
    if (!inst) return null
    const crossed = limitCrossed(values[inst.tag], inst)
    return crossed ? { unit: u, tag: inst.tag, ...crossed } : null
  }).filter(Boolean)

  // Drill-down is its own full page — the PFD is not shown alongside it.
  if (drilledUnit) {
    return (
      <UnitPage
        key={drilledUnit}
        unit={drilledUnit}
        values={{ ...values, ...overrides }}
        trendData={trends}
        unitState={unitStates[drilledUnit]}
        valveStates={valveStates}
        motorStates={motorStates}
        onBack={() => setDrilledUnit(null)}
        isPaused={isPaused}
        onTogglePause={togglePause}
        onOverride={setOverride}
        onClearOverride={clearOverrides}
      />
    )
  }

  return (
    <div className="plant-pfd-page">
      <ProcessFlowDiagram
        unitStates={unitStates}
        unitValues={unitValues}
        selectedUnit={null}
        onSelectUnit={setDrilledUnit}
      />

      <div className="plant-pfd-body">
        <EsdPanel
          onTriggerInitiator={triggerInitiator}
          onTriggerAmineTrip={triggerAmineTrip}
          onReset={resetAll}
          activeInitiator={activeInitiator}
          isPaused={isPaused}
          onTogglePause={togglePause}
        />

        <AlarmSummary
          alarms={alarms}
          onAcknowledge={acknowledge}
          onShelve={shelve}
          onSelectUnit={setDrilledUnit}
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
                    <div key={d.tag}>{d.tag} <strong>{d.limit}</strong> — {d.kind}</div>
                  ))}
                </div>
              )}
              <br />
              Click any unit on the diagram for its equipment, instruments and trips.
              Trigger an ESD initiator to see first-out root cause analysis — compare a
              plant-wide ESD-1 against a selective ESD-3 trip, or an amine unit trip
              that actuates no plant effects.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
