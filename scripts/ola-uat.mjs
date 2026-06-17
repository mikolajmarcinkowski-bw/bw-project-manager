// UAT: Scenariusz poniedziałkowego poranka Oli — BW Project Manager
// Uruchom: node scripts/ola-uat.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const DIR = '/tmp/e2e-ola'
mkdirSync(DIR, { recursive: true })

const consoleErrors = []
const networkErrors = []
const findings = []

const log = (s) => console.log(s)
const finding = (sev, area, msg) => {
  findings.push({ sev, area, msg })
  log(`  [${sev}] ${area}: ${msg}`)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 300)))
page.on('response', (r) => {
  if (r.status() >= 400) networkErrors.push(`${r.status()} ${r.url().slice(0, 120)}`)
})

const step = async (name, fn) => {
  log(`\n--- ${name} ---`)
  try {
    await fn()
    log(`OK: ${name}`)
  } catch (e) {
    const msg = String(e).split('\n')[0].slice(0, 200)
    log(`FAIL: ${name} → ${msg}`)
    finding('FAIL', name, msg)
  }
}

// ============================================================
// 1. LOGIN — przycisk "Wejdź jako Admin"
// ============================================================
await step('1a. Redirect / → /login', async () => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  if (!page.url().includes('/login')) throw new Error('brak redirect, url=' + page.url())
})
await page.screenshot({ path: `${DIR}/01-login-page.png` })

