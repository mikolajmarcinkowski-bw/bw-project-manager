import { LayoutDashboard, FolderOpen, Archive } from 'lucide-react'

export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Wszystkie projekty',
    href: '/projekty',
    icon: FolderOpen,
  },
  {
    label: 'Archiwum',
    href: '/archiwum',
    icon: Archive,
  },
] as const
