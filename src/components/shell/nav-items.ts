import { LayoutDashboard, FolderOpen, Archive, User } from 'lucide-react'

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
    label: 'Moje projekty',
    href: '/projekty?pm=current',
    icon: User,
  },
  {
    label: 'Archiwum',
    href: '/archiwum',
    icon: Archive,
  },
] as const
