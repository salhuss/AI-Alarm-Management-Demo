import { limitCrossed } from '../plant/hmiStates.js'

/**
 * Instrument faceplate — fixed position, not draggable.
 *
 * Matches the original separator faceplate: light grey panel, blue gradient
 * header, large black reading, cyan vertical bar with the scale beside it,
 * the four setpoints colour-coded, and PvHH/PvHi/PvLo/PvLL status naming.
 *
 * `traceColor` ties the faceplate to its line on the trend graph — the
 * header carries a band in the trace colour and the tag is marked with a
 * swatch, so you can tell at a glance which plate belongs to which trace.
 */

const pct = (value, [min, max]) => {
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

/** Status text and colour, following the original's PvXX naming. */
const statusFor = (value, instrument, health) => {
  if (health < 80) return { icon: '⚠️', text: 'BadPv', color: '#0066aa', bold: true }

  const crossed = limitCrossed(value, instrument)
  if (!crossed) return { icon: '✓', text: 'Normal', color: '#006600', bold: false }

  switch (crossed.limit) {
    case 'HH': return { icon: '🚨', text: 'PvHH - TRIP', color: '#ff0000', bold: true }
    case 'H': return { icon: '⚠️', text: 'PvHi - WARNING', color: '#cc6600', bold: false }
    case 'L': return { icon: '⚠️', text: 'PvLo - WARNING', color: '#cc6600', bold: false }
    case 'LL': return { icon: '🚨', text: 'PvLL - TRIP', color: '#ff0000', bold: true }
    default: return { icon: '✓', text: 'Normal', color: '#006600', bold: false }
  }
}

export default function Faceplate({ instrument, value, health = 100, traceColor }) {
  if (!instrument) return null

  const { tag, service, range, eng, alarms = {}, trips = {}, duty, sil, setpoint } = instrument

  const status = statusFor(value, instrument, health)
  const decimals = eng === 'mm' ? 0 : range[1] <= 1 ? 2 : 1
  const barPct = value == null ? 0 : pct(value, range)

  // A trip setpoint outside the calibrated span cannot be drawn on the bar.
  const overRange = [trips.HH, trips.LL].filter(
    (v) => v != null && (v > range[1] || v < range[0]),
  )

  const tripped = status.text.includes('TRIP')

  return (
    <div
      className="vd"
      style={tripped ? {
        border: '4px solid #ff0000',
        boxShadow: '0 0 20px rgba(255,0,0,0.85), inset 0 0 8px rgba(255,0,0,0.25)',
      } : undefined}
    >
      {/* Trace colour band, tying this plate to its line on the trend */}
      {traceColor && <div className="vd-trace" style={{ backgroundColor: traceColor }} />}

      <div className="vd-header">
        <span>{tag}</span>
        {sil && <span className="vd-sil">{sil}</span>}
      </div>

      <div className="vd-body">
        <div className="vd-tag">
          {traceColor && <span className="vd-swatch" style={{ backgroundColor: traceColor }} />}
          {tag}
        </div>
        <div className="vd-desc">{service}</div>

        {/* Reading with vertical bar and scale */}
        <div className="vd-reading">
          <div className="vd-number">{value == null ? '---' : value.toFixed(decimals)}</div>
          <div className="vd-bar-group">
            <div className="vd-bar-scale">
              <span>{range[1]}</span>
              <span>{range[0]}</span>
            </div>
            <div className="vd-bar-container">
              <div className="vd-bar-fill" style={{ height: `${barPct}%` }} />
              {/* Limit ticks, drawn where they fall in the range */}
              {trips.HH != null && trips.HH <= range[1] && (
                <div className="vd-tick trip" style={{ bottom: `${pct(trips.HH, range)}%` }} />
              )}
              {alarms.H != null && (
                <div className="vd-tick warn" style={{ bottom: `${pct(alarms.H, range)}%` }} />
              )}
              {alarms.L != null && (
                <div className="vd-tick warn" style={{ bottom: `${pct(alarms.L, range)}%` }} />
              )}
              {trips.LL != null && trips.LL >= range[0] && (
                <div className="vd-tick trip" style={{ bottom: `${pct(trips.LL, range)}%` }} />
              )}
            </div>
            <div className="vd-bar-label">{eng}</div>
          </div>
        </div>

        {/* The four setpoints, colour-coded as in the original */}
        <div className="vd-setpoints">
          {trips.HH != null && <div className="vd-sp trip">HH (Trip) <b>{trips.HH}</b></div>}
          {alarms.H != null && <div className="vd-sp warn">Hi (Warn) <b>{alarms.H}</b></div>}
          {setpoint != null && <div className="vd-sp sp">SP <b>{setpoint}</b></div>}
          {alarms.L != null && <div className="vd-sp warn">Lo (Warn) <b>{alarms.L}</b></div>}
          {trips.LL != null && <div className="vd-sp trip">LL (Trip) <b>{trips.LL}</b></div>}
        </div>

        <div className="vd-status" style={{ color: status.color, fontWeight: status.bold ? 'bold' : 'normal' }}>
          <span className="vd-status-icon">{status.icon}</span>
          <span>{status.text}</span>
        </div>

        {overRange.length > 0 && (
          <div className="vd-overrange" title="Trip setpoint lies outside the calibrated span — asserts on over-range">
            ⚠ trip {overRange.join(', ')} beyond span
          </div>
        )}
      </div>

      <div className="vd-footer">
        <span>PV</span>
        <span className="vd-mode">{duty === 'control' ? 'M' : 'ESD'}</span>
        <span className="vd-footer-value">
          {value == null ? '---' : value.toFixed(decimals)} {eng}
        </span>
        {health < 100 && <span className="vd-health">{health.toFixed(0)}%</span>}
      </div>
    </div>
  )
}
