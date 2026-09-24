import { UNIT_ORDER } from '../plant/index.js'
import { UNIT_META } from './unitMeta.js'

/**
 * Plant overview: the process train as a left-to-right row of unit blocks,
 * with gas flowing between them. Each block shows the unit's live headline
 * value and its shutdown state, so a cascade is visible as it propagates.
 *
 * Deliberately compact rather than six full vessel graphics — at 1920x1080
 * this strip has to coexist with faceplates, a trend graph, the alarm
 * banner and the alarm summary.
 */

const STATE_STYLE = {
  normal: { border: '#4a7c4a', bg: '#243024', text: '#7fbf7f', label: 'RUNNING' },
  alarm: { border: '#c8a000', bg: '#332d1a', text: '#ffd700', label: 'ALARM' },
  tripped: { border: '#cc2222', bg: '#331a1a', text: '#ff5555', label: 'TRIPPED' },
  shutdown: { border: '#cc00cc', bg: '#2d1a2d', text: '#ff66ff', label: 'SHUTDOWN' },
}

function UnitBlock({ unitKey, state, headline, actuated, total, isSelected, onSelect }) {
  const meta = UNIT_META[unitKey]
  const style = STATE_STYLE[state] ?? STATE_STYLE.normal

  return (
    <div
      className={`train-unit${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(unitKey)}
      style={{ borderColor: style.border, backgroundColor: style.bg }}
      title={`${meta.label} — click to inspect`}
    >
      <div className="train-unit-icon">{meta.icon}</div>
      <div className="train-unit-label">{meta.label}</div>
      <div className="train-unit-sublabel">{meta.sublabel}</div>

      {headline && (
        <div className="train-unit-value">
          {headline.value}
          <span className="train-unit-unit">{headline.unit}</span>
        </div>
      )}

      <div className="train-unit-state" style={{ color: style.text }}>
        {state === 'tripped' || state === 'shutdown' ? '■' : '●'} {style.label}
      </div>

      {total > 0 && (
        <div className="train-unit-effects">
          {actuated}/{total} effects
        </div>
      )}
    </div>
  )
}

export default function PlantTrain({ unitStates, headlines, effectCounts, selectedUnit, onSelectUnit }) {
  return (
    <div className="plant-train">
      {UNIT_ORDER.map((unitKey, i) => (
        <div key={unitKey} className="train-segment">
          <UnitBlock
            unitKey={unitKey}
            state={unitStates[unitKey] ?? 'normal'}
            headline={headlines[unitKey]}
            actuated={effectCounts[unitKey]?.actuated ?? 0}
            total={effectCounts[unitKey]?.total ?? 0}
            isSelected={selectedUnit === unitKey}
            onSelect={onSelectUnit}
          />
          {i < UNIT_ORDER.length - 1 && (
            <div
              className={`train-flow${unitStates[unitKey] === 'tripped' || unitStates[unitKey] === 'shutdown' ? ' stopped' : ''}`}
            >
              <span className="train-flow-arrow">▶</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
