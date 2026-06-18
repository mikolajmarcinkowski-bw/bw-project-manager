// BW Project Manager — Testy integracyjne 3 person
// Persona 1: Developer (techniczny), Persona 2: Ola (Senior PM), Persona 3: Junior (chaos)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const DIR = '/tmp/bw-persona'
mkdirSync(DIR, { recursive: true })

const consoleErrors = []
const networkErrors = []
const findings = []
let currentPersona = 'init'
let currentAction = 'init'

const log = (...args) => console.log(...args)

function finding(sev, area, what, expected, got) {
  findings.push({ sev, persona: currentPersona, area, what, expected, got })
  const gotStr = got !== undefined ? ` | GOT: ${got}` : ''
  const expStr = expected !== undefined ? ` | EXPECTED: ${expected}` : ''
  log(`  [${sev}][${currentPersona}] ${area}: ${what}${expStr}${gotStr}`)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error') {
    consoleErrors.push({ persona: currentPersona, action: currentAction, msg: m.text().slice(0, 300) })
  }
})
page.on('pageerror', (e) => {
  consoleErrors.push({ persona: currentPersona, action: currentAction, msg: 'PAGEERROR: ' + String(e).slice(0, 300) })
})
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) {
    networkErrors.push({ persona: currentPersona, action: currentAction, info: `${r.status()} ${r.url().slice(0, 120)}` })
  }
})

const step = async (name, fn) => {
  currentAction = name
  log(`\n--- ${name} ---`)
  try {
    await fn()
    log(`OK: ${name}`)
  } catch (e) {
    const msg = String(e).split('\n')[0].slice(0, 220)
    log(`FAIL: ${name} -> ${msg}`)
    finding('FAIL', name, msg)
  }
}

// ─── SHARED: Login przez "Wejdź jako Admin" ───────────────────────────────────

async function doLogin() {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  const adminBtn = page.locator('button, a').filter({ hasText: /wejdź jako admin/i }).first()
  const cnt = await adminBtn.count()
  if (cnt === 0) {
    finding('KRYTYCZNE', 'login', '"Wejdź jako Admin" button not found on /login', 'button visible', 'absent')
    throw new Error('Brak przycisku "Wejdź jako Admin" — nie można kontynuować testów')
  }
  await adminBtn.click()
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  log('Zalogowano jako Admin, url=' + page.url())
}

// ─── SHARED: Nawigacja do projektu z danymi ───────────────────────────────────

let projectUrl = null
let projectId = null

async function goToFirstProject() {
  await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Szukaj Kaufland najpierw, potem cokolwiek
  const kauflandLink = page.locator('a[href*="/projects/"]').filter({ hasText: /kaufland/i }).first()
  const kaufCount = await kauflandLink.count()

  if (kaufCount > 0) {
    projectUrl = await kauflandLink.getAttribute('href')
    log(`Znaleziono Kaufland: ${projectUrl}`)
  } else {
    const anyLink = page.locator('a[href*="/projects/"]').first()
    const anyCount = await anyLink.count()
    if (anyCount === 0) {
      // Spróbuj z dashboard
      await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      const dashLink = page.locator('a[href*="/projects/"]').first()
      const dashCount = await dashLink.count()
      if (dashCount === 0) throw new Error('Brak projektów w ogóle')
      projectUrl = await dashLink.getAttribute('href')
    } else {
      projectUrl = await anyLink.getAttribute('href')
    }
    log(`Używam projektu: ${projectUrl}`)
  }

  if (!projectUrl) throw new Error('Nie udało się wyciągnąć URL projektu')
  const match = projectUrl.match(/\/projects\/([^/]+)/)
  if (match) projectId = match[1]

  await page.goto(BASE + projectUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
}

async function clickTab(tabText) {
  const tab = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tabText, 'i') }).first()
  const cnt = await tab.count()
  if (cnt === 0) {
    finding('WYSOKIE', `zakładka-${tabText}`, `Tab "${tabText}" not found`, 'tab present', 'absent')
    return false
  }
  await tab.click()
  await page.waitForTimeout(800)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA 1 — DEVELOPER
// ─────────────────────────────────────────────────────────────────────────────

log('\n\n========== PERSONA 1: DEVELOPER ==========\n')
currentPersona = 'P1-Developer'

await step('P1-0. Login jako Admin', async () => {
  await doLogin()
})
await page.screenshot({ path: `${DIR}/p1-00-login.png` })

await step('P1-1. Nawigacja do projektu z danymi', async () => {
  await goToFirstProject()
})
await page.screenshot({ path: `${DIR}/p1-01-projekt.png`, fullPage: true })

// ─── ZAKŁADKA RAID ───────────────────────────────────────────────────────────

await step('P1-2a. Klik zakładki RAID', async () => {
  const ok = await clickTab('RAID')
  if (!ok) throw new Error('Brak zakładki RAID')
})
await page.screenshot({ path: `${DIR}/p1-02a-raid-tab.png`, fullPage: true })

await step('P1-2b. RAID: tabela lub empty state widoczne', async () => {
  const table = await page.locator('table').count()
  const empty = await page.locator('*').filter({ hasText: /brak ryzyk/i }).count()
  const addBtn = await page.locator('button').filter({ hasText: /dodaj ryzyko/i }).count()
  log(`Tabela: ${table}, empty state: ${empty}, przycisk dodaj: ${addBtn}`)
  if (table === 0 && empty === 0) {
    finding('WYSOKIE', 'RAID', 'Ani tabela ani empty state nie widoczne po wejściu w zakładkę RAID', 'table or empty state', 'neither visible')
  }
  if (addBtn === 0) {
    finding('WYSOKIE', 'RAID', 'Brak przycisku "+ Dodaj ryzyko" na RAID', 'button present', 'absent')
  }
})

await step('P1-2c. RAID: otwarcie modala "+ Dodaj ryzyko"', async () => {
  const btn = page.locator('button').filter({ hasText: /dodaj ryzyko/i }).first()
  await btn.click()
  await page.waitForTimeout(600)
  const modal = await page.locator('[role="dialog"], [data-state="open"]').count()
  if (modal === 0) {
    finding('WYSOKIE', 'RAID-modal', 'Modal nie otworzył się po kliknięciu "+ Dodaj ryzyko"', 'dialog opens', 'no dialog')
    throw new Error('Modal nie otwarty')
  }
})
await page.screenshot({ path: `${DIR}/p1-02c-raid-modal.png` })

await step('P1-2d. RAID: wpisz opis "Test ryzyko P1"', async () => {
  const desc = page.locator('textarea[id="risk-desc"], textarea[placeholder*="ryzyko"], textarea').first()
  const cnt = await desc.count()
  if (cnt === 0) throw new Error('Brak pola opisu ryzyka w modalu')
  await desc.fill('Test ryzyko P1')
})

