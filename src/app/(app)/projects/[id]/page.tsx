import { notFound } from 'next/navigation'
import { ProjectHeader } from '@/components/projects/project-header'
import { ProjectViews } from '@/components/projects/project-views'
import { ProjectVisitTracker } from '@/components/projects/project-visit-tracker'
import {
  getProjectDetail,
  getProfiles,
  getProjectBudget,
  getProjectChangeRequests,
  getProjectRaci,
} from '@/lib/data/projects'

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
  const [project, profiles, budget, changeRequests, raci] = await Promise.all([
    getProjectDetail(id),
    getProfiles(),
    getProjectBudget(id),
    getProjectChangeRequests(id),
    getProjectRaci(id),
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
      <ProjectHeader project={project} profiles={profiles} />
      <ProjectViews
        project={project}
        profiles={profiles}
        budget={budget}
        changeRequests={changeRequests}
        raci={raci}
      />
    </div>
  )
}
