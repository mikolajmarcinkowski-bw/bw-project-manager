import { requireAdmin } from '@/lib/auth/dal'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Panel admina · BW Project Manager',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin().catch(() => null)
  if (!user) redirect('/dashboard')
  return <>{children}</>
}
