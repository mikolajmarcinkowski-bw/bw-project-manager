import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const EMAIL = 'mikolaj.marcinkowski@businessweb.pl'
const PASS = '8bTgMFdGq4yvF6LAukSV3Vuq'
const DIR = '/tmp/gantt'
mkdirSync(DIR, { recursive: true })

// Projekty z danymi do badania
const KAUFLAND_DEMO = '/projects/f7b9b178-e246-4f19-b88b-a97341a4f70e'
const KAUFLAND_SPO = '/projects/d42470ac-f058-41c6-be0c-bdf17449d65d'
const ERP_OVERDUE = '/projects/f418509d-b334-4172-a5a8-7866b37dc58c'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })

// Login
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.fill('#email', EMAIL)
await page.fill('#password', PASS)
await page.getByRole('button', { name: /Zaloguj/i }).click()
await page.waitForURL(/\/dashboard/, { timeout: 15000 })
console.log('✅ zalogowano')

// === TEST 1: Projekt Kaufland DEMO (największy Gantt) ===
await page.goto(BASE + KAUFLAND_DEMO, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${DIR}/10-kaufland-demo-mapa.png`, fullPage: true })
console.log('\n=== KAUFLAND DEMO ===')

// Sprawdź PhaseStrip
const phaseBlocks = await page.$$('button[aria-label*="Faza"]')
console.log('Klocki faz w strip:', phaseBlocks.length)
if (phaseBlocks.length > 0) {
  const labels = await Promise.all(phaseBlocks.map(b => b.getAttribute('aria-label')))
  console.log('Etykiety klocków:', JSON.stringify(labels))
}

// Sprawdź ParallelView
const parallelSection = await page.$('[aria-label="Równoległe fazy projektu"]')
if (parallelSection) {
  const pvText = await parallelSection.innerText()
  console.log('ParallelView:', pvText.replace(/\s+/g, ' ').trim().slice(0, 400))
} else {
  console.log('ParallelView: BRAK')
}

// Kliknij klocek fazy → sprawdź czy przeskakuje do Harmonogramu
if (phaseBlocks.length > 0) {
  await phaseBlocks[0].click()
  await page.waitForTimeout(600)
  const activeTab = await page.$('[role="tab"][aria-selected="true"]')
  const activeTabText = await activeTab?.textContent()
  console.log('Po kliknięciu klocka aktywna zakładka:', activeTabText)
  await page.screenshot({ path: `${DIR}/11-po-kliknieciu-klocka.png`, fullPage: true })
}

// Przejdź do Harmonogramu
await page.goto(BASE + KAUFLAND_DEMO, { waitUntil: 'networkidle' })
const harmonogramTab = page.getByRole('tab', { name: /Harmonogram/i })
await harmonogramTab.click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${DIR}/12-harmonogram-full.png`, fullPage: true })
console.log('\n=== HARMONOGRAM ===')

// Ile faz i zadań
const phaseRows = await page.$$('[role="row"][aria-label*="Faza:"]')
console.log('Wiersze faz:', phaseRows.length)
const taskRows = await page.$$('[role="row"][aria-label]:not([aria-label*="Faza:"]):not([aria-label*="Kamień"])')
console.log('Wiersze zadań:', taskRows.length)

// Statystyki
const statsCards = await page.$$eval('[role="region"][aria-label="Statystyki harmonogramu"] > div', divs => 
  divs.map(d => ({ label: d.querySelector('.text-\\[0\\.625rem\\]')?.textContent, value: d.querySelector('.text-\\[1\\.5rem\\]')?.textContent }))
)
console.log('Karty statystyk:', JSON.stringify(statsCards))

// Sprawdź czy jest jakiś progress bar fazy
const progressBars = await page.$$('[role="progressbar"]')
console.log('Progress bary:', progressBars.length)

// Sprawdź kolumnę OWN
const ownButtons = await page.$$eval('button[aria-label*="Zmień osobę"], button[aria-label*="Przypisz osobę"]', btns =>
  btns.map(b => ({ label: b.getAttribute('aria-label'), text: b.textContent?.trim() }))
)
console.log('Przyciski Own (pierwsze 8):', JSON.stringify(ownButtons.slice(0,8)))

// Sprawdź czy istnieje FILTR / SEARCH
const filterElements = await page.$$('input[placeholder*="szukaj"], input[placeholder*="Szukaj"], input[placeholder*="filtr"], select[aria-label*="filtr"], button[aria-label*="filtr"], button[aria-label*="Filtruj"]')
console.log('Elementy filtrów:', filterElements.length)

// Sprawdź kontrolkę daty
const dateControls = await page.$$('button[aria-label*="Termin"], button[aria-label*="Ustaw termin"]')
console.log('Kontrolki daty:', dateControls.length)
if (dateControls.length > 0) {
  const dateLabels = await Promise.all(dateControls.slice(0,5).map(b => b.getAttribute('aria-label')))
  console.log('Etykiety dat (pierwsze 5):', JSON.stringify(dateLabels))
}

