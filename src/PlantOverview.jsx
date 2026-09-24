import { useState, useEffect, useRef } from 'react'
import PlantTrain from './components/PlantTrain.jsx'
import AlarmSummary from './components/AlarmSummary.jsx'
import EsdPanel from './components/EsdPanel.jsx'
import InsightCard from './components/InsightCard.jsx'
import useCascade from './hooks/useCascade.js'
import { EFFECTS, ALL_EFFECTS, UNIT_ORDER, INITIATORS, AMINE_TRIPS } from './plant/index.js'
import './plant-view.css'

/**
 * Plant overview screen: the four-unit train with C&E driven trips.
 *
 * Normal operation jitters each unit's headline value; a trip freezes the
 * affected units and the train shows flow stopping between them. The five
 * highest-priority alarms go to the existing banner in App.jsx; everything
 * else goes to the scrollable summary here.
 */

/** Normal operating values per unit, and the tag each headline represents. */
const NOMINAL = {
  wellpads: { tag: 'PIT-09A-03', value: 52, unit: 'barg', band: 1.5 },
  separator: { tag: 'PIT-1001-03', value: 48, unit: 'barg', band: 1.2 },
  producedWater: { tag: 'LIT-2001-01', value: 820, unit: 'mm', band: 25 },
  amine: { tag: 'LIT-2201-06', value: 1100, unit: 'mm', band: 30 },
  dehydration: { tag: 'TIT-1101-04', value: 204, unit: 'degC', band: 3 },
  salesGas: { tag: 'PIT-3001-02', value: 61, unit: 'barg', band: 0.8 },
}

/** Total effects that can land on each unit, for the n/m counter. */
const TOTAL_BY_UNIT = ALL_EFFECTS.reduce((acc, n) => {
  acc[EFFECTS[n].unit] = (acc[EFFECTS[n].unit] ?? 0) + 1
  return acc
}, {})

