import { useState, useMemo } from 'react'
import ProcessFlowDiagram from './components/ProcessFlowDiagram.jsx'
import UnitPage from './UnitPage.jsx'
import useUnitSimulation from './hooks/useUnitSimulation.js'
import { instrumentsForUnit } from './plant/index.js'
import { UNIT_KEYS } from './plant/layout.js'
import './plant-view.css'

/**
 * PFD landing page.
 *
 * The diagram alone: units, the streams between them, live headline values.
 * Clicking a unit opens its own page, where that unit's trips, alarms and
 * AI analysis live.
 *
 * The idle simulation runs here rather than inside the unit page, so values
 * keep advancing across the plant and a unit you open shows continuous
 * trend history rather than starting from flat.
 */

/**
 * The instrument whose value heads each unit block: the primary control
 * point, which is what an operator watches first.
 *
 * Selected by duty rather than by tag, so it resolves against either
 * dataset without this file naming any instrument.
 */
const resolveHeadline = (unit) => {
  const forUnit = instrumentsForUnit(unit)
  return forUnit.find((i) => i.duty === 'control' && i.envelope)
    ?? forUnit.find((i) => i.duty === 'control')
    ?? forUnit.find((i) => i.envelope)
    ?? forUnit[0]
    ?? null
}

const fmt = (value, inst) => {
  if (value == null || !inst) return null
  const decimals = inst.eng === 'mm' ? 0 : inst.range[1] <= 1 ? 2 : 1
  return { value: value.toFixed(decimals), unit: inst.eng }
}

export default function PlantPfd() {
  const [drilledUnit, setDrilledUnit] = useState(null)
  const [isPaused, setIsPaused] = useState(false)

  // A scenario on a unit page drives values directly, overriding the idle
  // simulation for that tag until it is reset.
  const [overrides, setOverrides] = useState({})
  const setOverride = (tag, value) => setOverrides((prev) => ({ ...prev, [tag]: value }))
  const clearOverrides = () => setOverrides({})

  // Tripped state is per unit, set by whichever unit page is running a
  // scenario. The plant-wide ESD cascade lives on the unit pages now.
  const [unitStates, setUnitStates] = useState({})

  const headlines = useMemo(
    () => Object.fromEntries(UNIT_KEYS.map((u) => [u, resolveHeadline(u)])),
    [],
  )

  const { values, trends } = useUnitSimulation({ unitStates, isPaused, overrides })

  const unitValues = Object.fromEntries(
    UNIT_KEYS.map((u) => [u, fmt(values[headlines[u]?.tag], headlines[u])]),
  )

  if (drilledUnit) {
    return (
      <UnitPage
        key={drilledUnit}
        unit={drilledUnit}
        values={{ ...values, ...overrides }}
        trendData={trends}
        unitState={unitStates[drilledUnit] ?? 'normal'}
        onBack={() => setDrilledUnit(null)}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((p) => !p)}
        onOverride={setOverride}
        onClearOverride={clearOverrides}
        onUnitStateChange={(state) =>
          setUnitStates((prev) => ({ ...prev, [drilledUnit]: state }))}
      />
    )
  }

  // The PFD page is the diagram alone.
  return (
    <div className="plant-pfd-page">
      <ProcessFlowDiagram
        unitStates={unitStates}
        unitValues={unitValues}
        selectedUnit={null}
        onSelectUnit={setDrilledUnit}
      />
    </div>
  )
}
