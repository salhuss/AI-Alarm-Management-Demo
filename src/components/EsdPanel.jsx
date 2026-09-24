import { INITIATORS, AMINE_TRIPS, ESD_LEVEL, DATASET } from '../plant/index.js'

/**
 * ESD initiator panel — triggers the cause & effect logic.
 *
 * Grouped by ESD level so the contrast is visible: an ESD-1 confirmed-gas
 * initiator actuates all 30 effects across the train, while an ESD-3
 * separator trip actuates one or two. The sweetening trips sit in their own
 * group because they are unit-level and actuate no plant effects at all.
 */

const LEVEL_STYLE = {
  [ESD_LEVEL.ESD_1]: { color: '#ff66ff', label: 'ESD-1 · TOTAL FACILITY SHUTDOWN' },
  [ESD_LEVEL.ESD_2]: { color: '#ff5555', label: 'ESD-2 · UTILITY / PIPELINE' },
  [ESD_LEVEL.ESD_3]: { color: '#ffaa00', label: 'ESD-3 · SELECTIVE UNIT TRIP' },
}

function InitiatorButton({ initiator, onTrigger, disabled }) {
  const count = initiator.effects.length
  return (
    <button
      className="esd-initiator"
      onClick={() => onTrigger(initiator.tag)}
      disabled={disabled}
      title={`${initiator.description} — actuates ${count} effect${count === 1 ? '' : 's'}`}
    >
      <span className="esd-initiator-tag">{initiator.tag}</span>
      <span className="esd-initiator-desc">{initiator.description}</span>
      <span className="esd-initiator-meta">
        {initiator.voting} · {count} effect{count === 1 ? '' : 's'}
      </span>
    </button>
  )
}

export default function EsdPanel({ onTriggerInitiator, onTriggerAmineTrip, onReset, activeInitiator, isPaused, onTogglePause }) {
  const busy = Boolean(activeInitiator)

  return (
    <div className="esd-panel">
      <div className="esd-panel-head">
        <span>CAUSE &amp; EFFECT SIMULATION</span>
        <span className={`esd-dataset ${DATASET}`} title={
          DATASET === 'project'
            ? 'Running on project tag data (local only)'
            : 'Running on synthetic tag data'
        }>
          {DATASET === 'project' ? 'PROJECT DATA' : 'SYNTHETIC DATA'}
        </span>
      </div>

      <div className="esd-panel-controls">
        <button
          className="esd-btn pause"
          onClick={onTogglePause}
          style={{ backgroundColor: isPaused ? '#00aa00' : '#cc6600' }}
        >
          {isPaused ? '▶ PLAY' : '⏸ PAUSE'}
        </button>
        <button className="esd-btn reset" onClick={onReset} disabled={!busy}>
          ⟲ RESET
        </button>
      </div>

      {[ESD_LEVEL.ESD_1, ESD_LEVEL.ESD_2, ESD_LEVEL.ESD_3].map((level) => {
        const group = INITIATORS.filter((i) => i.level === level)
        if (!group.length) return null
        return (
          <div key={level} className="esd-group">
            <div className="esd-group-head" style={{ color: LEVEL_STYLE[level].color }}>
              {LEVEL_STYLE[level].label}
            </div>
            {group.map((initiator) => (
              <InitiatorButton
                key={initiator.tag}
                initiator={initiator}
                onTrigger={onTriggerInitiator}
                disabled={busy}
              />
            ))}
          </div>
        )
      })}

      <div className="esd-group">
        <div className="esd-group-head" style={{ color: '#66ddff' }}>
          UNIT-LEVEL · AMINE SWEETENING (SIL-1)
        </div>
        <div className="esd-group-note">
          Not a plant-wide initiator — trips local equipment only. Area fire &amp; gas
          detection votes 2ooN into the ESD-1 confirmed-gas initiators above.
        </div>
        {AMINE_TRIPS.map((trip) => (
          <button
            key={trip.tag}
            className="esd-initiator amine"
            onClick={() => onTriggerAmineTrip(trip.tag)}
            disabled={busy}
            title={`${trip.service} — ${trip.sil}`}
          >
            <span className="esd-initiator-tag">{trip.tag}</span>
            <span className="esd-initiator-desc">{trip.service}</span>
            <span className="esd-initiator-meta">
              {trip.direction} @ {trip.setpoint} {trip.unit} · {trip.sil}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
