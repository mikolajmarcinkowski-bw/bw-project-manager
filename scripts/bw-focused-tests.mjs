// BW - Focused tests: potwierdzenie konkretnych bugów
// 1. Dropdown W w RAID modal — czy zamyka się po wyborze?
// 2. "open" vs "Otwarte" w RAID modal Status
// 3. RAID save z P=3, W=5 → score=15, RAG=R
// 4. Zakładki po zamknięciu modala
// 5. Zakładka Budżet — rzeczywisty wygląd
// 6. Zakładka KPI — rzeczywisty wygląd
// 7. Diamenciki w projekcie Kaufland (inny projekt)

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const DIR = '/tmp/bw-focused'
mkdirSync(DIR, { recursive: true })

const consoleErrors = []
const log = (...a) => console.log(...a)

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 300)))

// ─── LOGIN ─────────────────────────────────────────────────────────────────
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.locator('button').filter({ hasText: /wejdź jako admin/i }).first().click()
await page.waitForURL(/\/dashboard/, { timeout: 15000 })
log('Zalogowano jako Admin')

// ─── Użyj bezpośrednio projektu znalezionego w pierwszym teście ─────────────
// Z poprzedniego testu wiemy że ten projekt istnieje: /projects/d42470ac-f058-41c6-be0c-bdf17449d65d
const KNOWN_PROJECT = '/projects/d42470ac-f058-41c6-be0c-bdf17449d65d'
log('Projekt: ' + KNOWN_PROJECT)
await page.goto(BASE + KNOWN_PROJECT, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
// Jeśli redirect lub 404, spróbuj z dashboardu
const currentUrl = page.url()
if (!currentUrl.includes('/projects/')) {
  // Fallback — wejdź do dashboard i kliknij dowolny projekt
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const projLink = page.locator('a[href*="/projects/"]:not([href*="/new"])').first()
  const href = await projLink.getAttribute('href').catch(() => null)
  if (href) {
    await page.goto(BASE + href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
  }
}
log('Załadowano projekt: ' + page.url())
await page.screenshot({ path: `${DIR}/01-projekt-start.png`, fullPage: false })

// ─── TEST 1: Zakładki bez modala — KPI ──────────────────────────────────────
log('\n--- TEST 1: Zakładka KPI bez modala ---')
const kpiTab = page.locator('button, [role="tab"]').filter({ hasText: /^KPI$/ }).first()
await kpiTab.click()
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/02-kpi-tab.png`, fullPage: true })
const kpiContent = await page.evaluate(() => document.body.innerText)
log('KPI page text (200 chars):', kpiContent.slice(0, 200))

// ─── TEST 2: Zakładka Budżet ─────────────────────────────────────────────
log('\n--- TEST 2: Zakładka Budżet ---')
const budzetTab = page.locator('button, [role="tab"]').filter({ hasText: /budżet/i }).first()
await budzetTab.click()
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/03-budzet-tab.png`, fullPage: true })
const budzetContent = await page.evaluate(() => document.body.innerText)
log('Budżet page text (200 chars):', budzetContent.slice(0, 200))

// ─── TEST 3: RAID modal — zamknięcie dropdown W ──────────────────────────
log('\n--- TEST 3: RAID modal — dropdown W zamknięcie ---')
const raidTab = page.locator('button, [role="tab"]').filter({ hasText: /^RAID$/ }).first()
await raidTab.click()
await page.waitForTimeout(800)

const addBtn = page.locator('button').filter({ hasText: /dodaj ryzyko/i }).first()
await addBtn.click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${DIR}/04a-modal-open.png` })

// Wpisz opis
await page.locator('textarea[id="risk-desc"]').fill('Test P3W5 Score15')

// Klik P (prawdopodobieństwo) = trigger idx 1
const triggers = page.locator('button[role="combobox"]')
const tCnt = await triggers.count()
log(`Liczba triggers w modalu: ${tCnt}`)

// Otwórz P dropdown
log('Otwieranie dropdown P (idx=1)...')
await triggers.nth(1).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${DIR}/04b-p-dropdown-open.png` })

// Wybierz opcję 3 (Możliwe) — sprawdź czy dropdown zawiera PROB_LABELS
const pOpts = await page.locator('[role="option"]').allInnerTexts()
log('Opcje P dropdown:', pOpts)