await step('P1-2e. RAID: ustaw P=3', async () => {
  // Select Prawdopodobieństwo — szukamy SelectTrigger z P lub via aria
  const probTrigger = page.locator('[aria-label*="Prawdopodobieństwo"], select').first()
  // Radix Select trigger
  const allTriggers = page.locator('button[role="combobox"]')
  const trigCount = await allTriggers.count()
  log(`Liczba combobox triggers w modalu: ${trigCount}`)
  // Pierwszy combobox w modalu to Kategoria, drugi to P, trzeci to W
  if (trigCount >= 2) {
    await allTriggers.nth(1).click()
    await page.waitForTimeout(300)
    const opt3 = page.locator('[role="option"]').filter({ hasText: /^3/ }).first()
    const cnt3 = await opt3.count()
    if (cnt3 === 0) {
      // Próbuj po liczbie 3
      const allOpts = await page.locator('[role="option"]').all()
      log(`Opcje w dropdown: ${allOpts.length}`)
      await allOpts[2]?.click()
    } else {
      await opt3.click()
    }
    await page.waitForTimeout(200)
  }
})

await step('P1-2f. RAID: ustaw W=5', async () => {
  const allTriggers = page.locator('button[role="combobox"]')
  const trigCount = await allTriggers.count()
  if (trigCount >= 3) {
    await allTriggers.nth(2).click()
    await page.waitForTimeout(300)
    const opt5 = page.locator('[role="option"]').filter({ hasText: /^5/ }).first()
    const cnt5 = await opt5.count()
    if (cnt5 === 0) {
      const allOpts = await page.locator('[role="option"]').all()
      await allOpts[allOpts.length - 1]?.click()
    } else {
      await opt5.click()
    }
    await page.waitForTimeout(200)
  }
})
await page.screenshot({ path: `${DIR}/p1-02f-raid-pw-set.png` })

await step('P1-2g. RAID: sprawdź Score i RAG preview', async () => {
  // Preview RAG: P×W = 3×5=15 → R (czerwony)
  const preview = await page.locator('*').filter({ hasText: /P×W\s*=\s*15|P×W.*15/i }).count()
  const ragPreviewText = await page.locator('*').filter({ hasText: /czerwony/i }).count()
  log(`Score preview (P×W=15): ${preview}, RAG "Czerwony": ${ragPreviewText}`)

  // Sprawdź badge R w preview
  const rBadge = page.locator('.bg-\\[\\#FCEBEB\\], [class*="FCEBEB"]').filter({ hasText: /^R$/ }).first()
  const rBadgeAlt = await page.evaluate(() => {
    const all = document.querySelectorAll('span, div')
    for (const el of all) {
      if (el.textContent.trim() === 'R' && el.className.includes('rounded-full')) return 'found'
    }
    return 'not-found'
  })
  log(`Badge R w preview: ${rBadgeAlt}`)

  if (preview === 0) {
    finding('WYSOKIE', 'RAID-RAG', 'Preview Score P×W=15 nie widoczny w modalu', 'P×W = 15 text visible', 'absent')
  }
  if (ragPreviewText === 0 && rBadgeAlt === 'not-found') {
    finding('WYSOKIE', 'RAID-RAG', 'RAG preview nie pokazuje R przy P=3, W=5 (score 15)', 'R badge red visible', 'not visible')
  }
})

await step('P1-2h. RAID: wpisz właściciela i zapisz', async () => {
  const ownerInput = page.locator('input[id="risk-owner"], input[placeholder*="nazwisko"]').first()
  const cnt = await ownerInput.count()
  if (cnt === 0) throw new Error('Brak pola Właściciel w modalu ryzyka')
  await ownerInput.fill('Jan Kowalski')

  const saveBtn = page.locator('button[type="submit"], button[form="risk-form"]').first()
  const saveCnt = await saveBtn.count()
  if (saveCnt === 0) throw new Error('Brak przycisku Zapisz w modalu')
  await saveBtn.click()
  await page.waitForTimeout(1500)
})
await page.screenshot({ path: `${DIR}/p1-02h-raid-after-save.png`, fullPage: true })

await step('P1-2i. RAID: ryzyko "Test ryzyko P1" widoczne w tabeli', async () => {
  const riskRow = await page.locator('table td, table').filter({ hasText: /Test ryzyko P1/i }).count()
  log(`Ryzyko w tabeli: ${riskRow}`)
  if (riskRow === 0) {
    finding('WYSOKIE', 'RAID-save', 'Ryzyko "Test ryzyko P1" nie pojawia się w tabeli po zapisaniu', 'row in table', 'not found')
  }
})

await step('P1-2j. RAID: RAG badge = R (czerwone) dla score=15', async () => {
  // Szukamy w tabeli RAG badge R
  const rBadge = await page.evaluate(() => {
    const cells = document.querySelectorAll('td')
    for (const cell of cells) {
      const spans = cell.querySelectorAll('span')
      for (const sp of spans) {
        if (sp.textContent.trim() === 'R' && sp.className.includes('rounded-full')) {
          return sp.className
        }
      }
    }
    return null
  })
  log(`RAG badge class w tabeli: ${rBadge}`)
  if (!rBadge) {
    finding('WYSOKIE', 'RAID-RAG-tabela', 'Brak badge R (czerwonego) w tabeli dla score=15', 'R badge in table', 'absent')
  } else if (!rBadge.includes('FCEBEB') && !rBadge.includes('E24B4A')) {
    finding('NISKIE', 'RAID-RAG-tabela', `Badge R ma inny kolor niż oczekiwany czerwony: ${rBadge}`, '#FCEBEB bg', rBadge)
  }
})

await step('P1-2k. RAID: toggle statusu Open→Monitor→Closed', async () => {
  // Znajdź status badge naszego ryzyka i kliknij
  const statusBadge = page.locator('button').filter({ hasText: /otwarte/i }).first()
  const cnt = await statusBadge.count()
  if (cnt === 0) {
    finding('WYSOKIE', 'RAID-toggle', 'Brak przycisku statusu "Otwarte" w tabeli ryzyka', 'status button', 'absent')
    return
  }

  // Kliknij → monitor
  await statusBadge.click()
  await page.waitForTimeout(600)
  const afterFirst = await page.locator('button').filter({ hasText: /monitorowane/i }).count()
  log(`Po 1. kliknięciu: "Monitorowane" widoczne: ${afterFirst}`)
  if (afterFirst === 0) {
    finding('WYSOKIE', 'RAID-toggle', 'Status nie zmienił się z "Otwarte" na "Monitorowane" po kliknięciu', '"Monitorowane" visible', 'not visible')
  }

  // Kliknij jeszcze raz → closed
  const monitorBtn = page.locator('button').filter({ hasText: /monitorowane/i }).first()
  if (await monitorBtn.count() > 0) {
    await monitorBtn.click()
    await page.waitForTimeout(600)
    const afterSecond = await page.locator('button').filter({ hasText: /zamknięte/i }).count()
    log(`Po 2. kliknięciu: "Zamknięte" widoczne: ${afterSecond}`)
    if (afterSecond === 0) {
      finding('ŚREDNIE', 'RAID-toggle', 'Status nie zmienił się z "Monitorowane" na "Zamknięte"', '"Zamknięte" visible', 'not visible')
    }
    // Kliknij jeszcze raz → open (cykl)
    const closedBtn = page.locator('button').filter({ hasText: /zamknięte/i }).first()
    if (await closedBtn.count() > 0) {
      await closedBtn.click()
      await page.waitForTimeout(600)
      const afterThird = await page.locator('button').filter({ hasText: /otwarte/i }).count()
      log(`Po 3. kliknięciu (powrót do open): ${afterThird}`)
    }
  }
})
await page.screenshot({ path: `${DIR}/p1-02k-raid-toggle.png` })

