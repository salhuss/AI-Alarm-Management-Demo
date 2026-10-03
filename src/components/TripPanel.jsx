/**
 * Trip controls on the unit page — the AI scenarios, driven by this unit's
 * own instruments rather than a hardcoded separator.
 *
 * `instruments` is already the unit's relevant selection (see
 * plant/relevance.js), so this offers a trip for each of those that has a
 * setpoint rather than every trip in the unit. Predictive maintenance and
 * nuisance shelving pick from the same selection: a control point for
 * degradation, and whichever point's high alarm sits closest to its
 * operating band for chatter.
 */

export default function TripPanel({
  instruments, scenario, subjectTag, floodCount,
  onTrip, onPredictive, onNuisance, onReset,
  isPaused, onTogglePause,
}) {
  const trippable = instruments.filter(
    (i) => i.trips && (i.trips.HH != null || i.trips.LL != null),
  )

  // Degradation reads best on a control point with an envelope.
  const predictiveSubject = instruments.find((i) => i.duty === 'control' && i.envelope)
    ?? instruments.find((i) => i.envelope)

  // Chatter needs a high alarm close enough to the operating point to cross.
  const nuisanceSubject = instruments
    .filter((i) => i.envelope && (i.alarms?.H != null || i.trips?.HH != null))
    .sort((a, b) => {
      const gap = (x) => ((x.alarms?.H ?? x.trips.HH) - x.envelope.normal) / x.envelope.noise
      return gap(a) - gap(b)
    })[0]

  const busy = Boolean(scenario) && scenario !== 'shelved'

  return (
    <div className="trip-panel">
      <div className="trip-panel-head">
        <span>AI SCENARIOS</span>
        <button
          className="trip-pause"
          onClick={onTogglePause}
          style={{ backgroundColor: isPaused ? '#00aa00' : '#cc6600' }}
        >
          {isPaused ? '▶' : '⏸'}
        </button>
      </div>

      {scenario && (
        <div className={`trip-active ${scenario}`}>
          {scenario === 'trip' && (
            <>TRIP ACTIVE — {subjectTag}{floodCount > 0 && ` · ${floodCount} consequential`}</>
          )}
          {scenario === 'predictive' && <>MONITORING — {subjectTag}</>}
          {scenario === 'nuisance' && <>CHATTERING — {subjectTag}</>}
          {scenario === 'shelved' && <>SHELVED — {subjectTag}</>}
        </div>
      )}

      <div className="trip-panel-scroll">
      <div className="trip-group">
        <div className="trip-group-head">ROOT CAUSE ANALYSIS — TRIP A TRANSMITTER</div>
        {trippable.length === 0 && (
          <div className="trip-none">No safeguarding trips on this unit</div>
        )}
        {trippable.map((inst) => {
          const toHH = inst.trips.HH != null
          const target = toHH ? inst.trips.HH : inst.trips.LL
          return (
            <button
              key={inst.tag}
              className="trip-btn"
              onClick={() => onTrip(inst)}
              disabled={busy}
              title={`${inst.service} — ramp to ${toHH ? 'HH' : 'LL'} ${target} ${inst.eng}`}
            >
              <span className="trip-btn-tag">{inst.tag}</span>
              <span className="trip-btn-service">{inst.service}</span>
              <span className="trip-btn-sp">
                {toHH ? 'HH' : 'LL'} @ {target} {inst.eng}
                {inst.sil && ` · ${inst.sil}`}
              </span>
            </button>
          )
        })}
      </div>

      <div className="trip-group">
        <div className="trip-group-head">OTHER AI CAPABILITIES</div>

        <button
          className="trip-btn predictive"
          onClick={() => onPredictive(predictiveSubject)}
          disabled={busy || !predictiveSubject}
          title={predictiveSubject ? `Degrade ${predictiveSubject.tag}` : 'No suitable instrument'}
        >
          <span className="trip-btn-tag">PREDICTIVE MAINTENANCE</span>
          <span className="trip-btn-service">
            {predictiveSubject ? `Sensor degradation on ${predictiveSubject.tag}` : 'unavailable'}
          </span>
        </button>

        <button
          className="trip-btn nuisance"
          onClick={() => onNuisance(nuisanceSubject)}
          disabled={busy || !nuisanceSubject}
          title={nuisanceSubject ? `Chatter ${nuisanceSubject.tag}` : 'No suitable instrument'}
        >
          <span className="trip-btn-tag">NUISANCE ALARM SHELVING</span>
          <span className="trip-btn-service">
            {nuisanceSubject ? `Chattering on ${nuisanceSubject.tag}` : 'unavailable'}
          </span>
        </button>
      </div>
      </div>

      {scenario && (
        <button className="trip-btn reset" onClick={onReset}>
          <span className="trip-btn-tag">⟲ RESET UNIT</span>
        </button>
      )}
    </div>
  )
}
