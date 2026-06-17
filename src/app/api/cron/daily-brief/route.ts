import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { getProjectsForBrief } from '@/lib/data/projects'
import type { BriefData } from '@/lib/data/projects'

// Resend inicjalizowany lazy (wewnatrz handlera) — unika bledu "Missing API key"
// gdy Next.js instancjonuje modul podczas build bez zmiennych srodowiskowych.

// Vercel Cron wywoluje GET. Autoryzacja: naglowek x-vercel-cron (Vercel)
// lub Bearer CRON_SECRET (do testow lokalnych).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronHeader = request.headers.get('x-vercel-cron')

  if (!cronHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const briefData = await getProjectsForBrief()

    const recipientEmail =
      process.env.BRIEF_EMAIL ?? 'mikolaj.marcinkowski@businessweb.pl'

    const now = new Date()
    const subject = `Poranek BW — ${now.toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: recipientEmail,
      subject,
      html: buildBriefHtml(briefData),
    })

    if (error) {
      console.error('[daily-brief] Resend error:', error)
      return NextResponse.json({ error: 'Email send failed', detail: error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      emailId: data?.id,
      stats: {
        atRisk: briefData.atRiskProjects.length,
        dueToday: briefData.tasksDueToday.length,
        dueSoon: briefData.tasksDueSoon.length,
      },
    })
  } catch (err) {
    console.error('[daily-brief] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function buildBriefHtml(data: BriefData): string {
  const formattedDate = formatDate(new Date())
  const hasIssues = data.atRiskProjects.length > 0 || data.tasksDueToday.length > 0

  const atRiskSection =
    data.atRiskProjects.length > 0
      ? `
      <h2 style="font-size: 15px; color: #ef4444; border-left: 3px solid #ef4444; padding-left: 10px; margin-top: 24px;">
        &#9888; Zagro&#380;one projekty (${data.atRiskProjects.length})
      </h2>
      <ul style="padding-left: 20px; margin: 8px 0;">
        ${data.atRiskProjects
          .map(
            (p) =>
              `<li style="margin-bottom: 4px;"><b>${escHtml(p.name)}</b> &mdash; ${escHtml(p.clientName)}</li>`
          )
          .join('')}
      </ul>`
      : ''

  const todaySection =
    data.tasksDueToday.length > 0
      ? `
      <h2 style="font-size: 15px; color: #f59e0b; border-left: 3px solid #f59e0b; padding-left: 10px; margin-top: 24px;">
        &#128197; Na dzi&#347; (${data.tasksDueToday.length} zada&#324;)
      </h2>
      <ul style="padding-left: 20px; margin: 8px 0;">
        ${data.tasksDueToday
          .map(
            (t) =>
              `<li style="margin-bottom: 4px;">${escHtml(t.title)} &mdash; <i>${escHtml(t.projectName)}</i>${t.assigneeName ? ` &middot; ${escHtml(t.assigneeName)}` : ''}</li>`
          )
          .join('')}
      </ul>`
      : ''

  const soonSection =
    data.tasksDueSoon.length > 0
      ? `
      <h2 style="font-size: 15px; color: #6b7280; border-left: 3px solid #d1d5db; padding-left: 10px; margin-top: 24px;">
        Nadchodz&#261;ce (${data.tasksDueSoon.length} zada&#324;)
      </h2>
      <ul style="padding-left: 20px; margin: 8px 0;">
        ${data.tasksDueSoon
          .map(
            (t) =>
              `<li style="margin-bottom: 4px;">${escHtml(t.title)} &mdash; <i>${escHtml(t.projectName)}</i> <span style="color:#9ca3af; font-size: 12px;">(${escHtml(t.dueDate)})</span></li>`
          )
          .join('')}
      </ul>`
      : ''

  const allClearSection =
    !hasIssues
      ? `<p style="color: #28B39B; font-size: 15px; margin-top: 16px;">&#10003; Wszystko pod kontrol&#261; &mdash; brak pilnych spraw na dzi&#347;.</p>`
      : ''

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; background: #ffffff;">
  <h1 style="color: #28B39B; font-size: 20px; margin-bottom: 4px; margin-top: 0;">Dzie&#324; dobry &#128075;</h1>
  <p style="color: #6b7280; font-size: 13px; margin-top: 0;">BW Project Manager &middot; ${escHtml(formattedDate)}</p>
  ${atRiskSection}
  ${todaySection}
  ${soonSection}
  ${allClearSection}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 16px;">
  <p style="font-size: 11px; color: #9ca3af; margin: 0;">
    BW Project Manager &middot;
    <a href="https://bw-project-manager.vercel.app" style="color: #28B39B; text-decoration: none;">Otw&oacute;rz aplikacj&#281;</a>
  </p>
</body>
</html>`
}

/** Podstawowe escapowanie HTML dla danych z bazy. */
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
