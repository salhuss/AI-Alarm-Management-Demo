import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Keep the real plant data out of production bundles.
 *
 * src/plant/index.js picks up the gitignored real/*.real.js overlay through
 * import.meta.glob. That glob is a compile-time transform: Vite rewrites it
 * into static imports against whatever is on disk, before any runtime
 * `import.meta.env.DEV` check can prevent it. So a production build run from
 * a working copy that has the overlay — which is every deploy from this
 * machine — inlined the real tags into the bundle.
 *
 * The leak audit only inspects git-tracked files, and the overlay is
 * correctly untracked, so it passed while the build embedded the data. This
 * plugin closes that gap at the bundler level: during `vite build` the
 * overlay modules resolve to an empty module, so the loader finds nothing
 * and falls back to the synthetic dataset. `npm run dev` is untouched.
 */
const excludeRealDataFromBuild = () => ({
  name: 'exclude-real-plant-data',
  apply: 'build',
  enforce: 'pre',
  resolveId(source) {
    if (source.includes('.real.js')) return '\0empty-real-data'
    return null
  },
  load(id) {
    if (id === '\0empty-real-data') return 'export default {}'
    return null
  },
})

export default defineConfig({
  plugins: [react(), excludeRealDataFromBuild()],
  base: '/AI-Alarm-Management-Demo/',
})
