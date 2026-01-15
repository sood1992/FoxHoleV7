import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  Calendar,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const mainNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
  { path: '/time', label: 'Time Tracking', icon: Clock },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
]

const adminNavItems = [
  { path: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'pm'] },
  { path: '/team', label: 'Team', icon: Users, roles: ['admin'] },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth()

  const NavItem = ({ item }) => {
    const Icon = item.icon

    // Check role access
    if (item.roles && !item.roles.includes(user?.role)) {
      return null
    }

    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          isActive ? 'sidebar-link-active' : 'sidebar-link'
        }
      >
        <Icon size={20} />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    )
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-surface border-r border-border z-40 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <span className="font-bold text-lg text-text-primary">Foxhole</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold">F</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </div>

        {/* Admin section */}
        {(user?.role === 'admin' || user?.role === 'pm') && (
          <>
            <div className="my-4 px-4">
              <div className="border-t border-border" />
            </div>
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}
