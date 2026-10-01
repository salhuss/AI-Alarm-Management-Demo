/**
 * HMI dynamic states and alarm priority assignment.
 *
 * Contains no plant data — only the visual and priority rules from
 * FDS Chapter 9 / HMI Standards — so this module is committed, not
 * overlaid.
 *
 * ONE COUNTERINTUITIVE RULE: on the Experion electrical standard a running
 * pump is RED and a stopped pump is GREEN. That is the opposite of the
 * web convention where green means healthy. It is deliberate — red marks
 * energised, rotating equipment that is hazardous to approach. Do not
 * "fix" it to green-means-running.
 */

export const VALVE_STATE = {
  OPEN: 'open',
  CLOSED: 'closed',
  IN_TRANSIT: 'inTransit',
  BAD_PV: 'badPv',
}

export const VALVE_STYLE = {
  [VALVE_STATE.OPEN]: { fill: '#5a8f5a', stroke: '#8fbf8f', label: 'OPEN' },
  [VALVE_STATE.CLOSED]: { fill: '#808080', stroke: '#a0a0a0', label: 'CLOSED' },
  [VALVE_STATE.IN_TRANSIT]: { fill: '#8f7a3a', stroke: '#c8a000', label: 'IN-BET' },
  [VALVE_STATE.BAD_PV]: { fill: '#2a4a6a', stroke: '#0088ff', label: '?', halo: true },
}

export const MOTOR_STATE = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  TRIPPED: 'tripped',
  LOCAL: 'local',
}

/** Red = running, green = stopped. See the note at the top of this file. */
export const MOTOR_STYLE = {
  [MOTOR_STATE.RUNNING]: { fill: '#aa2222', stroke: '#ff5555', label: 'RUNNING' },
  [MOTOR_STATE.STOPPED]: { fill: '#2a5a2a', stroke: '#5a8f5a', label: 'STOPPED' },
  [MOTOR_STATE.TRIPPED]: { fill: '#6a1a1a', stroke: '#ff3333', label: 'TRIPPED', badge: 'B' },
  [MOTOR_STATE.LOCAL]: { fill: '#4a4a2a', stroke: '#c8c800', label: 'LOCALMAN' },
}

export const PRIORITY = {
  CRITICAL: 'critical',
  URGENT: 'urgent',
  HIGH: 'high',
  LOW: 'low',
}

/**
 * ISA-18.2 tiers per FDS 9.8.4:
 *   Critical (magenta) — system hardware failures, master ESD-1 shutdowns
 *   Urgent   (red)     — ESD & FGS safety trips
 *   High     (yellow)  — process warnings, control valve discrepancy
 *   Low      (cyan)    — minor deviations, bad PV on monitoring points
 */
export const PRIORITY_STYLE = {
  [PRIORITY.CRITICAL]: { color: '#ff66ff', bg: '#8b008b', label: 'CRIT', tier: 'System Critical' },
  [PRIORITY.URGENT]: { color: '#ff5555', bg: '#aa0000', label: 'URG', tier: 'System Urgent' },
  [PRIORITY.HIGH]: { color: '#ffd700', bg: '#8a7000', label: 'HIGH', tier: 'High Priority' },
  [PRIORITY.LOW]: { color: '#66ddff', bg: '#005a8a', label: 'LOW', tier: 'Low Priority' },
}

export const PRIORITY_RANK = {
  [PRIORITY.CRITICAL]: 0,
  [PRIORITY.URGENT]: 1,
  [PRIORITY.HIGH]: 2,
  [PRIORITY.LOW]: 3,
}

/**
 * Assign a priority to an alarm from its source.
 *
 * `kind` is what crossed: 'trip' (LL/HH safeguarding), 'alarm' (L/H
 * process), 'badPv', or 'systemFault'. `esdLevel` and `duty` refine it.
 */
export const priorityFor = ({ kind, esdLevel, duty, isMasterShutdown }) => {
  if (kind === 'systemFault') return PRIORITY.CRITICAL
  if (isMasterShutdown || esdLevel === 'ESD-1') return PRIORITY.CRITICAL
  if (kind === 'trip') return PRIORITY.URGENT
  if (kind === 'badPv') {
    return duty === 'monitoring' ? PRIORITY.LOW : PRIORITY.HIGH
  }
  if (kind === 'alarm') return PRIORITY.HIGH
  return PRIORITY.LOW
}

/**
 * Which limit an instrument reading has crossed, highest severity first.
 * Returns null when the value is inside every limit.
 */
export const limitCrossed = (value, { alarms = {}, trips = {} }) => {
  if (trips.HH != null && value >= trips.HH) return { limit: 'HH', kind: 'trip' }
  if (trips.LL != null && value <= trips.LL) return { limit: 'LL', kind: 'trip' }
  if (alarms.H != null && value >= alarms.H) return { limit: 'H', kind: 'alarm' }
  if (alarms.L != null && value <= alarms.L) return { limit: 'L', kind: 'alarm' }
  return null
}

/**
 * F&G voting. 1ooN raises a high alarm; 2ooN executes ESD isolation. Used
 * by the gas and flame detector groups, where a single detector in alarm is
 * not sufficient to shut the plant in.
 */
export const votedState = (detectorsInAlarm, voting = '2ooN') => {
  const required = voting === '2ooN' ? 2 : 1
  if (detectorsInAlarm >= required) return { confirmed: true, action: 'ESD isolation', priority: PRIORITY.URGENT }
  if (detectorsInAlarm >= 1) return { confirmed: false, action: 'High alarm only', priority: PRIORITY.HIGH }
  return { confirmed: false, action: null, priority: null }
}

/**
 * Restart sequence after a shutdown, per FDS. Ordered: utilities before
 * fluids, fluids before heat, heat before feed, feed before export. The
 * demo can walk these to show a controlled restart rather than an
 * all-at-once reset.
 */
export const RESTART_SEQUENCE = [
  { step: 1, name: 'Reset safety system', detail: 'Operator RESET on HMI once field causes clear', unit: null },
  { step: 2, name: 'Restore utilities', detail: 'Instrument air U-6101-01 and fuel gas headers', unit: null },
  { step: 3, name: 'Start fluid circulation', detail: 'TEG, amine circulation, and PW booster pumps', unit: ['dehydration', 'amine', 'producedWater'] },
  { step: 4, name: 'Thermal stabilisation', detail: 'Warm up TEG and amine reboilers', unit: ['dehydration', 'amine'] },
  { step: 5, name: 'Un-isolate wellpads', detail: 'Slowly open trunkline SDVs to re-pressurise the separator', unit: ['wellpads', 'separator'] },
  { step: 6, name: 'Resume export', detail: 'Un-bypass export compressor and open the export SDV', unit: ['salesGas'] },
]
