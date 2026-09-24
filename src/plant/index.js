/**
 * Plant data loader.
 *
 * Prefers the real project dataset in ./real/ when it is present, and falls
 * back to the committed synthetic dataset otherwise. ./real/ is gitignored,
 * so a clone of the public repo runs on synthetic data with no missing
 * imports, while a local working copy with the overlay in place shows the
 * real tags and setpoints.
 *
 * Both datasets export the same shape, so nothing downstream knows or cares
 * which is loaded. `DATASET` says which one won, for the HMI banner.
 *
 * Vite resolves import.meta.glob at build time, so the fallback costs
 * nothing at runtime and the real modules are simply absent from a public
 * build rather than bundled-but-unused.
 */

import * as syntheticEffects from './effects.js'
import * as syntheticInitiators from './initiators.js'
import * as syntheticAmine from './amine.js'

const realModules = import.meta.glob('./real/*.real.js', { eager: true })

const pick = (name, synthetic) => {
  const real = realModules[`./real/${name}.real.js`]
  return real ?? synthetic
}

const effects = pick('effects', syntheticEffects)
const initiators = pick('initiators', syntheticInitiators)
const amine = pick('amine', syntheticAmine)

export const DATASET = Object.keys(realModules).length > 0 ? 'project' : 'synthetic'

export const IS_SYNTHETIC = DATASET === 'synthetic'

export const {
  EXECUTIVE_ACTION,
  EFFECTS,
  ALL_EFFECTS,
  effectsByUnit,
} = effects

export const {
  ESD_LEVEL,
  INITIATORS,
  initiatorByTag,
  UNIT_ORDER,
} = initiators

export const {
  SIL,
  AMINE_EQUIPMENT,
  AMINE_TRIPS,
  AMINE_SKIN_TEMP_TRIPS,
  AMINE_FGS_ZONE,
} = amine

export * from './engine.js'
