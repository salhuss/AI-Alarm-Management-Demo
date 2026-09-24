import { UNIT_META } from './unitMeta.js'

/**
 * Scrollable alarm summary, shown alongside the five-button alarm banner.
 *
 * HMI_Standards specifies the banner holds the five highest-priority active
 * alarms. During a full ESD that understates the situation by an order of
 * magnitude — which is the operator problem this demo is about. The banner
 * stays spec-compliant and this panel carries the rest, so the flood is
 * visible and countable rather than hidden behind a five-item cap.
 *
 * Priority colours follow HMI_Standards section 2:
 *   Critical magenta · Urgent red · High yellow · Low cyan
 */

const PRIORITY_STYLE = {
  critical: { color: '#ff66ff', bg: 'rgba(204,0,204,0.12)', label: 'CRIT' },
  urgent: { color: '#ff5555', bg: 'rgba(204,34,34,0.12)', label: 'URG' },
  high: { color: '#ffd700', bg: 'rgba(200,160,0,0.10)', label: 'HIGH' },
  low: { color: '#66ddff', bg: 'rgba(0,136,255,0.10)', label: 'LOW' },
}

const PRIORITY_RANK = { critical: 0, urgent: 1, high: 2, low: 3 }

const hhmmssms = (d) =>
  `${d.toLocaleTimeString('en-GB', { hour12: false })}.${d.getMilliseconds().toString().padStart(3, '0')}`

export default function AlarmSummary({ alarms, onAcknowledge, onShelve, onSelectUnit, aiSuppressing }) {
  const active = alarms.filter((a) => !a.shelved)

  const counts = active.reduce((acc, a) => {
    acc[a.priority] = (acc[a.priority] ?? 0) + 1
    return acc
  }, {})

  // Newest first, but never bury a higher priority under a newer lower one.
  const sorted = [...active].sort((a, b) => {
    const byPriority = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
    return byPriority !== 0 ? byPriority : b.timestamp - a.timestamp
  })

  const firstOut = active.find((a) => a.isFirstOut)

  return (
    <div className="alarm-summary">
      <div className="alarm-summary-header">
        <span className="alarm-summary-title">ALARM SUMMARY</span>
        <span className="alarm-summary-total">{active.length} active</span>
      </div>

      <div className="alarm-summary-counts">
        {['critical', 'urgent', 'high', 'low'].map((p) => (
          <span
            key={p}
            className="alarm-summary-count"
            style={{ color: PRIORITY_STYLE[p].color, opacity: counts[p] ? 1 : 0.3 }}
          >
            {PRIORITY_STYLE[p].label} {counts[p] ?? 0}
          </span>
        ))}
      </div>

      {aiSuppressing > 0 && (
        <div className="alarm-summary-ai">
          🤖 AI grouped {aiSuppressing} consequential alarm{aiSuppressing === 1 ? '' : 's'} under
          {firstOut ? ` ${firstOut.tag}` : ' the root cause'}
        </div>
      )}

      <div className="alarm-summary-list">
        {sorted.length === 0 && <div className="alarm-summary-empty">No active alarms</div>}

        {sorted.map((alarm) => {
          const style = PRIORITY_STYLE[alarm.priority] ?? PRIORITY_STYLE.high
          return (
            <div
              key={alarm.id}
              className={`alarm-summary-row${alarm.isFirstOut ? ' first-out' : ''}${alarm.acknowledged ? ' acked' : ''}`}
              style={{ backgroundColor: style.bg, borderLeftColor: style.color }}
              onClick={() => alarm.unit && onSelectUnit?.(alarm.unit)}
              title={alarm.unit ? `Show ${UNIT_META[alarm.unit]?.label ?? alarm.unit}` : undefined}
            >
              <div className="alarm-summary-row-time">{hhmmssms(alarm.timestamp)}</div>

              <div className="alarm-summary-row-body">
                <div className="alarm-summary-row-tag">
                  {alarm.tag}
                  {alarm.isFirstOut && <span className="alarm-summary-badge">FIRST-OUT</span>}
                  {alarm.effectNumber && <span className="alarm-summary-effect">E{alarm.effectNumber}</span>}
                </div>
                <div className="alarm-summary-row-desc">{alarm.description}</div>
              </div>

              <div className="alarm-summary-row-pri" style={{ color: style.color }}>
                {style.label}
              </div>

              <div className="alarm-summary-row-actions">
                {!alarm.acknowledged && (
                  <button
                    className="alarm-summary-btn"
                    onClick={(e) => { e.stopPropagation(); onAcknowledge(alarm.id) }}
                    title="Acknowledge"
                  >
                    ACK
                  </button>
                )}
                <button
                  className="alarm-summary-btn shelve"
                  onClick={(e) => { e.stopPropagation(); onShelve(alarm.id) }}
                  title="Shelve for 2 hours"
                >
                  SHV
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
