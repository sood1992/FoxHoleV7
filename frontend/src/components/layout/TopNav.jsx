import { Link } from 'react-router-dom'
import { Bell, Search, LogOut, User, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import Avatar from '../common/Avatar'
import Dropdown, { DropdownItem, DropdownDivider } from '../common/Dropdown'

export default function TopNav() {
  const { user, logout } = useAuth()
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search projects, tasks..."
            className="input pl-10 py-2 bg-surface-secondary border-0"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Dropdown
          align="right"
          trigger={
            <button className="relative p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          }
        >
          {({ close }) => (
            <div className="w-80">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      markAllAsRead()
                      close()
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-text-secondary text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        markAsRead(notification.id)
                        close()
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-surface-secondary transition-colors ${
                        !notification.is_read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-text-primary">
                        {notification.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5 truncate">
                        {notification.content}
                      </p>
                    </button>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <Link
                  to="/notifications"
                  onClick={close}
                  className="block px-4 py-3 text-center text-sm text-primary hover:underline border-t border-border"
                >
                  View all notifications
                </Link>
              )}
            </div>
          )}
        </Dropdown>

        {/* User menu */}
        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-surface-secondary transition-colors">
              <Avatar src={user?.avatar_url} name={user?.name} size="sm" />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-text-primary">
                  {user?.name}
                </p>
                <p className="text-xs text-text-secondary capitalize">
                  {user?.role}
                </p>
              </div>
            </button>
          }
        >
          {({ close }) => (
            <>
              <Link
                to="/profile"
                onClick={close}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-surface-secondary"
              >
                <User size={16} />
                My Profile
              </Link>
              <DropdownItem
                icon={<Settings size={16} />}
                onClick={() => {
                  close()
                }}
              >
                Settings
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem
                icon={<LogOut size={16} />}
                danger
                onClick={() => {
                  handleLogout()
                  close()
                }}
              >
                Logout
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  )
}