// Wybierz "3 – Możliwe" lub trzecią opcję
const p3Opt = page.locator('[role="option"]').filter({ hasText: /możliwe|prawdopodobn/i }).first()
const p3OptAlt = page.locator('[role="option"]').nth(2)
if (await p3Opt.count() > 0) {
  await p3Opt.click()
  log('Wybrano opcję P: Możliwe (lub podobną)')
} else {
  await p3OptAlt.click()
  log('Wybrano opcję P: nth(2)')
}
await page.waitForTimeout(400)
await page.screenshot({ path: `${DIR}/04c-after-p-select.png` })

// Sprawdź czy dropdown P zamknął się
const openDropdowns = await page.locator('[role="listbox"], [data-state="open"][role="listbox"]').count()
log(`Otwarte dropdowny po wyborze P: ${openDropdowns}`)

// Otwórz W dropdown (idx=2 jeśli P jest idx=1, albo idx=2 = Wpływ)
log('Otwieranie dropdown W (idx=2)...')
await triggers.nth(2).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${DIR}/04d-w-dropdown-open.png` })

const wOpts = await page.locator('[role="option"]').allInnerTexts()
log('Opcje W dropdown:', wOpts)

// Wybierz 5 – Krytyczny (ostatnia opcja)
const w5Opt = page.locator('[role="option"]').filter({ hasText: /krytyczny/i }).first()
const w5OptAlt = page.locator('[role="option"]').last()
if (await w5Opt.count() > 0) {
  await w5Opt.click()
  log('Wybrano opcję W=5: Krytyczny')
} else {
  await w5OptAlt.click()
  log('Wybrano ostatnią opcję W')
}
await page.waitForTimeout(400)
await page.screenshot({ path: `${DIR}/04e-after-w-select.png` })

// Sprawdź preview P×W
const previewText = await page.evaluate(() => {
  const els = document.querySelectorAll('*')
  for (const el of els) {
    if (el.childElementCount === 0 && el.textContent.includes('P×W')) return el.textContent
  }
  return null
})
log(`Preview P×W: ${previewText}`)

// Sprawdź badge
const ragBadge = await page.evaluate(() => {
  const spans = document.querySelectorAll('span')
  for (const sp of spans) {
    if (sp.className.includes('rounded-full') && (sp.textContent.trim() === 'R' || sp.textContent.trim() === 'A' || sp.textContent.trim() === 'G')) {
      return { text: sp.textContent.trim(), cls: sp.className.slice(0, 100) }
    }
  }
  return null
})
log(`RAG badge w preview: ${JSON.stringify(ragBadge)}`)

// Sprawdź Status label w modal
const statusLabel = await page.locator('select, button[role="combobox"]').last().innerText().catch(() => '')
log(`Status field value: ${statusLabel}`)

// Sprawdź dokładny tekst pola Status — czy "open" czy "Otwarte"
const statusSelectText = await page.evaluate(() => {
  // Szukaj div/button zawierającego Status combobox
  const labels = document.querySelectorAll('label')
  for (const lbl of labels) {
    if (lbl.textContent.includes('Status')) {
      // Znajdź sąsiadujący select lub button
      const parent = lbl.parentElement
      if (parent) {
        const btn = parent.querySelector('button[role="combobox"]')
        if (btn) return { type: 'radix', text: btn.textContent.trim() }
        const sel = parent.querySelector('select')
        if (sel) return { type: 'native-select', text: sel.options[sel.selectedIndex]?.text, value: sel.value }
      }
    }
  }
  return null
})
log(`Status select: ${JSON.stringify(statusSelectText)}`)

// Wpisz właściciela
const ownerInput = page.locator('input[id="risk-owner"]').first()
if (await ownerInput.count() > 0) {
  await ownerInput.fill('Test Tester')
}
await page.screenshot({ path: `${DIR}/04f-before-save.png` })

// Zapisz
const saveBtn = page.locator('button[form="risk-form"]').first()
if (await saveBtn.count() > 0) {
  await saveBtn.click()
  await page.waitForTimeout(2000)
} else {
  // Spróbuj przez Dodaj ryzyko button type=submit
  const submitBtn = page.locator('button[type="submit"]').first()
  if (await submitBtn.count() > 0) {
    await submitBtn.click()
    await page.waitForTimeout(2000)
  }
}
await page.screenshot({ path: `${DIR}/04g-after-save.png`, fullPage: true })

// Sprawdź czy ryzyko zostało zapisane
const savedRisk = await page.locator('table td').filter({ hasText: /Test P3W5 Score15/i }).count()
log(`Ryzyko zapisane widoczne w tabeli: ${savedRisk}`)

// Sprawdź RAG badge w tabeli
if (savedRisk > 0) {
  const tableRAG = await page.evaluate(() => {
    const cells = document.querySelectorAll('td')
    for (const cell of cells) {
      const sp = cell.querySelector('span.rounded-full')
      if (sp && ['R', 'A', 'G'].includes(sp.textContent.trim())) {
        return { rag: sp.textContent.trim(), cls: sp.className.slice(0, 100) }
      }
    }
    return null
  })
  log(`RAG w tabeli: ${JSON.stringify(tableRAG)}`)

  // Sprawdź score w tabeli
  const scoreCell = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr')
    for (const row of rows) {
      const cells = row.querySelectorAll('td')
      if (cells.length >= 7) {
        // Score to kolumna P×W
        return { p: cells[4]?.textContent.trim(), w: cells[5]?.textContent.trim(), score: cells[6]?.textContent.trim() }
      }
    }
    return null
  })
  log(`Score w tabeli: ${JSON.stringify(scoreCell)}`)
}

// ─── TEST 4: Toggle statusu RAID ────────────────────────────────────────────
log('\n--- TEST 4: Toggle statusu RAID ---')
await page.screenshot({ path: `${DIR}/05a-after-save-raid.png`, fullPage: true })

// Znajdź przycisk statusu
const statusButtons = page.locator('button').filter({ hasText: /otwarte/i })
const sCnt = await statusButtons.count()
log(`Przyciski "Otwarte" w tabeli: ${sCnt}`)

if (sCnt > 0) {
  const btn = statusButtons.first()
  const before = await btn.innerText()
  log(`Status przed kliknięciem: ${before}`)
  await btn.click()
  await page.waitForTimeout(800)
  const after = await page.locator('button').filter({ hasText: /otwarte|monitorowane|zamknięte/i }).first().innerText()
  log(`Status po kliknięciu: ${after}`)
  await page.screenshot({ path: `${DIR}/05b-status-toggled.png` })
}

// ─── TEST 5: Zakładka Budżet szczegółowo ─────────────────────────────────
log('\n--- TEST 5: Zakładka Budżet szczegółowo ---')
await budzetTab.click()
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/06-budzet-full.png`, fullPage: true })