// Sprawdź obecność przycisku dev "Wejdź jako Admin"
const adminBtnCount = await page.locator('button, a').filter({ hasText: /wejdź jako admin/i }).count()
log(`Przycisk "Wejdź jako Admin": ${adminBtnCount > 0 ? 'OBECNY' : 'BRAK'}`)
if (adminBtnCount === 0) {
  finding('WARN', 'login', 'Brak przycisku "Wejdź jako Admin" — trzeba logować email/hasło')
  // Fallback do email/hasło
  await step('1b. Logowanie email/hasło (fallback)', async () => {
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await page.fill('#email', 'mikolaj.marcinkowski@businessweb.pl')
    await page.fill('#password', '8bTgMFdGq4yvF6LAukSV3Vuq')
    await page.getByRole('button', { name: /zaloguj/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  })
} else {
  await step('1b. Logowanie przez "Wejdź jako Admin"', async () => {
    await page.locator('button, a').filter({ hasText: /wejdź jako admin/i }).first().click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  })
}

// ============================================================
// 2. DASHBOARD — przegląd teczek
// ============================================================
await step('2a. Dashboard renderuje się', async () => {
  await page.waitForSelector('h1', { timeout: 8000 })
})
await page.screenshot({ path: `${DIR}/02-dashboard.png`, fullPage: true })

// Sprawdź czerwone trójkąty / zagrożone projekty
const redTriangles = await page.locator('[data-testid="alert-icon"], .text-red-500, [class*="status-off"], [class*="at-risk"]').count()
const warningIconsAlt = await page.locator('svg[class*="text-red"], [aria-label*="zagrożon"], [aria-label*="ryzyko"], [title*="zagrożon"]').count()
log(`Czerwone alerty (DOM szukanie): ${redTriangles + warningIconsAlt}`)

// Zbadaj strukturę dashboard — ile teczek klientów widać
const clientCards = await page.locator('[class*="card"], [class*="teczka"], [class*="client"]').count()
log(`Karty klientów na dashboard: ${clientCards}`)

// Dark mode check
await step('2b. Toggle dark mode', async () => {
  const darkToggle = page.locator('button[aria-label*="ciemn"], button[aria-label*="dark"], button[aria-label*="motyw"], [data-testid="theme-toggle"]')
  const togCount = await darkToggle.count()
  log(`Toggle dark mode obecny: ${togCount > 0}`)
  if (togCount === 0) {
    finding('WARN', 'dark-mode', 'Brak widocznego togglea trybu ciemnego (oczekiwany od MVP wg PRODUCT.md)')
  } else {
    await darkToggle.first().click()
    await page.waitForTimeout(500)
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    log(`Klasa .dark na html: ${isDark}`)
    if (!isDark) finding('BUG', 'dark-mode', 'Toggle nie dodaje klasy .dark do <html>')
    await page.screenshot({ path: `${DIR}/02b-dashboard-dark.png`, fullPage: true })
    // Przywróć jasny
    await darkToggle.first().click()
    await page.waitForTimeout(300)
  }
})

// ============================================================
// 3. /projekty — filtry
// ============================================================
await step('3a. Widok /projekty ładuje się', async () => {
  await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
  await page.waitForSelector('body', { timeout: 5000 })
})
await page.screenshot({ path: `${DIR}/03-projekty.png`, fullPage: true })

// Sprawdź filtry
const filterCRM = await page.locator('button, [role="option"], label, select option').filter({ hasText: /CRM/i }).count()
const filterStatus = await page.locator('[placeholder*="status"], select, [role="combobox"]').count()
log(`Elementy filtra CRM: ${filterCRM}, combo/select: ${filterStatus}`)

await step('3b. Filtr po typie CRM', async () => {
  // Próbuj różne selektory
  const crmFilter = page.locator('button').filter({ hasText: /^CRM$/ }).first()
  const crmCount = await crmFilter.count()
  if (crmCount === 0) {
    // Sprawdź select lub combobox
    const combo = page.locator('[role="combobox"]').first()
    const comboCount = await combo.count()
    if (comboCount > 0) {
      await combo.click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${DIR}/03b-filter-open.png` })
      const crmOption = page.locator('[role="option"]').filter({ hasText: /CRM/i }).first()
      if (await crmOption.count() > 0) {
        await crmOption.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: `${DIR}/03c-filter-crm.png`, fullPage: true })
      } else {
        finding('WARN', 'filtry', 'Brak opcji CRM w dropdownie filtra typów')
      }
    } else {
      finding('BUG', 'filtry', 'Brak elementów filtrowania po typie (CRM) na /projekty')
    }
  } else {
    await crmFilter.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/03c-filter-crm.png`, fullPage: true })
    log('Kliknięto filtr CRM')
  }
})

// ============================================================
// 4. KLIENT — Kaufland lub inny istniejący
// ============================================================
await step('4a. Przejście do klienta (z dashboard)', async () => {
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  // Szukaj linku do klienta Kaufland lub pierwszego dostępnego
  const kauflandLink = page.locator('a, button').filter({ hasText: /kaufland/i }).first()
  const kauflandCount = await kauflandLink.count()
  if (kauflandCount > 0) {
    await kauflandLink.click()
    await page.waitForURL(/\/clients\//, { timeout: 8000 })
    log('Nawigacja do Kaufland: OK, url=' + page.url())
  } else {
    // Użyj pierwszego linku klienta
    const anyClientLink = page.locator('a[href*="/clients/"]').first()
    const anyCount = await anyClientLink.count()
    if (anyCount === 0) throw new Error('Brak linków do klientów na dashboard')
    const href = await anyClientLink.getAttribute('href')
    log(`Kaufland nieznaleziony, używam: ${href}`)
    await anyClientLink.click()
    await page.waitForURL(/\/clients\//, { timeout: 8000 })
  }
})
await page.screenshot({ path: `${DIR}/04-klient.png`, fullPage: true })

// Zachowaj URL klienta do późniejszego użycia
const clientUrl = page.url()
log(`URL klienta: ${clientUrl}`)

// ============================================================
// 5. NOWY PROJEKT — kreator
// ============================================================
await step('5a. Przycisk "Nowy projekt" na stronie klienta', async () => {
  const newProjBtn = page.locator('button, a').filter({ hasText: /nowy projekt|dodaj projekt|new project/i }).first()
  const btnCount = await newProjBtn.count()
  if (btnCount === 0) {
    finding('BUG', 'kreator', 'Brak przycisku "Nowy projekt" na stronie klienta — jedyne CTA')
    // Fallback: idź bezpośrednio
    await page.goto(BASE + '/projects/new', { waitUntil: 'networkidle' })
  } else {
    await newProjBtn.click()
    await page.waitForURL(/\/projects\/new/, { timeout: 8000 })
  }
})
await page.screenshot({ path: `${DIR}/05-new-project-form.png`, fullPage: true })

// Sprawdź kroki kreatora
const step1Present = await page.locator('[class*="step"], [data-step], [aria-label*="krok"]').count()
log(`Elementy kroków kreatora: ${step1Present}`)

await step('5b. Wypełnij nazwę projektu', async () => {
  const nameInput = page.locator('input[name="name"], input[placeholder*="nazwa"], input[id*="name"]').first()
  const nameCount = await nameInput.count()
  if (nameCount === 0) throw new Error('Brak pola nazwy projektu')
  await nameInput.fill('Wdrożenie SharePoint Online — Q3 2026')
  await page.screenshot({ path: `${DIR}/05b-nazwa.png` })
})

await step('5c. Wybierz typ SPO', async () => {
  // Szukaj pill/radio/checkbox dla SPO
  const spoLabel = page.locator('label').filter({ hasText: /^SPO$/ }).first()
  const spoCount = await spoLabel.count()
  if (spoCount > 0) {
    await spoLabel.click()
    await page.waitForTimeout(300)
    log('Kliknięto SPO')
  } else {
    // Próbuj input value=SPO
    const spoInput = page.locator('input[value="SPO"]').first()
    if (await spoInput.count() > 0) {
      await spoInput.click()
      log('Kliknięto input SPO')
    } else {
      finding('WARN', 'kreator', 'Brak selektora typu SPO — nie można wybrać')
    }
  }
  await page.screenshot({ path: `${DIR}/05c-spo.png` })
})

await step('5d. Ustaw datę startu (za tydzień)', async () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 7)
  const dateStr = tomorrow.toISOString().split('T')[0]
  const dateInput = page.locator('input[type="date"], input[name*="start"], input[name*="date"]').first()
  const dateCount = await dateInput.count()
  if (dateCount === 0) {
    finding('WARN', 'kreator', 'Brak pola daty startu')
  } else {
    await dateInput.fill(dateStr)
    log(`Data startu ustawiona: ${dateStr}`)
  }
})

await step('5e. Przejście do kroku 2 (lista zadań)', async () => {
  const nextBtn = page.locator('button').filter({ hasText: /dalej|next|krok 2|następn/i }).first()
  const nextCount = await nextBtn.count()
  if (nextCount === 0) {
    finding('BUG', 'kreator', 'Brak przycisku "Dalej" do przejścia do kroku 2 kreatora')
  } else {
    await nextBtn.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${DIR}/05e-step2-tasks.png`, fullPage: true })
    // Sprawdź zadania
    const taskCheckboxes = await page.locator('input[type="checkbox"]').count()
    log(`Liczba checkboxów zadań w kroku 2: ${taskCheckboxes}`)
    if (taskCheckboxes < 3) {
      finding('WARN', 'kreator', `Mała liczba zadań w kroku 2 (${taskCheckboxes}) — oczekiwano listy wg szablonu`)
    } else {
      // Odznacz 3-4 zadania
      const checkboxes = await page.locator('input[type="checkbox"]:checked').all()
      let unchecked = 0
      for (const cb of checkboxes.slice(0, 4)) {
        await cb.click()
        unchecked++
        await page.waitForTimeout(100)
      }
      log(`Odznaczono ${unchecked} zadań`)
    }
  }
})

await step('5f. Utwórz projekt', async () => {
  const createBtn = page.locator('button').filter({ hasText: /utwórz|stwórz|create|zapisz|gotowe/i }).first()
  const createCount = await createBtn.count()
  if (createCount === 0) {
    finding('BUG', 'kreator', 'Brak przycisku "Utwórz projekt" / "Zapisz"')
    return
  }
  const urlBefore = page.url()
  await createBtn.click()
  await page.waitForTimeout(2000)
  const urlAfter = page.url()
  log(`URL po utworzeniu: ${urlAfter}`)
  if (urlAfter === urlBefore || urlAfter.includes('/projects/new')) {
    finding('BUG', 'kreator', 'Brak przekierowania po utworzeniu projektu (URL bez zmian lub nadal /projects/new)')
  } else if (!urlAfter.includes('/projects/')) {
    finding('WARN', 'kreator', `Przekierowanie do ${urlAfter} — oczekiwano /projects/[id]`)
  }
})
await page.screenshot({ path: `${DIR}/05f-po-utworzeniu.png`, fullPage: true })

const projectUrl = page.url()

// ============================================================
// 6. WIDOK PROJEKTU — zakładki
// ============================================================
await step('6a. Projekt otwiera się, są zakładki', async () => {
  if (!projectUrl.includes('/projects/')) {
    // Próbuj nawigować do nowo stworzonego projektu przez dashboard
    await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
    const newProjLink = page.locator('a[href*="/projects/"]').first()
    const count = await newProjLink.count()
    if (count === 0) throw new Error('Brak linku do projektu na dashboard')
    await newProjLink.click()
    await page.waitForURL(/\/projects\//, { timeout: 8000 })
  }
  const tabs = await page.locator('[role="tab"], [class*="tab"]').count()
  log(`Zakładki projektu: ${tabs}`)
  if (tabs < 2) finding('WARN', 'projekt', 'Mało zakładek lub brak zakładek w widoku projektu')
})
await page.screenshot({ path: `${DIR}/06-projekt-detail.png`, fullPage: true })

await step('6b. Zakładka Harmonogram (Gantt)', async () => {
  const ganttTab = page.locator('[role="tab"], button').filter({ hasText: /harmonogram|gantt/i }).first()
  const ganttCount = await ganttTab.count()
  if (ganttCount === 0) {
    finding('BUG', 'gantt', 'Brak zakładki "Harmonogram" / "Gantt" w widoku projektu')
    return
  }
  await ganttTab.click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${DIR}/06b-gantt.png`, fullPage: true })
  // Sprawdź obecność tabeli/pasków Gantt
  const ganttBars = await page.locator('[class*="gbar"], [class*="gantt"], [class*="bar"]').count()
  const ganttRows = await page.locator('tr, [class*="grow"]').count()
  log(`Paski Gantt: ${ganttBars}, wiersze: ${ganttRows}`)
  if (ganttBars === 0 && ganttRows < 3) {
    finding('WARN', 'gantt', 'Gantt nie renderuje pasków ani wierszy — brak zadań lub komponent pusty')
  }
})

