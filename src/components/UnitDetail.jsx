import { useMemo } from 'react'
import { EquipmentSymbol, Valve } from './EquipmentGraphic.jsx'
import { SYMBOL_SIZE } from './symbolSizes.js'
import Faceplate from './Faceplate.jsx'
import TrendGraph from './TrendGraph.jsx'
import { EQUIPMENT, STREAMS, instrumentsForUnit, finalElementsForUnit } from '../plant/index.js'
import { PHASE_STYLE, UNIT_LAYOUT } from '../plant/layout.js'
import { MOTOR_STATE, VALVE_STATE } from '../plant/hmiStates.js'

/**
 * Unit detail view — what the separator screen is, for any stage.
 *
 * Equipment graphic with internal streams on the left, faceplates for the
 * unit's instruments on the right, trend underneath. Everything is derived
 * from the dataset, so each of the six units gets the same depth of detail
 * without a hand-written screen each.
 *
 * All faceplates are fixed in a grid. The original screen had every
 * faceplate independently draggable and resizable, which cost ~25 state
 * hooks and six window-listener effects for no operational benefit.
 */

const COL_W = 104
const ROW_H = 118
const PAD = 24

/**
 * Lay equipment out by walking the unit's internal streams: anything fed by
 * nothing starts at column 0, and each item sits one column right of its
 * furthest-upstream feeder. That gives a left-to-right process order
 * without hand-placing 20 items per unit.
 */
const layoutEquipment = (unit) => {
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
    if (seen.has(tag)) return 0 // recycle loop — break the cycle
    seen.add(tag)
    const up = feeders.get(tag) ?? []
    const d = up.length ? Math.max(...up.map((u) => resolve(u, seen))) + 1 : 0
    depth.set(tag, d)
    return d
  }
  items.forEach((i) => resolve(i.tag))

  // Group by depth, then stack within a column.
  const byDepth = new Map()
  for (const item of items) {
    const d = depth.get(item.tag) ?? 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d).push(item)
  }

  // Two shapes need flattening before placement, or the graphic becomes
  // unreadable: a unit whose equipment has no internal streams piles every
  // item into one column (wellpads: 10 deep), and a long single-file
  // circulation chain spreads too thin to read (amine: 16 columns for 20
  // items). Both are wrapped to a sensible aspect.
  const MAX_STACK = 3
  const MAX_COLS = 8

  const flattened = new Map()
  let col = 0
  for (const [, group] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    for (let i = 0; i < group.length; i += MAX_STACK) {
      flattened.set(col, group.slice(i, i + MAX_STACK))
      col++
    }
  }

  // Still too wide? Fold the tail of the chain onto a second band.
  let bands = [[...flattened.entries()]]
  if (flattened.size > MAX_COLS) {
    const entries = [...flattened.entries()]
    bands = []
    for (let i = 0; i < entries.length; i += MAX_COLS) {
      bands.push(entries.slice(i, i + MAX_COLS))
    }
  }

  const placed = []
  let bandTop = PAD
  for (const band of bands) {
    let tallest = 0
    band.forEach(([, group], bandCol) => {
      group.forEach((item, row) => {
        const size = SYMBOL_SIZE[item.type] ?? { w: 44, h: 44 }
        placed.push({
          item,
          x: PAD + bandCol * COL_W,
          y: bandTop + row * ROW_H,
          size,
        })
        tallest = Math.max(tallest, (row + 1) * ROW_H)
      })
    })
    bandTop += tallest + 16
  }

  const maxCol = Math.max(0, ...placed.map((p) => p.x)) + COL_W
  const maxRow = Math.max(0, ...placed.map((p) => p.y + p.size.h)) + PAD

  return { placed, internal, width: maxCol, height: Math.max(maxRow, 260) }
}

