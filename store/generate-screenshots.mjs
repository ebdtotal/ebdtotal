import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const preview = path.join(root, 'store', 'preview')
fs.copyFileSync(path.join(root, 'public', 'logo.png'), path.join(preview, 'logo.png'))
const outDir = path.join(root, 'store', 'screenshots', 'pt-BR')
fs.mkdirSync(outDir, { recursive: true })

const edgeCandidates = [
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
]
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || edgeCandidates.find((p) => fs.existsSync(p))
if (!executablePath) {
  throw new Error('Navegador Chromium/Edge não encontrado para gerar as capturas.')
}

const shots = [
  ['01-login.html', '01-login.png'],
  ['02-chamada.html', '02-chamada.png'],
  ['03-licao.html', '03-licao.png'],
  ['04-ranking.html', '04-ranking.png'],
]

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--hide-scrollbars', '--allow-file-access-from-files'],
})
const page = await browser.newPage()
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 3 })
for (const [html, png] of shots) {
  const file = pathToFileURL(path.join(preview, html)).href
  await page.goto(file, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.screenshot({ path: path.join(outDir, png), type: 'png', clip: { x: 0, y: 0, width: 430, height: 932 } })
  console.log('gerou', png)
}
await browser.close()
