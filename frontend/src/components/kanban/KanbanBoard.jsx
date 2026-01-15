import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import * as projectsApi from '../../api/projects'
import * as tasksApi from '../../api/tasks'
import { useNotifications } from '../../context/NotificationContext'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import TaskDetailPane from './TaskDetailPane'
import TaskForm from './TaskForm'
import { SkeletonCard } from '../common/Skeleton'

export default function KanbanBoard({ projectId }) {
  const { showToast } = useNotifications()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskFormColumn, setTaskFormColumn] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchBoard = useCallback(async () => {
    try {
      const data = await projectsApi.getKanbanBoard(projectId)
      setBoard(data)
    } catch (error) {
      console.error('Failed to fetch board:', error)
      showToast('Failed to load board', 'error')
    } finally {
      setLoading(false)
    }
  }, [projectId, showToast])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const handleDragStart = (event) => {
    const { active } = event
    const task = board
      .flatMap((col) => col.tasks)
      .find((t) => t.id === active.id)
    setActiveTask(task)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeTask = board.flatMap((col) => col.tasks).find((t) => t.id === active.id)
    if (!activeTask || activeTask.is_blocked) return

    // Get target column
    const targetColumnId = over.id.toString().startsWith('column-')
      ? parseInt(over.id.toString().replace('column-', ''))
      : board.find((col) => col.tasks.some((t) => t.id === over.id))?.column.id

    if (!targetColumnId) return

    // Find current and target column indices
    const sourceColIndex = board.findIndex((col) =>
      col.tasks.some((t) => t.id === active.id)
    )
    const targetColIndex = board.findIndex(
      (col) => col.column.id === targetColumnId
    )

    if (sourceColIndex === -1 || targetColIndex === -1) return

    // Calculate new position
    const targetTasks = [...board[targetColIndex].tasks]
    let newPosition = 0

    if (over.id.toString().startsWith('column-')) {
      newPosition = targetTasks.length
    } else {
      const overIndex = targetTasks.findIndex((t) => t.id === over.id)
      newPosition = overIndex >= 0 ? overIndex : targetTasks.length
    }

    // Optimistic update
    const newBoard = [...board]

    // Remove from source
    newBoard[sourceColIndex].tasks = newBoard[sourceColIndex].tasks.filter(
      (t) => t.id !== active.id
    )

    // Add to target
    const updatedTask = { ...activeTask, column_id: targetColumnId }
    newBoard[targetColIndex].tasks.splice(newPosition, 0, updatedTask)

    setBoard(newBoard)

    // API call
    try {
      await tasksApi.moveTask(active.id, targetColumnId, newPosition)
    } catch (error) {
      console.error('Failed to move task:', error)
      showToast('Failed to move task', 'error')
      fetchBoard() // Revert on error
    }
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
  }

  const handleAddTask = (column) => {
    setTaskFormColumn(column)
    setShowTaskForm(true)
  }

  const handleTaskCreated = (task) => {
    setShowTaskForm(false)
    setTaskFormColumn(null)
    fetchBoard()
  }

  const handleTaskUpdated = () => {
    fetchBoard()
    setSelectedTask(null)
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-80 shrink-0">
            <div className="h-10 skeleton rounded-t-lg mb-2" />
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {board.map(({ column, tasks }) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onAddTask={() => handleAddTask(column)}
              onEditColumn={() => {}}
              onDeleteColumn={() => {}}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
        </DragOverlay>
      </DndContext>

      {/* Task detail pane */}
      <TaskDetailPane
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdated}
      />

      {/* Create task form */}
      <TaskForm
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false)
          setTaskFormColumn(null)
        }}
        projectId={projectId}
        columnId={taskFormColumn?.id}
        onCreated={handleTaskCreated}
      />
    </>
  )
}
