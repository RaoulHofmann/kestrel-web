import { cp, mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PUBLIC_DIR = '.output/public'

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await exists(PUBLIC_DIR))) {
    console.error(`[prepare-pages] ${PUBLIC_DIR} not found — run "nuxt generate" first.`)
    process.exit(1)
  }

  await mkdir(PUBLIC_DIR, { recursive: true })
  await writeFile(join(PUBLIC_DIR, '.nojekyll'), '')

  // GitHub Pages serves 404.html for unknown paths. Nuxt emits 200.html as the
  // SPA fallback; mirror it so deep links like /dashboard resolve.
  const fallback = (await exists(join(PUBLIC_DIR, '200.html')))
    ? '200.html'
    : (await exists(join(PUBLIC_DIR, 'index.html')))
      ? 'index.html'
      : null

  if (fallback) {
    await cp(join(PUBLIC_DIR, fallback), join(PUBLIC_DIR, '404.html'))
    console.log(`[prepare-pages] wrote .nojekyll and 404.html (from ${fallback}).`)
  } else {
    console.warn('[prepare-pages] no SPA fallback found; deep links may 404.')
  }
}

main()