await step('P1-2l. RAID: search filtruje po opisie', async () => {
  const searchInput = page.locator('input[type="search"], input[placeholder*="szukaj"], input[placeholder*="opisie"]').first()
  const cnt = await searchInput.count()
  if (cnt === 0) {
    finding('ŚREDNIE', 'RAID-search', 'Brak pola wyszukiwania na RAID', 'search input', 'absent')
    return
  }

  await searchInput.fill('Test ryzyko')
  await page.waitForTimeout(400)
  const rows = await page.locator('tbody tr').count()
  log(`Wyniki po wyszukaniu "Test ryzyko": ${rows} wierszy`)

  // Wyczyść wyszukiwanie
  await searchInput.fill('zxzxzxzx_niema_takiego')
  await page.waitForTimeout(300)
  const noRows = await page.locator('tbody tr').count()
  const noResults = await page.locator('*').filter({ hasText: /brak ryzyk pasuj/i }).count()
  log(`Brak wyników dla nieistniejącego: rows=${noRows}, empty=${noResults}`)
  if (noRows > 0 && noResults === 0) {
    finding('WYSOKIE', 'RAID-search', 'Filtr search nie działa — wiersze widoczne mimo braku pasujących wyników', '0 rows', `${noRows} rows`)
  }

  // Wyczyść
  await searchInput.fill('')
  await page.waitForTimeout(300)
})
await page.screenshot({ path: `${DIR}/p1-02l-raid-search.png` })

// ─── ZAKŁADKA KPI ────────────────────────────────────────────────────────────

await step('P1-3a. Klik zakładki KPI', async () => {
  const ok = await clickTab('KPI')
  if (!ok) throw new Error('Brak zakładki KPI')
})
await page.screenshot({ path: `${DIR}/p1-03a-kpi-tab.png`, fullPage: true })

await step('P1-3b. KPI: karty lub empty state widoczne', async () => {
  const cards = await page.locator('[class*="rounded-xl"][class*="border"]').count()
  const empty = await page.locator('*').filter({ hasText: /brak wskaźników/i }).count()
  const addBtn = await page.locator('button').filter({ hasText: /dodaj kpi/i }).count()
  log(`Karty: ${cards}, empty: ${empty}, dodaj: ${addBtn}`)
  if (addBtn === 0) {
    finding('WYSOKIE', 'KPI', 'Brak przycisku "+ Dodaj KPI"', 'button present', 'absent')
  }
})

await step('P1-3c. KPI: zmiana statusu karty (toggle)', async () => {
  // Szukaj istniejących kart KPI
  const statusBtns = page.locator('button').filter({ hasText: /na czasie|zagrożony|opóźniony|ukończony/i })
  const cnt = await statusBtns.count()
  log(`Przyciski statusu KPI: ${cnt}`)

  if (cnt === 0) {
    // Brak kart — sprawdź empty state
    const empty = await page.locator('*').filter({ hasText: /brak wskaźników/i }).count()
    if (empty > 0) {
      log('KPI empty state — brak danych do testowania toggle')
      finding('NISKIE', 'KPI-toggle', 'Brak kart KPI w projekcie — nie można przetestować toggle statusu', 'KPI cards exist', 'empty state')
      return
    }
    finding('WYSOKIE', 'KPI-toggle', 'Brak przycisków statusu KPI na kartach', 'status buttons', 'absent')
    return
  }

  const firstBtn = statusBtns.first()
  const beforeText = await firstBtn.innerText()
  log(`Status przed kliknięciem: "${beforeText}"`)
  await firstBtn.click()
  await page.waitForTimeout(600)
  const afterText = await firstBtn.innerText()
  log(`Status po kliknięciu: "${afterText}"`)

  if (beforeText === afterText) {
    finding('WYSOKIE', 'KPI-toggle', 'Status KPI nie zmienił się po kliknięciu przycisku', 'different status', `same: "${afterText}"`)
  }
})
await page.screenshot({ path: `${DIR}/p1-03c-kpi-toggle.png` })

await step('P1-3d. KPI: modal "+ Dodaj KPI"', async () => {
  const btn = page.locator('button').filter({ hasText: /dodaj kpi/i }).first()
  await btn.click()
  await page.waitForTimeout(500)
  const modal = await page.locator('[role="dialog"], [data-state="open"]').count()
  if (modal === 0) {
    finding('WYSOKIE', 'KPI-modal', 'Modal "Dodaj KPI" nie otworzył się', 'dialog opens', 'no dialog')
    throw new Error('Modal nie otwarty')
  }
})
await page.screenshot({ path: `${DIR}/p1-03d-kpi-modal.png` })

await step('P1-3e. KPI: wpisz i zapisz', async () => {
  const nameInput = page.locator('input[id="kpi-name"], input[placeholder*="KPI"], input[placeholder*="wdrożenia"]').first()
  const cnt = await nameInput.count()
  if (cnt === 0) throw new Error('Brak pola Nazwa KPI')
  await nameInput.fill('Test KPI P1')

  const saveBtn = page.locator('button[form="kpi-form"], button[type="submit"]').first()
  const saveCnt = await saveBtn.count()
  if (saveCnt === 0) throw new Error('Brak przycisku Zapisz w modalu KPI')
  await saveBtn.click()
  await page.waitForTimeout(1500)
})
await page.screenshot({ path: `${DIR}/p1-03e-kpi-saved.png`, fullPage: true })

await step('P1-3f. KPI: karta "Test KPI P1" widoczna', async () => {
  const kpiCard = await page.locator('*').filter({ hasText: /Test KPI P1/i }).count()
  log(`Karta KPI widoczna: ${kpiCard}`)
  if (kpiCard === 0) {
    finding('WYSOKIE', 'KPI-save', 'KPI "Test KPI P1" nie pojawia się po zapisaniu', 'card visible', 'not found')
  }
})

// ─── ZAKŁADKA BUDŻET ─────────────────────────────────────────────────────────

await step('P1-4a. Klik zakładki Budżet', async () => {
  const ok = await clickTab('Budżet')
  if (!ok) throw new Error('Brak zakładki Budżet')
})
await page.screenshot({ path: `${DIR}/p1-04a-budget-tab.png`, fullPage: true })

