import Link from 'next/link'

export default function RootNotFound() {
  return (
    <html lang="pl">
      <body style={{ margin: 0, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '0 16px' }}>
        <span style={{ fontSize: '64px', fontWeight: 700, color: '#d1d5db' }}>404</span>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Nie znaleziono strony</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          Zasób, którego szukasz, nie istnieje.
        </p>
        <Link
          href="/dashboard"
          style={{ marginTop: '8px', color: '#28B39B', textDecoration: 'underline', fontSize: '14px' }}
        >
          Wróć do dashboardu →
        </Link>
      </body>
    </html>
  )
}
