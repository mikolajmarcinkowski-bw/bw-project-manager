import { Logo } from '@/components/brand/logo'
import { LoginForm } from './login-form'
import { DevLogin } from './dev-login'

// Serwerowy komponent — gate na NODE_ENV liczony po stronie serwera.
// Fail-closed: tylko development. W produkcji i na preview Vercela <DevLogin />
// nie jest renderowany, więc przeglądarka nie pobiera jego chunku (nie jest
// referowany w produkcyjnym payloadzie RSC). Realną ochroną akcji devLogin jest
// jednak jej serwerowy guard NODE_ENV, nie brak markupu.
export default function LoginPage() {
  const devMode = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-[10px] bg-card shadow-whisper border border-border px-8 py-10 flex flex-col gap-7">
        {/* Logotyp */}
        <div className="flex flex-col gap-2 items-center text-center">
          <Logo className="h-11" />
          <p className="font-meta text-xs text-muted-foreground uppercase tracking-wide">
            Project Manager · narzędzie wewnętrzne
          </p>
        </div>

        {/* Formularz logowania */}
        <LoginForm />

        {/* Obejście logowania — tylko lokalnie */}
        {devMode && <DevLogin />}
      </div>
    </div>
  )
}
