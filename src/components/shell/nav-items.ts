import { LayoutDashboard, FolderOpen, Archive, User, Users, UserCog, FolderCog } from 'lucide-react'

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

export const ADMIN_NAV_ITEMS = [
  { label: 'Konta użytkowników', href: '/admin/users', icon: Users },
  { label: 'Pula specjalistów', href: '/admin/team', icon: UserCog },
  { label: 'Szablony faz', href: '/admin/templates', icon: FolderCog },
] as const
