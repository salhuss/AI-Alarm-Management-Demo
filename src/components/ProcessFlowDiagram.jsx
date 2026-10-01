import { useMemo } from 'react'
import {
  UNIT_LAYOUT, UNIT_KEYS, PHASE_STYLE,
  interUnitStreams, circulationLoops, unitSummary,
} from '../plant/layout.js'
import { BOUNDARY_NODES } from '../plant/index.js'

/**
 * Process Flow Diagram — the landing page.
 *
 * Units as blocks, streams between them, drawn as SVG so the lines route
 * properly behind the blocks. Circulation loops collapse to a single
 * indicator per unit: the amine loop alone is 14 items, and drawing it here
 * would bury the gas path that the plant exists to produce.
 *
 * Everything is derived from the topology, so adding a stream or a vessel
 * shows up here without touching this file.
 */

const CELL_W = 118
const CELL_H = 104
const BLOCK_W = 150
const BLOCK_H = 112
const PAD = 40

const STATE_STYLE = {
  normal: { border: '#4a7c4a', bg: '#1e2a1e', text: '#7fbf7f', label: 'RUNNING' },
  alarm: { border: '#c8a000', bg: '#2a2614', text: '#ffd700', label: 'ALARM' },
  tripped: { border: '#cc2222', bg: '#2a1414', text: '#ff5555', label: 'TRIPPED' },
  shutdown: { border: '#cc00cc', bg: '#26142a', text: '#ff66ff', label: 'SHUTDOWN' },
}

/** Grid cell to pixel centre. */
const cx = (col) => PAD + col * CELL_W + BLOCK_W / 2
const cy = (row) => PAD + row * CELL_H + BLOCK_H / 2

/**
 * Route a stream between two blocks as an orthogonal path. Horizontal
 * neighbours get a straight line; anything else gets a right-angled dogleg,
 * which is how a real PFD draws it.
 */
const routePath = (from, to) => {
  const x1 = cx(from.col) + BLOCK_W / 2
  const y1 = cy(from.row)
  const x2 = cx(to.col) - BLOCK_W / 2
  const y2 = cy(to.row)

  if (Math.abs(y1 - y2) < 4) return `M ${x1} ${y1} L ${x2} ${y2}`

  // Dogleg: out, down/up, in.
  const mid = x1 + (x2 - x1) / 2
  return `M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${y2} L ${x2} ${y2}`
}

/** Boundary nodes (flare, VRU, pipeline) sit below their source unit. */
const boundaryPos = (sourceUnit, index) => {
  const src = UNIT_LAYOUT[sourceUnit]
  if (!src) return { col: 0, row: 6 }
  return { col: src.col, row: 6 + (index % 2) * 0.6 }
}

