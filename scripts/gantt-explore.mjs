import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const EMAIL = 'mikolaj.marcinkowski@businessweb.pl'
const PASS = '8bTgMFdGq4yvF6LAukSV3Vuq'
const DIR = '/tmp/gantt'
mkdirSync(DIR, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 300)))

// Login
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.fill('#email', EMAIL)
await page.fill('#password', PASS)
await page.getByRole('button', { name: /Zaloguj/i }).click()
await page.waitForURL(/\/dashboard/, { timeout: 15000 })
console.log('✅ zalogowano')

// Idź do listy projektów
await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
await page.screenshot({ path: `${DIR}/01-projekty.png`, fullPage: true })

// Znajdź link do pierwszego projektu
const projectLinks = await page.$$eval('a[href*="/projects/"]', els => els.map(el => ({ href: el.href, text: el.textContent?.trim() })))
console.log('Projekty znalezione:', JSON.stringify(projectLinks.slice(0,5)))

// Przejdź do pierwszego projektu
if (projectLinks.length > 0) {
  await page.goto(projectLinks[0].href, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${DIR}/02-projekt-mapa.png`, fullPage: true })
  console.log('✅ widok projektu - Mapa klocków')

  // Kliknij zakładkę Harmonogram
  const harmonogramTab = page.getByRole('tab', { name: /Harmonogram/i })
  if (await harmonogramTab.isVisible()) {
    await harmonogramTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/03-harmonogram.png`, fullPage: true })
    console.log('✅ zakładka Harmonogram')

    // Sprawdź statystyki
    const statsText = await page.locator('[role="region"][aria-label="Statystyki harmonogramu"]').textContent().catch(() => 'brak')
    console.log('Statystyki:', statsText?.replace(/\s+/g, ' ').trim().slice(0, 200))

    // Sprawdź nagłówki kolumn
    const headers = await page.$$eval('[role="columnheader"]', els => els.map(el => el.textContent?.trim()).filter(Boolean))
    console.log('Nagłówki:', JSON.stringify(headers))

    // Sprawdź ile wierszy z zadaniami
    const taskRows = await page.$$('[role="row"][aria-label]')
    console.log('Liczba wierszy z aria-label:', taskRows.length)

    // Sprawdź przyciski kontroli
    const btns = await page.$$eval('button[type="button"]', els => els.map(el => el.textContent?.trim()).filter(Boolean))
    console.log('Przyciski widoczne:', JSON.stringify(btns.slice(0,20)))

    // Sprawdź czy jest filter/search
    const searchInput = await page.$('input[type="search"], input[placeholder*="szukaj"], input[placeholder*="Szukaj"], input[placeholder*="filtr"]')
    console.log('Pole search/filter:', searchInput ? 'TAK' : 'NIE')

    // Sprawdź statystyki ukończonych zadań
    const doneCount = await page.$$eval('[role="row"]', rows => {
      return rows.filter(r => {
        const statusCell = r.querySelector('[role="cell"]:last-child')
        return statusCell?.textContent?.includes('Gotowe')
      }).length
    })
    console.log('Wiersze ze statusem Gotowe widoczne:', doneCount)

    // Scroll do dołu i screenshot
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${DIR}/04-harmonogram-bottom.png`, fullPage: true })

    // Sprawdź czy kolumna Own pokazuje imiona
    const ownCells = await page.$$eval('[role="cell"]', cells => {
      return cells
        .filter(c => c.querySelector('button[aria-label*="Zmień osobę"], button[aria-label*="Przypisz"]'))
        .map(c => {
          const btn = c.querySelector('button')
          return btn?.textContent?.trim() || btn?.title || '?'
        })
        .slice(0, 10)
    })
    console.log('Komórki Own (inicjały):', JSON.stringify(ownCells))

  }

  // Wróć do Mapy klocków
  await page.goto(projectLinks[0].href, { waitUntil: 'networkidle' })
  
  // Kliknij klocek fazy
  const phaseBlock = await page.$('button[aria-label*="Faza"]')
  if (phaseBlock) {
    const phaseLabel = await phaseBlock.getAttribute('aria-label')
    console.log('Pierwszy klocek fazy:', phaseLabel)
    await phaseBlock.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/05-po-kliknieciu-klocka.png`, fullPage: true })
    console.log('✅ kliknięto klocek - przełączyło na Harmonogram?', page.url())
  }

  // Sprawdź ParallelView
  await page.goto(projectLinks[0].href, { waitUntil: 'networkidle' })
  const parallelView = await page.$('[aria-label="Równoległe fazy projektu"]')
  if (parallelView) {
    const pvText = await parallelView.textContent()
    console.log('ParallelView treść:', pvText?.replace(/\s+/g, ' ').trim().slice(0, 300))
    await page.screenshot({ path: `${DIR}/06-parallel-view.png`, fullPage: true })
  } else {
    console.log('ParallelView: NIE ZNALEZIONO')
  }
}

// Sprawdź czy jest jakiś projekt z większą liczbą zadań
await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
const allLinks = await page.$$eval('a[href*="/projects/"]', els => els.map(el => ({ href: el.href, text: el.textContent?.trim() })))
console.log('Wszystkie projekty:', JSON.stringify(allLinks))

await browser.close()
console.log('\n=== CONSOLE ERRORS ===')
if (consoleErrors.length === 0) console.log('Brak błędów')
else consoleErrors.forEach(e => console.log(e))
