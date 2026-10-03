import { useMemo, useEffect } from 'react'
import Equipment, { ValveSymbol } from './components/Equipment.jsx'
import { EQUIPMENT_SIZE } from './components/equipmentSizes.js'
import Faceplate from './components/Faceplate.jsx'
import TrendGraph from './components/TrendGraph.jsx'
import TripPanel from './components/TripPanel.jsx'
import { traceColorFor } from './components/traceColors.js'
import InsightCard from './components/InsightCard.jsx'
import AlarmSummary from './components/AlarmSummary.jsx'
import useUnitTrips from './hooks/useUnitTrips.js'
import AmineUnit from './components/units/AmineUnit.jsx'

/**
 * Units with a purpose-drawn graphic. Anything not listed here falls back
 * to the generic topology-driven layout until it gets its own drawing.
 */
const CUSTOM_GRAPHIC = {
  amine: AmineUnit,
}
import { EQUIPMENT, STREAMS, instrumentsForUnit, finalElementsForUnit } from './plant/index.js'
import { PHASE_STYLE, UNIT_LAYOUT } from './plant/layout.js'
import { MOTOR_STATE, VALVE_STATE } from './plant/hmiStates.js'
import './plant-view.css'

/**
 * Unit detail page — its own full screen, the way the separator screen is.
 *
 * Equipment is absolutely positioned on a process canvas with pipe runs
 * between items, so it reads like a process graphic rather than a flow
 * chart. Faceplates are fixed down the right side; the trend sits beneath
 * the canvas.
 */

const PAD_X = 40
const PAD_Y = 30
const GAP_X = 70
const GAP_Y = 44

/**
 * Place equipment left to right in process order by walking the unit's
 * internal streams, wrapping to a new row when the canvas gets too wide.
 * Rows are sized to their tallest item so nothing overlaps.
 */
const layoutUnit = (unit) => {
  const items = EQUIPMENT[unit] ?? []
  const tags = new Set(items.map((i) => i.tag))
  const internal = STREAMS.filter((s) => tags.has(s.from) && tags.has(s.to))

  const feeders = new Map()
  for (const s of internal) {
    if (!feeders.has(s.to)) feeders.set(s.to, [])
    feeders.get(s.to).push(s.from)
  }

  const depth = new Map()
  const resolve = (tag, seen = new Set()) => {
    if (depth.has(tag)) return depth.get(tag)
    if (seen.has(tag)) return 0 // recycle loop
    seen.add(tag)
    const up = feeders.get(tag) ?? []
    const d = up.length ? Math.max(...up.map((u) => resolve(u, seen))) + 1 : 0
    depth.set(tag, d)
    return d
  }
  items.forEach((i) => resolve(i.tag))

  const ordered = [...items].sort((a, b) => {
    const byDepth = (depth.get(a.tag) ?? 0) - (depth.get(b.tag) ?? 0)
    if (byDepth !== 0) return byDepth
    // Primary equipment first within a column, standby pumps after duty.
    if (a.primary !== b.primary) return a.primary ? -1 : 1
    return a.tag.localeCompare(b.tag)
  })

  const MAX_W = 1120
  const placed = []
  let x = PAD_X
  let y = PAD_Y
  let rowHeight = 0

  for (const item of ordered) {
    const size = EQUIPMENT_SIZE[item.type] ?? { w: 80, h: 70 }

    if (x + size.w > MAX_W && placed.length) {
      x = PAD_X
      y += rowHeight + GAP_Y
      rowHeight = 0
    }

    placed.push({ item, x, y, size })
    x += size.w + GAP_X
    rowHeight = Math.max(rowHeight, size.h)
  }

  const width = Math.max(...placed.map((p) => p.x + p.size.w), 400) + PAD_X
  const height = Math.max(...placed.map((p) => p.y + p.size.h), 240) + PAD_Y

  return { placed, internal, width, height }
}

