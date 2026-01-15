import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import TimerBar from './TimerBar'
import ToastContainer from '../common/Toast'
import { useTimer } from '../../context/TimerContext'

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isRunning } = useTimer()

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <TopNav />

        <main className={`p-6 ${isRunning ? 'pb-20' : ''}`}>
          <Outlet />
        </main>
      </div>

      <TimerBar />
      <ToastContainer />
    </div>
  )
}