await step('6c. Przełącz status zadania na "W toku"', async () => {
  // Szukaj kontrolki statusu zadania
  const statusControl = page.locator('[data-testid*="status"], [class*="status-control"], select[name*="status"]').first()
  const statusCount = await statusControl.count()
  if (statusCount === 0) {
    // Próbuj kliknąć badge statusu
    const statusBadge = page.locator('[class*="status"], [class*="badge"]').first()
    const badgeCount = await statusBadge.count()
    if (badgeCount === 0) {
      finding('BUG', 'gantt', 'Brak kontrolki zmiany statusu zadania w widoku Gantt')
      return
    }
    await statusBadge.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${DIR}/06c-status-dropdown.png` })
    const wTokuOption = page.locator('[role="option"], li, button').filter({ hasText: /w toku|in progress/i }).first()
    if (await wTokuOption.count() > 0) {
      await wTokuOption.click()
      await page.waitForTimeout(500)
      log('Status zmieniony na "W toku"')
    } else {
      finding('WARN', 'gantt', 'Brak opcji "W toku" w dropdown statusu')
    }
  }
  await page.screenshot({ path: `${DIR}/06c-po-zmianie-statusu.png` })
})

await step('6d. Przypisz ownera do pierwszego zadania', async () => {
  const ownerBtn = page.locator('[data-testid*="assignee"], [class*="assignee"], [class*="owner"], [aria-label*="owner"], [aria-label*="odpowiedzialn"]').first()
  const ownerCount = await ownerBtn.count()
  if (ownerCount === 0) {
    finding('BUG', 'zadania', 'Brak kontrolki przypisania ownera do zadania')
    return
  }
  await ownerBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${DIR}/06d-owner-dropdown.png` })
  // Wybierz pierwszą opcję
  const option = page.locator('[role="option"], li, button').first()
  const optCount = await option.count()
  if (optCount > 0) {
    await option.click()
    await page.waitForTimeout(400)
    log('Owner przypisany')
  } else {
    finding('WARN', 'zadania', 'Dropdown ownera otwarty ale brak opcji do wyboru')
  }
  await page.screenshot({ path: `${DIR}/06d-po-przypisaniu.png` })
})