await step('P1-4b. Budżet: tabela lub settings panel widoczny', async () => {
  const table = await page.locator('table').count()
  const settings = await page.locator('*').filter({ hasText: /ustawienia stawek|stawka k/i }).count()
  const empty = await page.locator('*').filter({ hasText: /brak danych budżetowych/i }).count()
  log(`Tabela: ${table}, settings: ${settings}, empty: ${empty}`)
  if (table === 0 && settings === 0 && empty === 0) {
    finding('WYSOKIE', 'Budżet', 'Zakładka Budżet nic nie wyświetla', 'table/settings/empty', 'nothing visible')
  }
})

await step('P1-4c. Budżet: kliknięcie pola Rzeczyw.(h)', async () => {
  // Szukaj EditableActual — span z tabular-nums który można kliknąć, lub wartość 0.0
  const editableSpan = page.locator('span.cursor-pointer, span[title*="edytować"]').first()
  const cnt = await editableSpan.count()

  if (cnt === 0) {
    // Może być empty state bez linii
    const empty = await page.locator('*').filter({ hasText: /brak danych budżetowych/i }).count()
    if (empty > 0) {
      finding('NISKIE', 'Budżet-edycja', 'Brak linii budżetowych — nie można przetestować edycji Rzeczyw.(h)', 'budget lines exist', 'empty state')
      return
    }
    finding('WYSOKIE', 'Budżet-edycja', 'Brak klikalnego pola Rzeczyw.(h) w tabeli budżetu', 'editable span', 'absent')
    return
  }

  await editableSpan.click()
  await page.waitForTimeout(400)
  const inputEditing = await page.locator('input[type="number"][autoFocus], input.w-16').count()
  const inputVisible = await page.locator('input[type="number"]').count()
  log(`Input Rzeczyw. po kliknięciu: ${inputEditing} (autofocus) / ${inputVisible} (total number inputs)`)

  if (inputEditing === 0) {
    finding('WYSOKIE', 'Budżet-edycja', 'Kliknięcie Rzeczyw.(h) nie otwiera inputa do edycji', 'input appears', 'no input')
  } else {
    // Wpisz wartość i zatwierdź
    await page.locator('input[type="number"]').last().fill('8')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
  }
})
await page.screenshot({ path: `${DIR}/p1-04c-budget-editable.png` })

// ─── ZAKŁADKA CR ─────────────────────────────────────────────────────────────

await step('P1-5a. Klik zakładki CR', async () => {
  const ok = await clickTab('CR')
  if (!ok) throw new Error('Brak zakładki CR')
})
await page.screenshot({ path: `${DIR}/p1-05a-cr-tab.png`, fullPage: true })

await step('P1-5b. CR: rejestr lub empty state widoczny', async () => {
  const table = await page.locator('table, [class*="register"]').count()
  const empty = await page.locator('*').filter({ hasText: /brak change requestów/i }).count()
  const btn = await page.locator('button').filter({ hasText: /nowy cr/i }).count()
  log(`Tabela/rejestr: ${table}, empty: ${empty}, przycisk: ${btn}`)
  if (btn === 0) {
    finding('WYSOKIE', 'CR', 'Brak przycisku "+ Nowy CR"', 'button present', 'absent')
  }
})

await step('P1-5c. CR: otwarcie formularza "+ Nowy CR"', async () => {
  const btn = page.locator('button').filter({ hasText: /nowy cr/i }).first()
  await btn.click()
  await page.waitForTimeout(600)
  // CR używa fixed div overlay, nie Dialog
  const dialog = await page.locator('.fixed.inset-0, [class*="fixed inset"]').count()
  const overlay = await page.locator('.bg-black\\/40, .bg-black\\/\\[').count()
  const modal = await page.locator('[role="dialog"]').count()
  log(`Dialog fixed: ${dialog}, overlay: ${overlay}, role-dialog: ${modal}`)

  const formHeader = await page.locator('*').filter({ hasText: /nowy change request/i }).count()
  if (formHeader === 0) {
    finding('WYSOKIE', 'CR-modal', 'Formularz "Nowy Change Request" nie otworzył się', 'form visible', 'not found')
    throw new Error('Formularz CR nie otwarty')
  }
})
await page.screenshot({ path: `${DIR}/p1-05c-cr-form.png`, fullPage: true })

// Zamknij CR form przed resztą testów
await step('P1-5d. CR: zamknij formularz', async () => {
  const cancelBtn = page.locator('button').filter({ hasText: /anuluj/i }).first()
  const closeBtn = page.locator('button').filter({ hasText: /✕|close/i }).first()
  if (await cancelBtn.count() > 0) {
    await cancelBtn.click()
  } else if (await closeBtn.count() > 0) {
    await closeBtn.click()
  }
  await page.waitForTimeout(400)
})

// ─── ZAKŁADKA RACI ────────────────────────────────────────────────────────────

await step('P1-6a. Klik zakładki RACI', async () => {
  const ok = await clickTab('RACI')
  if (!ok) throw new Error('Brak zakładki RACI')
})
await page.screenshot({ path: `${DIR}/p1-06a-raci-tab.png`, fullPage: true })

await step('P1-6b. RACI: tabela faz lub empty state widoczny', async () => {
  const table = await page.locator('table').count()
  const empty = await page.locator('*').filter({ hasText: /macierz raci jest pusta/i }).count()
  const phases = await page.locator('*').filter({ hasText: /faza \d+/i }).count()
  log(`Tabela: ${table}, empty: ${empty}, nagłówki faz: ${phases}`)
  if (table === 0 && empty === 0) {
    finding('WYSOKIE', 'RACI', 'Zakładka RACI nic nie wyświetla (ani tabela ani empty state)', 'table or empty', 'nothing')
  }
})

// ─── DIAMENCIKI ───────────────────────────────────────────────────────────────

await step('P1-7a. Powrót do "Mapa klocków"', async () => {
  const ok = await clickTab('Mapa klocków')
  if (!ok) throw new Error('Brak zakładki "Mapa klocków"')
})
await page.screenshot({ path: `${DIR}/p1-07a-mapa.png`, fullPage: true })

await step('P1-7b. Diamenciki: widoczność rombu decyzji', async () => {
  // Diamond: button z rotate-45 span
  const diamonds = await page.evaluate(() => {
    const btns = document.querySelectorAll('button')
    let count = 0
    for (const btn of btns) {
      const spans = btn.querySelectorAll('span')
      for (const sp of spans) {
        if (sp.className.includes('rotate-45')) { count++; break }
      }
    }
    return count
  })
  log(`Diamenciki widoczne: ${diamonds}`)
  if (diamonds === 0) {
    finding('ŚREDNIE', 'Diamenciki', 'Brak widocznych rombu/diamenciku decyzji na Mapie klocków', 'diamonds visible', 'none found')
  }
})

