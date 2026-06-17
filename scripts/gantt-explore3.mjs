import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const EMAIL = 'mikolaj.marcinkowski@businessweb.pl'
const PASS = '8bTgMFdGq4yvF6LAukSV3Vuq'
const DIR = '/tmp/gantt'
mkdirSync(DIR, { recursive: true })

const KAUFLAND_DEMO = '/projects/f7b9b178-e246-4f19-b88b-a97341a4f70e'
const ERP_OVERDUE = '/projects/f418509d-b334-4172-a5a8-7866b37dc58c'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

// Login
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.fill('#email', EMAIL)
await page.fill('#password', PASS)
await page.getByRole('button', { name: /Zaloguj/i }).click()
await page.waitForURL(/\/dashboard/, { timeout: 15000 })
console.log('✅ zalogowano')

// === Po "Rozwiń wszystko" sprawdź interaktywne elementy ===
console.log('\n=== PO ROZWINIĘCIU WSZYSTKIEGO ===')
await page.goto(BASE + KAUFLAND_DEMO, { waitUntil: 'networkidle' })
await page.getByRole('tab', { name: /Harmonogram/i }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: /Rozwiń wszystko/i }).click()
await page.waitForTimeout(600)

const statusBtns = await page.$$('button[aria-label="Zmień status zadania"]')
console.log('Przyciski statusu (po rozwinięciu):', statusBtns.length)

const ownBtns = await page.$$('button[aria-label*="Zmień osobę"], button[aria-label*="Przypisz osobę"]')
console.log('Przyciski Own (po rozwinięciu):', ownBtns.length)

const dateBtns = await page.$$('button[aria-label*="Termin"], button[aria-label*="Ustaw termin"]')
console.log('Przyciski dat (po rozwinięciu):', dateBtns.length)

// Sprawdź statusy zadań - ile jest done, in_progress itp.
const statusLabels = await page.$$eval('button[aria-label="Zmień status zadania"]', btns => 
  btns.map(b => b.textContent?.trim())
)
const statusCount = statusLabels.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {})
console.log('Rozkład statusów:', JSON.stringify(statusCount))

// Zrób screenshot po rozwinięciu (viewport)
await page.screenshot({ path: `${DIR}/20-harmonogram-rozwiniety-viewport.png` })
// Zrób fullpage
await page.screenshot({ path: `${DIR}/21-harmonogram-rozwiniety-fullpage.png`, fullPage: true })

// === Sprawdź co widać w kolumnie Own ===
const ownValues = await page.$$eval('button[aria-label*="Zmień osobę"], button[aria-label*="Przypisz osobę"]', btns => 
  btns.map(b => ({ label: b.getAttribute('aria-label'), title: b.getAttribute('title'), text: b.textContent?.trim() }))
)
console.log('\nOwn buttons details (10):', JSON.stringify(ownValues.slice(0, 10)))

// Zlicz unikalne osoby
const assignees = ownValues.map(b => b.title).filter(t => t && t !== 'Brak osoby')
const uniqueAssignees = [...new Set(assignees)]
console.log('Unikalne osoby:', JSON.stringify(uniqueAssignees))
console.log('Zadania bez osoby:', ownValues.filter(b => b.title === 'Brak osoby' || !b.title).length)

// === Sprawdź daty / terminy ===
const dateDetails = await page.$$eval('button[aria-label*="Termin"], button[aria-label*="Ustaw termin"]', btns =>
  btns.map(b => ({ label: b.getAttribute('aria-label'), text: b.textContent?.trim() }))
)
console.log('\nDaty/terminy (pierwsze 10):', JSON.stringify(dateDetails.slice(0, 10)))

// Ile zadań ma termin, ile nie
const withDate = dateDetails.filter(d => d.label?.includes('Termin:')).length
const withoutDate = dateDetails.filter(d => d.label?.includes('Ustaw termin')).length
console.log(`Zadania z terminem: ${withDate}, bez terminu: ${withoutDate}`)

// Sprawdź zadania "po terminie" - kolory
const overdueItems2 = await page.$$eval('[role="row"]', rows => {
  return rows.filter(r => {
    const statusCell = r.querySelector('[role="cell"]:last-child')
    const text = statusCell?.innerHTML || ''
    return text.includes('status-off') || text.includes('overdue')
  }).map(r => ({
    label: r.getAttribute('aria-label'),
    hasRedDate: r.innerHTML.includes('status-off')
  }))
}).catch(() => [])
console.log('\nZadania z czerwoną datą:', JSON.stringify(overdueItems2.slice(0,5)))