const budzetBody = await page.evaluate(() => document.body.innerText.slice(0, 500))
log('Budżet full text:', budzetBody)

// ─── TEST 6: Zakładka KPI szczegółowo ────────────────────────────────────
log('\n--- TEST 6: Zakładka KPI szczegółowo ---')
await kpiTab.click()
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/07-kpi-full.png`, fullPage: true })

const kpiBody = await page.evaluate(() => document.body.innerText.slice(0, 500))
log('KPI full text:', kpiBody)

// Kliknij "+ Dodaj KPI"
const addKpiBtn = page.locator('button').filter({ hasText: /dodaj kpi/i }).first()
if (await addKpiBtn.count() > 0) {
  await addKpiBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${DIR}/07b-kpi-modal.png` })
  // Wypełnij
  const kpiName = page.locator('input[id="kpi-name"]').first()
  if (await kpiName.count() > 0) {
    await kpiName.fill('Czas wdrożenia — test')
    const saveKpi = page.locator('button[form="kpi-form"]').first()
    if (await saveKpi.count() > 0) {
      await saveKpi.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${DIR}/07c-kpi-saved.png`, fullPage: true })
      const kpiCardVisible = await page.locator('*').filter({ hasText: /Czas wdrożenia — test/i }).count()
      log(`KPI card visible: ${kpiCardVisible}`)
    }
  }
}

// ─── TEST 7: RAID Search ─────────────────────────────────────────────────
log('\n--- TEST 7: RAID Search ---')
await raidTab.click()
await page.waitForTimeout(800)

const searchInput = page.locator('input[type="search"], input[placeholder*="opisie"]').first()
if (await searchInput.count() > 0) {
  await searchInput.fill('Test')
  await page.waitForTimeout(400)
  const rows = await page.locator('tbody tr').count()
  log(`Wiersze po szukaniu "Test": ${rows}`)
  await page.screenshot({ path: `${DIR}/08-raid-search.png` })

  await searchInput.fill('')
  await page.waitForTimeout(300)
  const allRows = await page.locator('tbody tr').count()
  log(`Wiersze po wyczyszczeniu search: ${allRows}`)
}

// ─── TEST 8: CR zakładka i widoczność ─────────────────────────────────────
log('\n--- TEST 8: CR tab ---')
const crTab = page.locator('button, [role="tab"]').filter({ hasText: /^CR$/ }).first()
await crTab.click()
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/09-cr-full.png`, fullPage: true })
const crBody = await page.evaluate(() => document.body.innerText.slice(0, 400))
log('CR full text:', crBody)