await step('6e. Zakładka "Mapa klocków" / phase strip', async () => {
  const phaseTab = page.locator('[role="tab"], button').filter({ hasText: /mapa|klocki|fazy|phase/i }).first()
  const phaseCount = await phaseTab.count()
  if (phaseCount === 0) {
    finding('BUG', 'mapa-klocków', 'Brak zakładki "Mapa klocków" w widoku projektu (ekran wymieniony w PRODUCT.md)')
    return
  }
  await phaseTab.click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${DIR}/06e-mapa-klocki.png`, fullPage: true })
  // Sprawdź "TU JESTEŚ"
  const tuJestesCount = await page.locator('*').filter({ hasText: /tu jesteś/i }).count()
  log(`Marker "TU JESTEŚ" widoczny: ${tuJestesCount > 0}`)
  if (tuJestesCount === 0) {
    finding('WARN', 'mapa-klocków', 'Brak markera "TU JESTEŚ" na mapie klocków')
  }
  // Sprawdź klocki faz
  const pblocks = await page.locator('[class*="pblock"], [class*="phase-block"], [class*="block"]').count()
  log(`Klocki faz (.pblock): ${pblocks}`)
})

// ============================================================
// 7. NAWIGACJA WSTECZ — ile kliknięć do dashboardu
// ============================================================
await step('7a. Powrót do dashboardu — nawigacja', async () => {
  const dashboardLink = page.locator('a[href="/dashboard"], a').filter({ hasText: /dashboard/i }).first()
  const breadcrumb = page.locator('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]').first()
  const dashCount = await dashboardLink.count()
  const breadCount = await breadcrumb.count()
  log(`Link Dashboard w nav: ${dashCount}, breadcrumb: ${breadCount}`)
  if (dashCount === 0) {
    finding('WARN', 'nawigacja', 'Brak bezpośredniego linku do Dashboard w nawigacji — wymaga wielu kliknięć')
  }
  if (dashCount > 0) {
    await dashboardLink.click()
    await page.waitForURL(/\/dashboard/, { timeout: 8000 })
    log('Powrót do dashboard: 1 kliknięcie')
  }
})
await page.screenshot({ path: `${DIR}/07-dashboard-powrot.png`, fullPage: true })

// ============================================================
// 8. PROJEKT KAUFLAND — nawigacja do Gantt
// ============================================================
await step('8a. Znajdź projekt Kaufland', async () => {
  const kauflandProj = page.locator('a[href*="/projects/"]').filter({ hasText: /kaufland/i }).first()
  const kaufCount = await kauflandProj.count()
  if (kaufCount === 0) {
    // Próbuj przez /projekty
    await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
    const projLink = page.locator('a[href*="/projects/"]').first()
    const linkCount = await projLink.count()
    if (linkCount === 0) throw new Error('Brak linków do projektów w ogóle')
    await projLink.click()
  } else {
    await kauflandProj.click()
  }
  await page.waitForURL(/\/projects\//, { timeout: 8000 })
  log('Projekt otwarty, url=' + page.url())
})

await step('8b. Szybki dostęp do Gantt z projektu', async () => {
  const ganttTab = page.locator('[role="tab"], button').filter({ hasText: /harmonogram|gantt/i }).first()
  if (await ganttTab.count() === 0) {
    finding('WARN', 'nawigacja', 'Brak zakładki Gantt — nawigacja do zadań wymaga więcej kroków')
    return
  }
  await ganttTab.click()
  await page.waitForTimeout(600)
  // Sprawdź scroll do aktywnej fazy
  const scrollToActive = await page.locator('button, a').filter({ hasText: /pokaż aktywną|przewiń|scroll/i }).count()
  log(`Przycisk scroll do aktywnej fazy: ${scrollToActive > 0 ? 'tak' : 'nie'}`)
  if (scrollToActive === 0) {
    finding('WARN', 'nawigacja', 'Brak przycisku "przewiń do aktywnej fazy" w Gantcie')
  }
})
await page.screenshot({ path: `${DIR}/08-kaufland-gantt.png`, fullPage: true })

// ============================================================
// 9. VISUAL AUDIT — spacing, colory, typografia
// ============================================================
await step('9. Visual audit — tokeny kolorów', async () => {
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  const visualAudit = await page.evaluate(() => {
    const results = {}
    // Sprawdź orange na statusy (powinien być TYLKO na primary CTA)
    const allElements = document.querySelectorAll('*')
    let orangeOnNonCTA = 0
    let missingHoverStates = 0
    allElements.forEach(el => {
      const style = window.getComputedStyle(el)
      const bg = style.backgroundColor
      // #F94213 jako orange primary
      if (bg.includes('249, 66, 19') || bg.includes('rgb(249, 66, 19)')) {
        const tag = el.tagName.toLowerCase()
        const role = el.getAttribute('role')
        // Jeśli to nie button/a i nie ma role button
        if (tag !== 'button' && tag !== 'a' && role !== 'button' && !el.closest('button')) {
          orangeOnNonCTA++
        }
      }
    })
    results.orangeOnNonCTA = orangeOnNonCTA
    // Sprawdź podstawowe spacing
    const mainContent = document.querySelector('main')
    if (mainContent) {
      const padding = window.getComputedStyle(mainContent).padding
      results.mainPadding = padding
    }
    return results
  })
  log(`Orange na non-CTA: ${visualAudit.orangeOnNonCTA}`)
  log(`Main padding: ${visualAudit.mainPadding}`)
  if (visualAudit.orangeOnNonCTA > 0) {
    finding('WARN', 'design', `Orange (#F94213) użyty ${visualAudit.orangeOnNonCTA}x poza CTA — naruszenie zasady "jedna akcja per widok"`)
  }
})