// Sprawdź widoczność overdueCount
const overdueCard = await page.$('[role="region"][aria-label="Statystyki harmonogramu"]')
const overdueText = await overdueCard?.innerText()
console.log('Statystyki tekst:', overdueText?.replace(/\s+/g, ' ').trim().slice(0, 200))

// Kliknij status zadania i sprawdź dropdown
const statusBtns = await page.$$('button[aria-label="Zmień status zadania"]')
console.log('Przyciski statusu:', statusBtns.length)
if (statusBtns.length > 0) {
  await statusBtns[0].click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${DIR}/13-status-dropdown.png` })
  
  // Sprawdź opcje dropdown
  const statusOptions = await page.$$eval('[role="option"], [data-radix-select-item], li', opts => 
    opts.map(o => o.textContent?.trim()).filter(t => t && t.length > 0)
  )
  console.log('Opcje statusu:', JSON.stringify(statusOptions.slice(0,10)))
  
  // Zamknij dropdown
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

// Kliknij datę
if (dateControls.length > 0) {
  await dateControls[0].click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${DIR}/14-date-dialog.png` })
  
  const dialogTitle = await page.$('[role="dialog"] h2, [role="dialog"] [data-slot="dialog-title"]')
  const dialogText = await dialogTitle?.textContent()
  console.log('Dialog daty tytuł:', dialogText)
  
  // Sprawdź czy jest wymagane słowo "change"
  const confirmLabel = await page.$('label[for="task-date-confirm"]')
  const confirmText = await confirmLabel?.textContent()
  console.log('Label potwierdzenia:', confirmText?.replace(/\s+/g, ' ').trim())
  
  await page.keyboard.press('Escape')
}

// === TEST 2: Projekt ERP po terminie ===
console.log('\n=== ERP PO TERMINIE ===')
await page.goto(BASE + ERP_OVERDUE, { waitUntil: 'networkidle' })
const harmonogramTab2 = page.getByRole('tab', { name: /Harmonogram/i })
await harmonogramTab2.click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${DIR}/15-erp-overdue-harmonogram.png`, fullPage: true })

const overdueRow = await page.$$('[role="row"]')
console.log('Wiersze tabeli ERP:', overdueRow.length)

// Sprawdź flagi "po terminie"
const overdueItems = await page.$$eval('[role="row"]', rows => {
  return rows.filter(r => {
    const text = r.textContent || ''
    return text.includes('overdue') || r.querySelector('[class*="status-off"]') !== null
  }).map(r => r.getAttribute('aria-label') || r.textContent?.trim().slice(0,80))
})
console.log('Wiersze z "po terminie" sygnałem:', JSON.stringify(overdueItems.slice(0,5)))

// Sprawdź karta "Po terminie" wartość
const statsSection = await page.$('[role="region"][aria-label="Statystyki harmonogramu"]')
const statsFullText = await statsSection?.innerText()
console.log('Statystyki ERP:', statsFullText?.replace(/\s+/g, ' ').trim().slice(0, 300))

// === TEST 3: Sprawdź czy search/breadcrumbs są ===
console.log('\n=== NAWIGACJA ===')
await page.goto(BASE + KAUFLAND_DEMO, { waitUntil: 'networkidle' })
const breadcrumb = await page.$('nav[aria-label="Nawigacja"]')
const breadcrumbText = await breadcrumb?.innerText()
console.log('Breadcrumb:', breadcrumbText?.replace(/\s+/g, ' ').trim())

// Sprawdź topbar
const topbar = await page.$('header, [role="banner"]')
const topbarText = await topbar?.innerText()
console.log('Topbar tekst:', topbarText?.replace(/\s+/g, ' ').trim().slice(0, 200))

// Sprawdź sidebar
const sidebar = await page.$('nav[aria-label], aside')
const sidebarLinks = await page.$$eval('nav a, aside a', els => els.map(el => ({ href: el.href, text: el.textContent?.trim() })))
console.log('Linki nawigacji:', JSON.stringify(sidebarLinks.slice(0,10)))

// Scroll do Harmonogramu z dużą liczbą faz i sprawdź scroll do aktywnej fazy
await page.getByRole('tab', { name: /Harmonogram/i }).click()
await page.waitForTimeout(600)
const expandAllBtn = page.getByRole('button', { name: /Rozwiń wszystko/i })
if (await expandAllBtn.isVisible()) {
  await expandAllBtn.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${DIR}/16-harmonogram-rozwiniety.png`, fullPage: true })
  console.log('✅ Rozwiń wszystko działa')
}

await browser.close()

console.log('\n=== CONSOLE ERRORS ===')
if (consoleErrors.length === 0) console.log('Brak błędów')
else consoleErrors.forEach(e => console.log(e))

console.log('\nZrzuty zapisane w /tmp/gantt/')