export default function UnitDetail({
  unit, values = {}, trendData = {}, unitState = 'normal',
  valveStates = {}, motorStates = {}, onBack,
}) {
  const layout = useMemo(() => layoutEquipment(unit), [unit])
  const instruments = useMemo(() => instrumentsForUnit(unit), [unit])
  const valves = useMemo(() => finalElementsForUnit(unit), [unit])
  const meta = UNIT_LAYOUT[unit]

  const posOf = (tag) => layout.placed.find((p) => p.item.tag === tag)

  // Faceplates: control instruments first, then safeguarding.
  const ordered = [...instruments].sort((a, b) => {
    const rank = { control: 0, safeguarding: 1, monitoring: 2 }
    return (rank[a.duty] ?? 9) - (rank[b.duty] ?? 9)
  })

  const series = ordered
    .slice(0, 4)
    .map((inst) => ({ instrument: inst, data: trendData[inst.tag] ?? [] }))
    .filter((s) => s.data.length)

  const sdvs = valves.filter((v) => v.type === 'SDV' || v.type === 'BDV')
  const controlValves = valves.filter((v) => v.type === 'control')

  return (
    <div className="unit-detail">
      <div className="unit-detail-head">
        <button className="unit-detail-back" onClick={onBack} title="Back to the process flow diagram">
          ← PFD
        </button>
        <span className="unit-detail-title">{meta?.label ?? unit}</span>
        <span className="unit-detail-sub">
          {layout.placed.length} equipment · {instruments.length} instruments · {valves.length} final elements
        </span>
        <span className={`unit-detail-state ${unitState}`}>{unitState.toUpperCase()}</span>
      </div>

      <div className="unit-detail-body">
        {/* Process graphic */}
        <div className="unit-graphic">
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="unit-graphic-svg"
            role="img"
            aria-label={`${meta?.label ?? unit} process graphic`}
          >
            {/* Internal streams behind the symbols */}
            {layout.internal.map((s, i) => {
              const from = posOf(s.from)
              const to = posOf(s.to)
              if (!from || !to) return null
              const style = PHASE_STYLE[s.phase] ?? { color: '#808080', width: 2, dash: null }
              const x1 = from.x + from.size.w
              const y1 = from.y + from.size.h / 2
              const x2 = to.x
              const y2 = to.y + to.size.h / 2
              const mid = x1 + (x2 - x1) / 2
              const d = Math.abs(y1 - y2) < 4
                ? `M ${x1} ${y1} L ${x2} ${y2}`
                : `M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${y2} L ${x2} ${y2}`
              const stopped = unitState === 'tripped' || unitState === 'shutdown'

              return (
                <path
                  key={`${s.from}-${s.to}-${i}`}
                  d={d} fill="none"
                  stroke={stopped ? '#5a3030' : style.color}
                  strokeWidth={style.width}
                  strokeDasharray={s.recycle ? '3 3' : style.dash ?? undefined}
                  opacity={stopped ? 0.4 : s.recycle ? 0.7 : 1}
                >
                  <title>{s.label}</title>
                </path>
              )
            })}

            {/* Equipment */}
            {layout.placed.map(({ item, x, y }) => (
              <g key={item.tag} transform={`translate(${x} ${y})`}>
                <EquipmentSymbol
                  item={item}
                  value={values[item.tag]}
                  state={unitState}
                  motorState={
                    motorStates[item.tag]
                    ?? (item.duty === 'standby'
                      ? MOTOR_STATE.STOPPED
                      : unitState === 'tripped' || unitState === 'shutdown'
                        ? MOTOR_STATE.TRIPPED
                        : MOTOR_STATE.RUNNING)
                  }
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Faceplates, fixed grid */}
        <div className="unit-faceplates">
          {ordered.slice(0, 6).map((inst) => (
            <Faceplate
              key={inst.tag}
              instrument={inst}
              value={values[inst.tag] ?? inst.envelope?.normal ?? inst.setpoint}
              compact={ordered.length > 4}
            />
          ))}
        </div>
      </div>

      <div className="unit-detail-foot">
        {series.length > 0 && (
          <TrendGraph series={series} focusTag={ordered[0]?.tag} />
        )}

        <div className="unit-valves">
          <div className="unit-valves-head">FINAL ELEMENTS</div>
          <svg viewBox={`0 0 ${Math.max(1, sdvs.length) * 56} 48`} className="unit-valves-svg">
            {sdvs.map((v, i) => (
              <g key={v.tag} transform={`translate(${i * 56 + 6} 4)`}>
                <Valve
                  element={v}
                  valveState={
                    valveStates[v.tag]
                    ?? (unitState === 'tripped' || unitState === 'shutdown'
                      ? (v.type === 'BDV' ? VALVE_STATE.OPEN : VALVE_STATE.CLOSED)
                      : (v.normal === 'OPEN' ? VALVE_STATE.OPEN : VALVE_STATE.CLOSED))
                  }
                />
              </g>
            ))}
          </svg>

          {controlValves.length > 0 && (
            <div className="unit-control-valves">
              {controlValves.map((v) => (
                <div key={v.tag} className="unit-cv">
                  <span className="unit-cv-tag">{v.tag}</span>
                  <span className="unit-cv-sp">SP {v.setpoint} {v.eng}</span>
                  <span className="unit-cv-by">← {v.drivenBy}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
