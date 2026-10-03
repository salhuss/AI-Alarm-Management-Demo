import { instrumentsForUnit } from '../../plant/index.js'
import '../../units.css'

/**
 * A contactor tower with its four connections.
 *
 * Amine sweetening and TEG dehydration are the same arrangement — a trayed
 * counter-current column, solvent in at the top, gas in at the bottom,
 * treated gas out the top right, rich solvent out the bottom — so both use
 * this one component with different labels and liquid colour.
 */

/** Per-unit presentation: what the streams are called and how they look. */
const PRESETS = {
  amine: {
    tower: { name: 'AMINE CONTACTOR' },
    liquid: 'amine',
    solventIn: { label: 'LEAN AMINE', sub: 'to tower top', cls: 'au-amine' },
    gasIn: { label: 'SOUR GAS', sub: 'from separator', cls: 'au-sour' },
    gasOut: { label: 'SWEET GAS', sub: 'to dehydration', cls: 'au-sweet' },
    solventOut: { label: 'RICH AMINE', sub: 'to regeneration', cls: 'au-rich' },
  },
  dehydration: {
    tower: { name: 'GLYCOL CONTACTOR' },
    liquid: 'glycol',
    solventIn: { label: 'LEAN TEG', sub: 'to tower top', cls: 'au-leanteg' },
    gasIn: { label: 'SWEET GAS', sub: 'from sweetening', cls: 'au-sweet' },
    gasOut: { label: 'DRY GAS', sub: 'to compression', cls: 'au-dry' },
    solventOut: { label: 'RICH TEG', sub: 'to regeneration', cls: 'au-richteg' },
  },
}

/** The tower's level instrument, control point preferred. */
const towerLevel = (unit) => {
  const inst = instrumentsForUnit(unit)
  return inst.find((i) => i.duty === 'control' && i.eng === 'mm')
    ?? inst.find((i) => i.eng === 'mm')
    ?? null
}

/** The tower tag: the unit's column, whatever it is called. */
const towerTag = (equipment) => equipment?.[0]?.tag ?? '—'

const pct = (value, range) => {
  if (value == null || !range) return 0
  const [min, max] = range
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export default function ContactorUnit({ unit, equipment, values = {}, unitState = 'normal' }) {
  const preset = PRESETS[unit] ?? PRESETS.amine
  const levelInst = towerLevel(unit)
  const level = levelInst ? pct(values[levelInst.tag], levelInst.range) : 0
  const reading = levelInst ? values[levelInst.tag] : null
  const tag = towerTag(equipment)

  const tripped = unitState === 'tripped' || unitState === 'shutdown'

  return (
    <div className={`amine-unit ${unit}${tripped ? ' tripped' : ''}`}>
      {/* Solvent in, top left */}
      <div className="au-stream au-amine-in">
        <div className={`au-pipe-h ${preset.solventIn.cls}`} />
        <div className={`au-pipe-v ${preset.solventIn.cls}`} />
        <span className="au-label au-amine-label">
          {preset.solventIn.label}
          <span className="au-label-sub">{preset.solventIn.sub}</span>
        </span>
      </div>

      {/* Treated gas out, top right */}
      <div className="au-stream au-sweet-out">
        <div className={`au-pipe-v ${preset.gasOut.cls}`} />
        <div className={`au-pipe-h ${preset.gasOut.cls}`} />
        <span className="au-label au-sweet-label">
          {preset.gasOut.label}
          <span className="au-label-sub">{preset.gasOut.sub}</span>
        </span>
      </div>

      {/* Feed gas in, bottom left */}
      <div className="au-stream au-sour-in">
        <div className={`au-pipe-h ${preset.gasIn.cls}`} />
        <div className={`au-pipe-v ${preset.gasIn.cls}`} />
        <span className="au-label au-sour-label">
          {preset.gasIn.label}
          <span className="au-label-sub">{preset.gasIn.sub}</span>
        </span>
      </div>

      {/* The tower */}
      <div className="au-tower">
        <div className="au-tower-head" />

        <div className="au-tower-shell">
          <div className="au-trays">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="au-tray">
                <span className="au-tray-cap" />
                <span className="au-tray-cap" />
                <span className="au-tray-cap" />
              </div>
            ))}
          </div>

          {/* Counter-current flow, stopped when the unit trips */}
          {!tripped && (
            <>
              <div className={`au-flow-up ${preset.gasIn.cls}`} />
              <div className={`au-flow-down ${preset.liquid}`} />
            </>
          )}

          <div className={`au-level ${preset.liquid}`} style={{ height: `${level}%` }} />

          <div className="au-tower-plate">
            <span className="au-tower-tag">{tag}</span>
            <span className="au-tower-name">{preset.tower.name}</span>
            {reading != null && levelInst && (
              <span className="au-tower-value">
                {reading.toFixed(0)} <small>{levelInst.eng}</small>
              </span>
            )}
          </div>
        </div>

        <div className="au-tower-skirt" />
      </div>

      {/* Rich solvent out, bottom */}
      <div className="au-stream au-rich-out">
        <div className={`au-pipe-v ${preset.solventOut.cls}`} />
        <span className="au-label au-rich-label">
          {preset.solventOut.label}
          <span className="au-label-sub">{preset.solventOut.sub}</span>
        </span>
      </div>
    </div>
  )
}
