/**
 * PFD layout.
 *
 * Positions the six units on the landing page and derives the inter-unit
 * streams from the full topology: any stream whose endpoints sit in
 * different units becomes a connection between unit blocks, and the
 * internal streams stay hidden until you drill in.
 *
 * Deriving rather than hardcoding means the diagram cannot drift out of
 * step with the topology — add a stream and the PFD picks it up.
 */

import { EQUIPMENT, STREAMS, BOUNDARY_NODES, PHASE } from './index.js'

/**
 * Unit positions on a 12x8 grid, laid out to follow the process:
 * gas left-to-right along the top, water dropping to the lower branch.
 */
export const UNIT_LAYOUT = {
  wellpads: { col: 0, row: 2, label: 'WELLPADS', sublabel: 'WP-01/02/03' },
  separator: { col: 1, row: 2, label: 'PRODUCTION SEPARATION', sublabel: '3-phase separator' },
  amine: { col: 2, row: 1, label: 'AMINE SWEETENING', sublabel: 'H2S removal' },
  dehydration: { col: 3, row: 1, label: 'GAS DEHYDRATION', sublabel: 'TEG contactor' },
  salesGas: { col: 4, row: 1, label: 'SALES GAS', sublabel: 'export compression' },
  producedWater: { col: 2, row: 4, label: 'PRODUCED WATER', sublabel: 'treatment & injection' },
}

export const UNIT_KEYS = Object.keys(UNIT_LAYOUT)

/** Line style per phase. Gas phases solid, liquids dashed, flare dotted. */
export const PHASE_STYLE = {
  [PHASE.SOUR_GAS]: { color: '#c89000', label: 'Sour gas', dash: null, width: 3 },
  [PHASE.SWEET_GAS]: { color: '#4a9a4a', label: 'Sweet gas', dash: null, width: 3 },
  [PHASE.DRY_GAS]: { color: '#3a8fd0', label: 'Dry gas', dash: null, width: 3 },
  [PHASE.FUEL_GAS]: { color: '#9a7ac0', label: 'Fuel gas', dash: '6 3', width: 2 },
  [PHASE.STRIPPING_GAS]: { color: '#7a9ac0', label: 'Stripping gas', dash: '6 3', width: 2 },
  [PHASE.FLASH_GAS]: { color: '#c0a060', label: 'Flash gas', dash: '6 3', width: 2 },
  [PHASE.RICH_AMINE]: { color: '#b06030', label: 'Rich amine', dash: '8 4', width: 2 },
  [PHASE.LEAN_AMINE]: { color: '#d09050', label: 'Lean amine', dash: '8 4', width: 2 },
  [PHASE.RICH_TEG]: { color: '#8060b0', label: 'Rich TEG', dash: '8 4', width: 2 },
  [PHASE.LEAN_TEG]: { color: '#a080d0', label: 'Lean TEG', dash: '8 4', width: 2 },
  [PHASE.PRODUCED_WATER]: { color: '#3a8a9a', label: 'Produced water', dash: null, width: 3 },
  [PHASE.CONDENSATE]: { color: '#6a8a5a', label: 'Condensate', dash: '8 4', width: 2 },
  [PHASE.FLARE]: { color: '#aa3030', label: 'Flare / blowdown', dash: '2 3', width: 2 },
}

/** Which unit an equipment tag belongs to; boundary nodes return null. */
const buildTagIndex = () => {
  const index = new Map()
  for (const [unit, items] of Object.entries(EQUIPMENT)) {
    for (const item of items) index.set(item.tag, unit)
  }
  return index
}

export const TAG_UNIT = buildTagIndex()

export const unitOf = (tag) => TAG_UNIT.get(tag) ?? null
export const isBoundary = (tag) => tag in BOUNDARY_NODES

/**
 * Streams that cross a unit boundary, collapsed so that several parallel
 * streams of the same phase between the same two units become one line.
 * These are the connections drawn on the landing page.
 */
export const interUnitStreams = () => {
  const merged = new Map()

  for (const stream of STREAMS) {
    const fromUnit = unitOf(stream.from)
    const toUnit = unitOf(stream.to)

    // Skip internal streams and utility ties that have no unit at either end.
    if (fromUnit && toUnit && fromUnit === toUnit) continue
    if (!fromUnit && !toUnit) continue

    const key = `${fromUnit ?? stream.from}|${toUnit ?? stream.to}|${stream.phase}`
    if (!merged.has(key)) {
      merged.set(key, {
        fromUnit: fromUnit ?? stream.from,
        toUnit: toUnit ?? stream.to,
        phase: stream.phase,
        fromBoundary: !fromUnit,
        toBoundary: !toUnit,
        streams: [],
      })
    }
    merged.get(key).streams.push(stream)
  }

  return [...merged.values()]
}

/**
 * Circulation loops, found by walking recycle legs back to their origin.
 * Each becomes a single indicator on the landing page rather than the dozen
 * or so items it actually contains.
 */
export const circulationLoops = () => {
  const loops = []

  for (const recycle of STREAMS.filter((s) => s.recycle)) {
    const unit = unitOf(recycle.to)
    if (!unit) continue

    // Everything in this unit on the same phase family is part of the loop.
    const family = recycle.phase.replace(/^(rich|lean)/, '').toLowerCase()
    const members = STREAMS.filter(
      (s) => unitOf(s.from) === unit && s.phase.toLowerCase().includes(family),
    )
    const equipment = [...new Set(members.flatMap((s) => [s.from, s.to]))].filter(
      (t) => unitOf(t) === unit,
    )

    loops.push({
      unit,
      phase: recycle.phase,
      family,
      returnsTo: recycle.to,
      equipmentCount: equipment.length,
      equipment,
      streamCount: members.length,
    })
  }

  return loops
}

/** Equipment counts per unit, for the landing-page block badges. */
export const unitSummary = (unit) => {
  const items = EQUIPMENT[unit] ?? []
  const internal = STREAMS.filter(
    (s) => unitOf(s.from) === unit && unitOf(s.to) === unit,
  )
  const loops = circulationLoops().filter((l) => l.unit === unit)

  // Largest loop first — the amine unit has both a condensate reflux loop
  // and the main amine circulation loop, and the block badge shows one.
  loops.sort((a, b) => b.equipmentCount - a.equipmentCount)

  return {
    equipmentCount: items.length,
    internalStreamCount: internal.length,
    primary: items.find((i) => i.primary) ?? items[0] ?? null,
    pumpPairs: items.filter((i) => i.duty === 'duty').length,
    loops,
  }
}
