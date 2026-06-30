import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users } from 'lucide-react'
import { requireUser } from '@/lib/auth/dal'
import { getConsultantDetail } from '@/lib/data/team'
import { ConsultantView } from '@/components/team/consultant-view'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // requireUser() — blokuje auth-less dostęp do admin-client data-layer (defense-in-depth)
  await requireUser()
  const { id } = await params
  const consultant = await getConsultantDetail(id)
  if (!consultant) return { title: 'Konsultant · BW Project Manager' }
  return { title: `${consultant.fullName} · BW Project Manager` }
}

interface ConsultantPageProps {
  params: Promise<{ id: string }>
}

export default async function ConsultantPage({ params }: ConsultantPageProps) {
  await requireUser()

  const { id } = await params
  const consultant = await getConsultantDetail(id)

  if (!consultant) notFound()

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div>
        <nav aria-label="Ścieżka nawigacyjna" className="flex items-center gap-1 mb-1">
          <Link
            href="/admin/team"
            className="flex items-center gap-1 font-meta text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
            aria-label="Wróć do puli konsultantów"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Pula konsultantów
          </Link>
          <span className="font-meta text-xs text-muted-foreground" aria-hidden="true">/</span>
          <span className="font-meta text-xs text-muted-foreground" aria-current="page">
            {consultant.fullName}
          </span>
        </nav>

        {/* Tytuł strony (widoczny tylko dla screen readerów — ConsultantView renderuje h1) */}
        <div className="flex items-center gap-2" aria-hidden="true">
          <Users className="h-5 w-5 text-teal" />
        </div>
      </div>

      <ConsultantView consultant={consultant} />
    </div>
  )
}
