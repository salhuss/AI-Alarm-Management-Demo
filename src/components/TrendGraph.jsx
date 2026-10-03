/**
 * Multi-parameter trend graph — fixed position, not draggable.
 *
 * Each trace is normalised against its own instrument range, so traces with
 * different engineering units share one plot area. Limit lines are drawn
 * per selected instrument in that same normalised space, which fixes a bug
 * in the original: there, limit lines scaled with the selected transmitter
 * while the traces used hardcoded ranges, so lines and traces disagreed
 * whenever you switched transmitter (App.jsx:1147 vs 1220).
 */

const W = 560
const H = 200
const PAD_L = 6
const PAD_R = 0

const TRACE_COLORS = ['#4a9a4a', '#c89000', '#3a8fd0', '#9a7ac0', '#c05a5a']

/** Normalise a value to 0-100 within its instrument's range. */
const norm = (value, [min, max]) => {
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

/** 0-100 normalised value to an SVG y coordinate. */
const toY = (n) => H - (n / 100) * H

export default function TrendGraph({ series, focusTag, windowSeconds = 60 }) {
  // series: [{ instrument, data: number[] }]
  const active = series.filter((s) => s.instrument && s.data?.length)
  if (!active.length) {
    return (
      <div className="trend">
        <div className="trend-head"><span className="trend-title">TREND</span></div>
        <div className="trend-empty">No instruments selected</div>
      </div>
    )
  }

  const focus = active.find((s) => s.instrument.tag === focusTag) ?? active[0]
  const { alarms = {}, trips = {}, range } = focus.instrument

  const limits = [
    { key: 'HH', v: trips.HH, color: '#cc2222', dash: null },
    { key: 'H', v: alarms.H, color: '#c8a000', dash: '4 3' },
    { key: 'L', v: alarms.L, color: '#c8a000', dash: '4 3' },
    { key: 'LL', v: trips.LL, color: '#cc2222', dash: null },
  ].filter((l) => l.v != null && l.v >= range[0] && l.v <= range[1])

  const points = (data, instRange) =>
    data
      .map((v, i) => {
        const x = PAD_L + (i / Math.max(1, data.length - 1)) * (W - PAD_L - PAD_R)
        return `${x.toFixed(1)},${toY(norm(v, instRange)).toFixed(1)}`
      })
      .join(' ')

  return (
    <div className="trend">
      <div className="trend-head">
        <span className="trend-title">TREND — last {windowSeconds}s</span>
        <span className="trend-scale-note">
          limits: {focus.instrument.tag} ({focus.instrument.eng})
        </span>
      </div>

      <div className="trend-plot">
        {/* Limit labels as HTML, overlaid on the plot. Text inside the
            stretched svg would be distorted by preserveAspectRatio="none". */}
        <div className="trend-limit-labels">
          {limits.map((l) => (
            <span
              key={l.key}
              className="trend-limit-label"
              style={{ top: `${100 - norm(l.v, range)}%`, color: l.color }}
            >
              {l.key} {l.v}
            </span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="trend-svg"
          role="img"
          aria-label="Process trend"
        >
          {/* Grid */}
          {[20, 40, 60, 80].map((n) => (
            <line
              key={n} x1={PAD_L} y1={toY(n)} x2={W - PAD_R} y2={toY(n)}
              stroke="#333" strokeWidth="1" vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Limit lines for the focused instrument */}
          {limits.map((l) => {
            const y = toY(norm(l.v, range))
            return (
              <g key={l.key}>
                <line
                  x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke={l.color} strokeWidth="1.5"
                  strokeDasharray={l.dash ?? undefined}
                  vectorEffect="non-scaling-stroke"
                />

              </g>
            )
          })}

          {/* Traces */}
          {active.map((s, i) => {
            const breached = s.data.length
              ? Boolean(
                (s.instrument.trips?.HH != null && s.data.at(-1) >= s.instrument.trips.HH) ||
                (s.instrument.trips?.LL != null && s.data.at(-1) <= s.instrument.trips.LL),
              )
              : false
            return (
              <polyline
                key={s.instrument.tag}
                points={points(s.data, s.instrument.range)}
                fill="none"
                stroke={breached ? '#ff3333' : TRACE_COLORS[i % TRACE_COLORS.length]}
                strokeWidth={s.instrument.tag === focus.instrument.tag ? 2.4 : 1.8}
                opacity={s.instrument.tag === focus.instrument.tag ? 1 : 0.85}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            )
          })}
        </svg>
      </div>

      <div className="trend-legend">
        {active.map((s, i) => {
          const color = TRACE_COLORS[i % TRACE_COLORS.length]
          const isFocus = s.instrument.tag === focus.instrument.tag
          return (
            <span
              key={s.instrument.tag}
              className={`trend-legend-item${isFocus ? ' focus' : ''}`}
              style={{ borderColor: color, backgroundColor: `${color}22` }}
            >
              <span className="trend-legend-swatch" style={{ backgroundColor: color }} />
              <span className="trend-legend-tag" style={{ color }}>{s.instrument.tag}</span>
              <span className="trend-legend-val">
                {s.data.at(-1)?.toFixed(s.instrument.eng === 'mm' ? 0 : 1)}
                <small>{s.instrument.eng}</small>
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
