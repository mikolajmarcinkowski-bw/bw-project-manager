#!/usr/bin/env node
// BW Project Manager — Testy penetracyjne 3 person dla nowych funkcji Admin + Archiwizacja
// Persona 1: Admin (system uprawnień)
// Persona 2: PM (workflow cyklu życia projektu)
// Persona 3: Junior (bezpieczeństwo + chaos)

import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'http://localhost:3000'
const DIR = '/tmp/penetration-tests'
mkdirSync(DIR, { recursive: true })

const findings = []
let currentPersona = 'init'
let currentAction = 'init'

const log = (...args) => console.log(...args)

function finding(sev, area, what, expected, got, details = '') {
  findings.push({ sev, persona: currentPersona, area, what, expected, got, details })
  const gotStr = got !== undefined ? ` | GOT: ${JSON.stringify(got)}` : ''
  const expStr = expected !== undefined ? ` | EXPECTED: ${JSON.stringify(expected)}` : ''
  const detailStr = details ? ` | ${details}` : ''
  log(`  [${sev}][${currentPersona}] ${area}: ${what}${expStr}${gotStr}${detailStr}`)
}

let consoleErrors = []
let networkErrors = []

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

// Setup error tracking
page.on('console', (m) => {
  if (m.type() === 'error') {
    const msg = m.text().slice(0, 300)
    consoleErrors.push({ persona: currentPersona, action: currentAction, msg })
    log(`  [CONSOLE ERROR] ${msg}`)
  }
})

page.on('pageerror', (e) => {
  const msg = 'PAGEERROR: ' + String(e).slice(0, 300)
  consoleErrors.push({ persona: currentPersona, action: currentAction, msg })
  log(`  [PAGE ERROR] ${msg}`)
})

page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) {
    networkErrors.push({ persona: currentPersona, action: currentAction, status: r.status(), url: r.url().slice(0, 120) })
  }
})

const step = async (name, fn) => {
  currentAction = name
  log(`\n  ✓ ${name}`)
  try {
    await fn()
  } catch (e) {
    const msg = String(e).split('\n')[0].slice(0, 220)
    log(`  ✗ FAIL: ${msg}`)
    throw e
  }
}