/** Pipe runs between placed equipment, as absolutely positioned divs. */
const pipeRuns = (placed, internal, stopped) => {
  const posOf = (tag) => placed.find((p) => p.item.tag === tag)
  const runs = []

  internal.forEach((stream, i) => {
    const from = posOf(stream.from)
    const to = posOf(stream.to)
    if (!from || !to) return

    const style = PHASE_STYLE[stream.phase] ?? { color: '#808080', width: 3 }
    const x1 = from.x + from.size.w
    const y1 = from.y + from.size.h / 2
    const x2 = to.x
    const y2 = to.y + to.size.h / 2
    const key = `${stream.from}-${stream.to}-${i}`

    if (x2 >= x1) {
      // Forward: horizontal out, vertical, horizontal in.
      const mid = x1 + (x2 - x1) / 2
      runs.push({ key: `${key}-a`, left: x1, top: y1 - 2, width: Math.max(2, mid - x1), height: 4, vertical: false, stream, style })
      if (Math.abs(y2 - y1) > 4) {
        runs.push({ key: `${key}-b`, left: mid - 2, top: Math.min(y1, y2), width: 4, height: Math.abs(y2 - y1), vertical: true, stream, style })
      }
      runs.push({ key: `${key}-c`, left: mid, top: y2 - 2, width: Math.max(2, x2 - mid), height: 4, vertical: false, stream, style })
    } else {
      // Recycle: drop below the row and run back.
      const below = Math.max(from.y + from.size.h, to.y + to.size.h) + 18
      runs.push({ key: `${key}-a`, left: x1 - 2, top: y1, width: 4, height: below - y1, vertical: true, stream, style })
      runs.push({ key: `${key}-b`, left: Math.min(x2, x1), top: below - 2, width: Math.abs(x1 - x2) + 4, height: 4, vertical: false, stream, style })
      runs.push({ key: `${key}-c`, left: x2 - 2, top: y2, width: 4, height: below - y2, vertical: true, stream, style })
    }
  })

  return runs.map((r) => ({ ...r, stopped }))
}