// ============================================================
// 10. Sprawdź stronę klienta — dark header, typ projektu
// ============================================================
await step('10. Strona klienta — struktura', async () => {
  await page.goto(clientUrl, { waitUntil: 'networkidle' })
  const projectsList = await page.locator('a[href*="/projects/"], [class*="project-row"], tr').count()
  log(`Projekty na stronie klienta: ${projectsList}`)
  if (projectsList === 0) {
    finding('WARN', 'klient', 'Strona klienta nie wyświetla listy projektów')
  }
  // Sprawdź badge typów (CRM, SPO kolorowe)
  const typeBadges = await page.locator('[class*="badge"], [class*="type"], [class*="impl"]').count()
  log(`Badge typów: ${typeBadges}`)
})
await page.screenshot({ path: `${DIR}/10-klient-detail.png`, fullPage: true })

// ============================================================
// PODSUMOWANIE
// ============================================================
log('\n\n=== BŁĘDY KONSOLI ===')
if (consoleErrors.length === 0) {
  log('(brak błędów konsoli)')
} else {
  consoleErrors.slice(0, 10).forEach(e => log('  ' + e))
}

log('\n=== BŁĘDY SIECIOWE ===')
if (networkErrors.length === 0) {
  log('(brak błędów sieci)')
} else {
  networkErrors.slice(0, 15).forEach(e => log('  ' + e))
}

log('\n=== FINDINGS ===')
findings.forEach(f => log(`  [${f.sev}] ${f.area}: ${f.msg}`))
log(`\nLiczba findingów: ${findings.length}`)

await browser.close()
log(`\nZrzuty w ${DIR}`)