let diamondClicked = false
await step('P1-7c. Diamenciki: klik rombu otwiera dialog', async () => {
  // Znajdź button zawierający span.rotate-45
  const diamondBtn = await page.evaluate(() => {
    const btns = document.querySelectorAll('button')
    for (const btn of btns) {
      const spans = btn.querySelectorAll('span')
      for (const sp of spans) {
        if (sp.className.includes('rotate-45')) {
          return { ariaLabel: btn.getAttribute('aria-label'), title: btn.getAttribute('title') }
        }
      }
    }
    return null
  })
  log(`Znaleziony diamond: ${JSON.stringify(diamondBtn)}`)

  if (!diamondBtn) {
    finding('ŚREDNIE', 'Diamenciki', 'Nie można znaleźć selektora dla diamencika', 'button found', 'not found')
    return
  }

  // Kliknij button z rotate-45
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button')
    for (const btn of btns) {
      const spans = btn.querySelectorAll('span')
      for (const sp of spans) {
        if (sp.className.includes('rotate-45')) {
          btn.click()
          return
        }
      }
    }
  })
  await page.waitForTimeout(600)

  const dialog = await page.locator('[role="dialog"]').count()
  const robimy = await page.locator('*').filter({ hasText: /robimy|pomijamy/i }).count()
  log(`Dialog po kliknięciu diamencika: ${dialog}, tekst robimy/pomijamy: ${robimy}`)

  if (dialog === 0 && robimy === 0) {
    finding('WYSOKIE', 'Diamenciki', 'Kliknięcie diamencika nie otwiera dialogu "Robimy/Pomijamy"', 'dialog opens', 'no dialog')
  } else {
    diamondClicked = true
  }
})
await page.screenshot({ path: `${DIR}/p1-07c-diamond-dialog.png` })

// Zamknij dialog jeśli otwarty
if (diamondClicked) {
  await step('P1-7d. Zamknij dialog diamencika', async () => {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  })
}

// ─── KONSOLA ─────────────────────────────────────────────────────────────────

