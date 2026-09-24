/**
 * Verifies the C&E encoding. Runs against the committed synthetic dataset
 * and, when the gitignored real overlay is present, against that too.
 *
 *   node src/plant/__tests__/ce-matrix.check.mjs
 *
 * The structural invariants asserted here must hold for any dataset: effect
 * numbering, ESD level distribution, cascade ordering, and — most
 * importantly — that the sweetening unit is never wired in as a plant-wide
 * initiator. That last one encodes a real safety-design distinction, so a
 * future edit that breaks it should fail loudly.
 */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildCascade, priorityForInitiator } from '../engine.js'

const here = dirname(fileURLToPath(import.meta.url))
const realDir = resolve(here, '../real')

let fail = 0
const check = (name, cond, detail = '') => {
  if (!cond) { console.log(`  FAIL  ${name} ${detail}`); fail++ }
  else console.log(`  ok    ${name}`)
}

async function loadDataset(kind) {
  const suffix = kind === 'project' ? 'real/%s.real.js' : '%s.js'
  const path = (n) => resolve(here, '..', suffix.replace('%s', n))
  const [effects, initiators, amine] = await Promise.all([
    import(path('effects')), import(path('initiators')), import(path('amine')),
  ])
  return { ...effects, ...initiators, ...amine }
}

async function verify(kind, data) {
  console.log(`\n=== ${kind} dataset ===`)
  const { EFFECTS, ALL_EFFECTS, INITIATORS, UNIT_ORDER, AMINE_TRIPS, AMINE_FGS_ZONE, initiatorByTag } = data
  const byTag = initiatorByTag ?? ((t) => INITIATORS.find((i) => i.tag === t))

  // --- Effects -------------------------------------------------------------
  check('30 effects defined', ALL_EFFECTS.length === 30, `got ${ALL_EFFECTS.length}`)
  check('effects numbered 1..30 with no gaps', ALL_EFFECTS.every((n, i) => n === i + 1))
  check('every effect has tag/description/action/unit',
    ALL_EFFECTS.every((n) => EFFECTS[n].tag && EFFECTS[n].description && EFFECTS[n].action && EFFECTS[n].unit))
  check('every effect unit is in the train order',
    ALL_EFFECTS.every((n) => UNIT_ORDER.includes(EFFECTS[n].unit)),
    ALL_EFFECTS.filter((n) => !UNIT_ORDER.includes(EFFECTS[n].unit)).map((n) => `${n}:${EFFECTS[n].unit}`).join(' '))

  // --- Initiators ----------------------------------------------------------
  check('initiator tags are unique', new Set(INITIATORS.map((i) => i.tag)).size === INITIATORS.length)
  check('every initiator has level/voting/effects',
    INITIATORS.every((i) => i.level && i.voting && Array.isArray(i.effects) && i.effects.length))
  check('every referenced effect number exists',
    INITIATORS.every((i) => i.effects.every((n) => EFFECTS[n])))
  check('ESD levels present', [1, 2, 3].every((n) => INITIATORS.some((i) => i.level === `ESD-${n}`)),
    [1, 2, 3].map((n) => `ESD-${n}:${INITIATORS.filter((i) => i.level === `ESD-${n}`).length}`).join(' '))
  check('total-shutdown initiators fire all 30',
    INITIATORS.filter((i) => i.totalShutdown).every((i) => i.effects.length === 30))
  check('selective initiators fire fewer than 30',
    INITIATORS.filter((i) => !i.totalShutdown).every((i) => i.effects.length < 30))

  // --- Cascade staging -----------------------------------------------------
  const fullTag = INITIATORS.find((i) => i.totalShutdown)?.tag
  const full = buildCascade(fullTag, data)
  check(`full ESD (${fullTag}) actuates 30`, full.length === 30, `got ${full.length}`)
  check('cascade is sorted by delay', full.every((s, i) => i === 0 || full[i - 1].delayMs <= s.delayMs))
  check('cascade staggers over time', full.at(-1).delayMs > 0)
  const unitsSeen = [...new Set(full.map((s) => s.unit))]
  check('cascade follows train order',
    unitsSeen.every((u, i) => i === 0 || UNIT_ORDER.indexOf(unitsSeen[i - 1]) < UNIT_ORDER.indexOf(u)),
    unitsSeen.join(' -> '))
  console.log(`        full ESD completes in ${full.at(-1).delayMs}ms across ${unitsSeen.length} units`)

  // Every selective initiator's cascade matches its declared effects
  for (const init of INITIATORS.filter((i) => !i.totalShutdown)) {
    const cascade = buildCascade(init.tag, data)
    check(`${init.tag} -> ${init.effects.length} actuation(s)`,
      cascade.length === init.effects.length &&
      cascade.every((c) => init.effects.includes(c.effectNumber)),
      `got ${cascade.map((c) => c.effectNumber).join(',')}`)
  }

  // --- Priority per HMI standards -----------------------------------------
  check('confirmed (2ooN) FGS initiators are urgent',
    INITIATORS.filter((i) => i.voting === '2ooN').every((i) => priorityForInitiator(i) === 'urgent'))
  check('manual total shutdown is critical',
    priorityForInitiator(byTag(INITIATORS.find((i) => i.voting === 'Manual' && i.totalShutdown).tag)) === 'critical')

  // --- Sweetening unit: the load-bearing architectural invariant -----------
  check('9 sweetening SIL-1 trips', AMINE_TRIPS.length === 9, `got ${AMINE_TRIPS.length}`)
  check('every sweetening trip has a numeric setpoint and direction',
    AMINE_TRIPS.every((t) => typeof t.setpoint === 'number' && ['HH', 'LL'].includes(t.direction)))
  check('NO sweetening tag is a plant-wide initiator',
    !INITIATORS.some((i) => AMINE_TRIPS.some((t) => t.tag === i.tag)))
  check('NO effect targets the sweetening unit',
    !ALL_EFFECTS.some((n) => EFFECTS[n].unit === 'amine'))
  check('sweetening FGS detectors vote into real plant-wide initiators',
    AMINE_FGS_ZONE.detectors.every((d) => byTag(d.votesInto)),
    AMINE_FGS_ZONE.detectors.filter((d) => !byTag(d.votesInto)).map((d) => d.votesInto).join(' '))

  // --- Source-fidelity conflicts are flagged, not hidden -------------------
  const dupes = Object.entries(
    ALL_EFFECTS.reduce((acc, n) => { (acc[EFFECTS[n].tag] ??= []).push(n); return acc }, {}),
  ).filter(([, ns]) => ns.length > 1)
  check('any duplicate effect tag carries an explanatory note',
    dupes.every(([, ns]) => ns.every((n) => EFFECTS[n].note)),
    dupes.map(([t, ns]) => `${t}:${ns}`).join(' '))
  console.log(`        duplicate effect tags: ${dupes.map(([t, ns]) => `${t} (${ns.join(',')})`).join('; ') || 'none'}`)
}

await verify('synthetic', await loadDataset('synthetic'))

if (existsSync(resolve(realDir, 'effects.real.js'))) {
  await verify('project', await loadDataset('project'))
} else {
  console.log('\n=== project dataset ===\n  (not present — synthetic only)')
}

console.log(fail ? `\n${fail} FAILURE(S)\n` : '\nAll checks passed\n')
process.exit(fail ? 1 : 0)