function UnitBlock({ unitKey, state, value, onSelect, isSelected }) {
  const layout = UNIT_LAYOUT[unitKey]
  const summary = useMemo(() => unitSummary(unitKey), [unitKey])
  const style = STATE_STYLE[state] ?? STATE_STYLE.normal
  const x = cx(layout.col) - BLOCK_W / 2
  const y = cy(layout.row) - BLOCK_H / 2

  return (
    <g
      className="pfd-unit"
      transform={`translate(${x} ${y})`}
      onClick={() => onSelect(unitKey)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        width={BLOCK_W} height={BLOCK_H} rx="3"
        fill={style.bg} stroke={style.border}
        strokeWidth={isSelected ? 3 : 2}
      />
      {isSelected && (
        <rect width={BLOCK_W} height={BLOCK_H} rx="3" fill="none" stroke="#0088ff" strokeWidth="1" strokeDasharray="4 2" />
      )}

      <text x={BLOCK_W / 2} y="17" textAnchor="middle" className="pfd-unit-label">
        {layout.label}
      </text>
      <text x={BLOCK_W / 2} y="30" textAnchor="middle" className="pfd-unit-sublabel">
        {layout.sublabel}
      </text>

      {summary.primary && (
        <text x={BLOCK_W / 2} y="46" textAnchor="middle" className="pfd-unit-tag">
          {summary.primary.tag}
        </text>
      )}

      {value && (
        <text x={BLOCK_W / 2} y="68" textAnchor="middle" className="pfd-unit-value">
          {value.value}
          <tspan className="pfd-unit-unit"> {value.unit}</tspan>
        </text>
      )}

      <text x={BLOCK_W / 2} y="84" textAnchor="middle" className="pfd-unit-state" fill={style.text}>
        {state === 'tripped' || state === 'shutdown' ? '■' : '●'} {style.label}
      </text>

      {/* Collapsed circulation loop indicator */}
      {summary.loops.length > 0 && (
        <g transform={`translate(6 ${BLOCK_H - 20})`}>
          <rect width={BLOCK_W - 12} height="15" rx="2" fill="rgba(160,128,208,0.15)" stroke="#8060b0" strokeWidth="0.5" />
          <text x={(BLOCK_W - 12) / 2} y="11" textAnchor="middle" className="pfd-loop-badge">
            ↻ {summary.loops[0].family} loop · {summary.loops[0].equipmentCount} items
          </text>
        </g>
      )}

      <text x={BLOCK_W - 5} y="13" textAnchor="end" className="pfd-unit-count">
        {summary.equipmentCount}
      </text>
    </g>
  )
}

export default function ProcessFlowDiagram({ unitStates = {}, unitValues = {}, selectedUnit, onSelectUnit }) {
  const streams = useMemo(() => interUnitStreams(), [])
  const loops = useMemo(() => circulationLoops(), [])

  // Boundary nodes, positioned under whichever unit feeds them.
  const boundaries = useMemo(() => {
    const seen = new Map()
    streams.forEach((s) => {
      const tag = s.toBoundary ? s.toUnit : s.fromBoundary ? s.fromUnit : null
      if (!tag || seen.has(tag)) return
      const source = s.toBoundary ? s.fromUnit : s.toUnit
      seen.set(tag, { tag, source, index: seen.size })
    })
    return [...seen.values()]
  }, [streams])

  const boundaryLayout = useMemo(() => {
    const map = {}
    boundaries.forEach((b, i) => { map[b.tag] = boundaryPos(b.source, i) })
    return map
  }, [boundaries])

  const posOf = (key) => UNIT_LAYOUT[key] ?? boundaryLayout[key]

  const width = PAD * 2 + 13 * CELL_W
  const height = PAD * 2 + 7.4 * CELL_H

  // Phases actually present, for the legend.
  const phasesUsed = [...new Set(streams.map((s) => s.phase))]

  return (
    <div className="pfd">
      <div className="pfd-header">
        <span className="pfd-title">PROCESS FLOW DIAGRAM</span>
        <span className="pfd-hint">Click a unit to inspect its equipment, instruments and trips</span>
      </div>

      <div className="pfd-canvas">
        <svg viewBox={`0 0 ${width} ${height}`} className="pfd-svg" role="img" aria-label="Plant process flow diagram">
          <defs>
            {phasesUsed.map((phase) => (
              <marker
                key={phase} id={`arrow-${phase}`} viewBox="0 0 8 8"
                refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"
              >
                <path d="M 0 1 L 7 4 L 0 7 z" fill={PHASE_STYLE[phase]?.color ?? '#808080'} />
              </marker>
            ))}
          </defs>

          {/* Streams first, so blocks draw over the line ends */}
          {streams.map((s, i) => {
            const from = posOf(s.fromUnit)
            const to = posOf(s.toUnit)
            if (!from || !to) return null
            const style = PHASE_STYLE[s.phase] ?? { color: '#808080', width: 2, dash: null }
            const upstreamState = unitStates[s.fromUnit]
            const stopped = upstreamState === 'tripped' || upstreamState === 'shutdown'

            return (
              <g key={`${s.fromUnit}-${s.toUnit}-${s.phase}-${i}`}>
                <path
                  d={routePath(from, to)}
                  fill="none"
                  stroke={stopped ? '#5a3030' : style.color}
                  strokeWidth={style.width}
                  strokeDasharray={style.dash ?? undefined}
                  markerEnd={`url(#arrow-${s.phase})`}
                  opacity={stopped ? 0.45 : 1}
                  className={stopped ? 'pfd-stream stopped' : 'pfd-stream'}
                />
                {s.streams.length > 1 && (
                  <title>{s.streams.map((x) => x.label).join(' · ')}</title>
                )}
              </g>
            )
          })}

          {/* Boundary nodes */}
          {boundaries.map((b) => {
            const pos = boundaryLayout[b.tag]
            const meta = BOUNDARY_NODES[b.tag]
            if (!pos || !meta) return null
            return (
              <g key={b.tag} transform={`translate(${cx(pos.col) - 56} ${cy(pos.row) - 14})`}>
                <rect width="112" height="28" rx="14" fill="#1f1f1f" stroke="#555" strokeWidth="1" strokeDasharray="3 2" />
                <text x="56" y="18" textAnchor="middle" className="pfd-boundary">{meta.name}</text>
              </g>
            )
          })}

          {/* Unit blocks */}
          {UNIT_KEYS.map((unitKey) => (
            <UnitBlock
              key={unitKey}
              unitKey={unitKey}
              state={unitStates[unitKey] ?? 'normal'}
              value={unitValues[unitKey]}
              isSelected={selectedUnit === unitKey}
              onSelect={onSelectUnit}
            />
          ))}
        </svg>
      </div>

      <div className="pfd-legend">
        {phasesUsed.map((phase) => {
          const style = PHASE_STYLE[phase]
          if (!style) return null
          return (
            <span key={phase} className="pfd-legend-item">
              <svg width="22" height="8" aria-hidden="true">
                <line
                  x1="0" y1="4" x2="22" y2="4"
                  stroke={style.color} strokeWidth={style.width}
                  strokeDasharray={style.dash ?? undefined}
                />
              </svg>
              {style.label}
            </span>
          )
        })}
        {loops.length > 0 && (
          <span className="pfd-legend-item loop">↻ circulation loop — click the unit to expand</span>
        )}
      </div>
    </div>
  )
}
