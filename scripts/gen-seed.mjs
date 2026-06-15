// Generator seeda step_templates / step_task_templates.
// Źródło prawdy (KANON): raw/00_harmonogram.html (tablica TASKS — 9 faz FAZA 0-8 + Sprint 2, R14).
// "Master Excel" Oli PORZUCONY (decyzja Mikołaja 2026-06-15, D-052) — harmonogram jest finalnym
// źródłem struktury faz i mapowania typów. Re-runnable: edytuj raw/00_harmonogram.html i regeneruj.
// Użycie: node scripts/gen-seed.mjs <ścieżka_html> > supabase/migrations/<ts>_seed_templates.sql

import { readFileSync } from 'node:fs'

const htmlPath = process.argv[2]
if (!htmlPath) { console.error('Podaj ścieżkę do 00_harmonogram.html'); process.exit(1) }

const html = readFileSync(htmlPath, 'utf8')
const m = html.match(/const TASKS = \[([\s\S]*?)\];/)
if (!m) { console.error('Nie znaleziono tablicy TASKS'); process.exit(1) }

// Eval tablicy w izolacji (źródło zaufane — własny plik raw/).
const TASKS = eval('[' + m[1] + ']')

// id fazy -> (phase_number, step_order)
const PHASE_KEY = {
  '0': [0, 1], '1': [1, 1], '2': [2, 1], '3': [3, 1], '3b': [3, 2],
  '4': [4, 1], '5': [5, 1], '6': [6, 1], '7': [7, 1], '8': [8, 1],
}

const TYPES = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"
const arr = (xs) => "'{" + xs.join(',') + "}'"

// applies_to_types: 'all' => [] (puste = wszystkie, konwencja R15);
// w przeciwnym razie typy z `note` (jeśli jest), inaczej z `type`.
function appliesTypes(t) {
  if (t.type === 'all') return []
  if (t.note) {
    const found = TYPES.filter((T) => new RegExp(`\\b${T}\\b`).test(t.note))
    if (found.length) return found
  }
  return [t.type.toUpperCase()]
}

const phases = []   // {pnum, sord, name, title}
let current = null
const tasksByPhase = new Map() // "pnum.sord" -> [rows]

for (const t of TASKS) {
  if (t.isPhase) {
    const key = PHASE_KEY[t.id]
    if (!key) { console.error('Nieznane id fazy: ' + t.id); process.exit(1) }
    const [pnum, sord] = key
    const name = t.name.replace(/^FAZA\s+\S+\s+—\s+/, '')
    current = `${pnum}.${sord}`
    phases.push({ pnum, sord, name, title: t.name })
    tasksByPhase.set(current, [])
    continue
  }
  if (!current) continue
  const rows = tasksByPhase.get(current)
  rows.push({
    order: rows.length + 1,
    title: t.name.replace(/^✦\s*/, ''),
    kind: t.kind,
    types: appliesTypes(t),
    ws: t.wStart ?? null,
    we: t.wEnd ?? null,
    est: (t.est ?? null),
    ms: !!t.isMilestone,
  })
}

let out = ''
out += `-- =====================================================================\n`
out += `-- SEED: step_templates + step_task_templates\n`
out += `-- WYGENEROWANE ze skryptu scripts/gen-seed.mjs ze źródła raw/00_harmonogram.html (R14).\n`
out += `-- KANON: struktura 9-fazowa (FAZA 0-8 + Sprint 2) jest FINALNA — "Master Excel" Oli\n`
out += `--   PORZUCONY (D-052). Nadpisuje notatkę matrycy "baza = 6 faz" (bw-process-matrix.md).\n`
out += `--   Mapowanie typów (CRM/SPO/INT/MKT/ERP -> zadania) pochodzi z pól type/note harmonogramu.\n`
out += `-- KONWENCJA R15 (auto-insert): applies_to_types = '{}' oznacza WSZYSTKIE typy.\n`
out += `--   Zapytanie auto-insertu MUSI: cardinality(applies_to_types)=0 OR applies_to_types && :selected\n`
out += `--   (sam operator && na pustej tablicy = false -> bez special-case "puste" znaczyłoby ŻADNE).\n`
out += `-- =====================================================================\n\n`

// step_templates (klocki-fazy) — applies_to_types '{}' (filtr na poziomie zadań); UI ukrywa puste bloki.
out += `insert into step_templates (phase_number, phase_name, step_order, step_title, applies_to_types, is_recurring, is_parallel) values\n`
const phaseVals = phases.map(
  (p) => `  (${p.pnum}, ${q(p.name)}, ${p.sord}, ${q(p.title)}, '{}', false, false)`
)
// Klocki cykliczne (pula) — D-038 z bw-process-matrix.md. phase_number=99.
const recurring = [
  [99, 'Klocki cykliczne', 1, 'Raport statusu tygodniowy (mail co czwartek)'],
  [99, 'Klocki cykliczne', 2, 'Piątkowe podsumowanie finansowe/godzinowe'],
  [99, 'Klocki cykliczne', 3, 'Spotkanie przyrostowe z klientem'],
]
const recVals = recurring.map(
  ([pn, pname, so, title]) => `  (${pn}, ${q(pname)}, ${so}, ${q(title)}, '{}', true, false)`
)
out += [...phaseVals, ...recVals].join(',\n') + ';\n\n'

// step_task_templates — jeden INSERT per faza (cross join do id klocka po phase_number+step_order).
let totalTasks = 0
let totalEst = 0
for (const p of phases) {
  const rows = tasksByPhase.get(`${p.pnum}.${p.sord}`)
  if (!rows.length) continue
  out += `-- ${p.title}\n`
  out += `insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)\n`
  out += `select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms\n`
  out += `from step_templates s cross join (values\n`
  const vals = rows.map((r) => {
    totalTasks++
    if (r.est != null) totalEst += Number(r.est)
    return `  (${r.order}, ${q(r.title)}, ${q(r.kind)}, ${arr(r.types)}, ${r.ws ?? 'null'}, ${r.we ?? 'null'}, ${r.est ?? 'null'}, ${r.ms})`
  })
  out += vals.join(',\n') + '\n'
  out += `) as v(ord, title, kind, types, ws, we, est, ms)\n`
  out += `where s.phase_number = ${p.pnum} and s.step_order = ${p.sord};\n\n`
}

out += `-- PODSUMOWANIE (do weryfikacji): klocki-fazy=${phases.length} + cykliczne=${recurring.length}; zadania=${totalTasks}; suma est=${totalEst}h\n`

process.stdout.write(out)
console.error(`[gen-seed] klocki=${phases.length}+${recurring.length} cykl., zadania=${totalTasks}, suma est=${totalEst}h`)