await step('P1-8. Sprawdź błędy konsoli po Persona 1', async () => {
  const p1Errors = consoleErrors.filter(e => e.persona === 'P1-Developer')
  log(`Błędy konsoli podczas Persona 1: ${p1Errors.length}`)
  p1Errors.forEach(e => log(`  [KONSOLA] ${e.action}: ${e.msg}`))
  if (p1Errors.length > 0) {
    finding('WYSOKIE', 'Konsola-P1', `${p1Errors.length} błędów JS w konsoli podczas testów Developer`, '0 errors', `${p1Errors.length} errors`)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA 2 — OLA (Senior PM)
// ─────────────────────────────────────────────────────────────────────────────

log('\n\n========== PERSONA 2: OLA (SENIOR PM) ==========\n')
currentPersona = 'P2-Ola'

// Ola jest już zalogowana z Persona 1

await step('P2-1. Wejdź w projekt (ten sam)', async () => {
  await page.goto(BASE + projectUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
})
await page.screenshot({ path: `${DIR}/p2-01-projekt.png`, fullPage: true })

await step('P2-2. RAID: sprawdź ryzyka z P1 i zmień status na Zamknięte', async () => {
  const ok = await clickTab('RAID')
  if (!ok) throw new Error('Brak zakładki RAID')
  await page.waitForTimeout(500)

  const testRow = await page.locator('*').filter({ hasText: /Test ryzyko P1/i }).count()
  log(`Ryzyko z P1 widoczne: ${testRow}`)
  if (testRow === 0) {
    finding('WYSOKIE', 'RAID-P2', 'Ryzyko dodane przez Persona 1 ("Test ryzyko P1") nie widoczne — dane nie persystują', 'risk visible', 'not found')
  }

  // Kliknij status badge naszego ryzyka do "Zamknięte"
  // Ryzyko jest teraz "Otwarte" (po cyklu z P1 wróciło do open)
  const openBtn = page.locator('button').filter({ hasText: /otwarte/i }).first()
  const monitorBtn = page.locator('button').filter({ hasText: /monitorowane/i }).first()
  let clickTarget = null
  if (await openBtn.count() > 0) {
    clickTarget = openBtn
  } else if (await monitorBtn.count() > 0) {
    clickTarget = monitorBtn
  }

  if (clickTarget) {
    await clickTarget.click()
    await page.waitForTimeout(600)
    // Potrzeba 1-2 kliknięć do Zamknięte
    const closedBtn = page.locator('button').filter({ hasText: /zamknięte/i }).first()
    if (await closedBtn.count() > 0) {
      log('Dotarliśmy do Zamknięte bezpośrednio')
    } else {
      // Może potrzeba jeszcze raz
      const currentBtn = page.locator('button').filter({ hasText: /otwarte|monitorowane/i }).first()
      if (await currentBtn.count() > 0) {
        await currentBtn.click()
        await page.waitForTimeout(600)
      }
    }
    const closedFinal = await page.locator('button').filter({ hasText: /zamknięte/i }).count()
    log(`Status "Zamknięte" po kliknięciach: ${closedFinal}`)
    if (closedFinal === 0) {
      finding('ŚREDNIE', 'RAID-P2-toggle', 'Nie udało się osiągnąć statusu "Zamknięte" przez toggle', '"Zamknięte" visible', 'not reached')
    }
  }
})
await page.screenshot({ path: `${DIR}/p2-02-raid-closed.png` })

await step('P2-3. KPI: zmień status na "at" (zagrożony)', async () => {
  const ok = await clickTab('KPI')
  if (!ok) throw new Error('Brak zakładki KPI')
  await page.waitForTimeout(600)

  // Szukaj "Na czasie" (on) i zmień na "Zagrożony" (at)
  const onBtn = page.locator('button').filter({ hasText: /na czasie/i }).first()
  const cnt = await onBtn.count()
  if (cnt === 0) {
    finding('NISKIE', 'KPI-P2', 'Brak KPI w statusie "Na czasie" — może być pusty lub już inny status', 'on-status button', 'absent')
    return
  }

  const beforeClass = await onBtn.evaluate(el => el.className)
  await onBtn.click()
  await page.waitForTimeout(600)

  const atBtn = page.locator('button').filter({ hasText: /zagrożony/i }).first()
  const atCnt = await atBtn.count()
  log(`"Zagrożony" status po kliknięciu: ${atCnt}`)

  if (atCnt === 0) {
    finding('WYSOKIE', 'KPI-P2', 'Karta KPI nie zmieniła się na "Zagrożony" po kliknięciu "Na czasie"', '"Zagrożony" button', 'not found')
  } else {
    const afterClass = await atBtn.evaluate(el => el.parentElement?.className || el.className)
    log(`Klasa karty po zmianie na at: ${afterClass.slice(0, 100)}`)
    // Sprawdź kolor karty — powinna mieć border amber
    const amberborder = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="rounded-xl"][class*="border"]')
      for (const card of cards) {
        if (card.className.includes('EF9F27')) return 'amber border present'
      }
      return 'no amber border'
    })
    log(`Amber border na karcie: ${amberborder}`)
    if (amberborder === 'no amber border') {
      finding('NISKIE', 'KPI-P2-kolor', 'Karta KPI nie ma amber border po zmianie statusu na "Zagrożony"', 'amber border #EF9F27', 'no amber border')
    }
  }
})
await page.screenshot({ path: `${DIR}/p2-03-kpi-at.png`, fullPage: true })

await step('P2-4. Budżet: wpisz godziny rzeczywiste', async () => {
  const ok = await clickTab('Budżet')
  if (!ok) throw new Error('Brak zakładki Budżet')
  await page.waitForTimeout(600)

  const editSpan = page.locator('span[title*="edytować"], span.cursor-pointer').first()
  const cnt = await editSpan.count()
  if (cnt === 0) {
    finding('NISKIE', 'Budżet-P2', 'Brak linii budżetowych — nie można wpisać godzin rzeczywistych', 'editable hours', 'empty state')
    return
  }

  await editSpan.click()
  await page.waitForTimeout(400)
  const inp = page.locator('input[type="number"]').last()
  const inpCnt = await inp.count()
  if (inpCnt === 0) {
    finding('WYSOKIE', 'Budżet-P2', 'Kliknięcie godzin nie otwiera edytora', 'input appears', 'no input')
    return
  }
  await inp.fill('12')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  log('Wpisano 12h do Rzeczyw. i zatwierdzono Enter')
})
await page.screenshot({ path: `${DIR}/p2-04-budget-hours.png` })

await step('P2-5. CR: Utwórz nowy CR "Zmiana scope"', async () => {
  const ok = await clickTab('CR')
  if (!ok) throw new Error('Brak zakładki CR')
  await page.waitForTimeout(600)

  const newCrBtn = page.locator('button').filter({ hasText: /nowy cr/i }).first()
  await newCrBtn.click()
  await page.waitForTimeout(600)

  // Sprawdź formularz
  const formPresent = await page.locator('*').filter({ hasText: /nowy change request/i }).count()
  if (formPresent === 0) {
    finding('WYSOKIE', 'CR-P2', 'Formularz nowego CR nie otworzył się', 'form opens', 'not found')
    throw new Error('Formularz CR nie otwarty')
  }

  // Wpisz tytuł
  const titleInput = page.locator('input[placeholder*="tytuł"], input[placeholder*="CR"]').first()
  const titleCnt = await titleInput.count()
  if (titleCnt === 0) throw new Error('Brak pola Tytuł w formularzu CR')
  await titleInput.fill('Zmiana scope')

  // Typ = scope (Zmiana zakresu) — powinien być domyślnie zaznaczony
  const scopeBtn = page.locator('button').filter({ hasText: /zmiana zakresu/i }).first()
  if (await scopeBtn.count() > 0) {
    await scopeBtn.click()
    await page.waitForTimeout(200)
  }

  // Wpływ = high
  const highBtn = page.locator('button').filter({ hasText: /wysoki/i }).first()
  if (await highBtn.count() > 0) {
    await highBtn.click()
    await page.waitForTimeout(200)
  }
})
await page.screenshot({ path: `${DIR}/p2-05a-cr-form-filled.png`, fullPage: true })

await step('P2-5b. CR: Zapisz CR', async () => {
  const saveBtn = page.locator('button').filter({ hasText: /zapisz do rejestru/i }).first()
  const cnt = await saveBtn.count()
  if (cnt === 0) throw new Error('Brak przycisku "Zapisz do rejestru"')
  await saveBtn.click()
  await page.waitForTimeout(1500)
})
await page.screenshot({ path: `${DIR}/p2-05b-cr-saved.png`, fullPage: true })

await step('P2-5c. CR: "Zmiana scope" pojawia się w rejestrze', async () => {
  const crRow = await page.locator('*').filter({ hasText: /zmiana scope/i }).count()
  log(`CR "Zmiana scope" w rejestrze: ${crRow}`)
  if (crRow === 0) {
    finding('WYSOKIE', 'CR-P2-save', 'CR "Zmiana scope" nie pojawia się w rejestrze po zapisaniu', 'row in register', 'not found')
  }
})

await step('P2-6. Mapa klocków: klik diamencika i wybierz "Robimy"', async () => {
  const ok = await clickTab('Mapa klocków')
  if (!ok) throw new Error('Brak zakładki Mapa klocków')
  await page.waitForTimeout(600)

  // Znajdź i kliknij diamond
  const found = await page.evaluate(() => {
    const btns = document.querySelectorAll('button')
    for (const btn of btns) {
      const spans = btn.querySelectorAll('span')
      for (const sp of spans) {
        if (sp.className.includes('rotate-45')) {
          btn.click()
          return true
        }
      }
    }
    return false
  })

  if (!found) {
    finding('ŚREDNIE', 'Diamenciki-P2', 'Brak diamencika na Mapie klocków', 'diamond found', 'not found')
    return
  }
  await page.waitForTimeout(600)

  const robimyBtn = page.locator('button').filter({ hasText: /robimy/i }).first()
  const cnt = await robimyBtn.count()
  if (cnt === 0) {
    finding('WYSOKIE', 'Diamenciki-P2', 'Dialog diamencika nie ma przycisku "Robimy"', '"Robimy" button', 'absent')
    return
  }
  await robimyBtn.click()
  await page.waitForTimeout(1500)
})
await page.screenshot({ path: `${DIR}/p2-06a-after-robimy.png`, fullPage: true })

await step('P2-6b. Sprawdź że romb zmienił wygląd (filled teal)', async () => {
  const filledDiamond = await page.evaluate(() => {
    const btns = document.querySelectorAll('button')
    for (const btn of btns) {
      const spans = btn.querySelectorAll('span')
      for (const sp of spans) {
        if (sp.className.includes('rotate-45')) {
          return { cls: sp.className, filled: sp.className.includes('bg-teal') }
        }
      }
    }
    return null
  })
  log(`Diamond po "Robimy": ${JSON.stringify(filledDiamond)}`)
  if (!filledDiamond) {
    finding('ŚREDNIE', 'Diamenciki-P2', 'Nie znaleziono rombu po decyzji "Robimy"', 'diamond present', 'not found')
  } else if (!filledDiamond.filled) {
    finding('WYSOKIE', 'Diamenciki-P2', 'Romb nie zmienił wyglądu na "filled teal" po wyborze "Robimy"', 'bg-teal class', `class: ${filledDiamond.cls}`)
  } else {
    log('OK: Romb jest filled teal po "Robimy"')
  }
})
await page.screenshot({ path: `${DIR}/p2-06b-diamond-filled.png` })

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA 3 — JUNIOR (chaos)
// ─────────────────────────────────────────────────────────────────────────────

log('\n\n========== PERSONA 3: JUNIOR (CHAOS) ==========\n')
currentPersona = 'P3-Junior'

await step('P3-0. Reload projektu', async () => {
  await page.goto(BASE + projectUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
})

await step('P3-1. Szybkie przełączanie zakładek — sprawdź crashe', async () => {
  const tabNames = ['RAID', 'KPI', 'Budżet', 'CR', 'RACI', 'RAID', 'KPI', 'Budżet']
  for (const tabName of tabNames) {
    const tab = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(`^${tabName}$`, 'i') }).first()
    const cnt = await tab.count()
    if (cnt > 0) {
      await tab.click()
      await page.waitForTimeout(300)
      // Sprawdź czy strona nie crashnęła
      const crashed = await page.locator('*').filter({ hasText: /error|unexpected|application error|something went wrong/i }).count()
      if (crashed > 0) {
        finding('KRYTYCZNE', `Tab-${tabName}`, `Crash/error po szybkim kliknięciu zakładki ${tabName}`, 'no crash', 'error visible')
      }
    }
  }
  log('Szybkie przełączanie zakładek: brak crashu')
})
await page.screenshot({ path: `${DIR}/p3-01-tabs-rapid.png`, fullPage: true })

