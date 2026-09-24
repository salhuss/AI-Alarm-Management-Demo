/**
 * AI insight card. Replaces the wall of alarms with one statement of what
 * happened, what caused it, and how far it reached.
 *
 * Deliberately not a modal: it sits in the layout so the alarm summary and
 * the plant train stay visible beside it. The operator needs to see the
 * flood and the analysis of the flood at the same time for the contrast to
 * land.
 */
export default function InsightCard({ insight, onDismiss }) {
  if (!insight) return null

  return (
    <div className={`insight-card ${insight.kind}`}>
      <div className="insight-card-head">
        <span className="insight-card-icon">{insight.icon}</span>
        <span className="insight-card-title">{insight.title}</span>
        <button className="insight-card-close" onClick={onDismiss} title="Dismiss">✕</button>
      </div>

      <div className="insight-card-headline">{insight.headline}</div>
      <div className="insight-card-subtitle">{insight.subtitle}</div>

      <div className="insight-card-body">
        {insight.details.map((d, i) => (
          <div key={i} className="insight-card-item">
            <div className="insight-card-label">{d.label}</div>
            <div className="insight-card-value">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
