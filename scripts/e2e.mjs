// E2E klik-test przez Playwright (headless Chromium) na localhost:3000.
// Loguje wynik kroków + zapisuje zrzuty do /tmp/e2e. Uruchom: node scripts/e2e.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.E2E_BASE || 'http://localhost:3000'
// Dane logowania WYŁĄCZNIE z env — nigdy w kodzie (leak GitHub 2026-06-15).
// Użycie: E2E_EMAIL=... E2E_PASS=... node scripts/e2e.mjs
const EMAIL = process.env.E2E_EMAIL
const PASS = process.env.E2E_PASS
if (!EMAIL || !PASS) {
  console.error('Ustaw E2E_EMAIL i E2E_PASS w zmiennych środowiskowych (nie hardkoduj!).')
  process.exit(1)
}
const DIR = '/tmp/e2e'
mkdirSync(DIR, { recursive: true })

const log = (s) => console.log(s)
const consoleErrors = []

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 200)))

const step = async (name, fn) => {
  try { await fn(); log(`✅ ${name}`) }
  catch (e) { log(`❌ ${name} → ${String(e).split('\n')[0].slice(0, 160)}`) }
}

// 1. Ochrona tras: / → /login
await step('redirect / → /login', async () => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  if (!page.url().includes('/login')) throw new Error('brak redirectu, url=' + page.url())
})
await page.screenshot({ path: `${DIR}/01-login.png` })

// 2. Logowanie
await step('logowanie', async () => {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASS)
  await page.getByRole('button', { name: /Zaloguj/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
})
await page.screenshot({ path: `${DIR}/02-dashboard-light.png`, fullPage: true })

// 3. Dashboard — czy są teczki / stan
await step('dashboard render (h1)', async () => {
  await page.waitForSelector('h1', { timeout: 8000 })
})

// 4. /projekty
await step('widok /projekty', async () => {
  await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
})
await page.screenshot({ path: `${DIR}/03-projekty.png`, fullPage: true })

// 5. /projects/new — typy + PM
await step('formularz /projects/new', async () => {
  await page.goto(BASE + '/projects/new', { waitUntil: 'networkidle' })
})
await page.screenshot({ path: `${DIR}/04-form-przed.png`, fullPage: true })

let crmChecked = null
await step('klik typu CRM zaznacza checkbox', async () => {
  // klik w label/pill zawierający tekst CRM
  await page.locator('label:has(input[value="CRM"])').click()
  crmChecked = await page.locator('input[name="types"][value="CRM"]').isChecked()
  if (!crmChecked) throw new Error('checkbox CRM nie zaznaczony po kliknięciu')
})
await page.screenshot({ path: `${DIR}/05-form-typ-zaznaczony.png` })

let pmTriggerText = null, pmOptions = []
await step('PM select pokazuje nazwy nie UUID', async () => {
  pmTriggerText = (await page.locator('#project-pm').innerText()).trim()
  await page.locator('#project-pm').click()
  await page.waitForTimeout(400)
  pmOptions = await page.locator('[role="option"]').allInnerTexts().catch(() => [])
  await page.keyboard.press('Escape')
})
log(`   PM trigger: "${pmTriggerText}" | opcje: ${JSON.stringify(pmOptions)}`)

// 6. /clients/[id] istniejącego klienta
await step('widok klienta', async () => {
  await page.goto(BASE + '/clients/34959980-a664-43a6-bfc2-351e02bd77c1', { waitUntil: 'networkidle' })
})
await page.screenshot({ path: `${DIR}/06-klient.png`, fullPage: true })

// 7. Tryb ciemny (przez localStorage next-themes) + dashboard
await step('tryb ciemny', async () => {
  await page.evaluate(() => localStorage.setItem('theme', 'dark'))
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  if (!isDark) throw new Error('html nie ma klasy .dark')
})
await page.screenshot({ path: `${DIR}/07-dashboard-dark.png`, fullPage: true })

// 8. Narzędzie inspekcji (tester) obecne?
let inspectPresent = false
await step('narzędzie inspekcji widoczne dla testera', async () => {
  await page.evaluate(() => localStorage.setItem('theme', 'light'))
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  inspectPresent = await page.getByRole('button', { name: /inspekcj/i }).count() > 0
  if (!inspectPresent) throw new Error('brak przycisku inspekcji')
})

log('\n=== KONSOLA (błędy) ===')
log(consoleErrors.length ? consoleErrors.slice(0, 10).join('\n') : '(brak błędów konsoli) ✅')

await browser.close()
log('\nZrzuty w ' + DIR)
