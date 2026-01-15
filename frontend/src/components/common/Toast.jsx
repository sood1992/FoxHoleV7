import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-white',
  info: 'bg-info text-white',
}

function ToastItem({ toast, onDismiss }) {
  const Icon = icons[toast.type] || icons.info

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-dropdown min-w-[300px] max-w-[400px] toast-enter ${
        styles[toast.type]
      }`}
    >
      <Icon size={20} className="shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded hover:bg-white/20 transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
