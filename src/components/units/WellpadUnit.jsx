import { instrumentsForUnit } from '../../plant/index.js'
import '../../units.css'

/**
 * Wellpads — three pads feeding one trunkline.
 *
 * The only unit that is geographically distributed rather than a single
 * process train, and the only one where the pressure letdown across a choke
 * is worth showing: upstream of the choke is reservoir pressure in the
 * hundreds of barg, downstream is flowline pressure under 70. That drop is
 * what a wellhead choke exists to do.
 *
 * Also the only unit whose headline trip is a gas release rather than a
 * process deviation, so the H2S detector gets its own readout.
 */

const pickInstruments = () => {
  const all = instrumentsForUnit('wellpads')
  const pressures = all.filter((i) => i.eng === 'barg').sort((a, b) => b.range[1] - a.range[1])
  return {
    upstream: pressures[0] ?? null,                       // widest range: reservoir side
    downstream: pressures[1] ?? pressures[0] ?? null,     // flowline side
    gas: all.find((i) => i.eng === 'ppm') ?? null,
  }
}

const fmt = (value, inst) => {
  if (value == null || !inst) return '---'
  return value.toFixed(inst.range[1] > 100 ? 0 : 1)
}

/** Is the reading past an alarm or trip limit? */
const alarmLevel = (value, inst) => {
  if (value == null || !inst) return null
  if (inst.trips?.HH != null && value >= inst.trips.HH) return 'trip'
  if (inst.trips?.LL != null && value <= inst.trips.LL) return 'trip'
  if (inst.alarms?.H != null && value >= inst.alarms.H) return 'warn'
  if (inst.alarms?.L != null && value <= inst.alarms.L) return 'warn'
  return null
}

export default function WellpadUnit({ equipment = [], values = {}, unitState = 'normal' }) {
  const { upstream, downstream, gas } = pickInstruments()
  const tripped = unitState === 'tripped' || unitState === 'shutdown'

  const upValue = upstream ? values[upstream.tag] : null
  const downValue = downstream ? values[downstream.tag] : null
  const gasValue = gas ? values[gas.tag] : null

  const gasLevel = alarmLevel(gasValue, gas)
  const downLevel = alarmLevel(downValue, downstream)

  return (
    <div className={`wp-unit${tripped ? ' tripped' : ''}`}>
      {/* Area gas detection: the pad's own hazard, not a process value */}
      {gas && (
        <div className={`wp-gas${gasLevel ? ` ${gasLevel}` : ''}`}>
          <span className="wp-gas-icon">{gasLevel === 'trip' ? '☣' : '◈'}</span>
          <div className="wp-gas-body">
            <span className="wp-gas-tag">{gas.tag}</span>
            <span className="wp-gas-label">AREA H2S</span>
          </div>
          <span className="wp-gas-value">
            {fmt(gasValue, gas)}<small>{gas.eng}</small>
          </span>
          <span className="wp-gas-sp">
            HH {gas.trips?.HH} · {gas.sil} · {gas.voting ?? '2ooN'}
          </span>
        </div>
      )}

      {/* One row per pad: wellhead, choke, flowline */}
      <div className="wp-pads">
        {equipment.map((well, i) => {
          // Only the first pad carries live instrument values; the others
          // are drawn at the same nominal condition.
          const lead = i === 0
          return (
            <div key={well.tag} className="wp-pad">
              <div className="wp-pad-name">
                {well.pad}
                <span className="wp-pad-wells">
                  {well.wellCount} well{well.wellCount === 1 ? '' : 's'}
                </span>
              </div>

              {/* Wellhead */}
              <div className="wp-wellhead">
                <span className="wp-tree" />
                <span className="wp-stem" />
                <span className="wp-cellar" />
              </div>

              {/* Upstream of the choke: reservoir pressure */}
              <div className="wp-leg">
                <div className="wp-pipe wp-sour" />
                {lead && upstream && (
                  <span className="wp-reading up">
                    {fmt(upValue, upstream)}<small>{upstream.eng}</small>
                  </span>
                )}
              </div>

              {/* The choke: where the pressure comes down */}
              <div className={`wp-choke${tripped ? ' shut' : ''}`}>
                <span className="wp-choke-body" />
                <span className="wp-choke-label">CHOKE</span>
              </div>

              {/* Downstream: flowline pressure, the SIL-1 trip point */}
              <div className="wp-leg">
                <div className="wp-pipe wp-sour" />
                {lead && downstream && (
                  <span className={`wp-reading down${downLevel ? ` ${downLevel}` : ''}`}>
                    {fmt(downValue, downstream)}<small>{downstream.eng}</small>
                  </span>
                )}
              </div>

              {/* Trunkline SDV, where the pad has one */}
              <div className="wp-sdv-slot">
                <span className={`wp-sdv${tripped ? ' closed' : ' open'}`} />
                <span className="wp-sdv-state">{tripped ? 'CLOSED' : 'OPEN'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* The three pads converge on the trunkline */}
      <div className="wp-trunk">
        <div className="wp-trunk-header" />
        <div className="wp-trunk-out">
          <div className="wp-pipe wp-sour" />
          <span className="wp-arrow" />
        </div>
        <span className="wp-trunk-label">
          TRUNKLINE
          <span className="wp-label-sub">to production separator</span>
        </span>
      </div>
    </div>
  )
}
