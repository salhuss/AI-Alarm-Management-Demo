import { MOTOR_STATE, MOTOR_STYLE } from '../plant/hmiStates.js'
import { EQUIPMENT_TYPE as T } from '../plant/topology.js'
import '../equipment.css'

/**
 * Equipment graphics in the visual language of the existing production
 * separator: metallic vessel body, specular highlight, floor shadow, blue
 * liquid level, tag plate on the face.
 *
 * HTML/CSS rather than SVG — the form comes from layered gradients, inset
 * shadows and blur, which SVG does not do nearly as well.
 */

/** Liquid colour per service: water blue, amine brown, glycol violet. */
const liquidClass = (tag = '') => {
  if (/22\d\d|32\d\d/.test(tag)) return 'amine'
  if (/11\d\d|12\d\d/.test(tag)) return 'glycol'
  return ''
}

const pct = (value, range) => {
  if (value == null || !range) return null
  const [min, max] = range
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

const fmtValue = (value, item) => {
  if (value == null) return null
  if (item.level) return `${value.toFixed(0)} mm`
  if (item.press) return `${value.toFixed(1)} barg`
  if (item.temp) return `${value.toFixed(1)} °C`
  return value.toFixed(1)
}

/** Horizontal or vertical vessel, or a trayed column. */
function VesselBody({ item, value, state, shape, width, height, nozzles = [] }) {
  const range = item.level ?? item.press ?? item.temp
  const level = item.level ? pct(value, item.level) : null
  const tripped = state === 'tripped' || state === 'shutdown'

  return (
    <div className={`eqp ${shape}${tripped ? ' tripped' : ''}`} style={{ width, height }}>
      {nozzles.map((n) => (
        <div key={n} className={`eqp-nozzle ${n}`} />
      ))}

      <div className="eqp-shell" style={{ width: '100%', height: '100%' }}>
        {level != null && <div className={`eqp-level ${liquidClass(item.tag)}`} style={{ height: `${level}%` }} />}

        {shape === 'column' && (
          <div className="eqp-trays">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="eqp-tray" />)}
          </div>
        )}

        <div className="eqp-plate">
          <span className="eqp-plate-tag">{item.tag}</span>
          <span className="eqp-plate-name">{item.name}</span>
          {value != null && range && (
            <span className="eqp-plate-value">{fmtValue(value, item)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Pump({ item, motorState }) {
  const cls = motorState === MOTOR_STATE.RUNNING ? 'running'
    : motorState === MOTOR_STATE.TRIPPED ? 'tripped'
      : 'stopped'
  const label = item.duty === 'standby' && motorState === MOTOR_STATE.STOPPED
    ? 'STANDBY'
    : cls.toUpperCase()

  return (
    <div className={`eqp eqp-pump ${cls}`}>
      <div className="eqp-pump-body">
        <div className="eqp-pump-impeller" />
      </div>
      <div className="eqp-caption">
        {item.tag}
        <span className="eqp-caption-name">{item.name.replace(/ (Pump )?[AB]$/, '')}</span>
        <span className={`eqp-caption-state ${item.duty === 'standby' && cls === 'stopped' ? 'standby' : cls}`}>
          {label}
        </span>
      </div>
    </div>
  )
}

function AirCooler({ item, fansRunning, state }) {
  const total = item.fans?.length ?? 2
  const tripped = state === 'tripped' || state === 'shutdown'
  const running = tripped ? 0 : fansRunning ?? total

  return (
    <div className={`eqp${tripped ? ' tripped' : ''}`}>
      <div className="eqp-cooler-body" style={{ width: total * 40 + 12, height: 46 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`eqp-fan${i < running ? ' running' : ''}`} />
        ))}
      </div>
      <div className="eqp-caption">
        {item.tag}
        <span className="eqp-caption-name">{item.name}</span>
        <span className={`eqp-caption-state ${running ? 'running' : 'tripped'}`}>
          {running}/{total} FANS
        </span>
      </div>
    </div>
  )
}

function FiredHeater({ item, state }) {
  const tripped = state === 'tripped' || state === 'shutdown'
  return (
    <div className={`eqp${tripped ? ' tripped' : ''}`}>
      <div className="eqp-heater-body" style={{ width: 62, height: 62 }}>
        <div className="eqp-flame" />
      </div>
      <div className="eqp-caption">
        {item.tag}
        <span className="eqp-caption-name">{item.name}</span>
        <span className={`eqp-caption-state ${tripped ? 'tripped' : 'running'}`}>
          {tripped ? 'POWER CUTOFF' : 'FIRING'}
        </span>
      </div>
    </div>
  )
}

function Compressor({ item, state }) {
  const tripped = state === 'tripped' || state === 'shutdown'
  return (
    <div className={`eqp eqp-compressor ${tripped ? 'tripped' : 'running'}`}>
      <div className="eqp-compressor-body" style={{ width: 92, height: 56 }}>
        {[0, 1, 2].map((i) => <div key={i} className="eqp-compressor-stage" />)}
      </div>
      <div className="eqp-caption">
        {item.tag}
        <span className="eqp-caption-name">{item.name}</span>
        <span className={`eqp-caption-state ${tripped ? 'tripped' : 'running'}`}>
          {tripped ? 'SHUTDOWN' : 'RUNNING'}
        </span>
      </div>
    </div>
  )
}

function Filter({ item, state }) {
  const tripped = state === 'tripped' || state === 'shutdown'
  return (
    <div className={`eqp${tripped ? ' tripped' : ''}`}>
      <div className="eqp-filter-body" style={{ width: 34, height: 62 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="eqp-filter-mesh" />)}
      </div>
      <div className="eqp-caption">
        {item.tag}
        <span className="eqp-caption-name">{item.name}</span>
      </div>
    </div>
  )
}

function Well({ item, state }) {
  const tripped = state === 'tripped' || state === 'shutdown'
  return (
    <div className={`eqp${tripped ? ' tripped' : ''}`}>
      <div className="eqp-well">
        <div className="eqp-well-tree" />
        <div className="eqp-well-stem" />
        <div className="eqp-well-base" />
      </div>
      <div className="eqp-caption">
        {item.tag}
        <span className={`eqp-caption-state ${tripped ? 'tripped' : 'running'}`}>
          {tripped ? 'SHUT IN' : 'FLOWING'}
        </span>
      </div>
    </div>
  )
}

function Exchanger({ item, state }) {
  const tripped = state === 'tripped' || state === 'shutdown'
  return (
    <div className={`eqp vertical${tripped ? ' tripped' : ''}`} style={{ width: 70, height: 48 }}>
      <div className="eqp-shell" style={{ width: '100%', height: '100%', borderRadius: '24px / 24px' }}>
        <div className="eqp-plate">
          <span className="eqp-plate-tag" style={{ fontSize: '11px' }}>{item.tag}</span>
        </div>
      </div>
      <div className="eqp-caption">
        <span className="eqp-caption-name">{item.name}</span>
      </div>
    </div>
  )
}

export default function Equipment({ item, value, state = 'normal', fansRunning, motorState }) {
  switch (item.type) {
    case T.VESSEL: {
      const horizontal = item.detail?.includes('Horizontal') || item.primary
      return (
        <VesselBody
          item={item} value={value} state={state}
          shape={horizontal ? 'horizontal' : 'vertical'}
          width={horizontal ? 230 : 90}
          height={horizontal ? 104 : 150}
          nozzles={horizontal ? ['left', 'right', 'bottom'] : ['top', 'bottom']}
        />
      )
    }
    case T.COLUMN:
      return (
        <VesselBody
          item={item} value={value} state={state}
          shape="column" width={86} height={204}
          nozzles={['top', 'bottom', 'left']}
        />
      )
    case T.EXCHANGER:
      return <Exchanger item={item} state={state} />
    case T.AIR_COOLER:
      return <AirCooler item={item} fansRunning={fansRunning} state={state} />
    case T.FIRED_HEATER:
      return <FiredHeater item={item} state={state} />
    case T.PUMP:
      return <Pump item={item} motorState={motorState ?? MOTOR_STATE.RUNNING} />
    case T.COMPRESSOR:
      return <Compressor item={item} state={state} />
    case T.FILTER:
      return <Filter item={item} state={state} />
    case T.WELL:
      return <Well item={item} state={state} />
    default:
      return (
        <div className="eqp vertical" style={{ width: 70, height: 50 }}>
          <div className="eqp-shell" style={{ width: '100%', height: '100%', borderRadius: '8px' }}>
            <div className="eqp-plate"><span className="eqp-plate-tag" style={{ fontSize: '10px' }}>{item.tag}</span></div>
          </div>
          <div className="eqp-caption"><span className="eqp-caption-name">{item.name}</span></div>
        </div>
      )
  }
}
