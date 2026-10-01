/**
 * Equipment and final-element graphics for the unit detail views.
 *
 * Symbols follow the HMI standard: process lines grey, valves as bow-ties
 * that fill when open, motors red when running. See hmiStates.js for the
 * colour rules — in particular that running is red and stopped is green,
 * which is deliberate and not a mistake.
 */

import { EQUIPMENT_TYPE } from '../plant/topology.js'
import { VALVE_STATE, VALVE_STYLE, MOTOR_STATE, MOTOR_STYLE } from '../plant/hmiStates.js'

const T = EQUIPMENT_TYPE

/** Fill level inside a vessel or column, 0-100. */
const fillHeight = (value, range) => {
  if (value == null || !range) return null
  const [min, max] = range
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export function Vessel({ item, value, state = 'normal', horizontal = false }) {
  const level = fillHeight(value, item.level)
  const tripped = state === 'tripped' || state === 'shutdown'
  const stroke = tripped ? '#cc2222' : '#8a8a8a'

  const w = horizontal ? 76 : 44
  const h = horizontal ? 40 : 86

  return (
    <g className="eq-vessel">
      <rect
        width={w} height={h} rx={horizontal ? 20 : 8}
        fill="#1a1a1a" stroke={stroke} strokeWidth="2"
      />
      {level != null && (
        <rect
          x="2" y={2 + (h - 4) * (1 - level / 100)}
          width={w - 4} height={(h - 4) * (level / 100)}
          rx={horizontal ? 18 : 6}
          fill={tripped ? 'rgba(204,34,34,0.3)' : 'rgba(58,138,154,0.45)'}
        />
      )}
      <text x={w / 2} y={h + 11} textAnchor="middle" className="eq-tag">{item.tag}</text>
    </g>
  )
}

export function Column({ item, value, state = 'normal' }) {
  const level = fillHeight(value, item.level)
  const tripped = state === 'tripped' || state === 'shutdown'
  const stroke = tripped ? '#cc2222' : '#8a8a8a'

  return (
    <g className="eq-column">
      <rect width="36" height="116" rx="16" fill="#1a1a1a" stroke={stroke} strokeWidth="2" />
      {/* Tray indications */}
      {[0.25, 0.4, 0.55, 0.7].map((f) => (
        <line key={f} x1="4" y1={116 * f} x2="32" y2={116 * f} stroke="#555" strokeWidth="1" />
      ))}
      {level != null && (
        <rect
          x="2" y={2 + 112 * (1 - level / 100)}
          width="32" height={112 * (level / 100)}
          rx="14"
          fill={tripped ? 'rgba(204,34,34,0.3)' : 'rgba(176,96,48,0.45)'}
        />
      )}
      <text x="18" y="129" textAnchor="middle" className="eq-tag">{item.tag}</text>
    </g>
  )
}

export function Exchanger({ item, state = 'normal' }) {
  const stroke = state === 'tripped' ? '#cc2222' : '#8a8a8a'
  return (
    <g className="eq-exchanger">
      <circle cx="22" cy="22" r="20" fill="#1a1a1a" stroke={stroke} strokeWidth="2" />
      <path d="M 6 22 Q 14 10 22 22 Q 30 34 38 22" fill="none" stroke={stroke} strokeWidth="1.5" />
      <text x="22" y="56" textAnchor="middle" className="eq-tag">{item.tag}</text>
    </g>
  )
}

export function AirCooler({ item, fansRunning = 0, state = 'normal' }) {
  const total = item.fans?.length ?? 0
  const stroke = state === 'tripped' ? '#cc2222' : '#8a8a8a'
  return (
    <g className="eq-aircooler">
      <rect width="52" height="30" rx="2" fill="#1a1a1a" stroke={stroke} strokeWidth="2" />
      {Array.from({ length: Math.max(1, total) }).map((_, i) => {
        const running = i < fansRunning
        return (
          <g key={i} transform={`translate(${13 + i * 26} 15)`}>
            <circle r="9" fill="none" stroke={running ? '#aa2222' : '#2a5a2a'} strokeWidth="1.5" />
            <path
              d="M 0 -7 L 0 7 M -7 0 L 7 0"
              stroke={running ? '#ff5555' : '#5a8f5a'} strokeWidth="1.5"
              className={running ? 'eq-fan spinning' : 'eq-fan'}
            />
          </g>
        )
      })}
      <text x="26" y="44" textAnchor="middle" className="eq-tag">{item.tag}</text>
      {total > 0 && (
        <text x="26" y="54" textAnchor="middle" className="eq-sub">{fansRunning}/{total} fans</text>
      )}
    </g>
  )
}

export function FiredHeater({ item, state = 'normal' }) {
  const tripped = state === 'tripped' || state === 'shutdown'
  const stroke = tripped ? '#cc2222' : '#8a8a8a'
  return (
    <g className="eq-heater">
      <rect width="44" height="46" rx="3" fill="#1a1a1a" stroke={stroke} strokeWidth="2" />
      {/* Flame, extinguished when tripped */}
      <path
        d="M 22 36 Q 15 28 22 18 Q 29 28 22 36"
        fill={tripped ? '#3a3a3a' : '#cc6600'}
        stroke={tripped ? '#555' : '#ffaa00'} strokeWidth="1"
      />
      <text x="22" y="60" textAnchor="middle" className="eq-tag">{item.tag}</text>
      {tripped && <text x="22" y="70" textAnchor="middle" className="eq-sub trip">CUTOFF</text>}
    </g>
  )
}

/** Pump. Red when running, per the Experion electrical standard. */
export function Pump({ item, motorState = MOTOR_STATE.RUNNING }) {
  const style = MOTOR_STYLE[motorState] ?? MOTOR_STYLE[MOTOR_STATE.STOPPED]
  return (
    <g className="eq-pump">
      <circle cx="17" cy="17" r="15" fill={style.fill} stroke={style.stroke} strokeWidth="2" />
      <path d="M 17 5 L 17 17 L 28 22" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
      {style.badge && (
        <>
          <circle cx="29" cy="5" r="6" fill="#0088ff" />
          <text x="29" y="8" textAnchor="middle" className="eq-badge">{style.badge}</text>
        </>
      )}
      <text x="17" y="44" textAnchor="middle" className="eq-tag">{item.tag}</text>
      <text x="17" y="53" textAnchor="middle" className="eq-sub" fill={style.stroke}>
        {item.duty === 'standby' ? 'STBY' : style.label}
      </text>
    </g>
  )
}

export function Compressor({ item, state = 'normal' }) {
  const tripped = state === 'tripped' || state === 'shutdown'
  const style = tripped ? MOTOR_STYLE[MOTOR_STATE.TRIPPED] : MOTOR_STYLE[MOTOR_STATE.RUNNING]
  return (
    <g className="eq-compressor">
      <rect width="60" height="40" rx="3" fill={style.fill} stroke={style.stroke} strokeWidth="2" />
      <path d="M 10 20 L 24 20 M 30 12 L 30 28 M 36 20 L 50 20" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
      <text x="30" y="54" textAnchor="middle" className="eq-tag">{item.tag}</text>
      <text x="30" y="63" textAnchor="middle" className="eq-sub" fill={style.stroke}>{style.label}</text>
    </g>
  )
}

export function Filter({ item, state = 'normal' }) {
  const stroke = state === 'tripped' ? '#cc2222' : '#8a8a8a'
  return (
    <g className="eq-filter">
      <rect width="28" height="46" rx="3" fill="#1a1a1a" stroke={stroke} strokeWidth="2" />
      {[14, 23, 32].map((y) => (
        <line key={y} x1="4" y1={y} x2="24" y2={y} stroke="#666" strokeWidth="1" strokeDasharray="2 2" />
      ))}
      <text x="14" y="60" textAnchor="middle" className="eq-tag">{item.tag}</text>
    </g>
  )
}

export function Well({ item, state = 'normal' }) {
  const tripped = state === 'tripped' || state === 'shutdown'
  const stroke = tripped ? '#cc2222' : '#8a8a8a'
  return (
    <g className="eq-well">
      <line x1="16" y1="8" x2="16" y2="40" stroke={stroke} strokeWidth="2" />
      <path d="M 6 8 L 16 0 L 26 8 z" fill={tripped ? '#4a1414' : '#2a3a2a'} stroke={stroke} strokeWidth="1.5" />
      <line x1="4" y1="40" x2="28" y2="40" stroke={stroke} strokeWidth="2" />
      <text x="16" y="54" textAnchor="middle" className="eq-tag">{item.tag}</text>
    </g>
  )
}

/** SDV / BDV / control valve as a bow-tie, filled when open. */
export function Valve({ element, valveState }) {
  const state = valveState
    ?? (element.normal === 'OPEN' ? VALVE_STATE.OPEN : VALVE_STATE.CLOSED)
  const style = VALVE_STYLE[state]

  return (
    <g className="eq-valve">
      {style.halo && <circle cx="14" cy="10" r="15" fill="none" stroke="#0088ff" strokeWidth="2" opacity="0.6" />}
      <path d="M 2 2 L 2 18 L 26 2 L 26 18 z" fill={style.fill} stroke={style.stroke} strokeWidth="1.5" />
      {state === VALVE_STATE.BAD_PV && (
        <text x="14" y="14" textAnchor="middle" className="eq-badge">?</text>
      )}
      <text x="14" y="30" textAnchor="middle" className="eq-tag">{element.tag}</text>
      <text x="14" y="39" textAnchor="middle" className="eq-sub" fill={style.stroke}>{style.label}</text>
    </g>
  )
}

/** Dispatch by equipment type. */
export function EquipmentSymbol({ item, value, state, fansRunning, motorState }) {
  switch (item.type) {
    case T.VESSEL:
      return <Vessel item={item} value={value} state={state} horizontal={item.detail?.includes('Horizontal')} />
    case T.COLUMN:
      return <Column item={item} value={value} state={state} />
    case T.EXCHANGER:
      return <Exchanger item={item} state={state} />
    case T.AIR_COOLER:
      return <AirCooler item={item} fansRunning={fansRunning ?? item.fans?.length ?? 0} state={state} />
    case T.FIRED_HEATER:
      return <FiredHeater item={item} state={state} />
    case T.PUMP:
      return <Pump item={item} motorState={motorState} />
    case T.COMPRESSOR:
      return <Compressor item={item} state={state} />
    case T.FILTER:
      return <Filter item={item} state={state} />
    case T.WELL:
      return <Well item={item} state={state} />
    default:
      return (
        <g className="eq-generic">
          <rect width="44" height="30" rx="2" fill="#1a1a1a" stroke="#8a8a8a" strokeWidth="2" />
          <text x="22" y="44" textAnchor="middle" className="eq-tag">{item.tag}</text>
        </g>
      )
  }
}

