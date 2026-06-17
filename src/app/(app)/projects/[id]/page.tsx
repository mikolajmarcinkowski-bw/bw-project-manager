import { notFound } from 'next/navigation'
import { ProjectHeader } from '@/components/projects/project-header'
import { ProjectViews } from '@/components/projects/project-views'
import { getProjectDetail, getProfiles } from '@/lib/data/projects'

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
  const [project, profiles] = await Promise.all([
    getProjectDetail(id),
    getProfiles(),
  ])

  if (!project) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader project={project} />
      <ProjectViews project={project} profiles={profiles} />
    </div>
  )
}