// === Kliknij status → Gotowe i sprawdź co się dzieje ===
console.log('\n=== TEST ZMIANY STATUSU ===')
const firstStatusBtn = statusBtns[0]
if (firstStatusBtn) {
  const currentStatus = await firstStatusBtn.textContent()
  console.log('Aktualny status pierwszego zadania:', currentStatus?.trim())
  
  await firstStatusBtn.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${DIR}/22-status-menu-open.png` })
  
  // Sprawdź opcje
  const menuItems = await page.$$eval('[role="option"]', items => items.map(i => i.textContent?.trim()))
  console.log('Opcje menu statusu:', JSON.stringify(menuItems))
  
  // Kliknij "Gotowe"
  const doneOption = page.locator('[role="option"]').filter({ hasText: /Gotowe/i })
  if (await doneOption.count() > 0) {
    await doneOption.first().click()
    await page.waitForTimeout(1000) // Czekaj na refresh
    await page.screenshot({ path: `${DIR}/23-po-zmianie-na-gotowe.png` })
    console.log('✅ zmieniono na Gotowe')
    
    // Sprawdź czy pojawił się completionDate
    const completionDates = await page.$$eval('span[title*="Ukończono"]', spans => 
      spans.map(s => s.textContent?.trim() + ' | ' + s.getAttribute('title'))
    )
    console.log('Daty ukończenia widoczne:', JSON.stringify(completionDates))
    
    // Sprawdź czy jest jakiś celebration / konfetti / toast
    const toasts = await page.$$('[role="status"], [aria-live], .toast, [class*="toast"], [class*="notification"]')
    console.log('Toasty/notyfikacje:', toasts.length)
    
    // Sprawdź podliczenie "Zadania ukończone X/Y"
    const progressInfo = await page.$('[class*="progress"], [role="progressbar"]')
    console.log('Progress bar:', progressInfo ? 'TAK' : 'NIE')
  }
  
  // Zamknij jeśli otwarte
  await page.keyboard.press('Escape')
}

// === Sprawdź ERP po terminie pełne ===
console.log('\n=== ERP PO TERMINIE — szczegóły ===')
await page.goto(BASE + ERP_OVERDUE, { waitUntil: 'networkidle' })
await page.getByRole('tab', { name: /Harmonogram/i }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: /Rozwiń wszystko/i }).click()
await page.waitForTimeout(600)

await page.screenshot({ path: `${DIR}/30-erp-harmonogram.png`, fullPage: true })

// Sprawdź kolor karty "Po terminie"
const statsCards2 = await page.$$('[role="region"][aria-label="Statystyki harmonogramu"] > div')
for (const card of statsCards2) {
  const text = await card.innerText()
  const classes = await card.getAttribute('class')
  console.log('Karta:', text.replace(/\n/g, ' ').trim(), '| klasy:', classes?.slice(0,100))
}

// Sprawdź paski Gantt po terminie - czy są czerwone
const overdueBarRows = await page.$$eval('[role="row"]', rows => {
  return rows
    .filter(r => !r.getAttribute('aria-label')?.includes('Faza:') && !r.getAttribute('aria-label')?.includes('Kamień'))
    .map(r => {
      const lastCell = r.querySelector('[role="cell"]:last-child')
      const hasOverdueDate = lastCell?.innerHTML?.includes('status-off') || false
      const taskName = r.getAttribute('aria-label')
      return hasOverdueDate ? taskName : null
    })
    .filter(Boolean)
})
console.log('Zadania po terminie (czerwona data):', JSON.stringify(overdueBarRows))

// === Sprawdź mapę klocków szczegółowo ===
console.log('\n=== MAPA KLOCKÓW — szczegóły ===')
await page.goto(BASE + KAUFLAND_DEMO, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

// PhaseStrip — ile klocków done, aktywna
const phaseBlocksData = await page.$$eval('button[aria-label*="Faza"]', btns => 
  btns.map(b => ({
    label: b.getAttribute('aria-label'),
    hasTuJestes: b.innerHTML.includes('TU JESTEŚ'),
    isDone: b.getAttribute('aria-label')?.includes('ukończona') || false,
    isActive: b.getAttribute('aria-label')?.includes('aktywna') || false,
  }))
)
console.log('Klocki faz:', JSON.stringify(phaseBlocksData))

// Czy ParallelView ma klikowalne elementy?
const parallelCols = await page.$$('[aria-label="Równoległe fazy projektu"] > div')
console.log('Kolumny ParallelView:', parallelCols.length)

// Sprawdź czy progress zadań w ParallelView
const parallelText = await page.$('[aria-label="Równoległe fazy projektu"]')
const pvContent = await parallelText?.innerText()
console.log('ParallelView content:', pvContent?.replace(/\s+/g, ' ').trim())

// Sprawdź czy można z ParallelView przejść do harmonogramu
const pvButtons = await page.$$('[aria-label="Równoległe fazy projektu"] button')
console.log('Przyciski w ParallelView:', pvButtons.length)

await page.screenshot({ path: `${DIR}/40-mapa-full.png`, fullPage: true })

// === Sprawdź decyzje (diamentem) ===
const decisionDiamonds = await page.$$('button[aria-label*="oczekuje"], button[aria-label*="robimy"], button[aria-label*="pomijamy"]')
console.log('Diamenty decyzji:', decisionDiamonds.length)
if (decisionDiamonds.length > 0) {
  const decLabels = await Promise.all(decisionDiamonds.map(d => d.getAttribute('aria-label')))
  console.log('Decyzje:', JSON.stringify(decLabels))
  
  // Kliknij decyzję - co się dzieje?
  await decisionDiamonds[0].click()
  await page.waitForTimeout(400)
  const activeTab2 = await page.locator('[role="tab"][aria-selected="true"]').textContent()
  console.log('Po kliknięciu decyzji aktywna zakładka:', activeTab2)
}

await browser.close()
console.log('\nGotowe. Screenshoty: /tmp/gantt/')
