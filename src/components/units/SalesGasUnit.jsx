import { instrumentsForUnit } from '../../plant/index.js'
import '../../units.css'

/**
 * Sales gas — export compression and custody metering.
 *
 * Two items left to right: the compressor package that raises the dry gas
 * to export pressure, and the metering skid where it is measured and sold.
 *
 * Unlike the two contactors this unit has no vessel level, so the live
 * value is discharge pressure — shown on a gauge on the compressor rather
 * than as a liquid fill.
 */

const pressureInstrument = () => {
  const inst = instrumentsForUnit('salesGas')
  return inst.find((i) => i.duty === 'control' && i.eng === 'barg')
    ?? inst.find((i) => i.eng === 'barg')
    ?? null
}

const pct = (value, range) => {
  if (value == null || !range) return 0
  const [min, max] = range
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export default function SalesGasUnit({ equipment = [], values = {}, unitState = 'normal' }) {
  const compressor = equipment.find((e) => e.type === 'compressor') ?? equipment[0]
  const meter = equipment.find((e) => e.type === 'meter')

  const inst = pressureInstrument()
  const value = inst ? values[inst.tag] : null
  const tripped = unitState === 'tripped' || unitState === 'shutdown'

  // Gauge needle sweeps 240 degrees across the instrument range.
  const sweep = inst ? pct(value, inst.range) : 0
  const angle = -120 + (sweep / 100) * 240

  return (
    <div className={`sg-unit${tripped ? ' tripped' : ''}`}>
      {/* Dry gas in, from dehydration */}
      <div className="sg-stream sg-in">
        <div className="sg-pipe-h sg-dry" />
        <span className="sg-label sg-in-label">
          DRY GAS
          <span className="sg-label-sub">from dehydration</span>
        </span>
      </div>

      {/* Fuel gas in, the compressor's own supply */}
      <div className="sg-stream sg-fuel">
        <div className="sg-pipe-v sg-fuelgas" />
        <span className="sg-label sg-fuel-label">
          FUEL GAS
          <span className="sg-label-sub">to driver</span>
        </span>
      </div>

      {/* Compressor package */}
      {compressor && (
        <div className="sg-compressor">
          <div className="sg-comp-body">
            <div className="sg-comp-stages">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`sg-stage${tripped ? '' : ' running'}`} />
              ))}
            </div>

            {/* Discharge pressure gauge */}
            {inst && (
              <div className="sg-gauge">
                <div className="sg-gauge-face">
                  <span className="sg-gauge-needle" style={{ transform: `rotate(${angle}deg)` }} />
                  <span className="sg-gauge-hub" />
                </div>
                <span className="sg-gauge-value">
                  {value == null ? '---' : value.toFixed(1)}
                  <small>{inst.eng}</small>
                </span>
              </div>
            )}
          </div>

          <div className="sg-caption">
            <span className="sg-caption-tag">{compressor.tag}</span>
            <span className="sg-caption-name">EXPORT COMPRESSOR</span>
            <span className={`sg-caption-state ${tripped ? 'tripped' : 'running'}`}>
              {tripped ? '■ SHUTDOWN' : '● RUNNING'}
            </span>
          </div>
        </div>
      )}

      {/* Compressed gas between the two */}
      <div className="sg-stream sg-mid">
        <div className="sg-pipe-h sg-dry" />
      </div>

      {/* Metering skid */}
      {meter && (
        <div className="sg-meter">
          <div className="sg-meter-body">
            <div className="sg-meter-runs">
              {[0, 1].map((i) => (
                <div key={i} className="sg-meter-run">
                  <span className={`sg-meter-rotor${tripped ? '' : ' turning'}`} />
                </div>
              ))}
            </div>
            <div className="sg-meter-badge">CUSTODY<br />TRANSFER</div>
          </div>

          <div className="sg-caption">
            <span className="sg-caption-tag">{meter.tag}</span>
            <span className="sg-caption-name">METERING SKID</span>
            <span className={`sg-caption-state ${tripped ? 'tripped' : 'running'}`}>
              {tripped ? '■ NO FLOW' : '● MEASURING'}
            </span>
          </div>
        </div>
      )}

      {/* Sales gas out, to the export pipeline */}
      <div className="sg-stream sg-out">
        <div className="sg-pipe-h sg-dry" />
        <span className="sg-label sg-out-label">
          SALES GAS
          <span className="sg-label-sub">to export pipeline</span>
        </span>
      </div>

      {/* Blowdown to flare */}
      <div className="sg-stream sg-blowdown">
        <div className={`sg-pipe-v sg-flare${tripped ? ' venting' : ''}`} />
        <span className="sg-label sg-bd-label">
          BLOWDOWN
          <span className="sg-label-sub">{tripped ? 'VENTING to flare' : 'to HP flare'}</span>
        </span>
      </div>
    </div>
  )
}
