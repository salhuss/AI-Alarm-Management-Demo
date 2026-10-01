import { useState, useEffect, useRef } from 'react'
import { INSTRUMENTS } from '../plant/index.js'

/**
 * Drives a live value and trend history for every instrument in the dataset.
 *
 * Values come from each instrument's documented envelope — normal, band,
 * noise — so idle behaviour sits inside the real operating range. A unit
 * that has tripped decays its instruments toward the bottom of range
 * (vented pressure, drained level) at the documented rate rather than
 * snapping to zero.
 *
 * Pause is held in a ref. The interval is created once, so reading state
 * directly would capture a stale value — the bug the original scenario
 * handlers have (App.jsx:134, 164, 261, 339, 431), where pausing a running
 * scenario does nothing.
 */

const TREND_POINTS = 60
const TICK_MS = 500

export default function useUnitSimulation({ unitStates = {}, isPaused = false }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      INSTRUMENTS.map((i) => [i.tag, i.envelope?.normal ?? i.setpoint ?? i.range[0]]),
    ),
  )

  const [trends, setTrends] = useState(() =>
    Object.fromEntries(
      INSTRUMENTS.map((i) => [
        i.tag,
        Array(TREND_POINTS).fill(i.envelope?.normal ?? i.setpoint ?? i.range[0]),
      ]),
    ),
  )

  const pausedRef = useRef(isPaused)
  const statesRef = useRef(unitStates)

  useEffect(() => { pausedRef.current = isPaused }, [isPaused])
  useEffect(() => { statesRef.current = unitStates })

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return

      setValues((prev) => {
        const next = { ...prev }

        for (const inst of INSTRUMENTS) {
          const state = statesRef.current[inst.unit]
          const env = inst.envelope
          const current = prev[inst.tag] ?? env?.normal ?? inst.range[0]

          if (state === 'tripped' || state === 'shutdown') {
            // Decay at the documented rate, scaled to the tick.
            const step = (env?.rate ?? 1) * (TICK_MS / 1000)
            next[inst.tag] = Math.max(inst.range[0], current - step)
          } else if (env) {
            const drift = (Math.random() - 0.5) * env.noise * 2
            const wave = Math.sin(Date.now() / 5000) * env.noise * 0.5
            const raw = env.normal + drift + wave
            next[inst.tag] = Math.min(Math.max(raw, env.band[0]), env.band[1])
          } else {
            next[inst.tag] = current
          }
        }

        // Append to trend history in the same tick, so values and traces agree.
        setTrends((prevTrends) => {
          const nextTrends = {}
          for (const inst of INSTRUMENTS) {
            const history = prevTrends[inst.tag] ?? []
            nextTrends[inst.tag] = [...history.slice(1), next[inst.tag]]
          }
          return nextTrends
        })

        return next
      })
    }, TICK_MS)

    return () => clearInterval(id)
  }, [])

  const reset = () => {
    setValues(
      Object.fromEntries(
        INSTRUMENTS.map((i) => [i.tag, i.envelope?.normal ?? i.setpoint ?? i.range[0]]),
      ),
    )
    setTrends(
      Object.fromEntries(
        INSTRUMENTS.map((i) => [
          i.tag,
          Array(TREND_POINTS).fill(i.envelope?.normal ?? i.setpoint ?? i.range[0]),
        ]),
      ),
    )
  }

  return { values, trends, reset }
}
