import { requireUser } from '@/lib/auth/dal'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { InspectionTool } from '@/components/inspection/inspection-tool'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Lewy sidebar */}
      <Sidebar />

      {/* Obszar roboczy: topbar + tresc */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={user} />

        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>

      {/* Narzędzie inspekcji — widoczne tylko dla testerów */}
      <InspectionTool isTester={user.isTester} />
    </div>
  )
}
