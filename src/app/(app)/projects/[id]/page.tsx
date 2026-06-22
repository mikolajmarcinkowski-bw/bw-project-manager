import { notFound } from 'next/navigation'
import { ProjectHeader } from '@/components/projects/project-header'
import { ProjectViews } from '@/components/projects/project-views'
import { ProjectVisitTracker } from '@/components/projects/project-visit-tracker'
import {
  getProjectDetail,
  getProfiles,
  getProjectRisks,
  getProjectKpis,
  getProjectBudget,
  getProjectChangeRequests,
  getProjectRaci,
  getProjectHealthMetrics,
  getProjectActivityLog,
} from '@/lib/data/projects'
import { getSpecialists } from '@/lib/data/specialists'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProjectDetail(id)
  if (!project) return { title: 'Projekt · BW Project Manager' }
  return { title: `${project.name} · BW Project Manager` }
}

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const [project, profiles, specialists, risks, kpis, budget, changeRequests, raci, health, activityLog] = await Promise.all([
    getProjectDetail(id),
    getProfiles(),
    getSpecialists(),
    getProjectRisks(id),
    getProjectKpis(id),
    getProjectBudget(id),
    getProjectChangeRequests(id),
    getProjectRaci(id),
    getProjectHealthMetrics(id),
    getProjectActivityLog(id),
  ])

  if (!project) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectVisitTracker
        projectId={project.id}
        projectName={project.name}
        clientName={project.client.name}
      />
      <ProjectHeader project={project} profiles={profiles} health={health} />
      <ProjectViews
        key={project.id}
        project={project}
        specialists={specialists}
        pmProfiles={profiles}
        risks={risks}
        kpis={kpis}
        budget={budget}
        changeRequests={changeRequests}
        raci={raci}
        activityLog={activityLog}
      />
    </div>
  )
}