export default function PlantOverview() {
  const {
    activeInitiator, alarms, actuatedEffects, insight, isPaused,
    triggerInitiator, triggerAmineTrip, reset, togglePause, setAlarms, setInsight,
  } = useCascade()

  const [selectedUnit, setSelectedUnit] = useState('separator')
  const [values, setValues] = useState(
    () => Object.fromEntries(UNIT_ORDER.map((u) => [u, NOMINAL[u].value])),
  )

  // The jitter interval below is created once, so it needs current values
  // rather than ones captured at creation. Refs are synced in an effect, not
  // during render — writing a ref while rendering is not safe under
  // concurrent rendering, which can render without committing.
  const pausedRef = useRef(isPaused)
  const unitStatesRef = useRef({})

  /** Units that have had an effect actuated on them. */
  const actuatedByUnit = {}
  for (const n of Object.keys(actuatedEffects).map(Number)) {
    const unit = EFFECTS[n]?.unit
    if (unit) actuatedByUnit[unit] = (actuatedByUnit[unit] ?? 0) + 1
  }

  const amineTripActive = AMINE_TRIPS.some((t) => t.tag === activeInitiator)
  const initiator = INITIATORS.find((i) => i.tag === activeInitiator)
  const isTotalShutdown = Boolean(initiator?.totalShutdown)

  const unitStates = {}
  for (const unit of UNIT_ORDER) {
    if (amineTripActive && unit === 'amine') unitStates[unit] = 'tripped'
    else if (actuatedByUnit[unit]) unitStates[unit] = isTotalShutdown ? 'shutdown' : 'tripped'
    else if (activeInitiator && !amineTripActive) unitStates[unit] = 'alarm'
    else unitStates[unit] = 'normal'
  }

  // Sync the refs the interval reads. In an effect, so it happens after
  // commit rather than during render.
  useEffect(() => { pausedRef.current = isPaused }, [isPaused])
  useEffect(() => { unitStatesRef.current = unitStates })

  // Live process jitter. Units that have tripped stop moving.
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return
      setValues((prev) => {
        const next = { ...prev }
        for (const unit of UNIT_ORDER) {
          const state = unitStatesRef.current[unit]
          const nom = NOMINAL[unit]
          if (state === 'tripped' || state === 'shutdown') {
            // Decay toward zero flow / vented pressure.
            next[unit] = Math.max(0, prev[unit] - nom.band * 0.8)
          } else {
            const drift = (Math.random() - 0.5) * nom.band
            const wave = Math.sin(Date.now() / 4000) * nom.band * 0.4
            next[unit] = nom.value + drift + wave
          }
        }
        return next
      })
    }, 500)
    return () => clearInterval(id)
  }, [])

  const headlines = Object.fromEntries(
    UNIT_ORDER.map((u) => {
      const nom = NOMINAL[u]
      const v = values[u] ?? nom.value
      return [u, { value: nom.unit === 'mm' ? v.toFixed(0) : v.toFixed(1), unit: nom.unit }]
    }),
  )

  const effectCounts = Object.fromEntries(
    UNIT_ORDER.map((u) => [u, { actuated: actuatedByUnit[u] ?? 0, total: TOTAL_BY_UNIT[u] ?? 0 }]),
  )

  const acknowledge = (id) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))

  // Shelving actually removes the alarm from the active list. The existing
  // popup's SHELVE button is inert (App.jsx:1760-1771) — it closes the dialog
  // and the alarm keeps chattering.
  const shelve = (id) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, shelved: true } : a)))

  const consequentialCount = insight?.consequences ?? 0

  // The banner's five slots: highest priority first, first-out always shown.
  // Padded to five so empty slots render as [ALARM n] like a real console.
  const PRIORITY_RANK = { critical: 0, urgent: 1, high: 2, low: 3 }
  const ranked = alarms
    .filter((a) => !a.shelved)
    .sort((a, b) => {
      if (a.isFirstOut !== b.isFirstOut) return a.isFirstOut ? -1 : 1
      const byPriority = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
      return byPriority !== 0 ? byPriority : b.timestamp - a.timestamp
    })
  const topFive = [...ranked.slice(0, 5), ...Array(Math.max(0, 5 - ranked.length)).fill(null)]

  return (
    <div className="plant-overview">
      <PlantTrain
        unitStates={unitStates}
        headlines={headlines}
        effectCounts={effectCounts}
        selectedUnit={selectedUnit}
        onSelectUnit={setSelectedUnit}
      />

      <div className="plant-overview-body">
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
          aiSuppressing={insight ? consequentialCount : 0}
        />

        {insight ? (
          <InsightCard insight={insight} onDismiss={() => setInsight(null)} />
        ) : (
          <div className="insight-card" style={{ borderColor: '#444', boxShadow: 'none', background: '#1f1f1f' }}>
            <div className="insight-card-head" style={{ backgroundColor: '#2a2a2a' }}>
              <span className="insight-card-icon">🤖</span>
              <span className="insight-card-title">AI ANALYSIS</span>
            </div>
            <div style={{ padding: '14px 12px', fontSize: '10px', color: '#888', lineHeight: 1.6 }}>
              Monitoring {UNIT_ORDER.length} units. Trigger an ESD initiator to see
              first-out root cause analysis.
              <br /><br />
              Compare a plant-wide initiator (all 30 effects, six units) against a
              selective ESD-3 trip, or an amine unit-level trip that actuates no
              plant effects at all.
            </div>
          </div>
        )}
      </div>

      {/*
        Five-button alarm banner, per HMI_Standards section 1: the five
        highest-priority active alarms. The scrollable summary above carries
        the rest — during a full ESD there are far more than five.
      */}
      <div className="alarm-banner">
        {topFive.map((alarm, i) => (
          <div
            key={alarm?.id ?? `empty-${i}`}
            className={`alarm-button ${alarm?.priority ?? 'inactive'}`}
            style={{
              position: 'relative',
              border: alarm?.isFirstOut ? '2px solid #ffff00' : undefined,
              boxShadow: alarm?.isFirstOut ? '0 0 10px rgba(255,255,0,0.8)' : undefined,
            }}
          >
            {alarm ? (
              <>
                {alarm.isFirstOut && (
                  <div className="alarm-summary-badge" style={{ position: 'absolute', top: '-8px', right: '-8px' }}>
                    FIRST-OUT
                  </div>
                )}
                <div style={{ fontWeight: 'bold' }}>{alarm.tag}</div>
                <div style={{ fontSize: '9px', lineHeight: 1.25 }}>{alarm.description}</div>
                <div style={{ fontSize: '8px', color: alarm.isFirstOut ? '#ffff00' : '#aaa', marginTop: '3px', fontFamily: 'monospace' }}>
                  {alarm.timestamp.toLocaleTimeString('en-GB', { hour12: false })}.
                  {alarm.timestamp.getMilliseconds().toString().padStart(3, '0')}
                </div>
              </>
            ) : `[ALARM ${i + 1}]`}
          </div>
        ))}
      </div>
    </div>
  )
}
