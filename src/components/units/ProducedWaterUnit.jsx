import { instrumentsForUnit } from '../../plant/index.js'
import '../../units.css'

/**
 * Produced water — degasser and injection pumps.
 *
 * The degasser is a horizontal vessel, so it uses the production separator
 * form from App.css rather than the vertical column treatment the
 * contactors get. The injection pumps are duty/standby: one running, one
 * on standby, both tripping together on injection line pressure.
 */

const pct = (value, range) => {
  if (value == null || !range) return 0
  const [min, max] = range
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

/** Pick an instrument by engineering unit and duty preference. */
const instFor = (eng, { control = true } = {}) => {
  const all = instrumentsForUnit('producedWater').filter((i) => i.eng === eng)
  if (control) return all.find((i) => i.duty === 'control') ?? all[0] ?? null
  return all[0] ?? null
}

export default function ProducedWaterUnit({ equipment = [], values = {}, unitState = 'normal' }) {
  const degasser = equipment.find((e) => e.type === 'vessel') ?? equipment[0]
  const pumps = equipment.filter((e) => e.type === 'pump')

  const levelInst = instFor('mm')
  // Injection line pressure: the high-range pressure point, not the
  // degasser's own which is sub-1 barg.
  const dischargeInst = instrumentsForUnit('producedWater')
    .filter((i) => i.eng === 'barg')
    .sort((a, b) => b.range[1] - a.range[1])[0] ?? null

  const level = levelInst ? pct(values[levelInst.tag], levelInst.range) : 0
  const levelValue = levelInst ? values[levelInst.tag] : null
  const discharge = dischargeInst ? values[dischargeInst.tag] : null

  const tripped = unitState === 'tripped' || unitState === 'shutdown'

  return (
    <div className={`pw-unit${tripped ? ' tripped' : ''}`}>
      {/* Produced water in, from the separator water boot */}
      <div className="pw-run pw-run-in">
        <span className="pw-label pw-in-label">
          PRODUCED WATER
          <span className="pw-label-sub">from separator</span>
        </span>
        <div className="pw-pipe pw-water" />
        <span className="pw-arrow pw-water-arrow" />
      </div>

      {/* Degasser: horizontal vessel with off-gas to LP flare */}
      {degasser && (
        <div className="pw-degasser">
          <div className="pw-branch-up">
            <span className="pw-label pw-gas-label">
              OFF-GAS
              <span className="pw-label-sub">{tripped ? 'VENTING to LP flare' : 'to LP flare'}</span>
            </span>
            <div className={`pw-pipe-v pw-flare${tripped ? ' venting' : ''}`} />
          </div>

          <div className="pw-vessel">
            <div className="pw-vessel-shell">
              <div className="pw-level" style={{ height: `${level}%` }} />
              <div className="pw-vessel-plate">
                <span className="pw-vessel-tag">{degasser.tag}</span>
                <span className="pw-vessel-name">PRODUCED WATER DEGASSER</span>
                {levelValue != null && levelInst && (
                  <span className="pw-vessel-value">
                    {levelValue.toFixed(0)} <small>{levelInst.eng}</small>
                  </span>
                )}
              </div>
            </div>
            <div className="pw-vessel-leg left" />
            <div className="pw-vessel-leg right" />
          </div>
        </div>
      )}

      {/* Degassed water to the pumps */}
      <div className="pw-run pw-run-mid">
        <div className="pw-pipe pw-water" />
        <span className="pw-arrow pw-water-arrow" />
      </div>

      {/* Injection pumps, duty and standby */}
      {pumps.length > 0 && (
        <div className="pw-pumps">
          <div className="pw-pumps-head">INJECTION PUMPS</div>
          <div className="pw-pumps-row">
            {pumps.map((p) => {
              const standby = p.duty === 'standby'
              const state = tripped ? 'tripped' : standby ? 'standby' : 'running'
              return (
                <div key={p.tag} className={`pw-pump ${state}`}>
                  <div className="pw-pump-body">
                    <span className="pw-pump-scroll" />
                  </div>
                  <span className="pw-pump-tag">{p.tag}</span>
                  <span className={`pw-pump-state ${state}`}>
                    {tripped ? 'TRIPPED' : standby ? 'STANDBY' : 'RUNNING'}
                  </span>
                </div>
              )
            })}
          </div>

          {dischargeInst && (
            <div className="pw-discharge">
              <span className="pw-discharge-label">DISCHARGE</span>
              <span className="pw-discharge-value">
                {discharge == null ? '---' : discharge.toFixed(1)}
                <small>{dischargeInst.eng}</small>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Injection to the disposal well */}
      <div className="pw-run pw-run-out">
        <div className="pw-pipe pw-water" />
        <span className="pw-arrow pw-water-arrow" />
        <span className="pw-label pw-out-label">
          INJECTION
          <span className="pw-label-sub">to disposal well</span>
        </span>
      </div>
    </div>
  )
}