const screenshot = async (name) => {
  await page.screenshot({ path: join(DIR, `${currentPersona}_${name}.png`), fullPage: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA 1 — ADMIN (weryfikacja systemu uprawnień)
// ─────────────────────────────────────────────────────────────────────────────

log('\n\n' + '═'.repeat(80))
log('PERSONA 1 — ADMIN (weryfikacja systemu uprawnień)')
log('═'.repeat(80))

currentPersona = 'ADMIN'
consoleErrors = []
networkErrors = []

try {
  // Test 1: Login
  await step('1. Wejście na /login i kliknięcie "Wejdź jako Admin"', async () => {
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })

    // Szukaj przycisku "Wejdź jako Admin"
    const adminBtn = page.locator('button, a').filter({ hasText: /wejdź jako admin/i }).first()
    const cnt = await adminBtn.count()
    if (cnt === 0) {
      finding('KRYTYCZNE', 'login', 'Brak przycisku "Wejdź jako Admin"', 'button present', 'absent')
      throw new Error('Nie można zalogować')
    }
    await adminBtn.click()
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 })
  })

  // Test 2: Sprawdzenie czy /admin jest dostępna
  await step('2. Wejście na /admin — czy jest dostępna?', async () => {
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' })
    const title = await page.locator('h1, h2').first().textContent()
    const url = page.url()

    if (url.includes('/admin')) {
      log(`    URL: ${url}`)
      log(`    Nagłówek: ${title}`)
    } else {
      finding('KRYTYCZNE', 'admin-access', '/admin niedostępna', '/admin path', url)
    }
  })
  await screenshot('01-admin-page')

  // Test 3: Sprawdzenie Zarządzania kontami
  await step('3. Kliknij "Zarządzanie kontami" → /admin/users', async () => {
    const usersLink = page.locator('a, button').filter({ hasText: /zarządzanie kontami|users/i }).first()
    const cnt = await usersLink.count()

    if (cnt === 0) {
      finding('WYSOKIE', 'admin-menu', 'Brak linku "Zarządzanie kontami"', 'link present', 'absent')
    } else {
      await usersLink.click()
      await page.waitForURL(/\/admin\/users/, { timeout: 10000 })
      log(`    Navigated to: ${page.url()}`)
    }
  })
  await screenshot('02-admin-users')

  // Test 4: Sprawdzenie listy kont
  await step('4. Czy widać listę kont?', async () => {
    const table = page.locator('table')
    const tableCount = await table.count()

    if (tableCount === 0) {
      finding('WYSOKIE', 'users-list', 'Brak tabeli z listą kont', 'table present', 'absent')
    } else {
      const rows = page.locator('table tbody tr')
      const rowCount = await rows.count()
      log(`    Znaleziono ${rowCount} użytkowników`)

      if (rowCount === 0) {
        finding('ŚREDNIE', 'users-list', 'Tabela jest pusta', 'users visible', 'empty table')
      }
    }
  })

  // Test 5: Przycisk "+ Dodaj użytkownika"
  await step('5. Kliknij "+ Dodaj użytkownika" — czy modal się otwiera?', async () => {
    const addBtn = page.locator('button').filter({ hasText: /\+ dodaj użytkownika|dodaj użytkownika|add user/i }).first()
    const cnt = await addBtn.count()

    if (cnt === 0) {
      finding('WYSOKIE', 'add-user', 'Brak przycisku "+ Dodaj użytkownika"', 'button present', 'absent')
    } else {
      await addBtn.click()
      await page.waitForTimeout(1000)

      // Czekaj na modal
      const modal = page.locator('[role="dialog"], .modal, .dialog').first()
      const modalCnt = await modal.count()

      if (modalCnt === 0) {
        finding('WYSOKIE', 'add-user-modal', 'Modal nie otworzył się', 'dialog present', 'absent')
      } else {
        log(`    Modal otwarty`)

        // Sprawdzenie pól formularza
        const emailField = page.locator('input[type="email"], input[name*="email"]').first()
        const nameField = page.locator('input[name*="name"], input[name*="imię"]').first()
        const passwordField = page.locator('input[type="password"]').first()
        const roleSelect = page.locator('select, [role="combobox"], .select').first()

        const emailCnt = await emailField.count()
        const nameCnt = await nameField.count()
        const passCnt = await passwordField.count()
        const roleCnt = await roleSelect.count()

        if (emailCnt === 0) finding('WYSOKIE', 'modal-form', 'Brak pola email', 'email field present', 'absent')
        if (nameCnt === 0) finding('WYSOKIE', 'modal-form', 'Brak pola imię', 'name field present', 'absent')
        if (passCnt === 0) finding('WYSOKIE', 'modal-form', 'Brak pola hasło', 'password field present', 'absent')
        if (roleCnt === 0) finding('WYSOKIE', 'modal-form', 'Brak selecta rola', 'role select present', 'absent')
      }
    }
  })
  await screenshot('03-add-user-modal')

  // Test 6: Walidacja - próba dodania usera bez emaila
  await step('6. Walidacja: próba dodania usera bez emaila → czy blokuje?', async () => {
    // Modal powinien być już otwarty
    const modal = page.locator('[role="dialog"], .modal, .dialog').first()
    const modalCnt = await modal.count()

    if (modalCnt > 0) {
      // Usunąć email jeśli jest
      const emailField = page.locator('input[type="email"], input[name*="email"]').first()
      await emailField.fill('')

      // Spróbuj submit (przycisk Save/Submit)
      const submitBtn = page.locator('button').filter({ hasText: /save|submit|dodaj|add/i }).first()
      const submitCnt = await submitBtn.count()

      if (submitCnt > 0) {
        const isDisabled = await submitBtn.isDisabled()
        if (isDisabled) {
          log(`    Przycisk submit jest disabled (poprawnie)`)
        } else {
          finding('WYSOKI', 'validation', 'Przycisk submit NIE jest disabled bez emaila', 'button disabled', 'button enabled')
          // Sprawdź czy pojawi się error message
          await submitBtn.click()
          await page.waitForTimeout(500)
          const errorMsg = page.locator('[role="alert"], .error, .text-red-600').first()
          const errorCnt = await errorMsg.count()
          if (errorCnt > 0) {
            const text = await errorMsg.textContent()
            log(`    Error message: ${text}`)
          }
        }
      }
    }
  })

  // Test 7: Dodaj testowego usera (reset i wpisz poprawne dane)
  await step('7. Dodaj testowego usera: email=test-pentest@bwmanager.pl, imię="Test Pentest", hasło="Testpass123!", rola=user', async () => {
    // Zamknij modal jeśli jest otwarte (ESC) i otwórz na nowo
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Otwórz modal od nowa
    const addBtn = page.locator('button').filter({ hasText: /\+ dodaj użytkownika|dodaj użytkownika/i }).first()
    const addCnt = await addBtn.count()

    if (addCnt > 0) {
      await addBtn.click()
      await page.waitForTimeout(1000)
    }

    // Wpisz dane
    const emailField = page.locator('input[type="email"], input[name*="email"]').first()
    const nameField = page.locator('input[name*="name"], input[name*="imię"]').first()
    const passwordField = page.locator('input[type="password"]').first()

    if (await emailField.count() > 0) {
      await emailField.fill('test-pentest@bwmanager.pl')
    }
    if (await nameField.count() > 0) {
      await nameField.fill('Test Pentest')
    }
    if (await passwordField.count() > 0) {
      await passwordField.fill('Testpass123!')
    }

    // Wybierz rolę (user)
    const roleSelect = page.locator('select, [role="combobox"]').first()
    if (await roleSelect.count() > 0) {
      await roleSelect.click()
      await page.waitForTimeout(300)
      const userRole = page.locator('option, [role="option"]').filter({ hasText: /^user$/i }).first()
      if (await userRole.count() > 0) {
        await userRole.click()
      }
    }

    // Submit
    const submitBtn = page.locator('button').filter({ hasText: /save|submit|dodaj|add/i }).first()
    if (await submitBtn.count() > 0) {
      await submitBtn.click()
      await page.waitForTimeout(2000)
      log(`    User submission initiated`)
    }
  })
  await screenshot('04-add-user-form-filled')

  // Test 8: Czy użytkownik pojawia się na liście?
  await step('8. Czy nowy użytkownik pojawia się na liście?', async () => {
    // Odśwież listę
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Szukaj test-pentest@bwmanager.pl
    const testUserRow = page.locator('table tbody tr').filter({ hasText: /test-pentest@bwmanager\.pl/ }).first()
    const testUserCnt = await testUserRow.count()

    if (testUserCnt > 0) {
      log(`    Test user znaleziony w tabeli`)
    } else {
      finding('WYSOKIE', 'user-creation', 'Nowy user nie pojawił się w liście', 'user visible', 'user absent')
    }
  })

  // Test 9: Zmiana roli usera na "admin"
  await step('9. Zmień rolę usera na "admin" → czy zmiana jest widoczna?', async () => {
    // Szukaj przycisku edit/edit role dla test-pentest
    const editBtn = page.locator('button').filter({ hasText: /edit|zmień|rola/ }).first()
    const editCnt = await editBtn.count()

    if (editCnt > 0) {
      await editBtn.click()
      await page.waitForTimeout(1000)

      // Zmień rolę
      const roleSelect = page.locator('select, [role="combobox"]').first()
      if (await roleSelect.count() > 0) {
        await roleSelect.click()
        await page.waitForTimeout(300)
        const adminRole = page.locator('option, [role="option"]').filter({ hasText: /admin/i }).first()
        if (await adminRole.count() > 0) {
          await adminRole.click()
          await page.waitForTimeout(500)
          log(`    Role zmieniona na admin`)
        }
      }

      // Save
      const submitBtn = page.locator('button').filter({ hasText: /save|submit/ }).first()
      if (await submitBtn.count() > 0) {
        await submitBtn.click()
        await page.waitForTimeout(1500)
      }
    }
  })
  await screenshot('05-user-role-changed')

  // Test 10: Pula specjalistów
  await step('10. Kliknij "Pula specjalistów" → /admin/team — czy widać listę?', async () => {
    const teamLink = page.locator('a, button').filter({ hasText: /pula specjalistów|team|team pool/i }).first()
    const teamCnt = await teamLink.count()

    if (teamCnt === 0) {
      finding('ŚREDNIE', 'admin-menu', 'Brak linku "Pula specjalistów"', 'link present', 'absent')
    } else {
      await teamLink.click()
      await page.waitForURL(/\/admin\/team/, { timeout: 10000 })

      // Sprawdź czy jest lista
      const table = page.locator('table')
      const tableCnt = await table.count()

      if (tableCnt === 0) {
        finding('ŚREDNIE', 'team-list', 'Brak tabeli w /admin/team', 'table present', 'absent')
      }
    }
  })
  await screenshot('06-admin-team')

  // Test 11: Sprawdzenie czy sidebar pokazuje sekcję "Admin"
  await step('11. Sprawdź że sidebar pokazuje sekcję "Admin"', async () => {
    const adminSection = page.locator('nav, .sidebar').first()
    const adminLink = page.locator('nav, .sidebar').locator('a, button').filter({ hasText: /admin/i }).first()
    const adminLinkCnt = await adminLink.count()

    if (adminLinkCnt === 0) {
      finding('ŚREDNIE', 'sidebar', 'Brak sekcji Admin w sidebarze', 'admin link visible', 'absent')
    } else {
      log(`    Admin section widoczna w sidebarze`)
    }
  })
  await screenshot('07-admin-sidebar')

} catch (e) {
  log(`\n[PERSONA 1] FATAL ERROR: ${String(e).slice(0, 200)}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA 2 — PM (workflow lifecycle projektu)
// ─────────────────────────────────────────────────────────────────────────────

log('\n\n' + '═'.repeat(80))
log('PERSONA 2 — PM (workflow lifecycle projektu)')
log('═'.repeat(80))

currentPersona = 'PM'
consoleErrors = []
networkErrors = []

try {
  // Logowanie
  await step('1. Login (jeśli wylogowany)', async () => {
    const url = page.url()
    if (url.includes('/login')) {
      const adminBtn = page.locator('button, a').filter({ hasText: /wejdź jako admin/i }).first()
      if (await adminBtn.count() > 0) {
        await adminBtn.click()
        await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 })
      }
    }
  })

  // Test 1: Wejście na /projekty
  await step('2. Wejdź na /projekty → znajdź projekt (Kaufland/ELTRON/dowolny)', async () => {
    await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Szukaj linku do projektu
    const projectLink = page.locator('a[href*="/projects/"]').first()
    const projectCnt = await projectLink.count()

    if (projectCnt === 0) {
      // Spróbuj dashboard
      await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      const dashLink = page.locator('a[href*="/projects/"]').first()
      if (await dashLink.count() === 0) {
        finding('KRYTYCZNE', 'projects', 'Brak projektów w systemie', 'projects visible', 'no projects')
        throw new Error('Brak projektów do testowania')
      }
    }

    // Kliknij na projekt
    const link = page.locator('a[href*="/projects/"]').first()
    await link.click()
    await page.waitForURL(/\/projects\//, { timeout: 10000 })
    log(`    Projekt otwarty: ${page.url()}`)
  })
  await screenshot('08-pm-project-open')

  // Test 2: Sprawdzenie czy jest przycisk "Oznacz jako zakończony"
  await step('3. Sprawdź nagłówek — czy jest przycisk "Oznacz jako zakończony"?', async () => {
    const completeBtn = page.locator('button').filter({ hasText: /oznacz jako zakończony|mark completed|zakończony/i }).first()
    const completeCnt = await completeBtn.count()

    if (completeCnt === 0) {
      finding('WYSOKIE', 'pm-workflow', 'Brak przycisku "Oznacz jako zakończony"', 'button present', 'absent')
    } else {
      log(`    Przycisk "Oznacz jako zakończony" znaleziony`)
    }
  })

  // Test 3: Kliknij "Oznacz jako zakończony"
  await step('4. Kliknij "Oznacz jako zakończony" → czy projekt zmienia status?', async () => {
    const completeBtn = page.locator('button').filter({ hasText: /oznacz jako zakończony|mark completed|zakończony/i }).first()
    const completeCnt = await completeBtn.count()

    if (completeCnt > 0) {
      await completeBtn.click()
      await page.waitForTimeout(1500)

      // Sprawdź czy pojawiła się potwierdzenie/dialog
      const confirmDialog = page.locator('[role="dialog"], .modal, .confirm').first()
      const confirmCnt = await confirmDialog.count()

      if (confirmCnt > 0) {
        log(`    Dialog potwierdzenia pojawił się`)

        // Kliknij "Potwierdź" lub "Tak"
        const confirmBtn = page.locator('button').filter({ hasText: /potwierdź|tak|yes|confirm/ }).first()
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click()
          await page.waitForTimeout(1500)
        }
      } else {
        log(`    Status zmieniony bez dialogu`)
      }

      // Sprawdzenie nowego statusu
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      const statusBadge = page.locator('.badge, .status, [data-status]').first()
      const statusText = await statusBadge.textContent()
      log(`    Nowy status: ${statusText}`)
    }
  })
  await screenshot('09-pm-project-completed')

  // Test 4: Sprawdzenie czy jest przycisk "Archiwizuj"
  await step('5. Wróć do projektu — czy widać przycisk "Archiwizuj"?', async () => {
    // Projekt powinien być w przeglądarce
    const archiveBtn = page.locator('button').filter({ hasText: /archiwizuj|archive/ }).first()
    const archiveCnt = await archiveBtn.count()

    if (archiveCnt === 0) {
      finding('WYSOKIE', 'pm-workflow', 'Brak przycisku "Archiwizuj"', 'button present', 'absent')
    } else {
      log(`    Przycisk "Archiwizuj" znaleziony`)
    }
  })

  // Test 5: Kliknij "Archiwizuj"
  await step('6. Kliknij "Archiwizuj" → czy dialog z polem "wpisz nazwę projektu"?', async () => {
    const archiveBtn = page.locator('button').filter({ hasText: /archiwizuj|archive/ }).first()
    const archiveCnt = await archiveBtn.count()

    if (archiveCnt > 0) {
      await archiveBtn.click()
      await page.waitForTimeout(1000)

      // Czekaj na dialog
      const dialog = page.locator('[role="dialog"], .modal').first()
      const dialogCnt = await dialog.count()

      if (dialogCnt > 0) {
        // Szukaj pola tekstowego do wpisania nazwy
        const nameField = page.locator('input[type="text"]').first()
        const nameFieldCnt = await nameField.count()

        if (nameFieldCnt > 0) {
          log(`    Dialog archiwizacji otworzył się z polem tekstowym`)
        } else {
          finding('ŚREDNIE', 'archive-dialog', 'Brak pola tekstowego w dialogu archiwizacji', 'text field present', 'absent')
        }
      } else {
        finding('WYSOKIE', 'archive-dialog', 'Dialog archiwizacji nie otworzył się', 'dialog present', 'absent')
      }
    }
  })
  await screenshot('10-pm-archive-dialog')

  // Test 6: Walidacja - złą nazwę → disabled
  await step('7. Wpisz złą nazwę → czy przycisk jest disabled?', async () => {
    const nameField = page.locator('input[type="text"]').first()
    const nameFieldCnt = await nameField.count()

    if (nameFieldCnt > 0) {
      // Pobierz prawidłową nazwę z nagłówka projektu
      const headerText = page.locator('h1, h2').first()
      const headerContent = await headerText.textContent()
      log(`    Nagłówek projektu: ${headerContent}`)

      // Wpisz złą nazwę
      await nameField.fill('Wrong Name')
      await page.waitForTimeout(500)

      // Sprawdź status przycisku
      const submitBtn = page.locator('button').filter({ hasText: /potwierdź|submit|archiwizuj|confirm/ }).first()
      const isDisabled = await submitBtn.isDisabled()

      if (isDisabled) {
        log(`    Przycisk jest disabled (poprawnie)`)
      } else {
        finding('WYSOKI', 'archive-validation', 'Przycisk NIE jest disabled dla złej nazwy', 'button disabled', 'button enabled')
      }
    }
  })

  // Test 7: Wpisz poprawną nazwę
  await step('8. Wpisz poprawną nazwę → czy archiwizacja działa i redirect na /archiwum?', async () => {
    const nameField = page.locator('input[type="text"]').first()
    const nameFieldCnt = await nameField.count()

    if (nameFieldCnt > 0) {
      // Pobierz prawidłową nazwę
      const headerText = page.locator('h1, h2').first()
      const headerContent = await headerText.textContent()
      const cleanedName = headerContent?.split('\n')[0].trim() || 'Project'

      // Clear i wpisz
      await nameField.fill(cleanedName)
      await page.waitForTimeout(500)

      // Submit
      const submitBtn = page.locator('button').filter({ hasText: /potwierdź|submit|archiwizuj|confirm/ }).first()
      if (await submitBtn.count() > 0) {
        await submitBtn.click()
        await page.waitForURL(/\/archiwum/, { timeout: 10000 })
        log(`    Archiwizacja zakończona, redirect: ${page.url()}`)
      }
    }
  })
  await screenshot('11-pm-archived')

  // Test 8: Wejść na /archiwum
  await step('9. Wejdź na /archiwum → czy projekt widoczny na liście?', async () => {
    await page.goto(BASE + '/archiwum', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Szukaj archiwalnego projektu
    const archivedProjects = page.locator('table tbody tr')
    const projectCnt = await archivedProjects.count()

    if (projectCnt > 0) {
      log(`    Znaleziono ${projectCnt} zarchiwizowanych projektów`)
    } else {
      finding('ŚREDNIE', 'archive-page', 'Brak projektów na /archiwum', 'projects visible', 'empty list')
    }
  })
  await screenshot('12-pm-archive-list')

  // Test 9: Mapa klocków - diamenciki
  await step('10. Sprawdź Mapę klocków na innym projekcie — kliknij diamencik → modal?', async () => {
    // Wróć do /projekty
    await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Otwórz dowolny projekt
    const projectLink = page.locator('a[href*="/projects/"]').first()
    if (await projectLink.count() > 0) {
      await projectLink.click()
      await page.waitForURL(/\/projects\//, { timeout: 10000 })

      // Szukaj diamencika (SVG lub przycisk z symbolem diamentu)
      const diamond = page.locator('button, .diamond, [data-type="diamond"]').first()
      const diamondCnt = await diamond.count()

      if (diamondCnt > 0) {
        await diamond.click()
        await page.waitForTimeout(1000)

        // Czekaj na modal
        const modal = page.locator('[role="dialog"], .modal').first()
        const modalCnt = await modal.count()

        if (modalCnt > 0) {
          // Szukaj przycisków "Robimy" / "Pomijamy"
          const doBtn = page.locator('button').filter({ hasText: /robimy|we do|yes/ }).first()
          const skipBtn = page.locator('button').filter({ hasText: /pomijamy|skip|no/ }).first()

          if (await doBtn.count() > 0 || await skipBtn.count() > 0) {
            log(`    Modal diamencika ma przyciski akcji`)
          } else {
            finding('ŚREDNIE', 'diamond-modal', 'Modal bez przycisków Robimy/Pomijamy', 'action buttons present', 'absent')
          }
        } else {
          finding('WYSOKI', 'diamond-modal', 'Modal diamencika nie otworzył się', 'modal present', 'absent')
        }
      } else {
        log(`    Brak diamencików na tym projekcie (może nikt nie ma decyzji)`)
      }
    }
  })
  await screenshot('13-pm-diamond-modal')

} catch (e) {
  log(`\n[PERSONA 2] ERROR: ${String(e).slice(0, 200)}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA 3 — JUNIOR (bezpieczeństwo + chaos)
// ─────────────────────────────────────────────────────────────────────────────

log('\n\n' + '═'.repeat(80))
log('PERSONA 3 — JUNIOR (bezpieczeństwo + chaos)')
log('═'.repeat(80))

currentPersona = 'JUNIOR'
consoleErrors = []
networkErrors = []

try {
  // Logowanie jeśli trzeba
  await step('1. Login', async () => {
    const url = page.url()
    if (url.includes('/login')) {
      const adminBtn = page.locator('button, a').filter({ hasText: /wejdź jako admin/i }).first()
      if (await adminBtn.count() > 0) {
        await adminBtn.click()
        await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 })
      }
    }
  })

  // Test 1: Direct access na /admin/users
  await step('2. Spróbuj wejść bezpośrednio na /admin/users (sprawdzenie 403/redirect)', async () => {
    await page.goto(BASE + '/admin/users', { waitUntil: 'networkidle' })
    const url = page.url()

    // Sprawdź czy jest 404 czy redirect
    const notFound = page.locator('h1, h2').filter({ hasText: /not found|404|brak dostępu/i }).first()
    const notFoundCnt = await notFound.count()

    if (notFoundCnt > 0) {
      log(`    404 page pojawił się (poprawnie)`)
    } else if (!url.includes('/admin')) {
      log(`    Redirect z /admin (poprawnie)`)
    } else {
      log(`    Dostęp do /admin/users — możliwy (niekoniecznie błąd, zależy od uprawnień)`)
    }
  })
  await screenshot('14-junior-admin-access')

  // Test 2: Wejście na /admin/team
  await step('3. Spróbuj wejść na /admin/team', async () => {
    await page.goto(BASE + '/admin/team', { waitUntil: 'networkidle' })
    const url = page.url()

    if (url.includes('/admin/team')) {
      log(`    /admin/team dostępna`)
    } else {
      log(`    /admin/team niedostępna lub redirect`)
    }
  })

  // Test 3: Szybkie kliknięcia "Oznacz jako zakończony"
  await step('4. Szybkie kliknięcia "Oznacz jako zakończony" na tym samym projekcie wielokrotnie', async () => {
    // Otwórz projekt
    await page.goto(BASE + '/projekty', { waitUntil: 'networkidle' })
    const projectLink = page.locator('a[href*="/projects/"]').first()

    if (await projectLink.count() > 0) {
      await projectLink.click()
      await page.waitForURL(/\/projects\//, { timeout: 10000 })

      // Szukaj przycisku
      const completeBtn = page.locator('button').filter({ hasText: /oznacz jako zakończony/i }).first()

      // Kliknij wielokrotnie bez czekania
      for (let i = 0; i < 3; i++) {
        if (await completeBtn.count() > 0) {
          await completeBtn.click()
          await page.waitForTimeout(100) // mały delay
        }
      }

      log(`    3x kliknięcia wykonane`)

      // Sprawdzenie czy błędy w konsoli
      await page.waitForTimeout(1000)
    }
  })
  await screenshot('15-junior-spam-clicks')

  // Test 4: Dialog archiwizacji - puste pole
  await step('5. Dialog archiwizacji — wpisz puste pole → czy przycisk disabled?', async () => {
    // Kliknij archiwizuj
    const archiveBtn = page.locator('button').filter({ hasText: /archiwizuj/i }).first()
    if (await archiveBtn.count() > 0) {
      await archiveBtn.click()
      await page.waitForTimeout(1000)

      const nameField = page.locator('input[type="text"]').first()
      if (await nameField.count() > 0) {
        await nameField.fill('')
        await page.waitForTimeout(300)

        const submitBtn = page.locator('button').filter({ hasText: /potwierdź|submit|archiwizuj/ }).first()
        const isDisabled = await submitBtn.isDisabled()

        if (isDisabled) {
          log(`    Przycisk disabled dla pustego pola (poprawnie)`)
        } else {
          finding('WYSOKI', 'archive-validation', 'Przycisk NIE disabled dla pustego pola', 'button disabled', 'enabled')
        }
      }

      // Zamknij dialog
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }
  })

  // Test 5: Inne kapitalizacje nazwy projektu
  await step('6. Dialog archiwizacji — test case-insensitive validation', async () => {
    const archiveBtn = page.locator('button').filter({ hasText: /archiwizuj/i }).first()
    if (await archiveBtn.count() > 0) {
      await archiveBtn.click()
      await page.waitForTimeout(1000)

      // Pobierz prawidłową nazwę
      const headerText = page.locator('h1, h2').first()
      const originalName = await headerText.textContent()
      const lowerName = originalName?.toLowerCase() || 'test'

      const nameField = page.locator('input[type="text"]').first()
      if (await nameField.count() > 0) {
        await nameField.fill(lowerName)
        await page.waitForTimeout(300)

        const submitBtn = page.locator('button').filter({ hasText: /potwierdź/ }).first()
        const isDisabled = await submitBtn.isDisabled()

        if (!isDisabled) {
          log(`    Case-insensitive validation działa (button enabled dla lowercase)`)
        } else {
          finding('ŚREDNIE', 'archive-validation', 'Case-insensitive validation nie działa', 'button enabled', 'button disabled')
        }
      }

      await page.keyboard.press('Escape')
    }
  })

  // Test 6: Konsola - czy są JS errory
  await step('7. Sprawdzenie konsoli — zero błędów JS', async () => {
    const errorCount = consoleErrors.length
    log(`    Total console errors during session: ${errorCount}`)

    if (errorCount > 0) {
      finding('ŚREDNIE', 'console', `Znaleziono ${errorCount} błędów w konsoli`, 'zero errors', errorCount)
      consoleErrors.forEach((e, i) => {
        if (i < 5) log(`      • ${e.msg}`)
      })
      if (errorCount > 5) log(`      ... i ${errorCount - 5} więcej`)
    }
  })
  await screenshot('16-junior-final')

} catch (e) {
  log(`\n[PERSONA 3] ERROR: ${String(e).slice(0, 200)}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT
// ─────────────────────────────────────────────────────────────────────────────

await browser.close()

log('\n\n' + '═'.repeat(80))
log('RAPORT FINAŁOWY')
log('═'.repeat(80))

const criticals = findings.filter(f => f.sev === 'KRYTYCZNE')
const highs = findings.filter(f => f.sev === 'WYSOKI' || f.sev === 'WYSOKIE')
const mediums = findings.filter(f => f.sev === 'ŚREDNIE')

log(`\n## KRYTYCZNE (${criticals.length})`)
criticals.forEach(f => {
  log(`\n**[${f.persona}] ${f.area}**`)
  log(`${f.what}`)
  log(`Expected: ${f.expected}`)
  log(`Got: ${f.got}`)
  if (f.details) log(`Details: ${f.details}`)
})

log(`\n## WYSOKI (${highs.length})`)
highs.forEach(f => {
  log(`\n**[${f.persona}] ${f.area}**`)
  log(`${f.what}`)
  log(`Expected: ${f.expected}`)
  log(`Got: ${f.got}`)
  if (f.details) log(`Details: ${f.details}`)
})

log(`\n## ŚREDNIE (${mediums.length})`)
mediums.forEach(f => {
  log(`\n**[${f.persona}] ${f.area}**`)
  log(`${f.what}`)
})

log(`\n## KONSOLA (${consoleErrors.length} errors, ${networkErrors.length} network errors)`)
if (consoleErrors.length > 0) {
  log(`\nConsole errors (pierwsze 10):`)
  consoleErrors.slice(0, 10).forEach(e => {
    log(`  [${e.persona}] ${e.msg}`)
  })
}

log(`\n## SCREENSHOTS`)
log(`Wszystkie zrzuty zapisane w: ${DIR}`)
log(`Otwórz w Preview: open ${DIR}`)

const report = {
  timestamp: new Date().toISOString(),
  total_findings: findings.length,
  critical: criticals.length,
  high: highs.length,
  medium: mediums.length,
  console_errors: consoleErrors.length,
  network_errors: networkErrors.length,
  findings,
  screenshots_dir: DIR
}

writeFileSync(join(DIR, 'report.json'), JSON.stringify(report, null, 2))
log(`\nJSON report: ${join(DIR, 'report.json')}`)
