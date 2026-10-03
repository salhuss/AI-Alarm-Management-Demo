import { useMemo, useEffect } from 'react'
import Faceplate from './components/Faceplate.jsx'
import TrendGraph from './components/TrendGraph.jsx'
import TripPanel from './components/TripPanel.jsx'
import { traceColorFor } from './components/traceColors.js'
import InsightCard from './components/InsightCard.jsx'
import AlarmSummary from './components/AlarmSummary.jsx'
import useUnitTrips from './hooks/useUnitTrips.js'
import ContactorUnit from './components/units/ContactorUnit.jsx'
import SalesGasUnit from './components/units/SalesGasUnit.jsx'
import ProducedWaterUnit from './components/units/ProducedWaterUnit.jsx'
import WellpadUnit from './components/units/WellpadUnit.jsx'

/**
 * Units with a purpose-drawn graphic. Anything not listed here falls back
 * to the generic topology-driven layout until it gets its own drawing.
 */
const CUSTOM_GRAPHIC = {
  amine: ContactorUnit,
  dehydration: ContactorUnit,
  salesGas: SalesGasUnit,
  producedWater: ProducedWaterUnit,
  wellpads: WellpadUnit,
}
import { EQUIPMENT, instrumentsForUnit } from './plant/index.js'
import { UNIT_LAYOUT } from './plant/layout.js'
import { relevantInstruments } from './plant/relevance.js'
import './plant-view.css'

/**
 * Unit detail page — its own full screen, the way the separator screen is.
 *
 * Equipment is absolutely positioned on a process canvas with pipe runs
 * between items, so it reads like a process graphic rather than a flow
 * chart. Faceplates are fixed down the right side; the trend sits beneath
 * the canvas.
 */

export default function UnitPage({
  unit, values = {}, trendData = {}, unitState = 'normal',
  onBack,
  isPaused, onTogglePause, onOverride, onClearOverride, onUnitStateChange,
}) {
  const trips = useUnitTrips({ unit, isPaused, onOverride, onClearOverride })
  const CustomGraphic = CUSTOM_GRAPHIC[unit]
  const instruments = useMemo(() => instrumentsForUnit(unit), [unit])
  const meta = UNIT_LAYOUT[unit]

  // A unit trip run from this page overrides the plant-level state.
  const localTripped = trips.scenario === 'trip'
  const effectiveState = localTripped ? 'tripped' : unitState


  // Report this unit's state upward, so its block on the PFD reflects a trip
  // run from here.
  useEffect(() => {
    onUnitStateChange?.(localTripped ? 'tripped' : 'normal')
  }, [localTripped, onUnitStateChange])

  // The three most relevant instruments for this unit: one control point
  // plus its most informative trips. A unit may carry a dozen instruments
  // across equipment that is not on the drawing, and showing all of them
  // is noise — see plant/relevance.js.
  const ordered = useMemo(() => relevantInstruments(unit), [unit])

  const series = ordered
    .map((inst) => ({ instrument: inst, data: trendData[inst.tag] ?? [] }))
    .filter((s) => s.data.length)



  return (
    <div className="unit-page">
      <div className="unit-page-head">
        <button className="unit-page-back" onClick={onBack}>← PROCESS FLOW</button>
        <h2 className="unit-page-title">{meta?.label ?? unit}</h2>
        <span className="unit-page-sub">{meta?.sublabel}</span>
        <span className="unit-page-count">
          {ordered.length} of {instruments.length} instruments
        </span>
        <span className={`unit-page-state ${effectiveState}`}>{effectiveState.toUpperCase()}</span>
      </div>

      <div className="unit-page-main">
        {/* Process graphic: purpose-drawn where one exists */}
        <div className="unit-canvas-wrap">
          <div className="unit-custom-graphic">
            {CustomGraphic && (
              <CustomGraphic
                unit={unit}
                equipment={EQUIPMENT[unit]}
                values={values}
                unitState={effectiveState}
              />
            )}
          </div>
        </div>

        {/* Trip controls, fixed column */}
        <div className="unit-page-controls">
          <TripPanel
            instruments={ordered}
            scenario={trips.scenario}
            subjectTag={trips.subjectTag}
            floodCount={trips.floodCount}
            onTrip={trips.runTrip}
            onPredictive={trips.runPredictive}
            onNuisance={trips.runNuisance}
            onReset={trips.reset}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
          />
        </div>
      </div>

      {/*
        One band below the graphic, shared: faceplates when idle, the AI
        analysis while a scenario runs. Giving the analysis its own row as
        well left the process graphic 230px against the 430px the tower
        needs, so it scrolled — and the graphic is the subject of the page.
      */}
      {trips.insight ? (
        <InsightCard
          insight={trips.insight}
          onDismiss={() => trips.setInsight(null)}
          onAction={trips.insight.actionable ? trips.shelveSubject : undefined}
          actionLabel="SHELVE FOR 2 HOURS"
          wide
        />
      ) : (
        <div className="unit-page-faceplates">
          {ordered.map((inst) => {
            // Faceplates that have a line on the trend carry its colour.
            const seriesIndex = series.findIndex((s) => s.instrument.tag === inst.tag)
            return (
              <Faceplate
                key={inst.tag}
                instrument={inst}
                value={values[inst.tag] ?? inst.envelope?.normal ?? inst.setpoint}
                health={trips.health[inst.tag] ?? 100}
                traceColor={seriesIndex >= 0 ? traceColorFor(seriesIndex) : undefined}
              />
            )
          })}
          {ordered.length === 0 && <div className="unit-page-empty">No instruments on this unit</div>}
        </div>
      )}

      <div className="unit-page-foot">
        {series.length > 0
          ? <TrendGraph series={series} focusTag={ordered[0]?.tag} />
          : <div className="unit-page-empty">No trend data</div>}

        {/* Right column: alarm summary, or the final elements when idle. */}
        {trips.alarms.length > 0 ? (
          <AlarmSummary
            alarms={trips.alarms}
            onAcknowledge={(id) => trips.setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))}
            onShelve={(id) => trips.setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, shelved: true } : a)))}
            aiSuppressing={trips.insight ? trips.insight.consequences : 0}
          />
        ) : (
          <div className="unit-page-idle">
            <div className="unit-page-panel-head">ALARMS</div>
            <div className="unit-page-empty">
              No active alarms. Trigger a scenario to see root cause analysis.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
