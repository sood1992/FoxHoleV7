import { Play, Pause, Square } from 'lucide-react'
import { useTimer } from '../../context/TimerContext'

export default function TimerBar() {
  const { activeTimer, formattedTime, stopTimer, isRunning, loading } = useTimer()

  if (!isRunning) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-primary text-white z-50 flex items-center justify-center gap-4 px-4 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="animate-pulse-soft text-lg font-mono">{formattedTime}</span>
      </div>

      <div className="h-4 w-px bg-white/30" />

      <div className="flex items-center gap-2 text-sm">
        <span className="opacity-75">Working on:</span>
        <span className="font-medium truncate max-w-xs">
          {activeTimer?.task_title}
        </span>
        <span className="opacity-50">|</span>
        <span className="opacity-75 truncate max-w-xs">
          {activeTimer?.project_name}
        </span>
      </div>

      <div className="h-4 w-px bg-white/30" />

      <button
        onClick={stopTimer}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
      >
        <Square size={16} />
        <span className="text-sm font-medium">Stop</span>
      </button>
    </div>
  )
}