export default function UnitPage({
  unit, values = {}, trendData = {}, unitState = 'normal',
  valveStates = {}, motorStates = {}, onBack,
  isPaused, onTogglePause, onOverride, onClearOverride, onUnitStateChange,
}) {
  const trips = useUnitTrips({ unit, isPaused, onOverride, onClearOverride })
  const CustomGraphic = CUSTOM_GRAPHIC[unit]
  const layout = useMemo(() => layoutUnit(unit), [unit])
  const instruments = useMemo(() => instrumentsForUnit(unit), [unit])
  const valves = useMemo(() => finalElementsForUnit(unit), [unit])
  const meta = UNIT_LAYOUT[unit]

  // A unit trip run from this page overrides the plant-level state.
  const localTripped = trips.scenario === 'trip'
  const effectiveState = localTripped ? 'tripped' : unitState
  const mergedValves = { ...valveStates, ...trips.valveStates }
  const mergedMotors = { ...motorStates, ...trips.motorStates }

  const stopped = effectiveState === 'tripped' || effectiveState === 'shutdown'

  // Report this unit's state upward, so its block on the PFD reflects a trip
  // run from here.
  useEffect(() => {
    onUnitStateChange?.(localTripped ? 'tripped' : 'normal')
  }, [localTripped, onUnitStateChange])
  const runs = useMemo(
    () => pipeRuns(layout.placed, layout.internal, stopped),
    [layout, stopped],
  )

  // Control first, then safeguarding — the order an operator scans.
  const ordered = useMemo(() => {
    const rank = { control: 0, safeguarding: 1, monitoring: 2 }
    return [...instruments].sort((a, b) => (rank[a.duty] ?? 9) - (rank[b.duty] ?? 9))
  }, [instruments])

  const series = ordered
    .slice(0, 4)
    .map((inst) => ({ instrument: inst, data: trendData[inst.tag] ?? [] }))
    .filter((s) => s.data.length)

  const sdvs = valves.filter((v) => v.type !== 'control')
  const controlValves = valves.filter((v) => v.type === 'control')

  const valveStateFor = (v) => mergedValves[v.tag]
    ?? (stopped
      ? (v.type === 'BDV' ? VALVE_STATE.OPEN : VALVE_STATE.CLOSED)
      : (v.normal === 'OPEN' ? VALVE_STATE.OPEN : VALVE_STATE.CLOSED))

  const motorStateFor = (item) => mergedMotors[item.tag]
    ?? (stopped
      ? MOTOR_STATE.TRIPPED
      : item.duty === 'standby' ? MOTOR_STATE.STOPPED : MOTOR_STATE.RUNNING)

  return (
    <div className="unit-page">
      <div className="unit-page-head">
        <button className="unit-page-back" onClick={onBack}>← PROCESS FLOW</button>
        <h2 className="unit-page-title">{meta?.label ?? unit}</h2>
        <span className="unit-page-sub">{meta?.sublabel}</span>
        <span className="unit-page-count">
          {CustomGraphic ? '' : `${layout.placed.length} equipment · `}{instruments.length} instruments · {valves.length} final elements
        </span>
        <span className={`unit-page-state ${effectiveState}`}>{effectiveState.toUpperCase()}</span>
      </div>

      <div className="unit-page-main">
        {/* Process graphic: purpose-drawn where one exists */}
        <div className="unit-canvas-wrap">
          {CustomGraphic ? (
            <div className="unit-custom-graphic">
              <CustomGraphic values={values} unitState={effectiveState} />
            </div>
          ) : (
            <div
              className="unit-canvas"
              style={{ width: layout.width, height: layout.height }}
            >
              {runs.map((r) => (
                <div
                  key={r.key}
                  className={`eqp-pipe${r.vertical ? ' vertical' : ''}${r.stopped ? ' stopped' : ''}`}
                  style={{
                    left: r.left, top: r.top, width: r.width, height: r.height,
                    borderTopColor: r.vertical ? undefined : r.style.color,
                    borderBottomColor: r.vertical ? undefined : r.style.color,
                    borderLeftColor: r.vertical ? r.style.color : undefined,
                    borderRightColor: r.vertical ? r.style.color : undefined,
                  }}
                  title={r.stream.label}
                />
              ))}

              {layout.placed.map(({ item, x, y }) => (
                <div key={item.tag} className="unit-canvas-item" style={{ left: x, top: y }}>
                  <Equipment
                    item={item}
                    value={values[item.tag]}
                    state={effectiveState}
                    motorState={motorStateFor(item)}
                    fansRunning={stopped ? 0 : item.fans?.length}
                  />
                </div>
              ))}
            </div>
          )}
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

      {/* Faceplates: their own row, so they are all visible at once */}
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

      <div className="unit-page-foot">
        {series.length > 0
          ? <TrendGraph series={series} focusTag={ordered[0]?.tag} />
          : <div className="unit-page-empty">No trend data</div>}

        {trips.insight ? (
          <InsightCard
            insight={trips.insight}
            onDismiss={() => trips.setInsight(null)}
            onAction={trips.insight.actionable ? trips.shelveSubject : undefined}
            actionLabel="SHELVE FOR 2 HOURS"
          />
        ) : trips.alarms.length > 0 ? (
          <AlarmSummary
            alarms={trips.alarms}
            onAcknowledge={(id) => trips.setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))}
            onShelve={(id) => trips.setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, shelved: true } : a)))}
            aiSuppressing={0}
          />
        ) : (
        <div className="unit-page-elements">
          <div className="unit-page-panel-head">FINAL ELEMENTS</div>
          <div className="unit-valve-row">
            {sdvs.map((v) => (
              <ValveSymbol key={v.tag} element={v} valveState={valveStateFor(v)} />
            ))}
            {sdvs.length === 0 && <span className="unit-page-empty">None</span>}
          </div>

          {controlValves.length > 0 && (
            <>
              <div className="unit-page-panel-head sub">CONTROL VALVES</div>
              {controlValves.map((v) => (
                <div key={v.tag} className="unit-cv">
                  <span className="unit-cv-tag">{v.tag}</span>
                  <span className="unit-cv-sp">SP {v.setpoint} {v.eng}</span>
                  <span className="unit-cv-by">← {v.drivenBy}</span>
                </div>
              ))}
            </>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
