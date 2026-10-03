import { instrumentsForUnit } from '../../plant/index.js'
import '../../units.css'

/**
 * Amine sweetening — the contactor tower only.
 *
 * Deliberately one vessel, not the full circulation loop: lean amine enters
 * at the top, sour gas at the bottom, sweet gas leaves top right. That is
 * the whole story of what the unit does, and the regeneration side would
 * bury it.
 *
 * Hand-drawn for this unit rather than laid out from the topology graph —
 * a sweetening tower has a specific arrangement that a generic placement
 * algorithm will not produce.
 */

/** The tower's level instrument, control point preferred. */
const towerLevel = () => {
  const inst = instrumentsForUnit('amine')
  return inst.find((i) => i.duty === 'control' && i.eng === 'mm')
    ?? inst.find((i) => i.eng === 'mm')
    ?? null
}

const pct = (value, range) => {
  if (value == null || !range) return 0
  const [min, max] = range
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export default function AmineUnit({ values = {}, unitState = 'normal' }) {
  const levelInst = towerLevel()
  const level = levelInst ? pct(values[levelInst.tag], levelInst.range) : 0
  const reading = levelInst ? values[levelInst.tag] : null

  const tripped = unitState === 'tripped' || unitState === 'shutdown'

  return (
    <div className={`amine-unit${tripped ? ' tripped' : ''}`}>
      {/* ---------- lean amine in, top left ---------- */}
      <div className="au-stream au-amine-in">
        <div className="au-pipe-h au-amine" />
        <div className="au-pipe-v au-amine" />
        <span className="au-label au-amine-label">
          LEAN AMINE
          <span className="au-label-sub">to tower top</span>
        </span>
      </div>

      {/* ---------- sweet gas out, top right ---------- */}
      <div className="au-stream au-sweet-out">
        <div className="au-pipe-v au-sweet" />
        <div className="au-pipe-h au-sweet" />
        <span className="au-label au-sweet-label">
          SWEET GAS
          <span className="au-label-sub">to dehydration</span>
        </span>
      </div>

      {/* ---------- sour gas in, bottom left ---------- */}
      <div className="au-stream au-sour-in">
        <div className="au-pipe-h au-sour" />
        <div className="au-pipe-v au-sour" />
        <span className="au-label au-sour-label">
          SOUR GAS
          <span className="au-label-sub">from separator</span>
        </span>
      </div>

      {/* ---------- the tower ---------- */}
      <div className="au-tower">
        <div className="au-tower-head" />

        <div className="au-tower-shell">
          {/* Contact trays, top to bottom */}
          <div className="au-trays">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="au-tray">
                <span className="au-tray-cap" />
                <span className="au-tray-cap" />
                <span className="au-tray-cap" />
              </div>
            ))}
          </div>

          {/* Gas rising, liquid falling — only while running */}
          {!tripped && (
            <>
              <div className="au-flow-up" />
              <div className="au-flow-down" />
            </>
          )}

          {/* Rich amine collected in the sump */}
          <div className="au-level" style={{ height: `${level}%` }} />

          <div className="au-tower-plate">
            <span className="au-tower-tag">C-2201-01</span>
            <span className="au-tower-name">AMINE CONTACTOR</span>
            {reading != null && levelInst && (
              <span className="au-tower-value">
                {reading.toFixed(0)} <small>{levelInst.eng}</small>
              </span>
            )}
          </div>
        </div>

        <div className="au-tower-skirt" />
      </div>

      {/* ---------- rich amine out, bottom ---------- */}
      <div className="au-stream au-rich-out">
        <div className="au-pipe-v au-rich" />
        <span className="au-label au-rich-label">
          RICH AMINE
          <span className="au-label-sub">to regeneration</span>
        </span>
      </div>
    </div>
  )
}
