/**
 * Instrument faceplate — fixed position, not draggable.
 *
 * Generic over any instrument from the dataset: reading, bar against
 * range with limit ticks, the four setpoints, status, and a PV footer.
 * Replaces the three hand-written faceplates in App.jsx, which were
 * near-identical copies differing only in which tag they displayed.
 */

import { limitCrossed, PRIORITY_STYLE, priorityFor } from '../plant/hmiStates.js'

/** Where a value sits in the instrument's range, as a percentage. */
const pct = (value, [min, max]) => {
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

const STATUS = {
  HH: { label: 'PV HIGH-HIGH', color: '#ff5555', bg: '#4a1010' },
  H: { label: 'PV HIGH', color: '#ffd700', bg: '#3a3010' },
  L: { label: 'PV LOW', color: '#ffd700', bg: '#3a3010' },
  LL: { label: 'PV LOW-LOW', color: '#ff5555', bg: '#4a1010' },
  NORMAL: { label: 'NORMAL', color: '#7fbf7f', bg: '#1a2a1a' },
  BAD_PV: { label: 'BAD PV', color: '#66ddff', bg: '#102a3a' },
}

export default function Faceplate({ instrument, value, health = 100, compact = false }) {
  if (!instrument) return null

  const { tag, service, range, eng, alarms = {}, trips = {}, duty, sil, setpoint, drives } = instrument

  const badPv = health < 80
  const crossed = badPv ? null : limitCrossed(value, instrument)
  const status = badPv ? STATUS.BAD_PV : crossed ? STATUS[crossed.limit] : STATUS.NORMAL

  const priority = crossed
    ? priorityFor({ kind: crossed.kind, duty })
    : null

  const decimals = eng === 'mm' ? 0 : range[1] <= 1 ? 2 : 1
  const barPct = pct(value, range)

  // Limit ticks on the bar, positioned by their place in the range.
  const ticks = [
    { key: 'HH', v: trips.HH, color: '#ff3333' },
    { key: 'H', v: alarms.H, color: '#ffaa00' },
    { key: 'L', v: alarms.L, color: '#ffaa00' },
    { key: 'LL', v: trips.LL, color: '#ff3333' },
  ].filter((t) => t.v != null && t.v >= range[0] && t.v <= range[1])

  // A trip above full span can't be drawn on the bar — flag it instead.
  const overRange = [trips.HH, trips.LL].filter(
    (v) => v != null && (v > range[1] || v < range[0]),
  )

  return (
    <div className={`fp${compact ? ' compact' : ''}`} style={{ borderColor: status.color }}>
      <div className="fp-head" style={{ backgroundColor: status.bg }}>
        <span className="fp-tag">{tag}</span>
        {sil && <span className="fp-sil">{sil}</span>}
      </div>

      <div className="fp-service">{service}</div>

      <div className="fp-reading">
        <div className="fp-value" style={{ color: status.color }}>
          {value == null ? '---' : value.toFixed(decimals)}
          <span className="fp-eng">{eng}</span>
        </div>

        <div className="fp-bar-wrap">
          <div className="fp-bar">
            <div
              className="fp-bar-fill"
              style={{ height: `${barPct}%`, backgroundColor: status.color }}
            />
            {ticks.map((t) => (
              <div
                key={t.key}
                className="fp-bar-tick"
                style={{ bottom: `${pct(t.v, range)}%`, borderTopColor: t.color }}
                title={`${t.key} ${t.v} ${eng}`}
              />
            ))}
          </div>
          <div className="fp-bar-scale">
            <span>{range[1]}</span>
            <span>{range[0]}</span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="fp-setpoints">
          {trips.HH != null && <div className="fp-sp"><span className="fp-sp-k hh">HH</span>{trips.HH}</div>}
          {alarms.H != null && <div className="fp-sp"><span className="fp-sp-k h">H</span>{alarms.H}</div>}
          {setpoint != null && <div className="fp-sp"><span className="fp-sp-k sp">SP</span>{setpoint}</div>}
          {alarms.L != null && <div className="fp-sp"><span className="fp-sp-k l">L</span>{alarms.L}</div>}
          {trips.LL != null && <div className="fp-sp"><span className="fp-sp-k ll">LL</span>{trips.LL}</div>}
        </div>
      )}

      <div className="fp-status" style={{ color: status.color, backgroundColor: status.bg }}>
        {badPv ? '◆' : crossed ? '▲' : '●'} {status.label}
        {priority && (
          <span className="fp-priority" style={{ color: PRIORITY_STYLE[priority].color }}>
            {PRIORITY_STYLE[priority].label}
          </span>
        )}
      </div>

      {!compact && (
        <div className="fp-foot">
          <span className="fp-foot-duty">{duty?.toUpperCase() ?? ''}</span>
          {drives && <span className="fp-foot-drives">→ {drives}</span>}
          {health < 100 && <span className="fp-foot-health">health {health.toFixed(0)}%</span>}
        </div>
      )}

      {overRange.length > 0 && !compact && (
        <div className="fp-overrange" title="Trip setpoint lies outside the calibrated span — asserts on over-range">
          ⚠ trip {overRange.join(', ')} beyond span
        </div>
      )}
    </div>
  )
}
