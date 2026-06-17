'use client'

import { useEffect } from 'react'
import type { RecentProject } from '@/components/shell/sidebar'

const RECENT_PROJECTS_KEY = 'bw-recent-projects'
const MAX_RECENT = 5

interface ProjectVisitTrackerProps {
  projectId: string
  projectName: string
  clientName: string
}

export function ProjectVisitTracker({ projectId, projectName, clientName }: ProjectVisitTrackerProps) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_PROJECTS_KEY)
      const existing: RecentProject[] = raw ? (JSON.parse(raw) as RecentProject[]) : []

      // Remove current project if already in list (dedup), then prepend
      const filtered = existing.filter((p) => p.id !== projectId)
      const updated: RecentProject[] = [
        { id: projectId, name: projectName, clientName },
        ...filtered,
      ].slice(0, MAX_RECENT)

      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated))
    } catch {
      // localStorage unavailable — ignore
    }
  }, [projectId, projectName, clientName])

  return null
}
