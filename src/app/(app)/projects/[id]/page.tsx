import { notFound } from 'next/navigation'
import { ProjectHeader } from '@/components/projects/project-header'
import { GanttChart } from '@/components/projects/gantt-chart'
import { getProjectDetail } from '@/lib/data/projects'

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
  const project = await getProjectDetail(id)

  if (!project) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader project={project} />
      <GanttChart project={project} />
    </div>
  )
}
