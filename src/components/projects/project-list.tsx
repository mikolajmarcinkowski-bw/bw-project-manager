import { ProjectRow, type ProjectRowData } from './project-row'

interface ProjectListProps {
  projects: ProjectRowData[]
  showClient?: boolean
  emptyMessage?: string
  linkDisabled?: boolean
}

export function ProjectList({
  projects,
  showClient = false,
  emptyMessage = 'Brak projektów.',
  linkDisabled = false,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <p className="font-meta text-sm text-muted-foreground px-3 py-4">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border/60">
      {projects.map((project, i) => (
        <ProjectRow
          key={project.id}
          project={project}
          showClient={showClient}
          linkDisabled={linkDisabled}
          index={i}
        />
      ))}
    </div>
  )
}