// ─── TEST 9: Diamenciki — szukaj projektu z decyzjami ──────────────────────
log('\n--- TEST 9: Diamond — sprawdź projekty pod kątem decyzji ---')
// Lista projektów
await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const allProjects = await page.locator('a[href*="/projects/"]').all()
log(`Liczba projektów na liście: ${allProjects.length}`)

let foundDiamond = false
for (let i = 0; i < Math.min(allProjects.length, 5); i++) {
  const href = await allProjects[i].getAttribute('href')
  const txt = await allProjects[i].innerText()
  await page.goto(BASE + href, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // Sprawdź zakładkę Mapa klocków
  const mapaTab = page.locator('button').filter({ hasText: /mapa klocków/i }).first()
  if (await mapaTab.count() === 0) continue
  await mapaTab.click()
  await page.waitForTimeout(600)

  const diamondCount = await page.evaluate(() => {
    const btns = document.querySelectorAll('button')
    let count = 0
    for (const btn of btns) {
      for (const sp of btn.querySelectorAll('span')) {
        if (sp.className.includes('rotate-45')) { count++; break }
      }
    }
    return count
  })
  log(`Projekt "${txt.slice(0, 40)}" (${href}): ${diamondCount} diamencików`)

  if (diamondCount > 0) {
    foundDiamond = true
    await page.screenshot({ path: `${DIR}/10-diamond-found.png`, fullPage: true })

    // Kliknij diamencik
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button')
      for (const btn of btns) {
        for (const sp of btn.querySelectorAll('span')) {
          if (sp.className.includes('rotate-45')) { btn.click(); return }
        }
      }
    })
    await page.waitForTimeout(600)

    const dialogOpen = await page.locator('[role="dialog"]').count()
    const robimy = await page.locator('*').filter({ hasText: /robimy|pomijamy/i }).count()
    log(`Dialog po kliknięciu diamond: ${dialogOpen}, robimy/pomijamy: ${robimy}`)
    await page.screenshot({ path: `${DIR}/10b-diamond-dialog.png` })

    if (dialogOpen > 0 || robimy > 0) {
      // Wybierz "Robimy"
      const robimyBtn = page.locator('button').filter({ hasText: /robimy/i }).first()
      if (await robimyBtn.count() > 0) {
        await robimyBtn.click()
        await page.waitForTimeout(1500)
        await page.screenshot({ path: `${DIR}/10c-after-robimy.png`, fullPage: true })

        const filledDiamond = await page.evaluate(() => {
          const btns = document.querySelectorAll('button')
          for (const btn of btns) {
            for (const sp of btn.querySelectorAll('span')) {
              if (sp.className.includes('rotate-45')) {
                return { cls: sp.className, isFilled: sp.className.includes('bg-teal') }
              }
            }
          }
          return null
        })
        log(`Diamond po Robimy: ${JSON.stringify(filledDiamond)}`)
      }
    }
    break
  }
}

if (!foundDiamond) {
  log('Żaden z 5 projektów nie ma diamencików — brak danych decyzji w projekcie testowym')
}

// ─── KONSOLA ─────────────────────────────────────────────────────────────────
log('\n=== BŁĘDY KONSOLI ===')
if (consoleErrors.length === 0) {
  log('(brak błędów konsoli)')
} else {
  consoleErrors.forEach(e => log('  ' + e))
}

await browser.close()
log('\nScreenshots w ' + DIR)