await step('P3-2. RAID: dodaj ryzyko BEZ OPISU — walidacja', async () => {
  await clickTab('RAID')
  await page.waitForTimeout(400)

  const addBtn = page.locator('button').filter({ hasText: /dodaj ryzyko/i }).first()
  await addBtn.click()
  await page.waitForTimeout(500)

  const modal = await page.locator('[role="dialog"]').count()
  if (modal === 0) {
    finding('WYSOKIE', 'RAID-walidacja', 'Modal nie otworzył się', 'dialog opens', 'not found')
    return
  }

  // Zostaw opis pusty, wpisz tylko właściciela
  const ownerInput = page.locator('input[id="risk-owner"]').first()
  if (await ownerInput.count() > 0) {
    await ownerInput.fill('Tester')
  }

  // Kliknij Zapisz bez opisu
  const saveBtn = page.locator('button[form="risk-form"]').first()
  await saveBtn.click()
  await page.waitForTimeout(500)

  // Modal powinien nadal być otwarty (walidacja HTML required blokuje)
  const modalStillOpen = await page.locator('[role="dialog"]').count()
  const descField = page.locator('textarea[id="risk-desc"]')
  const descInvalid = await descField.evaluate(el => !el.validity.valid)
  log(`Modal po kliknięciu Zapisz bez opisu: ${modalStillOpen}, opis invalid: ${descInvalid}`)

  if (modalStillOpen === 0) {
    finding('WYSOKIE', 'RAID-walidacja', 'Modal zamknął się bez opisu — walidacja "Opis jest wymagany" nie działa', 'modal stays open', 'modal closed')
  } else {
    log('OK: Walidacja działa — modal nadal otwarty przy pustym opisie')
  }
})
await page.screenshot({ path: `${DIR}/p3-02-raid-validation.png` })

// Zamknij modal
await step('P3-2b. Zamknij modal RAID', async () => {
  const cancel = page.locator('button').filter({ hasText: /anuluj/i }).first()
  if (await cancel.count() > 0) await cancel.click()
  else await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
})

await step('P3-3. RAID: P=3, W=4 → Score=12 → RAG=A (amber)', async () => {
  const addBtn = page.locator('button').filter({ hasText: /dodaj ryzyko/i }).first()
  await addBtn.click()
  await page.waitForTimeout(500)

  const modal = await page.locator('[role="dialog"]').count()
  if (modal === 0) {
    finding('WYSOKIE', 'RAID-RAG-A', 'Modal nie otworzył się', 'dialog opens', 'not found')
    return
  }

  // Opis
  await page.locator('textarea[id="risk-desc"]').fill('Test RAG Amber')

  // P=3 (combobox idx 1), W=4 (combobox idx 2)
  const triggers = page.locator('button[role="combobox"]')
  const tCnt = await triggers.count()
  log(`Combobox triggers w modalu: ${tCnt}`)

  // Ustaw P=3
  if (tCnt >= 2) {
    await triggers.nth(1).click()
    await page.waitForTimeout(300)
    const opts = page.locator('[role="option"]')
    const optCnt = await opts.count()
    log(`Opcje po otwarciu P-select: ${optCnt}`)
    // Opcja 3 (0-indexed: 2)
    if (optCnt >= 3) {
      await opts.nth(2).click()
    }
    await page.waitForTimeout(200)
  }

  // Ustaw W=4
  if (tCnt >= 3) {
    await triggers.nth(2).click()
    await page.waitForTimeout(300)
    const opts = page.locator('[role="option"]')
    const optCnt = await opts.count()
    // Opcja 4 (0-indexed: 3)
    if (optCnt >= 4) {
      await opts.nth(3).click()
    }
    await page.waitForTimeout(200)
  }

  // Sprawdź preview
  const score12 = await page.locator('*').filter({ hasText: /P×W\s*=\s*12/i }).count()
  const amberBadge = await page.locator('*').filter({ hasText: /pomarańczowy/i }).count()
  log(`Score P×W=12: ${score12}, Amber label: ${amberBadge}`)

  // Sprawdź badge A
  const aBadge = await page.evaluate(() => {
    const spans = document.querySelectorAll('span')
    for (const sp of spans) {
      if (sp.textContent.trim() === 'A' && sp.className.includes('rounded-full')) {
        return sp.className
      }
    }
    return null
  })
  log(`Badge A w preview: ${aBadge}`)

  if (score12 === 0) {
    finding('WYSOKIE', 'RAID-RAG-A', 'P×W=12 nie wyświetla się w preview', 'P×W = 12', 'not found')
  }
  if (!aBadge && amberBadge === 0) {
    finding('WYSOKIE', 'RAID-RAG-A', 'Badge A (amber) nie widoczny przy P=3, W=4 (score=12)', 'A badge amber', 'not found')
  }
})
await page.screenshot({ path: `${DIR}/p3-03-raid-amber.png` })

// Zamknij modal
const cancelAgain = page.locator('button').filter({ hasText: /anuluj/i }).first()
if (await cancelAgain.count() > 0) await cancelAgain.click()
else await page.keyboard.press('Escape')
await page.waitForTimeout(400)

await step('P3-4. KPI: klik status badge 5 razy szybko — desync?', async () => {
  await clickTab('KPI')
  await page.waitForTimeout(600)

  const statusBtns = page.locator('button').filter({ hasText: /na czasie|zagrożony|opóźniony|ukończony/i })
  const cnt = await statusBtns.count()
  if (cnt === 0) {
    finding('NISKIE', 'KPI-P3', 'Brak kart KPI do testowania rapid click', 'KPI cards', 'empty')
    return
  }

  const firstBtn = statusBtns.first()
  const beforeText = await firstBtn.innerText()

  // Rapid click x5
  for (let i = 0; i < 5; i++) {
    await firstBtn.click()
    await page.waitForTimeout(80)
  }

  await page.waitForTimeout(1500) // Poczekaj na sync ze server

  // Sprawdź stan po szybkich kliknięciach
  const allStatusBtns = await page.locator('button').filter({ hasText: /na czasie|zagrożony|opóźniony|ukończony/i }).all()
  let finalStatuses = []
  for (const btn of allStatusBtns.slice(0, 5)) {
    finalStatuses.push(await btn.innerText())
  }
  log(`Statusy KPI po rapid click x5: ${finalStatuses}`)

  // Sprawdź błędy konsoli po rapid click
  const rapidErrors = consoleErrors.filter(e => e.action.includes('KPI') || e.action.includes('rapid'))
  log(`Błędy konsoli po rapid click: ${rapidErrors.length}`)
  if (rapidErrors.length > 0) {
    finding('WYSOKIE', 'KPI-P3-rapid', `${rapidErrors.length} błędów konsoli po rapid click na KPI status`, '0 errors', `${rapidErrors.length} errors`)
  }

  // Odśwież i sprawdź czy stan jest zgodny
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await clickTab('KPI')
  await page.waitForTimeout(600)

  const afterReloadBtns = await page.locator('button').filter({ hasText: /na czasie|zagrożony|opóźniony|ukończony/i }).all()
  let afterStatuses = []
  for (const btn of afterReloadBtns.slice(0, 5)) {
    afterStatuses.push(await btn.innerText())
  }
  log(`Statusy KPI po reload: ${afterStatuses}`)
  // 5 kliknięć: cycle: on→at→off→done→on (wraca do stanu wyjściowego lub +1 jeśli nieparzyste)
  log(`Przed: ${beforeText}, Po reload: ${afterStatuses[0]}`)
})
await page.screenshot({ path: `${DIR}/p3-04-kpi-rapid.png`, fullPage: true })

await step('P3-5. CR: otwórz formularz, nic nie wypełniaj, kliknij Zapisz — walidacja', async () => {
  await clickTab('CR')
  await page.waitForTimeout(500)

  const btn = page.locator('button').filter({ hasText: /nowy cr/i }).first()
  await btn.click()
  await page.waitForTimeout(500)

  const formVisible = await page.locator('*').filter({ hasText: /nowy change request/i }).count()
  if (formVisible === 0) {
    finding('WYSOKIE', 'CR-P3', 'Formularz CR nie otworzył się', 'form opens', 'not found')
    return
  }

  // Kliknij "Zapisz do rejestru" bez wypełniania
  const saveBtn = page.locator('button').filter({ hasText: /zapisz do rejestru/i }).first()
  const sCnt = await saveBtn.count()
  if (sCnt === 0) {
    finding('WYSOKIE', 'CR-P3', 'Brak przycisku "Zapisz do rejestru"', 'save button', 'absent')
    return
  }
  await saveBtn.click()
  await page.waitForTimeout(500)

  // Sprawdź walidację — powinna pokazać błąd "Tytuł jest wymagany"
  const errorMsg = await page.locator('*').filter({ hasText: /tytuł jest wymagany|tytuł.*wymagan/i }).count()
  const formStillOpen = await page.locator('*').filter({ hasText: /nowy change request/i }).count()
  log(`Błąd walidacji CR: ${errorMsg}, formularz nadal otwarty: ${formStillOpen}`)

  if (formStillOpen === 0) {
    finding('WYSOKIE', 'CR-walidacja', 'Formularz CR zamknął się bez wypełnionego tytułu — walidacja nie działa', 'form stays open with error', 'form closed')
  } else if (errorMsg === 0) {
    finding('ŚREDNIE', 'CR-walidacja', 'Formularz CR nie pokazuje błędu "Tytuł jest wymagany" przy pustym tytule', 'error message', 'no error visible')
  } else {
    log('OK: Walidacja CR działa — błąd widoczny, formularz otwarty')
  }
})
await page.screenshot({ path: `${DIR}/p3-05-cr-validation.png` })

// Zamknij formularz CR
const crCancel = page.locator('button').filter({ hasText: /anuluj/i }).first()
if (await crCancel.count() > 0) await crCancel.click()
await page.waitForTimeout(400)

await step('P3-6. RACI: klik komórki kilka razy — cykl R→A→C→I→—', async () => {
  await clickTab('RACI')
  await page.waitForTimeout(600)

  const raciTable = await page.locator('table').count()
  if (raciTable === 0) {
    finding('NISKIE', 'RACI-P3', 'Brak tabeli RACI — nie można przetestować cyklu', 'table present', 'empty state')
    return
  }

  // Znajdź pierwszą komórkę RACI (button w td)
  const firstCell = page.locator('tbody td button').first()
  const cellCnt = await firstCell.count()
  if (cellCnt === 0) {
    finding('WYSOKIE', 'RACI-P3', 'Brak klikalnych komórek w tabeli RACI', 'clickable cells', 'absent')
    return
  }

  // Zbierz tekst przed
  const before = await firstCell.innerText()
  log(`Komórka RACI przed: "${before}"`)

  const cycle = ['R', 'A', 'C', 'I', '—']
  let prevText = before
  let cycleOk = true

  for (let i = 0; i < 5; i++) {
    await firstCell.click()
    await page.waitForTimeout(300)
    const current = await firstCell.innerText()
    log(`Po klik ${i+1}: "${current}"`)

    const expectedIdx = cycle.indexOf(prevText.trim())
    const expectedNext = cycle[(expectedIdx + 1) % cycle.length]

    if (current.trim() !== expectedNext && prevText.trim() !== '—') {
      // Sprawdź specjalny przypadek gdy wartość jest —
      const cleanCurrent = current.replace(/\s+/g, '').trim()
      const cleanExpected = expectedNext.trim()
      if (cleanCurrent !== cleanExpected) {
        finding('WYSOKIE', 'RACI-cykl', `Cykl RACI nieprawidłowy po ${i+1} kliknięciu: oczekiwano "${expectedNext}", got "${current}"`, expectedNext, current)
        cycleOk = false
      }
    }
    prevText = current
  }

  if (cycleOk) log('OK: Cykl RACI działa prawidłowo')
})
await page.screenshot({ path: `${DIR}/p3-06-raci-cycle.png`, fullPage: true })

// ─── FINALNA KONSOLA ─────────────────────────────────────────────────────────

log('\n\n=== WSZYSTKIE BŁĘDY KONSOLI ===')
if (consoleErrors.length === 0) {
  log('(brak błędów konsoli — ZERO errors)')
} else {
  consoleErrors.forEach(e => log(`  [${e.persona}/${e.action}] ${e.msg}`))
}

log('\n=== BŁĘDY SIECIOWE (4xx/5xx) ===')
if (networkErrors.length === 0) {
  log('(brak błędów sieciowych)')
} else {
  networkErrors.forEach(e => log(`  [${e.persona}/${e.action}] ${e.info}`))
}

log('\n\n=== FINDINGS SUMMARY ===')
const bySev = { KRYTYCZNE: [], WYSOKIE: [], ŚREDNIE: [], NISKIE: [], FAIL: [] }
for (const f of findings) {
  const key = bySev[f.sev] ? f.sev : 'FAIL'
  bySev[key].push(f)
}
for (const [sev, items] of Object.entries(bySev)) {
  if (items.length > 0) {
    log(`\n[${sev}] (${items.length}):`)
    items.forEach(f => log(`  - [${f.persona}] ${f.area}: ${f.what} | EXPECTED: ${f.expected} | GOT: ${f.got}`))
  }
}
log(`\nTotal findings: ${findings.length}`)
log(`Console errors: ${consoleErrors.length}`)
log(`Network errors: ${networkErrors.length}`)

await browser.close()
log(`\nScreenshots w ${DIR}`)
